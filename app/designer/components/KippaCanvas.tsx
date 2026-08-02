'use client';
// ── קנבס תצוגה חיה של הכיפה + ייצוא PNG באיכות הדפסה ─────────────────────────
// HTML5 Canvas מובנה (ללא תלויות חיצוניות). כשיש תמונת מוצר — הטקסט מונח
// עליה (הלקוח כבר בחר צבע/סוג בכרטיס המוצר); אחרת מצוירת כיפה גנרית.

import { useEffect, useRef, useState } from 'react';
import type { KippaDesign } from '../utils/types';
import { KIPPA_FONTS } from '../utils/types';

export interface KippaDrawSpec {
  baseColor: string;
  productImageUrl?: string;
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  position: KippaDesign['position'];
}

function fontCss(fontFamily: string): string {
  return KIPPA_FONTS.find(f => f.id === fontFamily)?.css ?? 'Arial, sans-serif';
}

function shade(hex: string, amount: number): string {
  const n = (hex || '#1E40AF').replace('#', '');
  const full = n.length === 3 ? n.split('').map(c => c + c).join('') : n;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

/** טעינת תמונת מוצר עם CORS (Cloudinary תומך) — כדי ש-toDataURL לא ייחסם */
export function loadDesignImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function drawText(ctx: CanvasRenderingContext2D, size: number, spec: KippaDrawSpec, area: { x: number; y: number; w: number; h: number }) {
  const text = spec.text.trim();
  if (!text) return;
  const yByPosition: Record<KippaDesign['position'], number> = {
    top:    area.y + area.h * 0.22,
    center: area.y + area.h * 0.50,
    bottom: area.y + area.h * 0.80,
  };
  const scaledFont = (spec.fontSize / 400) * size;
  ctx.save();
  ctx.font = `700 ${scaledFont}px ${fontCss(spec.fontFamily)}`;
  ctx.fillStyle = spec.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  // צל עדין לקריאות על גבי תמונה
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = scaledFont * 0.06;
  const maxW = area.w * 0.86;
  let display = text;
  while (display.length > 1 && ctx.measureText(display).width > maxW) {
    display = display.slice(0, -1);
  }
  ctx.fillText(display, area.x + area.w / 2, yByPosition[spec.position]);
  ctx.restore();
}

/** מצייר את הכיפה על קנבס נתון — size הוא רוחב/גובה לוגי (ריבועי) */
export function drawKippa(
  ctx: CanvasRenderingContext2D,
  size: number,
  spec: KippaDrawSpec,
  productImage?: HTMLImageElement | null,
) {
  ctx.clearRect(0, 0, size, size);

  // ── מצב תמונת מוצר: התמונה האמיתית כרקע + טקסט עליה ──
  if (productImage) {
    const r = size * 0.03;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.arcTo(size, 0, size, size, r); ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r); ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
    ctx.clip();
    // object-fit: cover
    const iw = productImage.naturalWidth, ih = productImage.naturalHeight;
    const scale = Math.max(size / iw, size / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(productImage, (size - dw) / 2, (size - dh) / 2, dw, dh);
    ctx.restore();
    drawText(ctx, size, spec, { x: 0, y: 0, w: size, h: size });
    return;
  }

  // ── fallback: כיפה גנרית מצוירת (כשאין תמונת מוצר) ──
  const cx = size / 2;
  const domeW = size * 0.86;
  const domeH = size * 0.60;
  const baseY = size * 0.78;
  const rx = domeW / 2;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, baseY + size * 0.025, rx * 0.92, size * 0.035, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rx, baseY);
  ctx.ellipse(cx, baseY, rx, domeH, 0, Math.PI, 0, false);
  ctx.ellipse(cx, baseY, rx, size * 0.045, 0, 0, Math.PI, false);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - rx, baseY - domeH, cx + rx, baseY);
  grad.addColorStop(0,   shade(spec.baseColor, 28));
  grad.addColorStop(0.5, spec.baseColor || '#1E40AF');
  grad.addColorStop(1,   shade(spec.baseColor, -30));
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, baseY - domeH);
  ctx.lineTo(cx, baseY + size * 0.04);
  ctx.moveTo(cx, baseY - domeH);
  ctx.quadraticCurveTo(cx - rx * 0.62, baseY - domeH * 0.45, cx - rx * 0.72, baseY + size * 0.015);
  ctx.moveTo(cx, baseY - domeH);
  ctx.quadraticCurveTo(cx + rx * 0.62, baseY - domeH * 0.45, cx + rx * 0.72, baseY + size * 0.015);
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.stroke();
  ctx.restore();

  drawText(ctx, size, spec, { x: cx - rx, y: baseY - domeH, w: domeW, h: domeH * 1.05 });
}

/** ייצוא PNG באיכות הדפסה — pixelRatio 3, אחרי טעינת פונטים ותמונה */
export async function exportKippaPng(spec: KippaDrawSpec, baseSize = 400, pixelRatio = 3): Promise<string> {
  const size = baseSize * pixelRatio;
  if (typeof document !== 'undefined' && (document as Document & { fonts?: FontFaceSet }).fonts) {
    const scaled = (spec.fontSize / 400) * size;
    try { await document.fonts.load(`700 ${scaled}px ${fontCss(spec.fontFamily)}`, spec.text || 'א'); } catch { /* פונט מערכת */ }
  }
  let productImage: HTMLImageElement | null = null;
  if (spec.productImageUrl) {
    try { productImage = await loadDesignImage(spec.productImageUrl); } catch { productImage = null; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  drawKippa(ctx, size, spec, productImage);
  return canvas.toDataURL('image/png');
}

export default function KippaCanvas({ spec, size }: { spec: KippaDrawSpec; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);

  // טעינת תמונת המוצר פעם אחת (או כשה-URL משתנה)
  useEffect(() => {
    let cancelled = false;
    if (!spec.productImageUrl) { setProductImage(null); return; }
    loadDesignImage(spec.productImageUrl)
      .then(img => { if (!cancelled) setProductImage(img); })
      .catch(() => { if (!cancelled) setProductImage(null); });
    return () => { cancelled = true; };
  }, [spec.productImageUrl]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let cancelled = false;
    const draw = () => { if (!cancelled) drawKippa(ctx, size, spec, productImage); };
    draw();
    const docFonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (docFonts && spec.text.trim()) {
      const scaled = (spec.fontSize / 400) * size;
      docFonts.load(`700 ${scaled}px ${fontCss(spec.fontFamily)}`, spec.text).then(draw).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [spec, size, productImage]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'block', margin: '0 auto', touchAction: 'manipulation' }}
      aria-label="תצוגה מקדימה של הכיפה המעוצבת"
    />
  );
}
