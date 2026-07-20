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

function chunk3<T>(arr: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 3) rows.push(arr.slice(i, i + 3));
  return rows;
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
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Heebo',Arial,sans-serif;">
<div class="no-print" style="position:sticky;top:0;background:#1a1a1a;color:#fff;padding:10px 16px;display:flex;gap:12px;align-items:center;direction:rtl;z-index:10;">
  <button onclick="window.print()" style="background:#C5A028;color:#1a1a1a;border:none;padding:8px 22px;font-weight:900;font-size:15px;cursor:pointer;border-radius:6px;font-family:inherit;">🖨️ הדפסה</button>
  <span style="font-size:13px;color:#ccc;">עמוד תצוגה — אפשר גם לצלם מסך ולהדפיס את הצילום</span>
</div>
<!-- טבלה במקום flex/grid: Chrome לא יודע לעמד flex על פני כמה עמודי הדפסה
     (מכווץ הכל לעמוד אחד) — טבלאות מתעמדות שורה-שורה באמינות מלאה. -->
<table dir="rtl" id="sticker-print-area" style="border-collapse:separate;border-spacing:1mm;margin:0;">
${chunk3(items).map(row => `<tr>
${row.map(p => `<td style="padding:0;vertical-align:top;">${labelHtml(p)}</td>`).join('\n')}
</tr>`).join('\n')}
</table>
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
