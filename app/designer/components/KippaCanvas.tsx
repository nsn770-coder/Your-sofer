'use client';
// ── קנבס תצוגה חיה של הכיפה + ייצוא PNG באיכות הדפסה ─────────────────────────
// HTML5 Canvas מובנה (ללא תלויות חיצוניות). אותה פונקציית ציור משמשת גם
// לתצוגה החיה וגם לייצוא offscreen ב-pixelRatio 3.

import { useEffect, useRef } from 'react';
import type { KippaDesign } from '../utils/types';
import { KIPPA_FONTS } from '../utils/types';

export interface KippaDrawSpec {
  baseColor: string;
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
  // amount שלילי = כהה יותר, חיובי = בהיר יותר
  const n = hex.replace('#', '');
  const full = n.length === 3 ? n.split('').map(c => c + c).join('') : n;
  const num = parseInt(full, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

/** מצייר את הכיפה על קנבס נתון — size הוא רוחב/גובה לוגי (ריבועי) */
export function drawKippa(ctx: CanvasRenderingContext2D, size: number, spec: KippaDrawSpec) {
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  // כיפה = חצי-אליפסה (כיפת ראש מהצד-למעלה) עם תחתית מעוגלת קלות
  const domeW = size * 0.86;          // רוחב הכיפה
  const domeH = size * 0.60;          // גובה הכיפה
  const baseY = size * 0.78;          // קו התחתית
  const rx = domeW / 2;

  // ── צל רך מתחת ──
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, baseY + size * 0.025, rx * 0.92, size * 0.035, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill();
  ctx.restore();

  // ── גוף הכיפה ──
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rx, baseY);
  // קשת עליונה (חצי אליפסה)
  ctx.ellipse(cx, baseY, rx, domeH, 0, Math.PI, 0, false);
  // תחתית מעוגלת קלות כלפי מטה
  ctx.ellipse(cx, baseY, rx, size * 0.045, 0, 0, Math.PI, false);
  ctx.closePath();

  const grad = ctx.createLinearGradient(cx - rx, baseY - domeH, cx + rx, baseY);
  grad.addColorStop(0,   shade(spec.baseColor, 28));
  grad.addColorStop(0.5, spec.baseColor);
  grad.addColorStop(1,   shade(spec.baseColor, -30));
  ctx.fillStyle = grad;
  ctx.fill();

  // קו מתאר עדין — חשוב במיוחד לכיפה לבנה
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  ctx.restore();

  // ── תפרים (4 פלחים כמו כיפה אמיתית) ──
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

  // ── טקסט ──
  const text = spec.text.trim();
  if (text) {
    const yByPosition: Record<KippaDesign['position'], number> = {
      top:    baseY - domeH * 0.66,
      center: baseY - domeH * 0.38,
      bottom: baseY - domeH * 0.12,
    };
    const scaledFont = (spec.fontSize / 400) * size; // 400 = גודל הבסיס של העורך בדסקטופ
    ctx.save();
    ctx.font = `700 ${scaledFont}px ${fontCss(spec.fontFamily)}`;
    ctx.fillStyle = spec.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    // קיצוץ עדין אם הטקסט רחב מדי לכיפה
    const maxW = domeW * 0.78;
    let display = text;
    while (display.length > 1 && ctx.measureText(display).width > maxW) {
      display = display.slice(0, -1);
    }
    ctx.fillText(display, cx, yByPosition[spec.position]);
    ctx.restore();
  }
}

/** ייצוא PNG באיכות הדפסה — pixelRatio 3, אחרי טעינת הפונטים */
export async function exportKippaPng(spec: KippaDrawSpec, baseSize = 400, pixelRatio = 3): Promise<string> {
  const size = baseSize * pixelRatio;
  if (typeof document !== 'undefined' && (document as Document & { fonts?: FontFaceSet }).fonts) {
    const scaled = (spec.fontSize / 400) * size;
    try { await document.fonts.load(`700 ${scaled}px ${fontCss(spec.fontFamily)}`, spec.text || 'א'); } catch { /* פונט מערכת */ }
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  drawKippa(ctx, size, spec);
  return canvas.toDataURL('image/png');
}

export default function KippaCanvas({ spec, size }: { spec: KippaDrawSpec; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

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
    const draw = () => { if (!cancelled) drawKippa(ctx, size, spec); };
    draw();
    // ציור חוזר אחרי שהפונט נטען (אחרת נופל לפונט ברירת מחדל)
    const docFonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (docFonts && spec.text.trim()) {
      const scaled = (spec.fontSize / 400) * size;
      docFonts.load(`700 ${scaled}px ${fontCss(spec.fontFamily)}`, spec.text).then(draw).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [spec, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'block', margin: '0 auto', touchAction: 'manipulation' }}
      aria-label="תצוגה מקדימה של הכיפה המעוצבת"
    />
  );
}
