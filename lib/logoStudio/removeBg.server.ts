// Background removal for a logo the customer uploaded ("I already have a logo").
//
// Logos almost always sit on a flat background (white / one colour). We take the
// background colour from the image border and:
//   1. flood-fill from the border through pixels close to that colour,
//   2. also clear enclosed "holes" of the background colour (inside letters such
//      as ם / ס / O) when they are big enough to be real holes, not specks.
// Edge pixels get partial alpha and are colour-decontaminated, so the letters
// stay smooth (no white halo on a dark kippah).
// No AI, no external service: deterministic, free and instant.

import sharp from 'sharp';

export class BgRemovalError extends Error {
  constructor(public readonly reason: 'empty' | 'not_an_image') {
    super(reason);
    this.name = 'BgRemovalError';
  }
}

export interface BgRemovalResult {
  png: Buffer;
  width: number;
  height: number;
  /** share of the original image that became transparent (0–1) */
  removedRatio: number;
  /** the image already had a transparent background — nothing was keyed */
  alreadyTransparent: boolean;
  /** the border was not one flat colour — the result may be partial */
  busyBackground: boolean;
}

const T_LO = 26;   // ≤ this distance from the background colour → fully transparent
const T_HI = 60;   // between T_LO and T_HI → partial alpha (anti-aliased edge)

/** Trims transparent margins and leaves a small transparent padding. */
async function trimTransparent(rgba: Buffer, width: number, height: number): Promise<{ png: Buffer; width: number; height: number }> {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[row + x * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new BgRemovalError('empty');
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const pad = Math.max(4, Math.round(Math.max(w, h) * 0.02));
  const out = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: w, height: h })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { png: out.data, width: out.info.width, height: out.info.height };
}

export async function removeLogoBackground(input: Buffer): Promise<BgRemovalResult> {
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true }).catch(() => null);
  if (!raw) throw new BgRemovalError('not_an_image');
  const { width: W, height: H } = raw.info;
  const px = Buffer.from(raw.data); // RGBA, mutable copy
  const N = W * H;

  // ── border samples ───────────────────────────────────────────────────────
  const border: number[] = [];
  const step = Math.max(1, Math.floor(Math.min(W, H) / 400));
  for (let x = 0; x < W; x += step) { border.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y += step) { border.push(y * W, y * W + W - 1); }

  const transparentBorder = border.filter(i => px[i * 4 + 3] < 16).length;
  if (transparentBorder / border.length > 0.6) {
    // already a transparent PNG — just trim
    const t = await trimTransparent(px, W, H);
    let clear = 0;
    for (let i = 0; i < N; i++) if (px[i * 4 + 3] < 16) clear++;
    return { ...t, removedRatio: clear / N, alreadyTransparent: true, busyBackground: false };
  }

  // background colour = per-channel median of the opaque border pixels
  const opaque = border.filter(i => px[i * 4 + 3] >= 16);
  const median = (c: number) => {
    const v = opaque.map(i => px[i * 4 + c]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)] ?? 255;
  };
  const bg = [median(0), median(1), median(2)];

  const dist = (i: number) => {
    const o = i * 4;
    const dr = px[o] - bg[0], dg = px[o + 1] - bg[1], db = px[o + 2] - bg[2];
    return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db) * 1.6;
  };
  const busyBackground = opaque.filter(i => dist(i) <= T_HI).length / Math.max(1, opaque.length) < 0.6;

  // distances once (Float32 is enough)
  const D = new Float32Array(N);
  for (let i = 0; i < N; i++) D[i] = px[i * 4 + 3] < 16 ? 0 : dist(i);

  const mark = new Uint8Array(N); // 1 = background (flooded / hole)
  const queue = new Int32Array(N);

  /** Flood-fills from `seeds`; the filled pixels end up in queue[0..returned count). */
  const flood = (seeds: number[], limit: number): number => {
    let head = 0, tail = 0;
    for (const s of seeds) if (!mark[s] && D[s] <= limit) { mark[s] = 1; queue[tail++] = s; }
    while (head < tail) {
      const i = queue[head++];
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && !mark[i - 1] && D[i - 1] <= limit) { mark[i - 1] = 1; queue[tail++] = i - 1; }
      if (x < W - 1 && !mark[i + 1] && D[i + 1] <= limit) { mark[i + 1] = 1; queue[tail++] = i + 1; }
      if (y > 0 && !mark[i - W] && D[i - W] <= limit) { mark[i - W] = 1; queue[tail++] = i - W; }
      if (y < H - 1 && !mark[i + W] && D[i + W] <= limit) { mark[i + W] = 1; queue[tail++] = i + W; }
    }
    return tail;
  };

  // 1) everything connected to the border
  const allBorder: number[] = [];
  for (let x = 0; x < W; x++) allBorder.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) allBorder.push(y * W, y * W + W - 1);
  flood(allBorder, T_HI);

  // 2) enclosed holes of (almost exactly) the background colour
  const minHole = Math.max(40, Math.round(N * 0.00015));
  for (let i = 0; i < N; i++) {
    if (mark[i] || D[i] > T_LO * 0.6) continue;
    const n = flood([i], T_LO);
    if (n < minHole) for (let k = 0; k < n; k++) mark[queue[k]] = 2; // speck → keep (2 = visited, not background)
  }

  // ── alpha + colour decontamination on background pixels ─────────────────
  let clear = 0;
  for (let i = 0; i < N; i++) {
    if (mark[i] !== 1) continue;
    const o = i * 4;
    const d = D[i];
    if (d <= T_LO) { px[o + 3] = 0; clear++; continue; }
    const a = Math.min(1, (d - T_LO) / (T_HI - T_LO));
    const a0 = px[o + 3] / 255;
    for (let c = 0; c < 3; c++) {
      const v = (px[o + c] - (1 - a) * bg[c]) / a;
      px[o + c] = v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
    }
    px[o + 3] = Math.round(a * a0 * 255);
    if (px[o + 3] < 16) clear++;
  }

  if (N - clear < N * 0.001) throw new BgRemovalError('empty');
  const t = await trimTransparent(px, W, H);
  return { ...t, removedRatio: clear / N, alreadyTransparent: false, busyBackground };
}
