import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { parseImageUrl, parsePrintArea, parseMm, parseFinishes } from '@/lib/logoStudio/adminValidate.server';
import { loadStudioKippot } from '@/lib/logoStudio/studioKippot.server';
import { STUDIO_KIPPOT_COLLECTION, STUDIO_KIPPAH_ID_RE, normalizeStudioKippah, type StudioKippahStudioConfig } from '@/app/lib/studioKippot';
import { materialKindOf } from '@/lib/logoStudio/catalog';
import { isEmbroideredKipaName } from '@/app/lib/kippot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── /api/admin/studio-kippot — ניהול כיפות הסטודיו (אדמין בלבד) ─────────────
// GET   → כל הכיפות (כולל מוסתרות) + האם האוסף כבר מוגר
// POST  → הוספת כיפה חדשה
// PATCH → עדכון / הסתרה של כיפה קיימת ({ id, ...שדות })
// אין מחיקה: כיפה שהוזמנה בעבר חייבת להישאר — מסתירים אותה (active=false).

const col = () => getAdminDb().collection(STUDIO_KIPPOT_COLLECTION);
const PRODUCT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const migrated = !(await col().limit(1).get()).empty;
    const kippot = await loadStudioKippot({ includeInactive: true });
    return NextResponse.json({ kippot, migrated });
  } catch (e) {
    return errorResponse(e, 'admin:studio-kippot:get');
  }
}

