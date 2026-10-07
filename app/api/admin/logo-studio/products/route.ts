import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { isAllowedImageUrl } from '@/lib/logoStudio/fetchImage.server';
import type { RawProduct, LogoStudioProductConfig } from '@/lib/logoStudio/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Studio kippot with their variant options, images and studio config. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const col = getAdminDb().collection('products');
    const [a, b] = await Promise.all([col.where('customDesign', '==', true).limit(100).get(), col.where('isEventKippot', '==', true).limit(100).get()]);
    const seen = new Set<string>();
    const products = [...a.docs, ...b.docs].filter(d => !seen.has(d.id) && seen.add(d.id)).map(d => {
      const p = d.data() as RawProduct;
      return {
        id: d.id, name: p.name ?? '', imgUrl: p.imgUrl || p.image_url || null,
        images: [p.imgUrl, p.image_url, p.imgUrl2, p.imgUrl3].filter((x): x is string => !!x),
        variantOptions: p.variantOptions ?? [], filterAttributes: p.filterAttributes ?? {},
        hidden: p.hidden === true, logoStudio: p.logoStudio ?? {},
      };
    });
    return NextResponse.json({ products });
  } catch (e) {
    return errorResponse(e, 'admin:products:get');
  }
}

/** Update ONLY the `logoStudio` field of a product (variant images, print area, mm, finishes). */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = await readJson(req);
    const productId = typeof b.productId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(b.productId) ? b.productId : null;
    if (!productId) throw new HttpError(400, 'invalid_product');
    const raw = (b.logoStudio && typeof b.logoStudio === 'object' ? b.logoStudio : {}) as Record<string, unknown>;
    const cfg: LogoStudioProductConfig = {};

    if (raw.variantImages && typeof raw.variantImages === 'object') {
      const vi: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw.variantImages as Record<string, unknown>)) {
        if (typeof v !== 'string' || !v) continue;
        if (!isAllowedImageUrl(v)) throw new HttpError(400, 'image_host_not_allowed', `כתובת תמונה לא מאושרת: ${v.slice(0, 80)}`);
        if (k.length <= 200) vi[k] = v;
      }
      cfg.variantImages = vi;
    }
    if (raw.printArea && typeof raw.printArea === 'object') {
      const pa = raw.printArea as Record<string, unknown>;
      const n = (k: string) => Number(pa[k]);
      const area = { cx: n('cx'), cy: n('cy'), minW: n('minW'), maxW: n('maxW'), defaultW: n('defaultW'), maxShift: n('maxShift') };
      if (!Object.values(area).every(v => Number.isFinite(v) && v >= 0 && v <= 1) || area.minW >= area.maxW || area.defaultW < area.minW || area.defaultW > area.maxW) {
        throw new HttpError(400, 'invalid_print_area', 'אזור ההדפסה אינו תקין.');
      }
      cfg.printArea = area;
    }
    if (raw.maxPrintWidthMm !== undefined) {
      const v = raw.maxPrintWidthMm === null || raw.maxPrintWidthMm === '' ? null : Number(raw.maxPrintWidthMm);
      if (v !== null && !(v > 5 && v < 500)) throw new HttpError(400, 'invalid_width');
      cfg.maxPrintWidthMm = v;
    }
    if (Array.isArray(raw.finishes)) {
      const f = raw.finishes.filter((x): x is 'print' | 'embroidery' => x === 'print' || x === 'embroidery');
      cfg.finishes = f.length ? f : ['print'];
    }
    if (typeof raw.disabled === 'boolean') cfg.disabled = raw.disabled;

    const ref = getAdminDb().collection('products').doc(productId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'not_found');
    const prev = (snap.data()!.logoStudio ?? {}) as LogoStudioProductConfig;
    await ref.update({ logoStudio: { ...prev, ...cfg } });
    return NextResponse.json({ ok: true, logoStudio: { ...prev, ...cfg } });
  } catch (e) {
    return errorResponse(e, 'admin:products:patch');
  }
}
