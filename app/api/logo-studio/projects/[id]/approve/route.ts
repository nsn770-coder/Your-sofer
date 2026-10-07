import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { getOwnedProject, getVersion, resolveForProject, selectionKey, computeProduction, getSettings, type MockupDoc } from '@/lib/logoStudio/projects.server';
import { signedUrl } from '@/lib/logoStudio/storage.server';
import { COL } from '@/lib/logoStudio/db';
import { LOGO_STYLES, LOGO_SYMBOLS, LOGO_EVENTS } from '@/lib/logoStudio/types';
import { getLogoFont } from '@/lib/logoStudio/fonts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Customer approves a logo version + its mockup. Creates an IMMUTABLE snapshot
 * (logoApprovals/{id}) that the cart line and the order reference. Later edits
 * to the project create new versions and never touch an existing approval.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const proj = await getOwnedProject(id, user.uid);
    const body = await readJson(req);
    const version = await getVersion(id, String(body.versionId ?? ''));
    const mockupId = String(body.mockupId ?? '');
    if (!/^[a-f0-9]{16}$/.test(mockupId)) throw new HttpError(400, 'mockup_required', 'נא ליצור הדמיה לגרסה שנבחרה לפני האישור.');
    const mSnap = await getAdminDb().collection(COL.projects).doc(id).collection('mockups').doc(mockupId).get();
    if (!mSnap.exists) throw new HttpError(404, 'mockup_not_found');
    const mockup = mSnap.data() as MockupDoc;
    if (mockup.versionId !== version.id) throw new HttpError(409, 'mockup_outdated', 'ההדמיה שייכת לגרסה אחרת של הלוגו. צרו הדמיה לגרסה שנבחרה.');
    if (mockup.selectionKey !== selectionKey(proj.productId, proj.selectedVariants)) throw new HttpError(409, 'mockup_other_product', 'ההדמיה נוצרה על כיפה או צבע אחרים. צרו הדמיה מחדש.');

    const { product, sel } = await resolveForProject(proj.productId, proj.selectedVariants);
    const settings = await getSettings();
    const production = computeProduction(version, mockup.placement, sel, settings.minDpi);
    const s = version.spec;

    const approvalId = crypto.randomBytes(10).toString('hex');
    const now = Date.now();
    const snapshot = {
      uid: user.uid,
      email: user.email,
      projectId: id,
      versionId: version.id,
      versionNumber: version.n,
      mockupId,
      createdAt: now,
      product: {
        id: product.id, name: product.name ?? '', selectedVariants: proj.selectedVariants,
        material: sel.material, color: sel.color, materialKind: sel.materialKind, imageUrl: mockup.imageUrl,
      },
      spec: s,
      details: {
        font: getLogoFont(s.fontId).label,
        style: LOGO_STYLES.find(x => x.id === s.style)?.label ?? s.style,
        symbol: LOGO_SYMBOLS.find(x => x.id === s.symbol)?.label ?? s.symbol,
        event: LOGO_EVENTS.find(x => x.id === s.eventType)?.label ?? s.eventType,
        aiLayers: Object.keys(version.ai ?? {}),
        warnings: version.warnings,
      },
      logo: version.logo,
      mockup: { asset: mockup.asset, kind: mockup.kind, placement: mockup.placement, finish: mockup.finish, box: mockup.box },
      production,
    };
    const ref = getAdminDb().collection(COL.approvals).doc(approvalId);
    await getAdminDb().runTransaction(async tx => {
      tx.create(ref, snapshot);
      tx.update(getAdminDb().collection(COL.projects).doc(id), {
        approval: { approvalId, versionId: version.id, mockupId, at: now }, updatedAt: now,
      });
    });

    return NextResponse.json({
      approvalId,
      productId: product.id,
      productName: product.name ?? '',
      productImageUrl: mockup.imageUrl,
      materialKind: sel.materialKind,
      selectedVariants: proj.selectedVariants,
      spec: s,
      font: snapshot.details.font,
      logoUrl: signedUrl(version.logo),
      logoThumbUrl: signedUrl(version.logo, { width: 600 }),
      mockupUrl: signedUrl(mockup.asset),
      mockupThumbUrl: signedUrl(mockup.asset, { width: 600 }),
      finish: mockup.finish,
      placement: mockup.placement,
      production,
    });
  } catch (e) {
    return errorResponse(e, 'approve');
  }
}
