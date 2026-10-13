import { describe, it, expect } from 'vitest';
import { resolveSelection, isStudioKippah, DEFAULT_PRINT_AREA, type RawProduct } from '../catalog';
import { normalizeStudioKippah, designImageFor, studioKippahUnitPrice, LEGACY_STUDIO_KIPPOT } from '@/app/lib/studioKippot';
import { EVENT_KIPPOT_STYLES } from '@/app/lib/eventKippotStyles';
import { styleProduct, selectionKey, PRODUCT_ID_RE } from '../projects.server';

const withVariants: RawProduct = {
  id: 'k2', name: 'כיפה פשתן',
  imgUrl: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1/main.png',
  variantOptions: [{ name: 'צבע', values: ['לבן', 'תכלת'] }],
  logoStudio: {
    variantImages: { 'צבע=לבן': 'https://res.cloudinary.com/dyxzq3ucy/top-white.png', 'צבע=תכלת': 'https://res.cloudinary.com/dyxzq3ucy/top-blue.png' },
    bottomVariantImages: { 'צבע=לבן': 'https://res.cloudinary.com/dyxzq3ucy/bottom-white.png' },
    bottomPrintArea: { cx: 0.5, cy: 0.55, minW: 0.1, maxW: 0.3, defaultW: 0.2, maxShift: 0.05 },
    maxPrintWidthMm: 70,
  },
};

describe('bottom side of the kippah', () => {
  it('uses the bottom photo of the selected variant, with its own print area', () => {
    const s = resolveSelection(withVariants, { 'צבע': 'לבן' }, 'bottom');
    expect(s.side).toBe('bottom');
    expect(s.image?.url).toContain('bottom-white');
    expect(s.printArea.maxW).toBe(0.3);
    expect(s.maxPrintWidthMm).toBe(70); // falls back to the top width when no bottom mm is set
    expect(s.sidesAvailable).toEqual({ top: true, bottom: true });
  });

  it('never borrows the top photo or another colour for the bottom', () => {
    const s = resolveSelection(withVariants, { 'צבע': 'תכלת' }, 'bottom');
    expect(s.imageStatus).toBe('no_bottom_image');
    expect(s.image).toBeNull();
    expect(s.sidesAvailable).toEqual({ top: true, bottom: false });
  });

  it('top side keeps working as before', () => {
    const s = resolveSelection(withVariants, { 'צבע': 'תכלת' });
    expect(s.side).toBe('top');
    expect(s.image?.url).toContain('top-blue');
    expect(s.printArea).toEqual(DEFAULT_PRINT_AREA);
  });

  it('single bottom photo for a product without colour variants', () => {
    const p: RawProduct = { id: 'k3', imgUrl: 'https://res.cloudinary.com/dyxzq3ucy/a.png', logoStudio: { bottomImage: 'https://res.cloudinary.com/dyxzq3ucy/b.png' } };
    expect(resolveSelection(p, {}, 'bottom').image?.url).toContain('/b.png');
    expect(resolveSelection({ ...p, logoStudio: {} }, {}, 'bottom').imageStatus).toBe('no_bottom_image');
  });

  it('mockups of one side are stale for the other side', () => {
    expect(selectionKey('k2', { 'צבע': 'לבן' })).toBe('k2|צבע=לבן'); // unchanged format for existing mockups
    expect(selectionKey('k2', { 'צבע': 'לבן' }, 'bottom')).not.toBe(selectionKey('k2', { 'צבע': 'לבן' }, 'top'));
  });
});

