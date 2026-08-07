'use client';
import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/app/firebase';
import { CATS } from '@/app/constants/categories';
import { updateInventoryFromSupplierReceipt } from './InventoryTab';
import {
  useProductLabelPrint,
  PRODUCT_LABEL_PRINT_STYLES,
  cloudImg,
  type PrintableLabel,
} from '@/app/components/ProductLabelPrint';

interface StickerProduct {
  id: string;
  name: string;
  cat?: string;
  sku?: string;
  price?: number;
  warehouseBox?: string;
  imgUrl?: string;
  image_url?: string;
  receivedFromSupplier?: number;
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

// שורת יצירת מוצר חדש מפריט לא-משויך בקבלה (תמונה + מחיר + קטגוריה)
interface NewRowState {
  imgUrl?: string;
  uploadingImg?: boolean;
  price: string;
  cat: string;
  creating?: boolean;
  createdId?: string;
}

const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';

interface PrintItem {
  product: StickerProduct;
  qty: number;
}

interface OrderItem {
  productId?: string;
  quantity: number;
}

interface OrderDoc {
  id: string;
  status?: string;
  items?: OrderItem[];
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
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<{ invoice: Invoice; rows: ModalRow[] } | null>(null);
  // יצירת מוצרים מפריטים לא-משויכים — state לפי אינדקס שורה במודאל
  const [newRows, setNewRows] = useState<Record<number, NewRowState>>({});
  const newRowFileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  // ── שיוך קבלה לארגז מחסן ──────────────────────────────────────────────────
  const [boxInputs, setBoxInputs]   = useState<Record<string, string>>({});
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignMsg, setAssignMsg]   = useState<Record<string, string>>({});
  const { printLabels, printArea, printing } = useProductLabelPrint();