/** Validates the editable fields present in the body → Firestore update object. */
async function parseFields(b: Record<string, unknown>, isCreate: boolean): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const has = (k: string) => b[k] !== undefined;

  if (isCreate || has('label')) {
    const label = typeof b.label === 'string' ? b.label.trim().replace(/\s+/g, ' ') : '';
    if (!label || label.length > 60) throw new HttpError(400, 'invalid_label', 'יש להזין שם לכיפה (עד 60 תווים).');
    out.label = label;
  }

  let productName: string | null = null;
  if (has('productId')) {
    const pid = b.productId === null || b.productId === '' ? null : typeof b.productId === 'string' && PRODUCT_ID_RE.test(b.productId) ? b.productId : undefined;
    if (pid === undefined) throw new HttpError(400, 'invalid_product', 'מזהה המוצר אינו תקין.');
    if (pid) {
      const p = await getAdminDb().collection('products').doc(pid).get();
      if (!p.exists) throw new HttpError(404, 'product_not_found', 'המוצר לשיוך לא נמצא.');
      const d = p.data() ?? {};
      productName = typeof d.name === 'string' ? d.name : null;
      out.productId = pid;
      out.sku = typeof d.sku === 'string' ? d.sku : null;
      out.productName = productName;
    } else {
      out.productId = null; out.sku = null; out.productName = null;
    }
  }

  if (has('material')) {
    if (b.material !== 'linen' && b.material !== 'satin') throw new HttpError(400, 'invalid_material', 'סוג הבד אינו תקין.');
    out.material = b.material;
  } else if (isCreate) {
    out.material = materialKindOf(productName) === 'satin' ? 'satin' : 'linen';
  }

  // כיפה עם רקמה → +₪5 לכיפה בכל המדרגות. ביצירה בלי סימון — לפי "רקמה"/"רקמת" בשם המוצר המשויך
  if (has('embroidered')) {
    if (typeof b.embroidered !== 'boolean') throw new HttpError(400, 'invalid_embroidered');
    out.embroidered = b.embroidered;
  } else if (isCreate) {
    out.embroidered = isEmbroideredKipaName(productName);
  }

  if (isCreate || has('listImage')) {
    const v = parseImageUrl(b.listImage, 'תמונת המוצר');
    if (!v) throw new HttpError(400, 'missing_list_image', 'יש להעלות תמונת מוצר לרשימת הבחירה.');
    out.listImage = v;
  }
  if (isCreate || has('topDesignImage')) out.topDesignImage = parseImageUrl(b.topDesignImage, 'תמונת העיצוב לצד העליון');
  if (isCreate || has('bottomDesignImage')) out.bottomDesignImage = parseImageUrl(b.bottomDesignImage, 'תמונת העיצוב לצד התחתון');

  if (isCreate || has('sides')) {
    const s = (b.sides && typeof b.sides === 'object' ? b.sides : {}) as Record<string, unknown>;
    const sides = { top: s.top === true, bottom: s.bottom === true };
    if (!sides.top && !sides.bottom) throw new HttpError(400, 'invalid_sides', 'יש לבחור לפחות צד הדפסה אחד.');
    out.sides = sides;
  }
  if (isCreate || has('active')) out.active = b.active !== false;
  if (has('sortOrder')) {
    const n = Number(b.sortOrder);
    if (!Number.isFinite(n) || n < 0 || n > 100000) throw new HttpError(400, 'invalid_sort', 'סדר התצוגה אינו תקין.');
    out.sortOrder = Math.round(n);
  }

  if (has('studio')) {
    const raw = (b.studio && typeof b.studio === 'object' ? b.studio : {}) as Record<string, unknown>;
    const st: StudioKippahStudioConfig = {};
    if (raw.printArea) st.printArea = parsePrintArea(raw.printArea, 'אזור ההדפסה העליון');
    if (raw.bottomPrintArea) st.bottomPrintArea = parsePrintArea(raw.bottomPrintArea, 'אזור ההדפסה התחתון');
    if (raw.maxPrintWidthMm !== undefined) st.maxPrintWidthMm = parseMm(raw.maxPrintWidthMm);
    if (raw.bottomMaxPrintWidthMm !== undefined) st.bottomMaxPrintWidthMm = parseMm(raw.bottomMaxPrintWidthMm);
    if (raw.finishes !== undefined) st.finishes = parseFinishes(raw.finishes);
    out.studio = st;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = await readJson(req);
    const fields = await parseFields(b, true);
    if (fields.studio === undefined) fields.studio = {};

    // מזהה קבוע (מופיע ב-URL ובהזמנות) — נוצר אוטומטית
    let id = '';
    for (let i = 0; i < 5 && !id; i++) {
      const cand = `k-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      if (STUDIO_KIPPAH_ID_RE.test(cand) && !(await col().doc(cand).get()).exists) id = cand;
    }
    if (!id) throw new HttpError(500, 'id_failed');

    if (fields.sortOrder === undefined) {
      const all = await col().get();
      const max = all.docs.reduce((m, d) => {
        const so = d.data().sortOrder;
        return typeof so === 'number' && Number.isFinite(so) ? Math.max(m, so) : m;
      }, 0);
      fields.sortOrder = max + 10;
    }
    const now = Date.now();
    await col().doc(id).create({ ...fields, createdAt: now, updatedAt: now });
    const snap = await col().doc(id).get();
    return NextResponse.json({ ok: true, kippah: normalizeStudioKippah(id, snap.data()) });
  } catch (e) {
    return errorResponse(e, 'admin:studio-kippot:post');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = await readJson(req);
    const id = typeof b.id === 'string' && STUDIO_KIPPAH_ID_RE.test(b.id) ? b.id : null;
    if (!id) throw new HttpError(400, 'invalid_id');
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'not_found', 'הכיפה לא נמצאה. אם זו כיפה ותיקה — יש להריץ קודם את המיגרציה.');
    const fields = await parseFields(b, false);
    if (fields.studio) fields.studio = { ...normalizeStudioKippah(id, snap.data()).studio, ...(fields.studio as object) };
    await ref.update({ ...fields, updatedAt: Date.now() });
    const after = await ref.get();
    return NextResponse.json({ ok: true, kippah: normalizeStudioKippah(id, after.data()) });
  } catch (e) {
    return errorResponse(e, 'admin:studio-kippot:patch');
  }
}
