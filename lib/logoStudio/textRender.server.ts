// Exact text rendering: text → vector outlines from the chosen font file.
//
// Why not ask the image model to "write the name in font X"? Image models
// cannot reproduce a specific font and regularly misspell Hebrew. Here every
// letter is taken from the actual font file (opentype.js), so spelling and
// typeface are guaranteed. The result is pure SVG path data — rasterising it
// needs no system fonts (works on Vercel).

import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import { getLogoFont, type LogoFontId } from './fonts';
import { toVisualRuns } from './bidi';

const fontCache = new Map<string, opentype.Font>();

export function fontDir(): string {
  return path.join(process.cwd(), 'public', 'fonts', 'logo-studio');
}

export function loadFont(id: LogoFontId | string): opentype.Font {
  const def = getLogoFont(id);
  const cached = fontCache.get(def.id);
  if (cached) return cached;
  const buf = fs.readFileSync(path.join(fontDir(), def.file));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  fontCache.set(def.id, font);
  return font;
}

/** Characters some fonts lack → typographically equivalent fallbacks. */
const FALLBACKS: Record<string, string> = { '״': '"', '׳': "'", '–': '-', '—': '-' };

export class MissingGlyphError extends Error {
  constructor(public readonly chars: string[], public readonly fontLabel: string) {
    super(`missing_glyphs:${chars.join('')}`);
    this.name = 'MissingGlyphError';
  }
}

export interface TextOutline {
  /** SVG path data, origin: left edge at x=0, baseline at y=0 (y grows down). */
  d: string;
  /** Advance-based layout box. */
  width: number;
  ascent: number;   // positive distance above baseline (font ascender at this size)
  descent: number;  // positive distance below baseline
  /** Tight ink box. */
  ink: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * Lay out one line of text in visual order and return its outline.
 * @param letterSpacingEm extra spacing between glyphs, in em.
 */
export function outlineText(text: string, fontId: LogoFontId, size: number, letterSpacingEm = 0): TextOutline {
  const font = loadFont(fontId);
  const scale = size / font.unitsPerEm;
  const runs = toVisualRuns(text);
  const missing: string[] = [];
  const combined = new opentype.Path();
  let x = 0;
  const spacing = letterSpacingEm * size;

  for (const run of runs) {
    let prev: opentype.Glyph | null = null;
    for (let ch of Array.from(run.text)) {
      if (font.charToGlyphIndex(ch) === 0 && ch.trim() !== '') {
        if (FALLBACKS[ch] && font.charToGlyphIndex(FALLBACKS[ch]) !== 0) ch = FALLBACKS[ch];
        else { missing.push(ch); continue; }
      }
      const glyph = font.charToGlyph(ch);
      // Kerning only for LTR runs: pairs are defined in logical order and our
      // RTL runs are already reversed. Hebrew fonts here carry no kerning anyway.
      if (prev && run.dir === 'L') x += font.getKerningValue(prev, glyph) * scale;
      const gp = glyph.getPath(x, 0, size);
      combined.extend(gp);
      x += (glyph.advanceWidth ?? 0) * scale + spacing;
      prev = glyph;
    }
  }
  if (missing.length) throw new MissingGlyphError([...new Set(missing)], getLogoFont(fontId).label);
  if (spacing) x -= spacing; // no trailing spacing

  const bb = combined.getBoundingBox();
  const empty = !Number.isFinite(bb.x1) || (bb.x1 === 0 && bb.x2 === 0 && bb.y1 === 0 && bb.y2 === 0);
  return {
    d: combined.toPathData(2),
    width: x,
    ascent: (font.ascender ?? font.unitsPerEm * 0.8) * scale,
    descent: Math.abs(font.descender ?? -font.unitsPerEm * 0.2) * scale,
    ink: empty ? { x1: 0, y1: 0, x2: x, y2: 0 } : { x1: bb.x1, y1: bb.y1, x2: bb.x2, y2: bb.y2 },
  };
}

/** Which characters of `text` the font cannot render (after fallbacks). */
export function unsupportedChars(text: string, fontId: LogoFontId): string[] {
  const font = loadFont(fontId);
  const out = new Set<string>();
  for (const ch of Array.from(text)) {
    if (ch.trim() === '') continue;
    if (font.charToGlyphIndex(ch) !== 0) continue;
    if (FALLBACKS[ch] && font.charToGlyphIndex(FALLBACKS[ch]) !== 0) continue;
    out.add(ch);
  }
  return [...out];
}
