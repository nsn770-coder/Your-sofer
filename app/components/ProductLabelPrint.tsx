'use client';
import { useState, type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared product-label (sticker) printing.
// ההדפסה מתבצעת בחלון נפרד ונקי (window.open + document.write) — כמו כפתור
// "הדפס QR" הבודד. כך אין שום תלות ב-CSS או במבנה של הדף שממנו מדפיסים,
// מה שפתר עמודים ריקים ופריסה שבורה בתצוגת ההדפסה.
// ─────────────────────────────────────────────────────────────────────────────

export interface PrintableLabel {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  warehouseBox?: string | null;
  imgUrl?: string;
  image_url?: string;
}

// Insert Cloudinary transform after /upload/ if applicable
export function cloudImg(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_200,c_fill,q_auto,f_auto/');
  }
  return url;
}

export function qrSrcForProduct(id: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://your-sofer.com/product/${id}`)}`;
}

// סגנונות המדבקות — משמשים את חלון ההדפסה הנפרד.
// מיוצא גם לתאימות לאחור (מסכים שמרנדרים <style> בעמוד — לא מזיק).
export const PRODUCT_LABEL_PRINT_STYLES = `
  .sticker {
    width: 60mm; height: 45mm;
    border: 0.4pt solid #bbb; padding: 2mm;
    box-sizing: border-box; direction: rtl;
    display: flex; flex-direction: column;
    overflow: hidden;
    page-break-inside: avoid; break-inside: avoid;
    background: #fff;
  }
  .sticker-top    { display: flex; gap: 1.5mm; height: 22mm; flex-shrink: 0; }
  .sticker-img    { flex: 1; min-width: 0; height: 22mm; object-fit: cover; border-radius: 1mm; }
  .sticker-qr     { flex: 1; min-width: 0; height: 22mm; object-fit: contain; }
  .sticker-qr-full{ width: 100%; height: 22mm; object-fit: contain; flex: none; }
  .sticker-name {
    font-weight: bold; font-size: 7.5pt; line-height: 1.2;
    overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    text-align: right; direction: rtl;
    margin-top: 1mm; flex: 1;
  }
  .sticker-meta-row {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 6.5pt; color: #555; margin-top: 0.5mm; flex-shrink: 0;
  }
  .sticker-sku   { font-family: monospace; direction: ltr; }
  .sticker-price { font-weight: bold; color: #111; }
  .sticker-box   { font-family: monospace; direction: ltr; }
`;

/**
 * פותח מסמך HTML להדפסה בטאב חדש דרך Blob URL.
 * לא משתמשים ב-document.write על about:blank — לתצוגת ההדפסה של Chrome יש
 * באג שדוחס מסמכים כאלה לעמודה צרה. מסמך Blob מודפס כדף רגיל.
 * מחזיר false אם הדפדפן חסם את החלון.
 */
export function openPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  // משחררים את ה-URL אחרי דקה — מספיק זמן לטעינה ולהדפסה
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// כל הסגנונות inline — עמיד לכל התנהגות של מנוע ההדפסה (סטיילשיטים חיצוניים
// התגלו כלא-אמינים בתצוגת ההדפסה של Chrome בחלון שנוצר עם document.write).
function labelHtml(p: PrintableLabel): string {
  const imgSrc = cloudImg(p.imgUrl || p.image_url);
  const qrSrc = qrSrcForProduct(p.id);
  const metaRow = 'display:flex;justify-content:space-between;align-items:baseline;font-size:6.5pt;color:#555;margin-top:0.5mm;flex-shrink:0;';
  return `
    <div style="width:60mm;height:45mm;border:0.4pt solid #bbb;padding:2mm;box-sizing:border-box;direction:rtl;display:flex;flex-direction:column;overflow:hidden;page-break-inside:avoid;break-inside:avoid;background:#fff;">
      <div style="display:flex;gap:1.5mm;height:22mm;flex-shrink:0;">
        ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="" style="flex:1;min-width:0;height:22mm;object-fit:cover;border-radius:1mm;" />` : ''}
        <img src="${escapeHtml(qrSrc)}" alt="QR" style="${imgSrc ? 'flex:1;min-width:0;height:22mm;object-fit:contain;' : 'width:100%;height:22mm;object-fit:contain;flex:none;'}" />
      </div>
      <div style="font-weight:bold;font-size:7.5pt;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;text-align:right;direction:rtl;margin-top:1mm;flex:1;">${escapeHtml(p.name ?? '')}</div>
      <div style="${metaRow}">
        ${p.sku ? `<span style="font-family:monospace;direction:ltr;">${escapeHtml(String(p.sku))}</span>` : ''}
        ${p.price != null ? `<span style="font-weight:bold;color:#111;">₪${p.price}</span>` : ''}
      </div>
      ${p.warehouseBox ? `<div style="${metaRow}"><span style="font-family:monospace;direction:ltr;">📦 ארגז ${escapeHtml(String(p.warehouseBox))}</span></div>` : ''}
    </div>`;
}

// Hook for printing one or many product labels from anywhere in the admin UI.
export function useProductLabelPrint() {
  const [printing, setPrinting] = useState(false);

  function printLabels(items: PrintableLabel[]) {
    if (!items.length) return;
    setPrinting(true);
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8" />
<title>מדבקות מוצרים (${items.length})</title>
<style>
  @page { margin: 8mm; size: A4 portrait; }
</style>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Heebo',Arial,sans-serif;">
<div id="sticker-print-area" style="width:186mm;display:flex;flex-wrap:wrap;flex-direction:row-reverse;justify-content:flex-start;gap:2mm;direction:ltr;align-content:flex-start;">
${items.map(labelHtml).join('\n')}
</div>
<script>
  (function () {
    var imgs = Array.prototype.slice.call(document.images);
    var pending = imgs.filter(function (im) { return !im.complete || im.naturalHeight === 0; });
    var done = false;
    function go() {
      if (done) return;
      done = true;
      setTimeout(function () { window.print(); }, 150);
    }
    if (pending.length === 0) { go(); }
    else {
      var left = pending.length;
      pending.forEach(function (im) {
        im.onload = im.onerror = function () { left--; if (left <= 0) go(); };
      });
      setTimeout(go, 6000); // רשת איטית — מדפיסים בכל מקרה אחרי 6 שניות
    }
    window.onafterprint = function () { window.close(); };
  })();
</script>
</body>
</html>`;
    if (!openPrintWindow(html)) {
      alert('הדפדפן חסם את חלון ההדפסה — אשר חלונות קופצים לאתר ונסה שוב');
    }
    setPrinting(false);
  }

  // printArea נשאר ב-API לתאימות לאחור — אין יותר אזור הדפסה בתוך הדף.
  return { printLabels, printArea: null as ReactNode, printing };
}
