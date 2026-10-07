import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { composeLogo, keyLineArt, KeyingError } from '../compose.server';
import { outlineText, unsupportedChars } from '../textRender.server';
import { toVisualString } from '../bidi';
import { DEFAULT_SPEC, validateSpec, effectiveMonogramLetters, type LogoSpec } from '../types';
import { composeMockup, logoRegionDifference } from '../mockup.server';
import { adjustLightness } from '../color';

const spec = (p: Partial<LogoSpec>): LogoSpec => ({ ...DEFAULT_SPEC, ...p }) as LogoSpec;

async function alphaStats(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
  const corners = [a(0, 0), a(info.width - 1, 0), a(0, info.height - 1), a(info.width - 1, info.height - 1)];
  let opaque = 0, colorHits = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 250) { opaque++; if (data[i] === 0x1f && data[i + 1] === 0x2a && data[i + 2] === 0x44) colorHits++; }
  }
  return { corners, opaque, colorHits, ...info };
}

describe('bidi', () => {
  it('orders Hebrew, mixed text and dates correctly', () => {
    expect(toVisualString('שלום')).toBe('םולש');
    expect(toVisualString('David Cohen')).toBe('David Cohen');
    expect(toVisualString('בר מצווה 12.03.2027')).toBe('12.03.2027 הווצמ רב');
    expect(toVisualString('יוסף & Rachel')).toBe('Rachel & ףסוי');
    expect(toVisualString('כ״ג אדר (תשפ״ז)')).toBe('(ז״פשת) רדא ג״כ');
  });
});

describe('exact text rendering', () => {
  it('renders Hebrew and English logos as PNG with a real transparent background in the exact colour', async () => {
    for (const p of [
      { primaryText: 'יוסף חיים', secondaryText: 'בר מצווה', date: 'כ״ג אדר תשפ״ז', symbol: 'star_of_david' as const },
      { primaryText: 'David & Sarah', secondaryText: 'Wedding', date: '12.03.2027', fontId: 'bellefair' as const, style: 'elegant' as const },
    ]) {
      const r = await composeLogo({ spec: spec({ ...p, color: '#1F2A44' }), outputLongSide: 1000 });
      const st = await alphaStats(r.png);
      expect(st.channels).toBe(4);
      expect(st.corners).toEqual([0, 0, 0, 0]);       // transparent, no checkerboard drawn
      expect(st.opaque).toBeGreaterThan(1000);
      expect(st.colorHits / st.opaque).toBeGreaterThan(0.95); // exact chosen colour
      expect(r.rasterScale).toBe(1);                   // pure vector → full resolution
    }
  });

  it('the chosen font changes the actual output', async () => {
    const a = await composeLogo({ spec: spec({ primaryText: 'משה כהן', fontId: 'david', style: 'minimal' }), outputLongSide: 800 });
    const b = await composeLogo({ spec: spec({ primaryText: 'משה כהן', fontId: 'amatic', style: 'minimal' }), outputLongSide: 800 });
    expect(a.png.equals(b.png)).toBe(false);
    expect(a.width / a.height).not.toBeCloseTo(b.width / b.height, 2);
  });

  it('every letter comes from the font (glyph outlines, nothing invented)', () => {
    const one = outlineText('דוד', 'david', 100);
    const two = outlineText('דודה', 'david', 100);
    expect(two.width).toBeGreaterThan(one.width);
    expect(one.d.length).toBeGreaterThan(50);
    expect(unsupportedChars('יוסף Joseph 2027', 'david')).toEqual([]);
  });

  it('rejects characters outside the supported set and strips niqqud', () => {
    const v = validateSpec({ primaryText: 'שָׁלוֹם' });
    expect(v.spec.primaryText).toBe('שלום');
    const bad = validateSpec({ primaryText: 'مرحبا' });
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it('monogram letters derive from the names when not given', () => {
    expect(effectiveMonogramLetters({ primaryText: 'יוסף חיים', monogramLetters: '' })).toBe('יח');
    expect(effectiveMonogramLetters({ primaryText: 'David & Sarah', monogramLetters: '' })).toBe('DS');
  });

  it('font monogram fallback renders without AI', async () => {
    const r = await composeLogo({ spec: spec({ style: 'monogram', monogramMode: 'font', primaryText: 'יעקב לוי', monogramLetters: 'יל' }), outputLongSide: 600 });
    expect(r.layers).toContain('monogram:font');
  });
});

describe('AI line-art keying', () => {
  it('turns black-on-white art into a transparent layer in the chosen colour', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#fff"/><circle cx="200" cy="200" r="150" stroke="#000" stroke-width="20" fill="none"/></svg>`;
    const art = await sharp(Buffer.from(svg)).png().toBuffer();
    const layer = await keyLineArt(art, '#B08D2E', { requireEmptyCentre: true });
    const { data, info } = await sharp(layer.png).raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    expect(data[3]).toBe(0); // corner transparent
    let ink = 0, gold = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 200) { ink++; if (data[i] === 0xb0 && data[i + 1] === 0x8d && data[i + 2] === 0x2e) gold++; }
    expect(ink).toBeGreaterThan(100);
    expect(gold).toBe(ink);
  });

  it('rejects art on a non-white background (e.g. a drawn checkerboard)', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#999"/><rect x="10" y="10" width="10" height="10" fill="#999"/></pattern></defs><rect width="200" height="200" fill="url(#c)"/></svg>`;
    const art = await sharp(Buffer.from(svg)).png().toBuffer();
    await expect(keyLineArt(art, '#000000')).rejects.toBeInstanceOf(KeyingError);
  });

  it('rejects a frame whose centre is not empty', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><rect x="60" y="60" width="80" height="80" fill="#000"/></svg>`;
    const art = await sharp(Buffer.from(svg)).png().toBuffer();
    await expect(keyLineArt(art, '#000000', { requireEmptyCentre: true })).rejects.toMatchObject({ reason: 'centre_not_empty' });
  });
});

describe('mockup', () => {
  it('places the exact logo on the product photo and keeps the photo size', async () => {
    const product = await sharp({ create: { width: 900, height: 700, channels: 3, background: '#e8e2d6' } }).jpeg().toBuffer();
    const logo = (await composeLogo({ spec: spec({ primaryText: 'יוסף', color: '#1F2A44' }), outputLongSide: 800 })).png;
    const m = await composeMockup(product, logo, { x: 0.5, y: 0.5, w: 0.34 }, 'print');
    const meta = await sharp(m.jpg).metadata();
    expect(meta.width! / meta.height!).toBeCloseTo(900 / 700, 2);
    expect(m.box.w).toBeCloseTo(0.34, 2);
    // the logo region is different from the plain photo, the corner is untouched
    const plain = await sharp(product).resize(meta.width!, meta.height!).jpeg().toBuffer();
    expect(await logoRegionDifference(plain, m.jpg, m.box)).toBeGreaterThan(0.05);
    const emb = await composeMockup(product, logo, { x: 0.5, y: 0.5, w: 0.34 }, 'embroidery');
    expect(emb.jpg.equals(m.jpg)).toBe(false);
  });
});

describe('colour', () => {
  it('darker / lighter adjust lightness only', () => {
    expect(adjustLightness('#808080', -0.1)).toBe('#676767');
    expect(adjustLightness('#808080', 0.1)).toBe('#9A9A9A');
    expect(adjustLightness('#1E5AA8', -0.1)).not.toBe('#1E5AA8');
  });
});
