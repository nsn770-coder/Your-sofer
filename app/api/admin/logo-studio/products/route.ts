import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { isAllowedImageUrl } from '@/lib/logoStudio/fetchImage.server';
import type { RawProduct, LogoStudioProductConfig } from '@/lib/logoStudio/catalog';
import { listStyleProducts, isStyleId, STYLE_PREFIX, styleInventoryProductId } from '@/lib/logoStudio/projects.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Studio kippot with their variant options, images and studio config. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const col = getAdminDb().collection('products');
    const [a, b] = await Promise.all([col.where('customDesign', '==', true).limit(100).get(), col.where('isEventKippot', '==', true).limit(100).get()]);
    const seen = new Set<string>();
    const styles = await Promise.all((await listStyleProducts()).map(async p => ({
      id: p.id, name: p.name ?? '', imgUrl: p.imgUrl ?? null, images: [p.imgUrl].filter((x): x is string => !!x),
      variantOptions: [], filterAttributes: p.filterAttributes ?? {}, hidden: false, logoStudio: p.logoStudio ?? {},
      isStyle: true, inventoryProductId: await styleInventoryProductId(p.id.slice(STYLE_PREFIX.length)),
    })));
    const products = [...a.docs, ...b.docs].filter(d => !seen.has(d.id) && seen.add(d.id)).map(d => {
      const p = d.data() as RawProduct;
      return {
        id: d.id, name: p.name ?? '', imgUrl: p.imgUrl || p.image_url || null,
        images: [p.imgUrl, p.image_url, p.imgUrl2, p.imgUrl3].filter((x): x is string => !!x),
        variantOptions: p.variantOptions ?? [], filterAttributes: p.filterAttributes ?? {},
        hidden: p.hidden === true, logoStudio: p.logoStudio ?? {},
      };
    });
    return NextResponse.json({ products: [...styles, ...products] });
  } catch (e) {
    return errorResponse(e, 'admin:products:get');
  }
}

/** Update ONLY the `logoStudio` field of a product (variant images, print area, mm, finishes). */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const b = await readJson(req);
    const productId = typeof b.productId === 'string' && /^(?:[A-Za-z0-9_-]{1,128}|style:[a-z0-9-]{1,40})$/.test(b.productId) ? b.productId : null;
    if (!productId) throw new HttpError(400, 'invalid_product');
    const raw = (b.logoStudio && typeof b.logoStudio === 'object' ? b.logoStudio : {}) as Record<string, unknown>;
    const cfg: LogoStudioProductConfig = {};

    const imageMap = (val: unknown) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries((val && typeof val === 'object' ? val : {}) as Record<string, unknown>)) {
        if (typeof v !== 'string' || !v) continue;
        if (!isAllowedImageUrl(v)) throw new HttpError(400, 'image_host_not_allowed', `כתובת תמונה לא מאושרת: ${v.slice(0, 80)}`);
        if (k.length <= 200) out[k] = v;
      }
      return out;
    };
    const area = (val: unknown, label: string) => {
      const pa = val as Record<string, unknown>;
      const n = (k: string) => Number(pa[k]);
      const a = { cx: n('cx'), cy: n('cy'), minW: n('minW'), maxW: n('maxW'), defaultW: n('defaultW'), maxShift: n('maxShift') };
      if (!Object.values(a).every(v => Number.isFinite(v) && v >= 0 && v <= 1) || a.minW >= a.maxW || a.defaultW < a.minW || a.defaultW > a.maxW) {
        throw new HttpError(400, 'invalid_print_area', `${label} אינו תקין.`);
      }
      return a;
    };
    const mm = (val: unknown) => {
      const v = val === null || val === '' ? null : Number(val);
      if (v !== null && !(v > 5 && v < 500)) throw new HttpError(400, 'invalid_width', 'רוחב ההדפסה במ״מ אינו תקין.');
      return v;
    };
    if (raw.variantImages !== undefined) cfg.variantImages = imageMap(raw.variantImages);
    if (raw.bottomVariantImages !== undefined) cfg.bottomVariantImages = imageMap(raw.bottomVariantImages);
    if (raw.bottomImage !== undefined) {
      const v = typeof raw.bottomImage === 'string' && raw.bottomImage ? raw.bottomImage : null;
      if (v && !isAllowedImageUrl(v)) throw new HttpError(400, 'image_host_not_allowed', 'כתובת תמונת הצד התחתון לא מאושרת.');
      cfg.bottomImage = v;
    }
    if (raw.printArea && typeof raw.printArea === 'object') cfg.printArea = area(raw.printArea, 'אזור ההדפסה העליון');
    if (raw.bottomPrintArea && typeof raw.bottomPrintArea === 'object') cfg.bottomPrintArea = area(raw.bottomPrintArea, 'אזור ההדפסה התחתון');
    if (raw.maxPrintWidthMm !== undefined) cfg.maxPrintWidthMm = mm(raw.maxPrintWidthMm);
    if (raw.bottomMaxPrintWidthMm !== undefined) cfg.bottomMaxPrintWidthMm = mm(raw.bottomMaxPrintWidthMm);
    if (Array.isArray(raw.finishes)) {
      const f = raw.finishes.filter((x): x is 'print' | 'embroidery' => x === 'print' || x === 'embroidery');
      cfg.finishes = f.length ? f : ['print'];
    }
    if (typeof raw.disabled === 'boolean') cfg.disabled = raw.disabled;

    if (isStyleId(productId)) {
      // event-kippot style → stored in settings/logoStudioStyles (not a product document)
      const styleId = productId.slice(STYLE_PREFIX.length);
      const ref = getAdminDb().doc(COL.styleConfigDoc);
      const merged = await getAdminDb().runTransaction(async tx => {
        const snap = await tx.get(ref);
        const prev = ((snap.exists ? snap.data() ?? {} : {})[styleId] ?? {}) as LogoStudioProductConfig;
        const next = { ...prev, ...cfg };
        tx.set(ref, { [styleId]: next }, { merge: true });
        return next;
      });
      return NextResponse.json({ ok: true, logoStudio: merged });
    }
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
