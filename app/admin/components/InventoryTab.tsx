'use client';
import { useState } from 'react';
import { Product } from '@/app/lib/types';
import { Order } from '@/app/lib/types';

interface InventoryTabProps {
  products: Product[];
  orders: Order[];
  onSave: (productId: string, data: Partial<Product>) => Promise<void>;
}

interface EditState {
  purchasePrice: string;
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

  const getSold = (productId: string) =>
    orders.flatMap(o => o.items ?? []).filter(i => i.productId === productId).reduce((s, i) => s + i.quantity, 0);

  const getInventory = (product: Product) =>
    (product.receivedFromSupplier ?? 0) - getSold(product.id);

  const inventoryProducts = products
    .map(p => ({
      ...p,
      computedInStock: getInventory(p),
      inventoryValue: getInventory(p) * (p.purchasePrice ?? 0),
    }))
    .filter(p => !searchTerm || p.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.computedInStock - a.computedInStock);

  const totalValue = inventoryProducts.reduce((s, p) => s + p.inventoryValue, 0);

  function startEdit(p: typeof inventoryProducts[0]) {
    setEditing(prev => ({
      ...prev,
      [p.id]: {
        purchasePrice: String(p.purchasePrice ?? ''),
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
    for (const item of parsedInvoice.items) {
      const product = products.find(p => p.sku === item.code);
      if (!product) continue;
      const prevReceived = product.receivedFromSupplier ?? 0;
      const newReceived  = prevReceived + item.quantity;
      const sold         = getSold(product.id);
      await onSave(product.id, {
        receivedFromSupplier: newReceived,
        purchasePrice:        item.unitPrice,
        inStock:              newReceived - sold,
      });
    }
    setApplyingInvoice(false);
    setParsedInvoice(null);
    alert('המלאי עודכן בהצלחה!');
  }

  async function saveEdit(id: string) {
    const e = editing[id];
    if (!e) return;
    setSaving(id);
    const data: Partial<Product> = {};
    if (e.purchasePrice !== '') data.purchasePrice = parseFloat(e.purchasePrice);
    if (e.receivedFromSupplier !== '') data.receivedFromSupplier = parseInt(e.receivedFromSupplier);
    // inStock = receivedFromSupplier - sold (numeric, not boolean)
    if (data.receivedFromSupplier !== undefined) {
      data.inStock = data.receivedFromSupplier - getSold(id);
    }
    await onSave(id, data);
    setSaving(null);
    cancelEdit(id);
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
                  const matched = products.find(p => p.sku === item.code);
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
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 12, color: '#666' }}>סה&quot;כ מוצרים</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{inventoryProducts.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666' }}>סה&quot;כ יחידות במלאי</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {inventoryProducts.reduce((s, p) => s + Math.max(0, p.computedInStock), 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#666' }}>שווי מלאי כולל</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>₪{totalValue.toFixed(2)}</div>
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
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee', background: e ? '#fffbeb' : undefined }}>
                  <td style={{ padding: 10 }}>{p.name?.slice(0, 40)}</td>
                  <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{p.sku || '-'}</td>

                  {/* מחיר קנייה */}
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    {e ? (
                      <input
                        type="number"
                        value={e.purchasePrice}
                        onChange={ev => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], purchasePrice: ev.target.value } }))}
                        style={{ width: 70, padding: '2px 4px', border: '1px solid #aaa', borderRadius: 4, textAlign: 'center' }}
                      />
                    ) : `₪${(p.purchasePrice ?? 0).toFixed(2)}`}
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
                  <td style={{
                    padding: 10, textAlign: 'center', fontWeight: 700,
                    background: p.computedInStock === 0 ? '#fee2e2' : p.computedInStock < 5 ? '#fef3c7' : '#ecfdf5',
                  }}>
                    {e
                      ? Math.max(0, parseInt(e.receivedFromSupplier || '0') - sold)
                      : p.computedInStock}
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