describe('studio kippot (Firestore studioKippot) in the studio', () => {
  const satin = normalizeStudioKippah('satin-white', {
    label: 'סאטן', material: 'satin',
    listImage: 'https://res.cloudinary.com/dyxzq3ucy/list.png',
    bottomDesignImage: 'https://res.cloudinary.com/dyxzq3ucy/s-b.png',
  });

  it('builds a structured virtual product from the kippah', () => {
    const p = styleProduct(satin);
    expect(p.id).toBe('style:satin-white');
    expect(p.filterAttributes).toEqual({ 'חומר': 'סאטן', 'צבע': 'סאטן' });
    const s = resolveSelection(p, {}, 'top');
    expect(s.material).toEqual({ value: 'סאטן', source: 'catalog' });
    expect(s.materialKind).toBe('satin');
    expect(resolveSelection(p, {}, 'bottom').image?.url).toContain('s-b.png');
    const linen = resolveSelection(styleProduct(LEGACY_STUDIO_KIPPOT.find(k => k.id === 'lavan')!), {});
    expect(linen.materialKind).toBe('linen');
    expect(linen.color?.value).toBe('לבן ורדרד');
  });

  it('studio canvas shows the TOP design photo, not the list photo', () => {
    const p = styleProduct({ ...satin, topDesignImage: 'https://res.cloudinary.com/dyxzq3ucy/top-design.png' });
    expect(resolveSelection(p, {}, 'top').image?.url).toContain('top-design.png');
    expect(p.imgUrl).toContain('list.png'); // the list keeps the product photo
  });

  it('falls back to the list photo when there is no top design photo yet', () => {
    expect(resolveSelection(styleProduct(satin), {}, 'top').image?.url).toContain('list.png');
    expect(designImageFor(satin, 'top')).toContain('list.png');
    expect(designImageFor({ ...satin, bottomDesignImage: null }, 'bottom')).toBeNull();
  });

  it('inactive kippot are not offered in the studio', () => {
    expect(isStudioKippah(styleProduct({ ...satin, active: false }))).toBe(false);
    expect(isStudioKippah(styleProduct(satin))).toBe(true);
  });

  it('normalizes missing fields safely', () => {
    const k = normalizeStudioKippah('x', {});
    expect(k).toMatchObject({ label: 'x', material: 'linen', active: true, sides: { top: true, bottom: true }, topDesignImage: null });
    expect(normalizeStudioKippah('y', { sides: { top: false, bottom: false } }).sides).toEqual({ top: true, bottom: false });
  });

  it('legacy list covers every kippah that was hard-coded', () => {
    expect(LEGACY_STUDIO_KIPPOT.map(k => k.id)).toEqual(EVENT_KIPPOT_STYLES.map(s => s.id));
    expect(LEGACY_STUDIO_KIPPOT.find(k => k.id === 'satin-white-18')?.material).toBe('satin');
  });

  it('ids are validated', () => {
    expect(PRODUCT_ID_RE.test('style:lavan')).toBe(true);
    expect(PRODUCT_ID_RE.test('style:k-mabc123')).toBe(true);
    expect(PRODUCT_ID_RE.test('style:../x')).toBe(false);
    expect(PRODUCT_ID_RE.test('GA6IaHppba8peGVGHGud')).toBe(true);
  });
});

describe('catalog products: top design photo', () => {
  it('uses logoStudio.topImage for the canvas, else the main photo', () => {
    const p: RawProduct = { id: 'k9', imgUrl: 'https://res.cloudinary.com/dyxzq3ucy/main.png', logoStudio: { topImage: 'https://res.cloudinary.com/dyxzq3ucy/t.png' } };
    expect(resolveSelection(p, {}, 'top').image?.url).toContain('/t.png');
    expect(resolveSelection({ ...p, logoStudio: {} }, {}, 'top').image?.url).toContain('main.png');
  });
});

describe('embroidered kippah (+₪5 per kippah at every tier)', () => {
  const linen = normalizeStudioKippah('r', { label: 'רקמה', material: 'linen', embroidered: true, listImage: 'https://res.cloudinary.com/dyxzq3ucy/r.png' });
  it('adds ₪5 to every linen / satin tier', () => {
    expect([30, 50, 100].map(q => studioKippahUnitPrice(linen, q))).toEqual([19, 17, 15]);
    expect([30, 50].map(q => studioKippahUnitPrice({ ...linen, material: 'satin' }, q))).toEqual([13, 11]);
    expect([30, 50, 100].map(q => studioKippahUnitPrice({ ...linen, embroidered: false }, q))).toEqual([14, 12, 10]);
  });
  it('the studio selection carries the embroidered flag', () => {
    expect(resolveSelection(styleProduct(linen), {}).embroidered).toBe(true);
    expect(resolveSelection(styleProduct({ ...linen, embroidered: false }), {}).embroidered).toBe(false);
    expect(normalizeStudioKippah('z', {}).embroidered).toBe(false);
  });
});

describe('logo embroidery on studio kippot', () => {
  const k = normalizeStudioKippah('e', { label: 'לבן', listImage: 'https://res.cloudinary.com/dyxzq3ucy/e.png' });
  it('offers embroidery when the kippah has a top side', () => {
    expect(resolveSelection(styleProduct(k), {}, 'top').finishes).toEqual(['print', 'embroidery']);
    expect(resolveSelection(styleProduct({ ...k, sides: { top: false, bottom: true } }), {}, 'top').finishes).toEqual(['print']);
  });
});
