// Logo composition: structured spec (+ optional AI graphic layers) → PNG with
// a real alpha channel.
//
// Layers:
//   • text lines  — exact outlines from the chosen font (textRender.server.ts)
//   • symbol      — drawn vector (symbols.ts)
//   • divider     — drawn vector for classic/elegant, or an AI graphic
//   • frame       — AI ornament around the text (style "ornament")
//   • monogram    — AI artistic monogram (style "monogram") or font monogram
// AI layers arrive already keyed to transparency and recoloured to spec.color
// (see keyLineArt), so the final colour is exact.

import sharp from 'sharp';
import type { LogoSpec } from './types';
import { effectiveMonogramLetters } from './types';
import { outlineText, type TextOutline } from './textRender.server';
import { getSymbolShape, getDividerShape } from './symbols';
import { hexToRgb } from './color';

export interface RasterLayer {
  png: Buffer;      // RGBA, transparent background, already in final colour
  width: number;
  height: number;
}

export interface ComposeInput {
  spec: LogoSpec;
  frame?: RasterLayer | null;
  divider?: RasterLayer | null;
  monogram?: RasterLayer | null;
  /** Long side of the output PNG in pixels. */
  outputLongSide?: number;
}

export interface ComposeResult {
  png: Buffer;
  width: number;
  height: number;
  /**
   * min(sourcePx / renderedPx) over raster layers; 1 when the logo is pure
   * vector. Used to compute the effective print DPI honestly.
   */
  rasterScale: number;
  layers: string[];
}

type Box = { x: number; y: number; w: number; h: number };

interface Placed {
  svg: (box: Box) => string;
  w: number;
  h: number;
  gapAfter: number;
  kind: string;
  raster?: RasterLayer;
}

const esc = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));

function textElement(o: TextOutline, color: string, kind: string, gapAfter: number): Placed {
  const w = Math.max(1, o.ink.x2 - o.ink.x1);
  const h = Math.max(1, o.ink.y2 - o.ink.y1);
  return {
    kind, w, h, gapAfter,
    svg: (b) => `<g transform="translate(${(b.x - o.ink.x1).toFixed(2)} ${(b.y - o.ink.y1).toFixed(2)})"><path d="${o.d}" fill="${color}"/></g>`,
  };
}

function vectorElement(d: string, aspect: number, boxW: number, boxH: number, targetH: number, color: string, kind: string, gapAfter: number): Placed {
  const h = targetH;
  const w = targetH * aspect;
  return {
    kind, w, h, gapAfter,
    svg: (b) => `<g transform="translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) scale(${(b.w / boxW).toFixed(5)} ${(b.h / boxH).toFixed(5)})"><path d="${d}" fill="${color}" fill-rule="evenodd"/></g>`,
  };
}

function rasterElement(r: RasterLayer, targetW: number, targetH: number, kind: string, gapAfter: number): Placed {
  const href = `data:image/png;base64,${r.png.toString('base64')}`;
  return {
    kind, w: targetW, h: targetH, gapAfter, raster: r,
    svg: (b) => `<image href="${href}" x="${b.x.toFixed(2)}" y="${b.y.toFixed(2)}" width="${b.w.toFixed(2)}" height="${b.h.toFixed(2)}" preserveAspectRatio="none"/>`,
  };
}

/** Font-based monogram: letters overlapped and centred — deterministic fallback. */
function fontMonogram(letters: string, spec: LogoSpec, size: number): Placed {
  const color = spec.color;
  const outlines = Array.from(letters).map(ch => outlineText(ch, spec.fontId, size, 0));
  // Hebrew letters are read right-to-left: first letter on the right.
  const rtl = /[א-ת]/.test(letters);
  const ordered = rtl ? [...outlines].reverse() : outlines;
  const overlap = 0.03; // fraction of each glyph width overlapping its neighbour
  let x = 0;
  const parts: { o: TextOutline; x: number; dy: number }[] = [];
  ordered.forEach((o, i) => {
    const w = o.ink.x2 - o.ink.x1;
    // letters sit tight side by side — legibility first for the deterministic fallback
    parts.push({ o, x, dy: 0 });
    x += w * (i === ordered.length - 1 ? 1 : 1 - overlap);
  });
  const totalW = x;
  const y1 = Math.min(...parts.map(p => p.o.ink.y1 + p.dy));
  const y2 = Math.max(...parts.map(p => p.o.ink.y2 + p.dy));
  const h = y2 - y1;
  return {
    kind: 'monogram-font', w: totalW, h, gapAfter: size * 0.18,
    svg: (b) => {
      const s = b.w / totalW;
      return `<g transform="translate(${b.x.toFixed(2)} ${b.y.toFixed(2)}) scale(${s.toFixed(5)})">` +
        parts.map(p => `<g transform="translate(${(p.x - p.o.ink.x1).toFixed(2)} ${(p.dy - y1).toFixed(2)})"><path d="${p.o.d}" fill="${color}"/></g>`).join('') +
        '</g>';
    },
  };
}

