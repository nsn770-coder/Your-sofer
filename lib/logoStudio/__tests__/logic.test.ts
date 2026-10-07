import { describe, it, expect } from 'vitest';
import { applyChanges, localInterpret } from '../interpret.server';
import { DEFAULT_SPEC, decorationKey, monogramKey, needsAiDecoration, type LogoSpec } from '../types';
import { resolveSelection, clampPlacement, DEFAULT_PRINT_AREA, type RawProduct } from '../catalog';
import { productionInfo } from '../production';
import { isAllowedImageUrl } from '../fetchImage.server';

const base: LogoSpec = { ...DEFAULT_SPEC, primaryText: 'יוסף חיים', secondaryText: 'בר מצווה', style: 'ornament', color: '#1E5AA8' };

describe('chat revisions keep everything else', () => {
  it('"a bit darker" changes only the colour', () => {
    const { spec } = applyChanges(base, { colorLightnessDelta: -0.1 }, 'תעשה את הצבע מעט כהה יותר');
    expect(spec.color).not.toBe(base.color);
    expect({ ...spec, color: base.color }).toEqual(base);
  });

  it('a name change is accepted only when the new text is in the message', () => {
    const ok = applyChanges(base, { primaryText: 'יעקב' }, 'תשאיר הכול ורק תשנה את השם ליעקב');
    expect(ok.rejected).toEqual([]);
    expect(ok.spec.primaryText).toBe('יעקב');
    expect(ok.spec.secondaryText).toBe(base.secondaryText);
    const invented = applyChanges(base, { primaryText: 'יעקב אבינו' }, 'תשנה את השם');
    expect(invented.rejected).toContain('primaryText');
  });

  it('remove ornament / star of David above / bigger letters', () => {
    expect(applyChanges(base, { showDecoration: false }, 'תוריד את העיטור').spec.showDecoration).toBe(false);
    const s = applyChanges(base, { symbol: 'star_of_david', symbolPosition: 'above' }, 'שים מגן דוד מעל האותיות').spec;
    expect([s.symbol, s.symbolPosition]).toEqual(['star_of_david', 'above']);
    expect(applyChanges(base, { textScaleFactor: 1.15 }, 'תגדיל את האותיות').spec.textScale).toBeCloseTo(1.15);
  });

  it('ignores values outside the whitelist', () => {
    const { spec } = applyChanges(base, { fontId: 'comic-sans', style: 'graffiti', symbol: 'skull', color: 'red' }, 'x');
    expect([spec.fontId, spec.style, spec.symbol, spec.color]).toEqual([base.fontId, base.style, base.symbol, base.color]);
  });

  it('offline rules understand the common requests', () => {
    expect(localInterpret('תעשה את הצבע מעט כהה יותר')).toMatchObject({ colorLightnessDelta: -0.1 });
    expect(localInterpret('תוריד את העיטור')).toMatchObject({ showDecoration: false });
    expect(localInterpret('שים מגן דוד מעל האותיות')).toMatchObject({ symbol: 'star_of_david', symbolPosition: 'above' });
    expect(localInterpret('תגדיל את האותיות')).toMatchObject({ textScaleFactor: 1.15 });
  });

  it('AI ornament is reused when only colour / text change (no new AI call)', () => {
    const next = { ...base, color: '#000000', primaryText: 'יעקב' };
    expect(decorationKey(next)).toBe(decorationKey(base));
    expect(decorationKey({ ...base, decorationInstruction: 'olive branch' })).not.toBe(decorationKey(base));
    expect(monogramKey({ ...base, style: 'monogram', monogramLetters: 'יח' })).not.toBe(monogramKey({ ...base, style: 'monogram', monogramLetters: 'יל' }));
    expect(needsAiDecoration({ ...base, style: 'minimal' })).toBeNull();
  });
});

