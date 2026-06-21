'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { Product } from '@/app/lib/types';
import { Order } from '@/app/lib/types';

// Feature 6: update inventory from supplier receipt and auto-join active all_in_stock promotion
export async function updateInventoryFromSupplierReceipt(
  items: { productId: string; quantity: number; unitPrice?: number; price?: number }[],
) {
  if (!items.length) return;

  // Find active all_in_stock promotion (if any)
  let activePromotion: { id: string; discountValue: number; startsAt?: string | null; endsAt?: string | null } | null = null;
  try {
    const promoSnap = await getDocs(
      query(collection(db, 'promotions'), where('active', '==', true), where('applyTo', '==', 'all_in_stock'))
    );
    if (!promoSnap.empty) {
      const d = promoSnap.docs[0].data();
      activePromotion = {
        id: promoSnap.docs[0].id,
        discountValue: d.discountValue,
        startsAt: d.startsAt ?? null,
        endsAt: d.endsAt ?? null,
      };
    }
  } catch (e) {
    console.error('[updateInventoryFromSupplierReceipt] promo lookup:', e);
  }

  const CHUNK = 400;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + CHUNK);
    for (const item of chunk) {
      const ref = doc(db, 'products', item.productId);
      const data: Record<string, unknown> = {
        inStock: item.quantity,
        outOfStock: item.quantity === 0,
        ...(item.unitPrice != null && { supplierCost: item.unitPrice }),
      };
      if (activePromotion && item.price != null && item.quantity > 0) {
        data.isOnSale = true;
        data.salePrice = Math.round(item.price * (1 - activePromotion.discountValue / 100) * 100) / 100;
        data.salePercent = activePromotion.discountValue;
        data.saleCampaignId = activePromotion.id;
        data.saleStartsAt = activePromotion.startsAt ?? null;
        data.saleEndsAt = activePromotion.endsAt ?? null;
      }
      batch.update(ref, data);
    }
    await batch.commit();
  }
}

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
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualRows, setManualRows] = useState<{ code: string; unitPrice: number; quantity: number }[]>([
    { code: '', unitPrice: 0, quantity: 0 },
  ]);
  const [applyingManual, setApplyingManual] = useState(false);

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
      const pid = i.productId ?? (i as { id?: string }).id;
      if (pid) m[pid] = (m[pid] ?? 0) + i.quantity;
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
    .filter(p =>
      searchTerm
        ? p.name?.toLowerCase().includes(searchTerm.toLowerCase())
        : (p.receivedFromSupplier ?? 0) > 0
    )
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
      if (!data.success) { alert('שגיאה בניתוח: ' + (data.error ?? 'שגיאה לא ידועה')); return; }
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

      const receiptItems: { productId: string; quantity: number; unitPrice?: number; price?: number }[] = [];
      for (const item of parsedInvoice.items) {
        const itemNumber = item.code.replace(/^[A-Z]+/i, '');
        const product = skuMap[itemNumber];
        if (!product) continue;
        const prevReceived = product.receivedFromSupplier ?? 0;
        const qty          = Number(item.quantity) || 0;
        const newReceived  = prevReceived + qty;
        const sold         = getSold(product.id);
        const newInStock   = Math.max(0, newReceived - sold);
        await onSave(product.id, {
          receivedFromSupplier: newReceived,
          soferBasePrice:        item.unitPrice,
          inStock:              newInStock,
          outOfStock:           newInStock === 0,
        });
        receiptItems.push({ productId: product.id, quantity: newInStock, unitPrice: item.unitPrice, price: product.price });
      }

      // Feature 6: auto-join active all_in_stock promotion for restocked products
      if (receiptItems.length > 0) {
        updateInventoryFromSupplierReceipt(receiptItems).catch(e =>
          console.error('[InventoryTab] auto-promo join failed (non-fatal):', e)
        );
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

  function addManualRow() {
    setManualRows(prev => [...prev, { code: '', unitPrice: 0, quantity: 0 }]);
  }

  function updateManualRow(index: number, field: 'code' | 'unitPrice' | 'quantity', value: string) {
    setManualRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === 'code') return { ...row, code: value };
      if (field === 'unitPrice') return { ...row, unitPrice: parseFloat(value) || 0 };
      return { ...row, quantity: parseInt(value) || 0 };
    }));
  }

  function removeManualRow(index: number) {
    setManualRows(prev => prev.filter((_, i) => i !== index));
  }

  // בונה מפה code(ספרות)→Product עבור קודים שהוזנו ידנית, באותה שיטה כמו ה-useEffect של skuMap
  async function findProductsByCodes(codes: string[]): Promise<Record<string, Product>> {
    const numbers = new Set(
      codes.map(c => c.replace(/^[A-Z]+/i, '')).filter(n => n.length > 0)
    );
    if (numbers.size === 0) return {};
    const snap = await getDocs(
      query(collection(db, 'products'), where('sku', '>=', ' '))
    );
    const map: Record<string, Product> = {};
    snap.forEach(d => {
      const p = { id: d.id, ...d.data() } as Product;
      const n = (p.sku || '').replace(/^[A-Z]+/i, '');
      if (n && numbers.has(n)) map[n] = p;
    });
    return map;
  }

  async function applyManualRows() {
    const rows = manualRows.filter(r => r.code.trim() !== '');
    if (rows.length === 0) { alert('אין שורות להחלה'); return; }
    setApplyingManual(true);
    try {
      const map = await findProductsByCodes(rows.map(r => r.code));

      const receiptItems: { productId: string; quantity: number; unitPrice?: number; price?: number }[] = [];
      const notFound: string[] = [];
      let updatedCount = 0;

      for (const row of rows) {
        const itemNumber = row.code.replace(/^[A-Z]+/i, '');
        const product = map[itemNumber];
        if (!product) { notFound.push(row.code); continue; }

        const prevReceived = product.receivedFromSupplier ?? 0;
        const qty          = Number(row.quantity) || 0;
        const newReceived  = prevReceived + qty;
        const sold         = getSold(product.id);
        const newInStock   = Math.max(0, newReceived - sold);

        await onSave(product.id, {
          receivedFromSupplier: newReceived,
          soferBasePrice:        row.unitPrice,
          inStock:              newInStock,
          outOfStock:           newInStock === 0,
        });

        receiptItems.push({ productId: product.id, quantity: newInStock, unitPrice: row.unitPrice, price: product.price });
        updatedCount++;
      }

      // Feature 6: אותו צירוף אוטומטי למבצע all_in_stock כמו בהזנה מה-OCR
      if (receiptItems.length > 0) {
        updateInventoryFromSupplierReceipt(receiptItems).catch(e =>
          console.error('[InventoryTab] manual auto-promo join failed (non-fatal):', e)
        );
      }

      setManualRows([{ code: '', unitPrice: 0, quantity: 0 }]);
      setManualFormOpen(false);

      alert(
        `עודכנו ${updatedCount} מוצרים בהצלחה.` +
        (notFound.length > 0 ? `\n⚠️ לא נמצאו ${notFound.length} קודים: ${notFound.join(', ')}` : '')
      );
    } finally {
      setApplyingManual(false);
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
      const newInStock = Math.max(0, data.receivedFromSupplier - getSold(id));
      data.inStock = newInStock;
      data.outOfStock = newInStock === 0;
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
          <button
            onClick={() => setManualFormOpen(o => !o)}
            className="whitespace-nowrap rounded-md border border-[#d1d5db] bg-[#f3f4f6] px-4 py-2 text-[13px] font-bold text-[#374151]"
          >
            ✍️ הזנה ידנית
          </button>
        </div>

        {/* טופס הזנה ידנית — גיבוי לקבלות שה-OCR לא קורא */}
        {manualFormOpen && (
          <div dir="rtl" className="mb-4 rounded-lg border border-[#d1d5db] bg-[#f9fafb] p-4">
            <div className="mb-2 font-bold">✍️ הזנה ידנית של קבלת מלאי</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#d1d5db]">
                  <th className="px-2 py-1 text-right">קוד מוצר</th>
                  <th className="px-2 py-1 text-center">עלות ספק</th>
                  <th className="px-2 py-1 text-center">כמות יחידות</th>
                  <th className="px-2 py-1 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#eee]">
                    <td className="px-2 py-1">
                      <input
                        type="text"
                        value={row.code}
                        onChange={ev => updateManualRow(i, 'code', ev.target.value)}
                        placeholder="לדוגמה: SKU1234"
                        className="w-full rounded border border-[#aaa] px-2 py-1 text-right font-mono"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.unitPrice}
                        onChange={ev => updateManualRow(i, 'unitPrice', ev.target.value)}
                        className="w-20 rounded border border-[#aaa] px-2 py-1 text-center"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={row.quantity}
                        onChange={ev => updateManualRow(i, 'quantity', ev.target.value)}
                        className="w-20 rounded border border-[#aaa] px-2 py-1 text-center"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => removeManualRow(i)}
                        className="rounded bg-[#fee2e2] px-2 py-1 text-[#dc2626]"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={addManualRow}
                className="rounded-md border border-[#d1d5db] bg-[#fff] px-3 py-2 text-[13px] font-bold"
              >
                + הוסף שורה
              </button>
              <button
                onClick={applyManualRows}
                disabled={applyingManual}
                className="rounded-md bg-[#16a34a] px-5 py-2 text-[13px] font-bold text-white"
              >
                {applyingManual ? '⏳ מעדכן...' : '✓ החל על המלאי'}
              </button>
              <span className="text-[12px] text-[#666]">
                {manualRows.filter(r => r.code.trim() !== '').length} שורות יוחלו
              </span>
            </div>
          </div>
        )}

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
            <div style={{ fontSize: 11, color: '#666' }}>מוצרים במלאי</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{inventoryProducts.length}</div>
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