export async function composeLogo(input: ComposeInput): Promise<ComposeResult> {
  const { spec } = input;
  const color = spec.color;
  const longSide = input.outputLongSide ?? 3000;
  const base = 200 * spec.textScale;              // primary font size (layout units)
  const style = spec.style;
  const spacing = spec.letterSpacing + (style === 'elegant' ? 0.12 : style === 'minimal' ? 0.06 : 0);
  const secSize = base * (style === 'minimal' ? 0.34 : 0.42) * spec.secondaryScale;
  const dateSize = base * 0.32 * spec.secondaryScale;
  const MAX_TEXT_W = 2000;

  const items: Placed[] = [];
  const layers: string[] = [];

  // ── symbol above ──
  const symbol = getSymbolShape(spec.symbol);
  const symbolH = base * 0.75 * spec.symbolScale;
  const pushSymbol = () => {
    if (!symbol) return;
    items.push(vectorElement(symbol.d, 1, 100, 100, symbolH, color, 'symbol', base * 0.2));
    // rescale path box: shapes are drawn in a 100-high box whose width = 100*aspect for wide shapes
    layers.push(`symbol:${spec.symbol}`);
  };
  if (symbol && spec.symbolPosition === 'above') pushSymbol();

  // ── monogram ──
  if (style === 'monogram') {
    const letters = effectiveMonogramLetters(spec);
    const monoH = base * 2.1;
    if (input.monogram) {
      const aspect = input.monogram.width / input.monogram.height;
      items.push(rasterElement(input.monogram, monoH * aspect, monoH, 'monogram-ai', base * 0.25));
      layers.push('monogram:ai');
    } else {
      const fm = fontMonogram(letters, spec, base * 2.4);
      const k = monoH / fm.h;
      items.push({ ...fm, w: fm.w * k, h: monoH });
      layers.push('monogram:font');
    }
  }

  // ── primary text ──
  if (spec.primaryText) {
    const size = style === 'monogram' ? base * 0.45 : base;
    let o = outlineText(spec.primaryText, spec.fontId, size, spacing);
    const inkW = o.ink.x2 - o.ink.x1;
    if (inkW > MAX_TEXT_W) o = outlineText(spec.primaryText, spec.fontId, size * (MAX_TEXT_W / inkW), spacing);
    items.push(textElement(o, color, 'primary', base * 0.22));
    layers.push('text:primary');
  }

  // ── divider (drawn or AI) ──
  const hasLower = !!(spec.secondaryText || spec.date);
  const primaryW = items.find(i => i.kind === 'primary')?.w ?? base * 3;
  if (spec.showDecoration && style !== 'monogram' && style !== 'ornament') {
    if (input.divider) {
      const aspect = input.divider.width / input.divider.height;
      const w = Math.min(primaryW * 1.05 * spec.decorationScale, base * 6);
      items.push(rasterElement(input.divider, w, w / aspect, 'divider-ai', base * 0.2));
      layers.push('divider:ai');
    } else {
      const div = getDividerShape(style);
      if (div && (hasLower || style === 'classic')) {
        const w = Math.max(primaryW * 0.8, base * 2) * spec.decorationScale;
        items.push(vectorElement(div.d, div.aspect, 100, 10, w / div.aspect, color, 'divider', base * 0.2));
        layers.push(`divider:${style}`);
      }
    }
  }

  // ── secondary text + date ──
  if (spec.secondaryText) {
    items.push(textElement(outlineText(spec.secondaryText, spec.fontId, secSize, spacing), color, 'secondary', base * 0.16));
    layers.push('text:secondary');
  }
  if (spec.date) {
    items.push(textElement(outlineText(spec.date, spec.fontId, dateSize, spacing + 0.04), color, 'date', base * 0.16));
    layers.push('text:date');
  }

  if (symbol && spec.symbolPosition === 'below') pushSymbol();
  if (items.length === 0) throw new Error('empty_logo');

  // ── vertical stack, centred on x = 0 ──
  let y = 0;
  const placed: { item: Placed; box: Box }[] = [];
  items.forEach((item, idx) => {
    const box = { x: -item.w / 2, y, w: item.w, h: item.h };
    placed.push({ item, box });
    y += item.h + (idx < items.length - 1 ? item.gapAfter : 0);
  });
  const stackW = Math.max(...items.map(i => i.w));
  const stackH = y;
  let minX = -stackW / 2, maxX = stackW / 2, minY = 0, maxY = stackH;

  // ── frame (AI ornament) around the stack ──
  let frameSvg = '';
  let frameRaster: { r: RasterLayer; w: number } | null = null;
  if (input.frame && style === 'ornament' && spec.showDecoration) {
    const fa = input.frame.width / input.frame.height;
    // The prompt asks for an empty centre of ~55% → scale so the stack fits inside.
    const inner = 0.56;
    let fw = Math.max(stackW / inner, (stackH / inner) * fa) * spec.decorationScale;
    fw = Math.max(fw, stackW * 1.25);
    const fh = fw / fa;
    const cy = stackH / 2;
    const fb = { x: -fw / 2, y: cy - fh / 2, w: fw, h: fh };
    frameSvg = rasterElement(input.frame, fw, fh, 'frame', 0).svg(fb);
    frameRaster = { r: input.frame, w: fw };
    minX = Math.min(minX, fb.x); maxX = Math.max(maxX, fb.x + fw);
    minY = Math.min(minY, fb.y); maxY = Math.max(maxY, fb.y + fh);
    layers.unshift('frame:ai');
  }

  const pad = Math.max(maxX - minX, maxY - minY) * 0.04;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const vbW = maxX - minX, vbH = maxY - minY;
  const k = longSide / Math.max(vbW, vbH);
  const outW = Math.round(vbW * k), outH = Math.round(vbH * k);

  // honest raster quality: source pixels per output pixel
  let rasterScale = 1;
  for (const p of placed) {
    if (p.item.raster) rasterScale = Math.min(rasterScale, p.item.raster.width / (p.box.w * k));
  }
  if (frameRaster) rasterScale = Math.min(rasterScale, frameRaster.r.width / (frameRaster.w * k));

  const body = placed.map(p => p.item.svg(p.box)).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}">` +
    `<title>${esc(spec.primaryText || 'logo')}</title>${frameSvg}${body}</svg>`;

  const png = await sharp(Buffer.from(svg), { limitInputPixels: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { png, width: outW, height: outH, rasterScale: Math.min(1, rasterScale), layers };
}

// ── AI line-art → transparent, exact-colour layer ───────────────────────────

export class KeyingError extends Error {
  constructor(public readonly reason: 'background_not_clean' | 'empty' | 'centre_not_empty') {
    super(reason);
    this.name = 'KeyingError';
  }
}

/**
 * Turns "black line art on white" into a transparent PNG in `colorHex`.
 * Alpha comes from darkness, so anti-aliasing is preserved and the colour is
 * exactly the customer's choice (the model never has to match a hex value).
 * No checkerboard can appear: transparency is computed, not drawn.
 */
export async function keyLineArt(input: Buffer, colorHex: string, opts: { requireEmptyCentre?: boolean } = {}): Promise<RasterLayer> {
  const img = sharp(input).flatten({ background: '#ffffff' }).greyscale();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const ch = info.channels;
  const L = (x: number, y: number) => data[(y * width + x) * ch];

  // background must be (near) white: sample the border
  let sum = 0, n = 0;
  for (let x = 0; x < width; x += 4) { sum += L(x, 0) + L(x, height - 1); n += 2; }
  for (let y = 0; y < height; y += 4) { sum += L(0, y) + L(width - 1, y); n += 2; }
  if (sum / n < 225) throw new KeyingError('background_not_clean');

  const [r, g, b] = hexToRgb(colorHex);
  const out = Buffer.alloc(width * height * 4);
  let ink = 0, centreInk = 0, centreN = 0;
  const cx1 = width * 0.3, cx2 = width * 0.7, cy1 = height * 0.3, cy2 = height * 0.7;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const l = L(x, y);
      let a = (238 - l) / 178;
      a = a < 0.06 ? 0 : a > 1 ? 1 : a;
      const i = (y * width + x) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = Math.round(a * 255);
      if (a > 0) ink++;
      if (x > cx1 && x < cx2 && y > cy1 && y < cy2) { centreN++; centreInk += a; }
    }
  }
  if (ink < width * height * 0.002) throw new KeyingError('empty');
  if (opts.requireEmptyCentre && centreInk / centreN > 0.04) throw new KeyingError('centre_not_empty');

  const keyed = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { png: keyed.data, width: keyed.info.width, height: keyed.info.height };
}
