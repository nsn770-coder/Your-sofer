import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireUser, errorResponse, readJson, readOpId, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { reserveAttempt, commitAttempt, releaseAttempt } from '@/lib/logoStudio/quota.server';
import { db, getOwnedProject, getVersion, resolveForProject, selectionKey, serializeProject, getSettings, type MockupDoc } from '@/lib/logoStudio/projects.server';
import { clampPlacement } from '@/lib/logoStudio/catalog';
import { fetchCatalogImage } from '@/lib/logoStudio/fetchImage.server';
import { composeMockup, logoRegionDifference } from '@/lib/logoStudio/mockup.server';
import { uploadPrivate, downloadPrivate, storageConfigured } from '@/lib/logoStudio/storage.server';
import { generateImage, AiUnavailableError, AiResponseError } from '@/lib/logoStudio/gemini.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const AI_MOCKUP_PROMPT = `This is a product photo of a kippah with a printed logo that was placed on it by software.
Make ONLY the print look naturally integrated with the fabric: subtle fabric texture showing through the ink and soft light consistent with the photo.
Do NOT change, redraw, move, resize or recolour the logo in any way — every letter and shape must stay exactly as it is.
Do NOT change the kippah's shape, colour, fabric, stitching or the background. Keep the exact framing. No added text.`;

