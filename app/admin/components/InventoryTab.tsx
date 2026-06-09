'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { Product } from '@/app/lib/types';
import { Order } from '@/app/lib/types';

interface InventoryTabProps {
  products: Product[];
  orders: Order[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
}

interface EditState {
  soferBasePrice: string;
  receivedFromSupplier: string;
}

interface ParsedItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ParsedInvoice {
  invoiceDate: string;
  invoiceNumber: string;
  supplier: string;
  items: ParsedItem[];
}

export default function InventoryTab({ products, orders, onSave }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [applyingInvoice, setApplyingInvoice] = useState(false);
  const [skuMap, setSkuMap] = useState<Record<string, Product>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allProductsLoading, setAllProductsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const data: Product[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
        console.log(`[InventoryTab] Loaded ${data.length} products from Firestore`);
        setAllProducts(data);
      } catch (e) {
        console.error('[InventoryTab] loadAllProducts', e);
      } finally {
        setAllProductsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!parsedInvoice) { setSkuMap({}); return; }
    (async () => {
      const numbers = new Set(
        parsedInvoice.items
          .map(i => i.code.replace(/^[A-Z]+/i, ''))
          .filter(n => n.length > 0)
      );
      if (numbers.size === 0) return;
      // Fetch all products that have a sku, then match by numeric suffix
      const snap = await getDocs(
        query(collection(db, 'products'), where('sku', '>=', ' '))
      );
      const map: Record<string, Product> = {};
      snap.forEach(d => {
        const p = { id: d.id, ...d.data() } as Product;
        const n = (p.sku || '').replace(/^[A-Z]+/i, '');
        if (n && numbers.has(n)) map[n] = p;
      });
      setSkuMap(map);
    })();
  }, [parsedInvoice]);

  // מחושב מ-orders.items[].quantity של כל ההזמנות (לא pending_payment ולא cancelled)
  const soldMap: Record<string, number> = orders
    .flatMap(o => o.items ?? [])
    .reduce<Record<string, number>>((m, i) => {
      if (i.productId) m[i.productId] = (m[i.productId] ?? 0) + i.quantity;
      return m;
    }, {});

  const getSold = (productId: string) => soldMap[productId] ?? 0;

  const getInventory = (product: Product) =>
    (product.receivedFromSupplier ?? 0) - getSold(product.id);

  const inventoryProducts = allProducts
    .map(p => ({
      ...p,
      computedInStock: getInventory(p),
      inventoryValue: getInventory(p) * (p.soferBasePrice ?? 0),
    }))
    .filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.computedInStock - a.computedInStock);

  console.log(`[InventoryTab] Filtered to ${inventoryProducts.length} products in inventory (search: "${searchTerm}")`);

  const totalValue    = inventoryProducts.reduce((s, p) => s + p.inventoryValue, 0);
  const totalInStock  = allProducts.reduce((s, p) => s + Math.max(0, getInventory(p)), 0);
  const totalSold     = Object.values(soldMap).reduce((s, v) => s + v, 0);
  const totalReceived = allProducts.reduce((s, p) => s + (p.receivedFromSupplier ?? 0), 0);

  function startEdit(p: typeof inventoryProducts[0]) {
    setEditing(prev => ({
      ...prev,
      [p.id]: {
        soferBasePrice: String(p.soferBasePrice ?? ''),
        receivedFromSupplier: String(p.receivedFromSupplier ?? ''),
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setParsedInvoice(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: form });
      const data = await res.json();
      if (data.error) { alert('שגיאה בניתוח: ' + data.error); return; }
      setParsedInvoice(data as ParsedInvoice);
    } catch (err) {
      alert('שגיאה בשליחה');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function applyInvoice() {
    if (!parsedInvoice) return;
    setApplyingInvoice(true);
    try {
      // בדוק כפילות רק כשיש מספר חשבונית — קבלה ללא מספר תמיד תיכנס
      if (parsedInvoice.invoiceNumber) {
        const dupSnap = await getDocs(
          query(
            collection(db, 'invoices'),
            where('invoiceNumber', '==', parsedInvoice.invoiceNumber),
            where('supplier', '==', parsedInvoice.supplier)
          )
        );
        if (!dupSnap.empty) {
          const existing = dupSnap.docs[0].data();
          const pt = existing.processedAt;
          const existingDate = pt?.toDate
            ? pt.toDate().toLocaleDateString('he-IL')
            : pt?.seconds
              ? new Date(pt.seconds * 1000).toLocaleDateString('he-IL')
              : 'תאריך לא ידוע';
          const proceed = window.confirm(
            `חשבונית #${parsedInvoice.invoiceNumber} כבר הוכנסה ב-${existingDate}.\nהמשך בכל זאת?`
          );
          if (!proceed) return;
        }
      }

      for (const item of parsedInvoice.items) {
        const itemNumber = item.code.replace(/^[A-Z]+/i, '');
        const product = skuMap[itemNumber];
        if (!product) continue;
        const prevReceived = product.receivedFromSupplier ?? 0;
        const qty          = Number(item.quantity) || 0;
        const newReceived  = prevReceived + qty;
        const sold         = getSold(product.id);
        await onSave(product.id, {
          receivedFromSupplier: newReceived,
          soferBasePrice:        item.unitPrice,
          inStock:              newReceived - sold,
        });
      }

      // שמור חשבונית ב-Firestore — תמיד, גם ללא מספר חשבונית
      try {
        await addDoc(collection(db, 'invoices'), {
          invoiceNumber: parsedInvoice.invoiceNumber,
          supplier:      parsedInvoice.supplier,
          invoiceDate:   parsedInvoice.invoiceDate,
          items: parsedInvoice.items.map(i => ({
            code:      i.code,
            name:      i.name,
            quantity:  Number(i.quantity)  || 0,
            unitPrice: Number(i.unitPrice) || 0,
          })),
          processedAt: serverTimestamp(),
        });
      } catch (invoiceErr: unknown) {
        const msg = invoiceErr instanceof Error ? invoiceErr.message : String(invoiceErr);
        console.error('[InventoryTab] addDoc invoices failed:', invoiceErr);
        alert('⚠️ המלאי עודכן אך שמירת הקבלה נכשלה:\n' + msg);
        return;
      }

      setParsedInvoice(null);
      alert('המלאי עודכן בהצלחה! ✅');
    } finally {
      setApplyingInvoice(false);
    }
  }

  async function saveEdit(id: string) {
    const e = editing[id];
    if (!e) return;
    setSaving(id);
    const data: Partial<Product> = {};
    if (e.soferBasePrice !== '') data.soferBasePrice = parseFloat(e.soferBasePrice);
    if (e.receivedFromSupplier !== '') data.receivedFromSupplier = parseInt(e.receivedFromSupplier);
    // inStock = receivedFromSupplier - sold (numeric, not boolean)
    if (data.receivedFromSupplier !== undefined) {
      data.inStock = data.receivedFromSupplier - getSold(id);
    }
    await onSave(id, data);
    setSaving(null);
    cancelEdit(id);
  }

  if (allProductsLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#666', fontSize: 15 }}>
        ⏳ טוען את כל המוצרים...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 10 }}>📦 ניהול מלאי</h2>

        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
          <input
            type="text"
            placeholder="חפש מוצר..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
          />
          <label style={{
            background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            {uploading ? '⏳ מנתח...' : '📤 העלה קבלה מהספק'}
            <input type="file" accept="image/*" onChange={handleReceiptUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>

        {/* Invoice preview after OCR */}
        {parsedInvoice && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              📄 חשבונית #{parsedInvoice.invoiceNumber} — {parsedInvoice.supplier} ({parsedInvoice.invoiceDate})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #fcd34d' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>קוד</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right' }}>שם</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>כמות</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>מחיר יחידה</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center' }}>מוצר בחנות</th>
                </tr>
              </thead>
              <tbody>
                {parsedInvoice.items.map((item, i) => {
                  const itemNumber = item.code.replace(/^[A-Z]+/i, '');
                  const matched = skuMap[itemNumber];
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #fef3c7', background: matched ? '#f0fdf4' : undefined }}>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{item.code}</td>
                      <td style={{ padding: '4px 8px' }}>{item.name.slice(0, 35)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>₪{item.unitPrice}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center', fontSize: 11, color: matched ? '#16a34a' : '#9ca3af' }}>
                        {matched ? `✓ ${matched.name?.slice(0, 25)}` : '— לא נמצא'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={applyInvoice}
                disabled={applyingInvoice}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}
              >
                {applyingInvoice ? '⏳ מעדכן...' : '✓ עדכן מלאי'}
              </button>
              <button
                onClick={() => setParsedInvoice(null)}
                style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <div style={{
          background: '#f0f9ff', padding: 12, borderRadius: 8, marginBottom: 15,
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>סה&quot;כ מוצרים</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{allProducts.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>סה&quot;כ יחידות במלאי</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0369a1' }}>{totalInStock}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>סה&quot;כ מכרנו</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>{totalSold}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>סה&quot;כ קיבלנו</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>{totalReceived}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666' }}>שווי מלאי כולל</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₪{totalValue.toFixed(0)}</div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: 10, textAlign: 'right' }}>מוצר</th>
              <th style={{ padding: 10, textAlign: 'right' }}>קוד</th>
              <th style={{ padding: 10, textAlign: 'center' }}>מחיר קנייה</th>
              <th style={{ padding: 10, textAlign: 'center' }}>קבלנו</th>
              <th style={{ padding: 10, textAlign: 'center' }}>נמכר</th>
              <th style={{ padding: 10, textAlign: 'center' }}>במלאי</th>
              <th style={{ padding: 10, textAlign: 'center' }}>שווי</th>
              <th style={{ padding: 10, textAlign: 'center' }}>עריכה</th>
            </tr>
          </thead>
          <tbody>
            {inventoryProducts.map(p => {
              const e = editing[p.id];
              const sold = getSold(p.id);
              const displayStock = e
                ? parseInt(e.receivedFromSupplier || '0') - sold
                : p.computedInStock;
              const stockBg = displayStock < 0 ? '#fee2e2' : displayStock === 0 ? '#fee2e2' : displayStock < 5 ? '#fef3c7' : '#ecfdf5';
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee', background: e ? '#fffbeb' : undefined }}>
                  <td style={{ padding: 10 }}>{p.name?.slice(0, 40)}</td>
                  <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{p.sku || '-'}</td>

                  {/* מחיר קנייה */}
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {e ? (
                      <input
                        type="number"
                        value={e.soferBasePrice}
                        onChange={ev => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], soferBasePrice: ev.target.value } }))}
                        style={{ width: 70, padding: '2px 4px', border: '1px solid #aaa', borderRadius: 4, textAlign: 'center' }}
                      />
                    ) : `₪${(p.soferBasePrice ?? 0).toFixed(2)}`}
                  </td>

                  {/* קבלנו */}
                  <td style={{ padding: 10, textAlign: 'center', fontWeight: 700 }}>
                    {e ? (
                      <input
                        type="number"
                        value={e.receivedFromSupplier}
                        onChange={ev => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], receivedFromSupplier: ev.target.value } }))}
                        style={{ width: 60, padding: '2px 4px', border: '1px solid #aaa', borderRadius: 4, textAlign: 'center' }}
                      />
                    ) : (p.receivedFromSupplier ?? 0)}
                  </td>

                  <td style={{ padding: 10, textAlign: 'center' }}>{sold}</td>

                  {/* במלאי */}
                  <td style={{ padding: 10, textAlign: 'center', fontWeight: 700, background: stockBg }}>
                    {displayStock < 0
                      ? <span style={{ color: '#dc2626' }}>⚠️ {displayStock}</span>
                      : displayStock}
                  </td>

                  <td style={{ padding: 10, textAlign: 'center' }}>₪{p.inventoryValue.toFixed(2)}</td>

                  {/* כפתורי עריכה */}
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {e ? (
                      <span style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button
                          onClick={() => saveEdit(p.id)}
                          disabled={saving === p.id}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
                        >
                          {saving === p.id ? '...' : '✓'}
                        </button>
                        <button
                          onClick={() => cancelEdit(p.id)}
                          style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => startEdit(p)}
                        style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