describe('catalog selection', () => {
  const product: RawProduct = {
    id: 'k1', name: 'כיפה פשתן לבנה',
    imgUrl: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1/main.png',
    variantOptions: [{ name: 'צבע', values: ['לבן', 'תכלת'] }, { name: 'מידה', values: ['16', '18'] }],
    filterAttributes: { 'חומר': 'סאטן' },
    logoStudio: { variantImages: { 'צבע=תכלת': 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1/blue.png' } },
  };

  it('prefers structured data over the product name', () => {
    const s = resolveSelection(product, { 'צבע': 'תכלת' });
    expect(s.material).toEqual({ value: 'סאטן', source: 'catalog' }); // name says פשתן — catalog wins
    expect(s.color).toEqual({ value: 'תכלת', source: 'variant' });
    expect(s.materialKind).toBe('satin');
  });

  it('uses the mapped variant image', () => {
    const s = resolveSelection(product, { 'צבע': 'תכלת', 'מידה': '18' });
    expect(s.imageStatus).toBe('ok');
    expect(s.image?.url).toContain('blue.png');
  });

  it('never falls back silently to another image when the variant has none', () => {
    const s = resolveSelection(product, { 'צבע': 'לבן' });
    expect(s.imageStatus).toBe('missing_variant_image');
    expect(s.image).toBeNull();
  });

  it('asks to choose a visual variant first', () => {
    expect(resolveSelection(product, {}).imageStatus).toBe('choose_variant');
  });

  it('ignores invalid variant values', () => {
    expect(resolveSelection(product, { 'צבע': 'סגול' }).selectedVariants).toEqual({});
  });

  it('name heuristics are flagged as such', () => {
    const s = resolveSelection({ id: 'x', name: 'כיפת סאטן לבנה', imgUrl: 'https://res.cloudinary.com/dyxzq3ucy/a.png' });
    expect(s.material?.source).toBe('name');
    expect(s.imageStatus).toBe('ok');
  });

  it('placement is clamped to the print area', () => {
    const p = clampPlacement({ x: 2, y: -1, w: 5 }, DEFAULT_PRINT_AREA);
    expect(p.w).toBe(DEFAULT_PRINT_AREA.maxW);
    expect(p.x).toBeCloseTo(DEFAULT_PRINT_AREA.cx + DEFAULT_PRINT_AREA.maxShift);
    expect(p.y).toBeCloseTo(DEFAULT_PRINT_AREA.cy - DEFAULT_PRINT_AREA.maxShift);
  });
});

describe('production readiness', () => {
  it('is not ready without configured print size', () => {
    const p = productionInfo({ width: 3000, height: 2000, rasterScale: 1 }, { x: .5, y: .5, w: .34 }, DEFAULT_PRINT_AREA, null);
    expect(p.ready).toBe(false);
    expect(p.printWidthMm).toBeNull();
  });
  it('computes mm and effective DPI, counting raster layers', () => {
    const ok = productionInfo({ width: 3000, height: 1500, rasterScale: 1 }, { x: .5, y: .5, w: DEFAULT_PRINT_AREA.maxW }, DEFAULT_PRINT_AREA, 80);
    expect(ok.printWidthMm).toBe(80);
    expect(ok.printHeightMm).toBe(40);
    expect(ok.effectiveDpi).toBe(952);
    expect(ok.ready).toBe(true);
    const low = productionInfo({ width: 3000, height: 1500, rasterScale: 0.2 }, { x: .5, y: .5, w: DEFAULT_PRINT_AREA.maxW }, DEFAULT_PRINT_AREA, 80);
    expect(low.ready).toBe(false);
  });
});

describe('SSRF guard', () => {
  it('allows only our catalog hosts over https', () => {
    expect(isAllowedImageUrl('https://res.cloudinary.com/dyxzq3ucy/image/upload/a.png')).toBe(true);
    expect(isAllowedImageUrl('https://res.cloudinary.com/othercloud/image/upload/a.png')).toBe(false);
    expect(isAllowedImageUrl('http://res.cloudinary.com/dyxzq3ucy/a.png')).toBe(false);
    expect(isAllowedImageUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedImageUrl('https://evil.com/x.png')).toBe(false);
    expect(isAllowedImageUrl('https://user:pw@israel-judaica.com/x.png')).toBe(false);
    expect(isAllowedImageUrl('https://israel-judaica.com/x.png')).toBe(true);
  });
});