/**
 * Mockup on the selected kippah variant.
 *  kind "composite" (default): controlled placement of the exact logo file on
 *    the real product photo — no AI, no attempt, unlimited (rate-limited).
 *  kind "ai": optional photo-real finish of the composite. The first one per
 *    logo version is included; further ones cost 1 attempt and require
 *    confirmCharge=true (the client warns first). If the model altered the
 *    logo region, the result is rejected and the attempt refunded.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  let reserved: { uid: string; opId: string } | null = null;
  let includedClaim: { ref: FirebaseFirestore.DocumentReference } | null = null;
  const settingsP = getSettings();
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const proj = await getOwnedProject(id, user.uid);
    const body = await readJson(req);
    const versionId = typeof body.versionId === 'string' ? body.versionId : proj.currentVersionId;
    if (!versionId) throw new HttpError(400, 'no_version', 'צרו קודם לוגו.');
    const version = await getVersion(id, versionId);
    const kind: 'composite' | 'ai' = body.kind === 'ai' ? 'ai' : 'composite';
    const finish = body.finish === 'embroidery' ? 'embroidery' : 'print';
    if (!storageConfigured()) throw new HttpError(503, 'storage_not_configured', 'שמירת הקבצים אינה מוגדרת כרגע.');

    const { sel } = await resolveForProject(proj.productId, proj.selectedVariants);
    if (sel.imageStatus !== 'ok' || !sel.image) {
      const msg = sel.imageStatus === 'choose_variant'
        ? `נא לבחור ${sel.missingOptions.join(' ו')} לפני יצירת ההדמיה.`
        : sel.imageStatus === 'missing_variant_image'
          ? 'אין עדיין תמונה לווריאציה שבחרתם, ולכן אי אפשר להציג הדמיה מדויקת. אפשר לבחור צבע אחר או לפנות אלינו.'
          : 'למוצר זה אין תמונה מתאימה להדמיה.';
      throw new HttpError(409, `image_${sel.imageStatus}`, msg);
    }
    if (!sel.finishes.includes(finish)) throw new HttpError(400, 'finish_not_available', 'הגימור שנבחר אינו זמין לכיפה זו.');
    const placement = clampPlacement(body.placement as Record<string, number> | null, sel.printArea);

    await consumeRate(db(), kind === 'ai' ? 'aiMockup' : 'mockup', user.uid);

    let charged = false;
    if (kind === 'ai') {
      const opId = readOpId(body.opId);
      const settings = await settingsP;
      // claim the included AI mockup atomically (one per version)
      const vRef = getAdminDb().collection(COL.projects).doc(id).collection('versions').doc(version.id);
      const included = await getAdminDb().runTransaction(async tx => {
        const s = await tx.get(vRef);
        if (s.data()?.includedAiMockupUsed) return false;
        tx.update(vRef, { includedAiMockupUsed: true });
        return true;
      });
      if (included) includedClaim = { ref: vRef };
      else if (body.confirmCharge !== true) {
        throw new HttpError(402, 'charge_confirmation_required', 'ההדמיה הכלולה לגרסה זו כבר נוצלה. הדמיה נוספת תצרוך ניסיון אחד.');
      }
      charged = !included;
      const r = await reserveAttempt(db(), { uid: user.uid, opId, kind: 'ai_mockup', projectId: id, charge: charged, freeDefault: settings.freeAttempts });
      if (r.status === 'duplicate') {
        if (includedClaim) { await includedClaim.ref.update({ includedAiMockupUsed: false }); includedClaim = null; }
        if (r.op.status === 'succeeded') return NextResponse.json({ mockupId: r.op.result?.mockupId, duplicate: true, project: await serializeProject(id, await getOwnedProject(id, user.uid)) });
        throw new HttpError(409, r.op.status === 'reserved' ? 'in_progress' : 'op_finished', 'הבקשה כבר טופלה או בתהליך.');
      }
      reserved = { uid: user.uid, opId };
    }

    const [productImg, logoPng] = await Promise.all([fetchCatalogImage(sel.image.url), downloadPrivate(version.logo)]);
    const comp = await composeMockup(productImg, logoPng, placement, finish);
    let out = comp.jpg;

    if (kind === 'ai') {
      const ai = await generateImage(AI_MOCKUP_PROMPT, [{ mimeType: 'image/jpeg', data: comp.jpg.toString('base64') }], 40_000);
      const sharp = (await import('sharp')).default;
      const aiJpg = await sharp(ai.buffer).resize(comp.width, comp.height, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer();
      const diff = await logoRegionDifference(comp.jpg, aiJpg, comp.box);
      if (diff > 0.12) throw new AiResponseError('logo_changed');
      out = aiJpg;
    }

    const asset = await uploadPrivate(out, `logo-studio/${user.uid}/${id}/mockups`, 'jpg');
    const mockupId = crypto.randomBytes(8).toString('hex');
    const doc: MockupDoc = {
      versionId: version.id, kind, placement, finish, asset, box: comp.box, productId: proj.productId,
      selectionKey: selectionKey(proj.productId, proj.selectedVariants), imageUrl: sel.image.url, charged, createdAt: Date.now(),
    };
    await getAdminDb().collection(COL.projects).doc(id).collection('mockups').doc(mockupId).set(doc);
    await getAdminDb().collection(COL.projects).doc(id).update({ finish, updatedAt: Date.now() });
    let quota = null;
    if (reserved) {
      quota = await commitAttempt(db(), { ...reserved, result: { mockupId }, freeDefault: (await settingsP).freeAttempts });
      reserved = null;
    }
    return NextResponse.json({ mockupId, quota, project: await serializeProject(id, await getOwnedProject(id, user.uid)) });
  } catch (e) {
    let quota = null;
    if (reserved) {
      try { quota = await releaseAttempt(db(), { ...reserved, error: e instanceof Error ? e.message : 'error', freeDefault: (await settingsP).freeAttempts }); }
      catch (re) { console.error('[logo-studio/mockup] release failed', re); }
    }
    if (includedClaim) {
      try { await includedClaim.ref.update({ includedAiMockupUsed: false }); } catch { /* best effort */ }
    }
    if (e instanceof AiUnavailableError) return NextResponse.json({ error: 'ai_unavailable', message: 'שירות ההדמיה המציאותית אינו זמין כרגע. לא נוצל ניסיון. ההדמיה הרגילה זמינה תמיד.', quota }, { status: 503 });
    if (e instanceof AiResponseError) return NextResponse.json({ error: 'ai_mockup_failed', message: 'ההדמיה המציאותית לא שמרה על הלוגו המדויק ולכן נפסלה. לא נוצל ניסיון.', quota }, { status: 502 });
    return errorResponse(e, 'mockup');
  }
}
