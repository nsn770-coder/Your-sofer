// Kippah mockup — controlled placement of the APPROVED logo file onto the real
// photo of the selected variant. No generative model touches the logo or the
// product: the PNG is scaled, positioned, slightly curved to the dome, shaded
// by the fabric's own light and finished as print or embroidery.

import sharp from 'sharp';
import type { Placement } from './catalog';

export type Finish = 'print' | 'embroidery';

export interface MockupResult { jpg: Buffer; width: number; height: number; box: { x: number; y: number; w: number; h: number } }

const OUT_LONG_SIDE = 1400;

/** Bilinear sample of an RGBA buffer. */
function sample(src: Buffer, w: number, h: number, x: number, y: number, out: number[]) {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) { out[0] = out[1] = out[2] = out[3] = 0; return; }
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0, fy = y - y0;
  for (let c = 0; c < 4; c++) {
    const a = src[(y0 * w + x0) * 4 + c], b = src[(y0 * w + x1) * 4 + c];
    const d = src[(y1 * w + x0) * 4 + c], e = src[(y1 * w + x1) * 4 + c];
    out[c] = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
  }
}

export async function composeMockup(productImage: Buffer, logoPng: Buffer, placement: Placement, finish: Finish): Promise<MockupResult> {
  const base = await sharp(productImage)
    .rotate()
    .resize({ width: OUT_LONG_SIDE, height: OUT_LONG_SIDE, fit: 'inside', withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = base.info.width, H = base.info.height;
  const img = base.data; // RGB

  // logo at target size
  const targetW = Math.max(16, Math.round(placement.w * W));
  const logoRes = await sharp(logoPng).ensureAlpha().resize({ width: targetW }).raw().toBuffer({ resolveWithObject: true });
  const lw = logoRes.info.width, lh = logoRes.info.height;
  const logo = logoRes.data;

  const left = Math.round(placement.x * W - lw / 2);
  const top = Math.round(placement.y * H - lh / 2);

  // local fabric light: luminance of the base, normalised to the area's mean
  let lumSum = 0, lumN = 0;
  for (let y = Math.max(0, top); y < Math.min(H, top + lh); y += 2) {
    for (let x = Math.max(0, left); x < Math.min(W, left + lw); x += 2) {
      const i = (y * W + x) * 3;
      lumSum += 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]; lumN++;
    }
  }
  const lumMean = lumN ? lumSum / lumN : 200;

  const curve = 0.07; // dome curvature: edges compress slightly
  const px = [0, 0, 0, 0];
  const out = Buffer.from(img);

  if (finish === 'embroidery') {
    // soft relief shadow under the raised stitches (offset 2px, 30% darker)
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const a = logo[(y * lw + x) * 4 + 3] / 255;
      if (a <= 0.02) continue;
      const gx = left + x + 2, gy = top + y + 2;
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      const i = (gy * W + gx) * 3;
      const f = 1 - 0.3 * a;
      out[i] *= f; out[i + 1] *= f; out[i + 2] *= f;
    }
  }
  for (let y = 0; y < lh; y++) {
    const gy = top + y;
    if (gy < 0 || gy >= H) continue;
    const v = (y / (lh - 1)) * 2 - 1;
    for (let x = 0; x < lw; x++) {
      const gx = left + x;
      if (gx < 0 || gx >= W) continue;
      const u = (x / (lw - 1)) * 2 - 1;
      // inverse map: output (u,v) samples further out near the rim → content curves with the dome
      const su = u * (1 + curve * v * v);
      const sv = v * (1 + curve * 0.6 * u * u);
      sample(logo, lw, lh, ((su + 1) / 2) * (lw - 1), ((sv + 1) / 2) * (lh - 1), px);
      let a = px[3] / 255;
      if (a <= 0.003) continue;
      const i = (gy * W + gx) * 3;
      const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      let shade = lumMean > 1 ? lum / lumMean : 1;
      shade = Math.min(1.12, Math.max(0.72, shade));
      let r = px[0] * shade, g = px[1] * shade, b = px[2] * shade;
      if (finish === 'embroidery') {
        // thread texture: fine diagonal satin-stitch ripples + slight relief
        const ripple = 1 + 0.09 * Math.sin((gx + gy) * 1.35);
        r *= ripple; g *= ripple; b *= ripple;
        a = Math.min(1, a * 1.05);
      } else {
        a *= 0.94; // ink sits in the weave
      }
      out[i] = Math.min(255, r * a + out[i] * (1 - a));
      out[i + 1] = Math.min(255, g * a + out[i + 1] * (1 - a));
      out[i + 2] = Math.min(255, b * a + out[i + 2] * (1 - a));
    }
  }

  const pipeline = sharp(out, { raw: { width: W, height: H, channels: 3 } });
  const jpg = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return { jpg, width: W, height: H, box: { x: left / W, y: top / H, w: lw / W, h: lh / H } };
}

/**
 * Guard for AI-enhanced mockups: the logo region must still match the
 * controlled composite. Returns mean absolute difference (0..1) on a 48×48
 * greyscale crop of the logo box.
 */
export async function logoRegionDifference(a: Buffer, b: Buffer, box: MockupResult['box']): Promise<number> {
  const crop = async (buf: Buffer) => {
    const m = await sharp(buf).metadata();
    const W = m.width!, H = m.height!;
    const left = Math.max(0, Math.floor(box.x * W)), top = Math.max(0, Math.floor(box.y * H));
    const width = Math.max(1, Math.min(W - left, Math.round(box.w * W)));
    const height = Math.max(1, Math.min(H - top, Math.round(box.h * H)));
    return sharp(buf).extract({ left, top, width, height }).resize(48, 48, { fit: 'fill' }).greyscale().normalise().raw().toBuffer();
  };
  const [x, y] = await Promise.all([crop(a), crop(b)]);
  let s = 0;
  for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]);
  return s / x.length / 255;
}
