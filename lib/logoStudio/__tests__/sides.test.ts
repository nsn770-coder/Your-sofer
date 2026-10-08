import { describe, it, expect } from 'vitest';
import { resolveSelection, DEFAULT_PRINT_AREA, type RawProduct } from '../catalog';
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

describe('event-kippot styles in the studio', () => {
  it('builds a structured virtual product from the style', () => {
    const p = styleProduct('satin-white', { bottomImage: 'https://res.cloudinary.com/dyxzq3ucy/s-b.png' })!;
    expect(p.id).toBe('style:satin-white');
    expect(p.filterAttributes).toEqual({ 'חומר': 'סאטן', 'צבע': 'סאטן' });
    const s = resolveSelection(p, {}, 'top');
    expect(s.material).toEqual({ value: 'סאטן', source: 'catalog' });
    expect(s.materialKind).toBe('satin');
    expect(s.image?.url).toContain('res.cloudinary.com/dyxzq3ucy');
    expect(resolveSelection(p, {}, 'bottom').image?.url).toContain('s-b.png');
    const linen = resolveSelection(styleProduct('lavan', undefined)!, {});
    expect(linen.materialKind).toBe('linen');
    expect(linen.color?.value).toBe('לבן ורדרד');
  });

  it('unknown styles are rejected; ids are validated', () => {
    expect(styleProduct('nope', undefined)).toBeNull();
    expect(PRODUCT_ID_RE.test('style:lavan')).toBe(true);
    expect(PRODUCT_ID_RE.test('style:../x')).toBe(false);
    expect(PRODUCT_ID_RE.test('GA6IaHppba8peGVGHGud')).toBe(true);
  });
});
