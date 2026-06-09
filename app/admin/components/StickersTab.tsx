'use client';
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/app/firebase';

interface StickerProduct {
  id: string;
  name: string;
  cat?: string;
  sku?: string;
  imgUrl?: string;
  image_url?: string;
}

interface InvoiceItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string;
  items: InvoiceItem[];
  processedAt?: unknown; // Firestore Timestamp or { seconds }
}

interface ModalRow {
  item: InvoiceItem;
  product: StickerProduct | null;
  qty: number;
}

interface PrintItem {
  product: StickerProduct;
  qty: number;
}

// Insert Cloudinary transform after /upload/ if applicable
function cloudImg(url: string | undefined): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_200,c_fill,q_auto,f_auto/');
  }
  return url;
}

function formatProcessedAt(pt: unknown): string {
  if (!pt || typeof pt !== 'object') return '';
  const obj = pt as Record<string, unknown>;
  if (typeof obj.toDate === 'function') {
    return (obj.toDate as () => Date)().toLocaleDateString('he-IL');
  }
  if (typeof obj.seconds === 'number') {
    return new Date(obj.seconds * 1000).toLocaleDateString('he-IL');
  }
  return '';
}

export default function StickersTab() {
  const [products, setProducts] = useState<StickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<{ invoice: Invoice; rows: ModalRow[] } | null>(null);
  // printSet drives the hidden print area — set by both table and invoice paths
  const [printSet, setPrintSet] = useState<PrintItem[]>([]);
  const [printing, setPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load products
  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerProduct)));
      setLoading(false);
    });
  }, []);

  // Wait for Firebase Auth before fetching — prevents silent permission-denied on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) loadInvoices();
      else setInvoicesLoading(false);
    });
    return () => unsub();
  }, []);

  async function loadInvoices() {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      // No orderBy — avoids index requirement; sort client-side instead
      const snap = await getDocs(collection(db, 'invoices'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
      // Sort descending — supports Firestore Timestamp (.seconds) and plain Date
      data.sort((a, b) => {
        const toSec = (x: Invoice) => {
          if (!x.processedAt || typeof x.processedAt !== 'object') return 0;
          const obj = x.processedAt as Record<string, unknown>;
          if (typeof obj.seconds === 'number') return obj.seconds;
          if (typeof (obj as unknown as Date).getTime === 'function') return (obj as unknown as Date).getTime() / 1000;
          return 0;
        };
        return toSec(b) - toSec(a);
      });
      setInvoices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[StickersTab] invoices fetch failed:', err);
      setInvoicesError(msg);
    } finally {
      setInvoicesLoading(false);
    }
  }

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  // numeric-suffix SKU index built from all loaded products
  const productSkuMap: Record<string, StickerProduct> = {};
  products.forEach(p => {
    const n = (p.sku || '').replace(/^[A-Z]+/i, '');
    if (n) productSkuMap[n] = p;
  });

  // Expand printSet into flat sticker list for the hidden print area
  const stickerList: StickerProduct[] = printSet.flatMap(({ product, qty }) =>
    qty > 0 ? Array.from({ length: qty }, () => product) : []
  );

  // ── Print engine: wait for all images, then window.print() ──────────────
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
          img.onerror = () => resolve();
        }));

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

  // ── Table path: print filtered products with manual quantities ───────────
  function handlePrintAll() {
    const items: PrintItem[] = filtered
      .map(p => ({ product: p, qty: quantities[p.id] ?? 1 }))
      .filter(x => x.qty > 0);
    if (items.length === 0) {
      alert('אין מדבקות להדפסה — הגדר כמות > 0 לפחות למוצר אחד');
      return;
    }
    setPrintSet(items);
    setPrinting(true);
  }

  // ── Invoice path: open modal ─────────────────────────────────────────────
  function openInvoiceModal(inv: Invoice) {
    const rows: ModalRow[] = (inv.items ?? []).map(item => {
      const n = item.code.replace(/^[A-Z]+/i, '');
      const product = productSkuMap[n] ?? null;
      return { item, product, qty: Number(item.quantity) || 1 };
    });
    setModal({ invoice: inv, rows });
  }

  // ── Invoice path: print from modal ───────────────────────────────────────
  function handlePrintInvoice() {
    if (!modal) return;
    const items: PrintItem[] = modal.rows
      .filter(r => r.product !== null && r.qty > 0)
      .map(r => ({ product: r.product!, qty: r.qty }));
    if (items.length === 0) {
      alert('אין מוצרים תואמים בקבלה זו');
      return;
    }
    setModal(null);
    setPrintSet(items);
    setPrinting(true);
  }

  // ── Single-product QR (existing behaviour) ───────────────────────────────
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

  const tableStickerCount = filtered.reduce((s, p) => s + Math.max(0, quantities[p.id] ?? 1), 0);

  return (
    <div>
      {/* ── Print styles ─────────────────────────────────────────────────── */}
      <style>{`
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
        .sticker-top    { display: flex; gap: 1.5mm; height: 24mm; flex-shrink: 0; }
        .sticker-img    { flex: 1; min-width: 0; height: 24mm; object-fit: cover; border-radius: 1mm; }
        .sticker-qr     { flex: 1; min-width: 0; height: 24mm; object-fit: contain; }
        .sticker-qr-full{ width: 100%; height: 24mm; object-fit: contain; flex: none; }
        .sticker-name {
          font-weight: bold; font-size: 7.5pt; line-height: 1.25;
          overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          text-align: right; direction: rtl;
          margin-top: 1.5mm; flex: 1;
        }
        .sticker-sku {
          font-size: 6.5pt; font-family: monospace; color: #555;
          text-align: left; direction: ltr;
          margin-top: 1mm; flex-shrink: 0;
        }
      `}</style>

      {/* ── Off-screen print area (images load here before window.print) ─── */}
      {printing && (
        <div
          id="sticker-print-area"
          ref={printAreaRef}
          style={{
            position: 'fixed', top: -9999, left: 0,
            display: 'grid', gridTemplateColumns: 'repeat(3, 60mm)',
            gap: '2mm', direction: 'rtl', background: '#fff', zIndex: -1,
          }}
        >
          {stickerList.map((p, i) => {
            const imgSrc = cloudImg(p.imgUrl || p.image_url);
            const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://your-sofer.com/product/${p.id}`)}`;
            return (
              <div key={i} className="sticker">
                <div className="sticker-top">
                  {imgSrc && <img className="sticker-img" src={imgSrc} alt="" />}
                  <img className={imgSrc ? 'sticker-qr' : 'sticker-qr-full'} src={qrSrc} alt="QR" />
                </div>
                <div className="sticker-name">{p.name}</div>
                {p.sku && <div className="sticker-sku">{p.sku}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Invoice modal ─────────────────────────────────────────────────── */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 24,
            width: '100%', maxWidth: 700, maxHeight: '80vh',
            overflow: 'auto', direction: 'rtl',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>
                {modal.invoice.invoiceNumber
                  ? `חשבונית #${modal.invoice.invoiceNumber}`
                  : modal.invoice.supplier}
                {' — '}{modal.invoice.supplier}
              </h3>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1, color: '#6b7280' }}
              >✕</button>
            </div>

            {/* Modal rows */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>תמונה</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>שם מוצר</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>קוד SKU</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', width: 110 }}>כמות מדבקות</th>
                </tr>
              </thead>
              <tbody>
                {modal.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee', opacity: row.product ? 1 : 0.45 }}>
                    <td style={{ padding: '6px 10px' }}>
                      {row.product ? (
                        <img
                          src={cloudImg(row.product.imgUrl || row.product.image_url)}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, background: '#f3f4f6', borderRadius: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: '#9ca3af',
                        }}>—</div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {row.product
                        ? row.product.name?.slice(0, 45)
                        : <span style={{ color: '#9ca3af', fontSize: 11 }}>
                            לא נמצא: {row.item.name.slice(0, 28)} ({row.item.code})
                          </span>}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11 }}>
                      {row.product?.sku || row.item.code}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      {row.product ? (
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={row.qty}
                          onChange={e => {
                            const v = Math.max(0, parseInt(e.target.value) || 0);
                            setModal(prev => prev
                              ? { ...prev, rows: prev.rows.map((r, j) => j === i ? { ...r, qty: v } : r) }
                              : prev
                            );
                          }}
                          style={{ width: 60, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, textAlign: 'center', fontSize: 13 }}
                        />
                      ) : <span style={{ color: '#9ca3af' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Modal footer */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(null)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                סגור
              </button>
              <button
                onClick={handlePrintInvoice}
                style={{ background: '#4338ca', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}
              >
                🖨️ הדפס מדבקות לקבלה זו
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 15 }}>🏷️ מדבקות QR</h2>

      {/* ── Invoices section ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#374151' }}>📥 קבלות שהתקבלו</h3>
        {invoicesError && (
          <div style={{ background: '#fff0f0', border: '1px solid #f87171', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 12, marginBottom: 10 }}>
            ⚠️ {invoicesError}
          </div>
        )}
        {invoicesLoading ? (
          <div style={{ color: '#999', fontSize: 13 }}>טוען קבלות...</div>
        ) : invoices.length === 0 && !invoicesError ? (
          <div style={{ color: '#9ca3af', fontSize: 13, padding: '10px 0' }}>אין קבלות עדיין</div>
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            {invoices.map((inv, i) => {
              const label = inv.invoiceNumber ? `#${inv.invoiceNumber}` : inv.supplier || '—';
              const date  = inv.invoiceDate || formatProcessedAt(inv.processedAt);
              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 14px', fontSize: 13,
                    borderBottom: i < invoices.length - 1 ? '1px solid #f0f0f0' : undefined,
                    background: '#fff', direction: 'rtl',
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 80 }}>{label}</span>
                  <span style={{ color: '#555' }}>{inv.supplier}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>{date}</span>
                  <span style={{ color: '#6366f1', fontSize: 12 }}>{inv.items?.length ?? 0} פריטים</span>
                  <div style={{ marginRight: 'auto' }}>
                    <button
                      onClick={() => openInvoiceModal(inv)}
                      disabled={loading}
                      style={{
                        background: '#4338ca', color: '#fff', border: 'none',
                        borderRadius: 5, padding: '4px 12px', fontSize: 12,
                        fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                      }}
                    >
                      🖨️ הדפס מדבקות
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Manual table section ─────────────────────────────────────────── */}
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
            background: printing ? '#6b7280' : '#4338ca', color: '#fff', border: 'none',
            borderRadius: 6, padding: '8px 20px', fontWeight: 700,
            cursor: printing ? 'wait' : 'pointer', fontSize: 13, whiteSpace: 'nowrap',
          }}
        >
          {printing
            ? '⏳ טוען תמונות...'
            : `🖨️ הדפס הכל (${tableStickerCount} מדבקות)`}
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
                    type="number" min={0} max={99}
                    value={quantities[p.id] ?? 1}
                    onChange={e => setQuantities(prev => ({
                      ...prev,
                      [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                    }))}
                    style={{ width: 60, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, textAlign: 'center', fontSize: 13 }}
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
