'use client';
// ── קנבס תצוגה חיה של הכיפה + ייצוא PNG באיכות הדפסה ─────────────────────────
// HTML5 Canvas מובנה (ללא תלויות חיצוניות). כשיש תמונת מוצר — הטקסט מונח
// עליה (הלקוח כבר בחר צבע/סוג בכרטיס המוצר); אחרת מצוירת כיפה גנרית.
// הטקסט ניתן לגרירה חופשית (עכבר / אצבע) — ההיסט נשמר יחסית לגודל הקנבס
// ולכן זהה בתצוגה ובקובץ ההדפסה.

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
  /** הזזה חופשית יחסית לגודל הקנבס (‎-0.45..0.45‎) */
  offset?: { x: number; y: number };
}

/** גבולות ההיסט — שומרים את הטקסט בתוך הכיפה */
export const KIPPA_OFFSET_LIMIT = 0.45;

export function clampOffset(o: { x: number; y: number }): { x: number; y: number } {
  const c = (v: number) => Math.max(-KIPPA_OFFSET_LIMIT, Math.min(KIPPA_OFFSET_LIMIT, Number.isFinite(v) ? v : 0));
  return { x: c(o.x), y: c(o.y) };
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

type Box = { x: number; y: number; w: number; h: number };

/** מצייר את בלוק הטקסט ומחזיר את התיבה התוחמת שלו (או null כשאין טקסט) */
function drawText(
  ctx: CanvasRenderingContext2D,
  size: number,
  spec: KippaDrawSpec,
  area: Box,
): Box | null {
  const lines = spec.text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
  if (lines.length === 0) return null;
  const yByPosition: Record<KippaDesign['position'], number> = {
    top:    area.y + area.h * 0.22,
    center: area.y + area.h * 0.50,
    bottom: area.y + area.h * 0.80,
  };
  const scaledFont = (spec.fontSize / 400) * size;
  const lineHeight = scaledFont * 1.18;
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
  // קיצור שורה שגולשת מהרוחב המותר
  const displays = lines.map(line => {
    let d = line;
    while (d.length > 1 && ctx.measureText(d).width > maxW) d = d.slice(0, -1);
    return d;
  });
  const widest = Math.max(...displays.map(d => ctx.measureText(d).width), 1);
  const halfW  = widest / 2;
  const blockH = (displays.length - 1) * lineHeight;

  // עוגן לפי position + הזזה חופשית של המשתמש
  const off  = clampOffset(spec.offset ?? { x: 0, y: 0 });
  const padX = Math.min(size * 0.02, area.w * 0.04);
  const padY = scaledFont * 0.7;

  let cx = area.x + area.w / 2 + off.x * size;
  let y  = yByPosition[spec.position] + off.y * size - blockH / 2;

  // לא לגלוש מחוץ לאזור הכיפה
  const minCx = area.x + halfW + padX;
  const maxCx = area.x + area.w - halfW - padX;
  cx = maxCx >= minCx ? Math.max(minCx, Math.min(cx, maxCx)) : area.x + area.w / 2;
  const minY = area.y + padY;
  const maxY = area.y + area.h - blockH - padY;
  y = maxY >= minY ? Math.max(minY, Math.min(y, maxY)) : minY;

  const topY = y;
  for (const d of displays) {
    ctx.fillText(d, cx, y);
    y += lineHeight;
  }
  ctx.restore();

  return {
    x: cx - halfW - padX,
    y: topY - scaledFont * 0.72,
    w: widest + padX * 2,
    h: blockH + scaledFont * 1.44,
  };
}

/** מסגרת מקווקוות עדינה שמסמנת "אפשר לגרור" — תצוגה בלבד, לא בייצוא */
function drawGuide(ctx: CanvasRenderingContext2D, size: number, box: Box, active: boolean) {
  ctx.save();
  ctx.setLineDash([size * 0.018, size * 0.014]);
  ctx.lineWidth = Math.max(1, size * (active ? 0.006 : 0.004));
  ctx.strokeStyle = active ? 'rgba(37,99,235,0.95)' : 'rgba(37,99,235,0.45)';
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

/** מצייר את הכיפה על קנבס נתון — size הוא רוחב/גובה לוגי (ריבועי) */
export function drawKippa(
  ctx: CanvasRenderingContext2D,
  size: number,
  spec: KippaDrawSpec,
  productImage?: HTMLImageElement | null,
  opts?: { guide?: 'off' | 'idle' | 'active' },
): Box | null {
  ctx.clearRect(0, 0, size, size);
  const guide = opts?.guide ?? 'off';

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
    const box = drawText(ctx, size, spec, { x: 0, y: 0, w: size, h: size });
    if (box && guide !== 'off') drawGuide(ctx, size, box, guide === 'active');
    return box;
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

  const box = drawText(ctx, size, spec, { x: cx - rx, y: baseY - domeH, w: domeW, h: domeH * 1.05 });
  if (box && guide !== 'off') drawGuide(ctx, size, box, guide === 'active');
  return box;
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
  drawKippa(ctx, size, spec, productImage); // ללא guide — קובץ ההדפסה נקי
  return canvas.toDataURL('image/png');
}

export default function KippaCanvas({
  spec,
  size,
  onOffsetChange,
}: {
  spec: KippaDrawSpec;
  size: number;
  /** כשמסופק — הטקסט ניתן לגרירה בעכבר/אצבע */
  onOffsetChange?: (offset: { x: number; y: number }) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [productImage, setProductImage] = useState<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const draggable = !!onOffsetChange && !!spec.text.trim();

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

    const guide: 'off' | 'idle' | 'active' = !draggable ? 'off' : dragging ? 'active' : 'idle';
    let cancelled = false;
    const draw = () => { if (!cancelled) drawKippa(ctx, size, spec, productImage, { guide }); };
    draw();
    const docFonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (docFonts && spec.text.trim()) {
      const scaled = (spec.fontSize / 400) * size;
      docFonts.load(`700 ${scaled}px ${fontCss(spec.fontFamily)}`, spec.text).then(draw).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [spec, size, productImage, draggable, dragging]);

  // ── גרירה: עכבר, מגע וסטיילוס דרך Pointer Events ──────────────────────────
  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!draggable) return;
    const canvas = ref.current;
    if (!canvas) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* דפדפן ישן */ }
    const cur = clampOffset(spec.offset ?? { x: 0, y: 0 });
    dragRef.current = { px: e.clientX, py: e.clientY, ox: cur.x, oy: cur.y };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current;
    if (!d || !onOffsetChange) return;
    e.preventDefault();
    onOffsetChange(clampOffset({
      x: d.ox + (e.clientX - d.px) / size,
      y: d.oy + (e.clientY - d.py) / size,
    }));
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try { ref.current?.releasePointerCapture(e.pointerId); } catch { /* כבר שוחרר */ }
  }

  // נגישות — חצי המקלדת מזיזים את הטקסט כשהקנבס בפוקוס (Shift = צעד גדול)
  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    if (!draggable || !onOffsetChange) return;
    const step = e.shiftKey ? 0.04 : 0.01;
    const cur = clampOffset(spec.offset ?? { x: 0, y: 0 });
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft:  { x: cur.x - step, y: cur.y },
      ArrowRight: { x: cur.x + step, y: cur.y },
      ArrowUp:    { x: cur.x, y: cur.y - step },
      ArrowDown:  { x: cur.x, y: cur.y + step },
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    onOffsetChange(clampOffset(next));
  }

  return (
    <canvas
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      tabIndex={draggable ? 0 : undefined}
      style={{
        width: size,
        height: size,
        display: 'block',
        margin: '0 auto',
        borderRadius: 12,
        // חובה — בלי זה גרירה באצבע גוללת את המסך במקום להזיז את הטקסט
        touchAction: draggable ? 'none' : 'manipulation',
        cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        outline: 'none',
      }}
      aria-label={draggable ? 'תצוגה מקדימה של הכיפה — גררו את הטקסט למיקום הרצוי' : 'תצוגה מקדימה של הכיפה המעוצבת'}
    />
  );
}
