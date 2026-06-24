'use client';
import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared product-label (sticker) printing — extracted from StickersTab so the
// same label markup/print engine can be reused from the product edit screens.
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

export const PRODUCT_LABEL_PRINT_STYLES = `
  @page { margin: 8mm; size: A4 portrait; }
  @media print {
    body * { visibility: hidden; }
    #sticker-print-area,
    #sticker-print-area * { visibility: visible; }
    #sticker-print-area {
      position: absolute !important;
      top: 0 !important; left: 0 !important;
      display: grid !important;
      grid-template-columns: repeat(3, 60mm) !important;
      gap: 2mm !important;
      padding: 0 !important;
      direction: rtl !important;
      background: #fff !important;
    }
  }
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

// Renders the actual label cards (no wrapper grid — caller positions them).
export function ProductLabelGrid({ items }: { items: PrintableLabel[] }) {
  return (
    <>
      {items.map((p, i) => {
        const imgSrc = cloudImg(p.imgUrl || p.image_url);
        const qrSrc = qrSrcForProduct(p.id);
        return (
          <div key={p.id + i} className="sticker">
            <div className="sticker-top">
              {imgSrc && <img className="sticker-img" src={imgSrc} alt="" />}
              <img className={imgSrc ? 'sticker-qr' : 'sticker-qr-full'} src={qrSrc} alt="QR" />
            </div>
            <div className="sticker-name">{p.name}</div>
            <div className="sticker-meta-row">
              {p.sku && <span className="sticker-sku">{p.sku}</span>}
              {p.price != null && <span className="sticker-price">₪{p.price}</span>}
            </div>
            {p.warehouseBox && (
              <div className="sticker-meta-row">
                <span className="sticker-box">📦 ארגז {p.warehouseBox}</span>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Hook for printing one or many product labels from anywhere in the admin UI.
// Renders an off-screen print area, waits for label images (QR/product photo)
// to load, then triggers window.print() — same engine as the original
// StickersTab sticker-grid flow.
export function useProductLabelPrint() {
  const [printItems, setPrintItems] = useState<PrintableLabel[] | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!printItems) return;
    const el = printAreaRef.current;
    if (!el) return; // print area not mounted yet — should not happen since it renders alongside printItems

    let cancelled = false;

    (async () => {
      const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
      const loads = imgs
        .filter(img => !img.complete || img.naturalHeight === 0)
        .map(img => new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }));

      await Promise.race([
        Promise.all(loads),
        new Promise<void>(r => setTimeout(r, 5000)),
      ]);

      if (!cancelled) window.print();
    })();

    const onAfterPrint = () => setPrintItems(null);
    window.addEventListener('afterprint', onAfterPrint, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printItems]);

  function printLabels(items: PrintableLabel[]) {
    if (!items.length) return;
    setPrintItems(items);
  }

  const printArea = printItems && (
    <div
      id="sticker-print-area"
      ref={printAreaRef}
      style={{
        position: 'fixed', top: -9999, left: 0,
        display: 'grid', gridTemplateColumns: 'repeat(3, 60mm)',
        gap: '2mm', direction: 'rtl', background: '#fff', zIndex: -1,
      }}
    >
      <ProductLabelGrid items={printItems} />
    </div>
  );

  return { printLabels, printArea, printing: !!printItems };
}