  // Load products (no auth required — public collection)
  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as StickerProduct)));
      setLoading(false);
    });
  }, []);

  // Wait for Firebase Auth before fetching protected collections
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        loadInvoices();
        loadOrders();
      } else {
        setInvoicesLoading(false);
        setOrdersLoading(false);
      }
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

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const snap = await getDocs(collection(db, 'orders'));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDoc)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[StickersTab] orders fetch failed:', err);
      setOrdersError(msg);
    } finally {
      setOrdersLoading(false);
    }
  }

  // soldMap: exclude pending_payment and cancelled — same semantics as getSold in InventoryTab
  const soldMap: Record<string, number> = orders
    .filter(o => o.status !== 'pending_payment' && o.status !== 'cancelled')
    .flatMap(o => o.items ?? [])
    .reduce<Record<string, number>>((m, i) => {
      const pid = i.productId ?? (i as any).id;
      if (pid) m[pid] = (m[pid] ?? 0) + i.quantity;
      return m;
    }, {});

  // Current in-stock = receivedFromSupplier − sold, clamped to ≥0
  function getInStock(p: StickerProduct): number {
    return Math.max(0, (p.receivedFromSupplier ?? 0) - (soldMap[p.id] ?? 0));
  }

  // Filtered for the manual table — only products with stock > 0
  const filtered = products.filter(p =>
    getInStock(p) > 0 &&
    (!search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  // numeric-suffix SKU index built from all loaded products
  const productSkuMap: Record<string, StickerProduct> = {};
  products.forEach(p => {
    const n = (p.sku || '').replace(/^[A-Z]+/i, '');
    if (n) productSkuMap[n] = p;
  });

  function toLabel(p: StickerProduct): PrintableLabel {
    return { id: p.id, name: p.name, sku: p.sku, price: p.price, warehouseBox: p.warehouseBox, imgUrl: p.imgUrl, image_url: p.image_url };
  }

  // ── Table path: print filtered products with manual quantities ───────────
  // One label per product type (regardless of quantity in stock)
  function handlePrintAll() {
    const items: PrintItem[] = filtered
      .map(p => ({ product: p, qty: quantities[p.id] ?? getInStock(p) }))
      .filter(x => x.qty > 0);
    if (items.length === 0) {
      alert('אין מדבקות להדפסה — הגדר כמות > 0 לפחות למוצר אחד');
      return;
    }
    printLabels(items.map(({ product }) => toLabel(product)));
  }

  // ── Invoice path: open modal ─────────────────────────────────────────────
  function openInvoiceModal(inv: Invoice) {
    const rows: ModalRow[] = (inv.items ?? []).flatMap((item): ModalRow[] => {
      const n = item.code.replace(/^[A-Z]+/i, '');
      const product = productSkuMap[n] ?? null;
      if (product) {
        const inStock = getInStock(product);
        if (inStock <= 0) return []; // exclude matched products with no stock
        return [{ item, product, qty: inStock }];
      }
      // keep unmatched items for informational display (won't be printed)
      return [{ item, product: null, qty: 0 }];
    });
    setModal({ invoice: inv, rows });
    setNewRows({});
  }

  // ── יצירת מוצר חדש מפריט לא-משויך ────────────────────────────────────────
  function updateNewRow(i: number, patch: Partial<NewRowState>) {
    setNewRows(prev => {
      const current: NewRowState = prev[i] ?? { price: '', cat: 'יודאיקה' };
      return { ...prev, [i]: { ...current, ...patch } };
    });
  }

  async function handleNewRowImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    updateNewRow(i, { uploadingImg: true });
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res = await fetch(CLOUDINARY_UPLOAD, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error('upload failed');
      updateNewRow(i, { imgUrl: data.secure_url, uploadingImg: false });
    } catch {
      updateNewRow(i, { uploadingImg: false });
      alert('שגיאה בהעלאת התמונה — נסה שוב');
    } finally {
      e.target.value = '';
    }
  }

  async function createProductFromRow(i: number) {
    if (!modal) return;
    const row = modal.rows[i];
    const nr = newRows[i];
    if (!row || row.product || !nr) return;
    const price = Number(nr.price);
    if (!nr.imgUrl) { alert('העלה תמונה למוצר לפני ההוספה'); return; }
    if (!(price > 0)) { alert('הזן מחיר מכירה תקין'); return; }
    if (!nr.cat || nr.cat === 'הכל') { alert('בחר קטגוריה'); return; }

    updateNewRow(i, { creating: true });
    try {
      const qty = Number(row.item.quantity) || 0;
      const unitPrice = Number(row.item.unitPrice) || 0;
      // סכמה זהה לזרימת יצירת מוצר מקבלה ב-InventoryTab
      const productData = {
        name: row.item.name.trim(),
        price,
        desc: '',
        cat: nr.cat,
        category: nr.cat,
        days: '7-10',
        imgUrl: nr.imgUrl,
        sku: row.item.code.trim() || null,
        soferBasePrice: unitPrice,
        receivedFromSupplier: qty,
        inStock: qty,
        outOfStock: qty === 0,
        stockVisible: true,
        priority: 50,
        hidden: false,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'products'), productData);
      const newProduct: StickerProduct = {
        id: ref.id, name: productData.name, cat: nr.cat, sku: row.item.code,
        price, imgUrl: nr.imgUrl, receivedFromSupplier: qty,
      };
      // עדכון מקומי: המוצר הופך למשויך וזמין להדפסת מדבקות מיד
      setProducts(prev => [...prev, newProduct]);
      setModal(prev => prev
        ? { ...prev, rows: prev.rows.map((r, j) => j === i ? { ...r, product: newProduct, qty } : r) }
        : prev
      );
      updateNewRow(i, { creating: false, createdId: ref.id });
      // צירוף אוטומטי למבצע all_in_stock פעיל — עקבי עם שאר זרימות המלאי
      updateInventoryFromSupplierReceipt([{ productId: ref.id, quantity: qty, unitPrice, price }])
        .catch(e => console.error('[StickersTab] auto-promo join failed (non-fatal):', e));
    } catch (e) {
      console.error('[StickersTab] create product failed:', e);
      updateNewRow(i, { creating: false });
      alert('שגיאה ביצירת המוצר');
    }
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
    printLabels(items.map(({ product }) => toLabel(product)));
  }

  // ── שיוך כל מוצרי הקבלה לארגז מחסן ───────────────────────────────────────
  async function assignInvoiceToBox(inv: Invoice) {
    const box = (boxInputs[inv.id] ?? '').trim();
    if (!box) {
      alert('הזן מספר ארגז לפני השיוך');
      return;
    }
    // התאמת פריטי הקבלה למוצרים — אותה לוגיקת SKU כמו בהדפסת מדבקות
    const matched = new Map<string, StickerProduct>();
    let unmatched = 0;
    for (const item of inv.items ?? []) {
      const n = item.code.replace(/^[A-Z]+/i, '');
      const product = productSkuMap[n] ?? null;
      if (product) matched.set(product.id, product);
      else unmatched++;
    }
    if (matched.size === 0) {
      alert('לא נמצאו מוצרים תואמים בקבלה זו');
      return;
    }
    const label = inv.invoiceNumber ? `#${inv.invoiceNumber}` : inv.supplier;
    if (!confirm(`לשייך ${matched.size} מוצרים מקבלה ${label} לארגז "${box}"?${unmatched ? `\n(${unmatched} פריטים ללא התאמה ידולגו)` : ''}`)) return;

    setAssigningId(inv.id);
    let ok = 0, failed = 0;
    for (const p of matched.values()) {
      try {
        await updateDoc(doc(db, 'products', p.id), { warehouseBox: box });
        ok++;
      } catch (err) {
        console.error('[StickersTab] box assign failed:', p.id, err);
        failed++;
      }
    }
    // עדכון מקומי כדי שהמדבקות יודפסו עם הארגז החדש בלי רענון
    setProducts(prev => prev.map(p => matched.has(p.id) ? { ...p, warehouseBox: box } : p));
    setAssigningId(null);
    setAssignMsg(prev => ({
      ...prev,
      [inv.id]: failed
        ? `⚠️ שויכו ${ok}, נכשלו ${failed}`
        : `✅ ${ok} מוצרים שויכו לארגז ${box}`,
    }));
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

  const tableStickerCount = filtered.reduce((s, p) => s + Math.max(0, quantities[p.id] ?? getInStock(p)), 0);

  return (
    <div>
      {/* ── Print styles + off-screen print area (shared with product-edit label printing) ── */}
      <style>{PRODUCT_LABEL_PRINT_STYLES}</style>
      {printArea}

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
                  <tr key={i} style={{ borderBottom: '1px solid #eee', opacity: row.product ? 1 : 0.9 }}>
                    <td style={{ padding: '6px 10px' }}>
                      {row.product ? (
                        <img
                          src={cloudImg(row.product.imgUrl || row.product.image_url)}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                        />
                      ) : (
                        <div
                          onClick={() => !newRows[i]?.uploadingImg && newRowFileRefs.current[i]?.click()}
                          title="העלה תמונה למוצר"
                          style={{
                            width: 40, height: 40, borderRadius: 4, cursor: 'pointer',
                            background: newRows[i]?.imgUrl ? 'transparent' : '#f3f4f6',
                            border: newRows[i]?.imgUrl ? '1px solid var(--ys-accent)' : '1px dashed #9ca3af',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: newRows[i]?.imgUrl ? 0 : 14, color: '#6b7280', overflow: 'hidden',
                          }}
                        >
                          <input
                            ref={el => { newRowFileRefs.current[i] = el; }}
                            type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => handleNewRowImage(i, e)}
                          />
                          {newRows[i]?.uploadingImg
                            ? <span style={{ fontSize: 9 }}>⏳</span>
                            : newRows[i]?.imgUrl
                              ? <img src={newRows[i].imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : '📷'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {row.product
                        ? row.product.name?.slice(0, 45)
                        : (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                              {row.item.name.slice(0, 40)}
                              <span style={{ color: '#9ca3af', fontWeight: 400 }}> ({row.item.code}) · לא קיים באתר</span>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5, flexWrap: 'wrap' }}>
                              <input
                                type="number" min={1} placeholder="מחיר ₪"
                                value={newRows[i]?.price ?? ''}
                                onChange={e => updateNewRow(i, { price: e.target.value })}
                                style={{ width: 70, padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                              />
                              <select
                                value={newRows[i]?.cat ?? 'יודאיקה'}
                                onChange={e => updateNewRow(i, { cat: e.target.value })}
                                style={{ padding: '3px 6px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, maxWidth: 130 }}
                              >
                                {CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button
                                onClick={() => createProductFromRow(i)}
                                disabled={newRows[i]?.creating || newRows[i]?.uploadingImg}
                                style={{
                                  background: newRows[i]?.creating ? '#6b7280' : '#15803d', color: '#fff',
                                  border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 12,
                                  fontWeight: 700, cursor: newRows[i]?.creating ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                                }}
                              >
                                {newRows[i]?.creating ? '⏳ יוצר...' : '➕ הוסף לאתר'}
                              </button>
                            </div>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>
                              עלות ספק: ₪{row.item.unitPrice} · כמות בקבלה: {row.item.quantity} — לחץ על 📷 להעלאת תמונה
                            </div>
                          </div>
                        )}
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
                  {assignMsg[inv.id] && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: assignMsg[inv.id].startsWith('✅') ? '#15803d' : '#b45309' }}>
                      {assignMsg[inv.id]}
                    </span>
                  )}
                  <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="מס' ארגז"
                      value={boxInputs[inv.id] ?? ''}
                      onChange={e => setBoxInputs(prev => ({ ...prev, [inv.id]: e.target.value }))}
                      style={{ width: 70, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, textAlign: 'center' }}
                    />
                    <button
                      onClick={() => assignInvoiceToBox(inv)}
                      disabled={loading || assigningId === inv.id}
                      style={{
                        background: assigningId === inv.id ? '#6b7280' : '#0f766e', color: '#fff', border: 'none',
                        borderRadius: 5, padding: '4px 12px', fontSize: 12,
                        fontWeight: 700, cursor: assigningId === inv.id ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {assigningId === inv.id ? '⏳ משייך...' : '📦 שייך לארגז'}
                    </button>
                    <button
                      onClick={() => openInvoiceModal(inv)}
                      disabled={loading}
                      style={{
                        background: '#4338ca', color: '#fff', border: 'none',
                        borderRadius: 5, padding: '4px 12px', fontSize: 12,
                        fontWeight: 700, cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
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

      {/* ── Orders error banner ───────────────────────────────────────────── */}
      {ordersError && (
        <div style={{ background: '#fff0f0', border: '1px solid #f87171', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 12, marginBottom: 12 }}>
          ⚠️ שגיאה בטעינת הזמנות — חישוב המלאי עלול להיות שגוי: {ordersError}
        </div>
      )}

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

      {loading || ordersLoading ? (
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
                    value={quantities[p.id] ?? getInStock(p)}
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
