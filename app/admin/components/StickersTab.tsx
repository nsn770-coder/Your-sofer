'use client';
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface StickerProduct {
  id: string;
  name: string;
  cat?: string;
  sku?: string;
  imgUrl?: string;
  image_url?: string;
}

// Insert Cloudinary transform after /upload/ if applicable
function cloudImg(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_200,c_fill,q_auto,f_auto/');
  }
  return url;
}

export default function StickersTab() {
  const [products, setProducts] = useState<StickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [printing, setPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerProduct)));
      setLoading(false);
    });
  }, []);

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  // Expand each product by its quantity into individual sticker instances
  const stickerList = filtered.flatMap(p => {
    const qty = quantities[p.id] ?? 1;
    return qty > 0 ? Array.from({ length: qty }, () => p) : [];
  });

  // After printing=true, wait for all images then call window.print()
  useEffect(() => {
    if (!printing) return;
    const el = printAreaRef.current;
    if (!el) { setPrinting(false); return; }

    let cancelled = false;

    (async () => {
      const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
      const loads = imgs
        .filter(img => !img.complete || img.naturalHeight === 0)
        .map(img => new Promise<void>(resolve => {
          img.onload  = () => resolve();
          img.onerror = () => resolve(); // don't block print on broken image
        }));

      // Wait for all images — 5 s fallback so print never hangs
      await Promise.race([
        Promise.all(loads),
        new Promise<void>(r => setTimeout(r, 5000)),
      ]);

      if (!cancelled) window.print();
    })();

    const onAfterPrint = () => setPrinting(false);
    window.addEventListener('afterprint', onAfterPrint, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printing]);

  function handlePrintAll() {
    if (stickerList.length === 0) {
      alert('אין מדבקות להדפסה — הגדר כמות > 0 לפחות למוצר אחד');
      return;
    }
    setPrinting(true);
  }

  // Single-product QR (existing behaviour — opens new window)
  function printQR(productId: string, name: string) {
    const url = `${window.location.origin}/product/${productId}`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR - ${name}</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
      </head><body style="font-family:sans-serif;padding:20px;text-align:center">
        <h3>${name}</h3>
        <canvas id="qr"></canvas>
        <p style="font-size:11px;color:#666">${url}</p>
        <script>
          QRCode.toCanvas(document.getElementById('qr'), '${url}', { width: 200 }, function() { window.print(); });
        </script>
      </body></html>
    `);
  }

  return (
    <div>
      {/* ── Print styles ───────────────────────────────────────────────────── */}
      <style>{`
        @page { margin: 8mm; size: A4 portrait; }

        @media print {
          /* hide everything, then reveal only the sticker area */
          body * { visibility: hidden; }
          #sticker-print-area,
          #sticker-print-area * { visibility: visible; }
          #sticker-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            display: grid !important;
            grid-template-columns: repeat(3, 60mm) !important;
            gap: 2mm !important;
            padding: 0 !important;
            direction: rtl !important;
            background: #fff !important;
          }
        }

        /* Sticker card — shared between screen (off-screen) and print */
        .sticker {
          width: 60mm;
          height: 45mm;
          border: 0.4pt solid #bbb;
          padding: 2mm;
          box-sizing: border-box;
          direction: rtl;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          page-break-inside: avoid;
          break-inside: avoid;
          background: #fff;
        }
        .sticker-top {
          display: flex;
          gap: 1.5mm;
          height: 24mm;
          flex-shrink: 0;
        }
        .sticker-img {
          flex: 1;
          min-width: 0;
          height: 24mm;
          object-fit: cover;
          border-radius: 1mm;
        }
        .sticker-qr {
          flex: 1;
          min-width: 0;
          height: 24mm;
          object-fit: contain;
        }
        .sticker-qr-full {
          width: 100%;
          height: 24mm;
          object-fit: contain;
          flex: none;
        }
        .sticker-name {
          font-weight: bold;
          font-size: 7.5pt;
          line-height: 1.25;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-align: right;
          direction: rtl;
          margin-top: 1.5mm;
          flex: 1;
        }
        .sticker-sku {
          font-size: 6.5pt;
          font-family: monospace;
          color: #555;
          text-align: left;
          direction: ltr;
          margin-top: 1mm;
          flex-shrink: 0;
        }
      `}</style>

      {/* ── Off-screen sticker area (rendered off-screen so images load) ─── */}
      {printing && (
        <div
          id="sticker-print-area"
          ref={printAreaRef}
          style={{
            position: 'fixed',
            top: -9999,
            left: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 60mm)',
            gap: '2mm',
            direction: 'rtl',
            background: '#fff',
            zIndex: -1,
          }}
        >
          {stickerList.map((p, i) => {
            const imgSrc = cloudImg(p.imgUrl || p.image_url);
            const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://your-sofer.com/product/${p.id}`)}`;
            return (
              <div key={i} className="sticker">
                <div className="sticker-top">
                  {imgSrc && <img className="sticker-img" src={imgSrc} alt="" />}
                  <img
                    className={imgSrc ? 'sticker-qr' : 'sticker-qr-full'}
                    src={qrSrc}
                    alt="QR"
                  />
                </div>
                <div className="sticker-name">{p.name}</div>
                {p.sku && <div className="sticker-sku">{p.sku}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── UI ──────────────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>🏷️ מדבקות QR</h2>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 15 }}>
        <input
          type="text"
          placeholder="חפש מוצר או קוד SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <button
          onClick={handlePrintAll}
          disabled={printing}
          style={{
            background: printing ? '#6b7280' : '#4338ca',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontWeight: 700,
            cursor: printing ? 'wait' : 'pointer',
            fontSize: 13,
            whiteSpace: 'nowrap',
          }}
        >
          {printing
            ? '⏳ טוען תמונות...'
            : `🖨️ הדפס הכל (${stickerList.length} מדבקות)`}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>טוען...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>מוצר</th>
              <th style={{ padding: 10, textAlign: 'right' }}>קטגוריה</th>
              <th style={{ padding: 10, textAlign: 'right' }}>קוד SKU</th>
              <th style={{ padding: 10, textAlign: 'center', width: 110 }}>כמות מדבקות</th>
              <th style={{ padding: 10, textAlign: 'center' }}>QR בודד</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{p.name?.slice(0, 45)}</td>
                <td style={{ padding: 10, color: '#666' }}>{p.cat || '—'}</td>
                <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{p.sku || '—'}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={quantities[p.id] ?? 1}
                    onChange={e => setQuantities(prev => ({
                      ...prev,
                      [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                    }))}
                    style={{
                      width: 60, padding: '3px 6px',
                      border: '1px solid #ddd', borderRadius: 4,
                      textAlign: 'center', fontSize: 13,
                    }}
                  />
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => printQR(p.id, p.name)}
                    style={{
                      background: '#4338ca', color: '#fff', border: 'none',
                      borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    הדפס QR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
