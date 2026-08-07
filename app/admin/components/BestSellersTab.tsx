'use client';
import { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatPrice } from '@/app/lib/utils';

// Orders with these statuses represent real payments
const PAID_STATUSES = new Set(['paid', 'packing', 'shipped', 'delivered', 'completed', 'needs_care']);

interface OrderItem {
  id: string;
  productId?: string;
  name?: string;
  productName?: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  status: string;
  items?: OrderItem[];
}

interface Product {
  id: string;
  name: string;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  isBestSeller?: boolean;
}

interface AggRow {
  productId: string;
  name: string;
  cat: string;
  imgUrl: string;
  units: number;
  revenue: number;
}

/**
 * Extract a product id from raw user input.
 * Accepts:
 *  - a bare product id / sku  ("aB12xY9")
 *  - a full product url        ("https://your-sofer.com/product/aB12xY9")
 *  - a url with query/hash     (".../product/aB12xY9?utm=...#x")
 *  - a slug-style url where the id is the last path segment
 */
function extractProductId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Not a URL → treat as a direct id/sku
  if (!/^https?:\/\//i.test(s) && !s.includes('/')) {
    return s;
  }

  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    // Strip query + hash, split path
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    // Prefer the segment right after /product/ or /p/
    const idx = parts.findIndex(p => p === 'product' || p === 'p');
    if (idx !== -1 && parts[idx + 1]) {
      return decodeURIComponent(parts[idx + 1]);
    }
    // Otherwise last path segment
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    // Not a parseable url → fall back to last "/" segment
    const tail = s.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
    return tail ? decodeURIComponent(tail) : null;
  }
}

export default function BestSellersTab({
  orders,
  products,
}: {
  orders: Order[];
  products: Product[];
}) {
  const productLookup = useMemo(
    () => Object.fromEntries(products.map(p => [p.id, p])),
    [products],
  );

  // isBestSeller state — initialized from products, updated locally after Firestore write
  const [bestSellerMap, setBestSellerMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(products.map(p => [p.id, p.isBestSeller ?? false])),
  );
  const [saving, setSaving] = useState<string | null>(null);

  // Manual pinning state
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [manualSaving, setManualSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Products fetched on-demand by id/url (not necessarily in the loaded `products` prop)
  const [fetchedProducts, setFetchedProducts] = useState<Record<string, Product>>({});

  // Add-by-link/code state
  const [linkInput, setLinkInput] = useState('');
  const [addingByLink, setAddingByLink] = useState(false);
  const [linkError, setLinkError] = useState('');

  // Drag & drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'siteConfig', 'bestSellers'));
        if (snap.exists()) {
          setManualIds((snap.data().manualProductIds ?? []) as string[]);
        }
      } catch { /* non-fatal */ } finally {
        setManualLoading(false);
      }
    }
    load();
  }, []);

  // After manualIds load, fetch any that aren't in the loaded products prop
  // so the row renders with name/image even for non-loaded products.
  useEffect(() => {
    const missing = manualIds.filter(id => !productLookup[id] && !fetchedProducts[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const found: Record<string, Product> = {};
      for (const id of missing) {
        try {
          const snap = await getDoc(doc(db, 'products', id));
          if (snap.exists()) found[id] = { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
        } catch { /* skip */ }
      }
      if (!cancelled && Object.keys(found).length) {
        setFetchedProducts(prev => ({ ...prev, ...found }));
      }
    })();
    return () => { cancelled = true; };
  }, [manualIds, productLookup, fetchedProducts]);

  // Unified lookup: loaded products first, then on-demand fetched ones
  function resolveProduct(id: string): Product | undefined {
    return productLookup[id] || fetchedProducts[id];
  }

  async function saveManualIds(ids: string[]) {
    setManualSaving(true);
    try {
      await setDoc(doc(db, 'siteConfig', 'bestSellers'), { manualProductIds: ids }, { merge: true });
      setManualIds(ids);
    } catch {
      alert('שגיאה בשמירה');
    } finally {
      setManualSaving(false);
    }
  }

  // Add a product to the manual list by pasted link or product code.
  async function addByLink() {
    setLinkError('');
    const id = extractProductId(linkInput);
    if (!id) {
      setLinkError('לא זוהה מזהה מוצר — הדבק קישור מלא או קוד מוצר');
      return;
    }
    if (manualIds.includes(id)) {
      setLinkError('המוצר כבר ברשימה');
      return;
    }

    setAddingByLink(true);
    try {
      // Verify the product exists in Firestore (even if not in loaded products)
      let prod = productLookup[id];
      if (!prod) {
        const snap = await getDoc(doc(db, 'products', id));
        if (!snap.exists()) {
          setLinkError(`מוצר עם מזהה "${id}" לא נמצא במאגר`);
          setAddingByLink(false);
          return;
        }
        prod = { id: snap.id, ...(snap.data() as Omit<Product, 'id'>) };
        setFetchedProducts(prev => ({ ...prev, [id]: prod! }));
      }
      await saveManualIds([...manualIds, id]);
      setLinkInput('');
    } catch {
      setLinkError('שגיאה באימות המוצר');
    } finally {
      setAddingByLink(false);
    }
  }

  // Aggregate from paid orders only.
  // Use item.productId || item.id to handle the old bug where productId was missing.
  // Name/cat/image come from products collection (authoritative), with item name as fallback.
  const rows = useMemo((): AggRow[] => {
    const agg: Record<string, AggRow> = {};

    for (const order of orders) {
      if (!PAID_STATUSES.has(order.status)) continue;
      for (const item of order.items ?? []) {
        const pid = item.productId || item.id;
        if (!pid) continue;
        if (!agg[pid]) {
          const p = productLookup[pid];
          agg[pid] = {
            productId: pid,
            name: p?.name ?? item.productName ?? item.name ?? pid,
            cat: p?.cat ?? '',
            imgUrl: p?.imgUrl ?? p?.image_url ?? '',
            units: 0,
            revenue: 0,
          };
        }
        agg[pid].units += item.quantity ?? 1;
        agg[pid].revenue += (item.price ?? 0) * (item.quantity ?? 1);
      }
    }

    return Object.values(agg).sort((a, b) => b.units - a.units);
  }, [orders, productLookup]);

  async function toggleBestSeller(productId: string) {
    const next = !(bestSellerMap[productId] ?? false);
    setSaving(productId);
    try {
      await updateDoc(doc(db, 'products', productId), { isBestSeller: next });
      setBestSellerMap(prev => ({ ...prev, [productId]: next }));
    } catch {
      alert('שגיאה בעדכון');
    } finally {
      setSaving(null);
    }
  }

  const manualProducts = manualIds
    .map(id => resolveProduct(id) ?? { id, name: id } as Product);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(p =>
        !manualIds.includes(p.id) &&
        (p.name?.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, products, manualIds]);

  const paidOrderCount = orders.filter(o => PAID_STATUSES.has(o.status)).length;

  // Reorder helper for drag & drop
  function moveItem(from: number, to: number) {
    if (from === to) return;
    const next = [...manualIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    saveManualIds(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Manual pinning section ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">📌 הצגה ידנית בסקרול</h2>
          <p className="text-sm text-gray-400 mt-1">
            מוצרים אלו יופיעו ראשונים בסקרול &ldquo;הנמכרים ביותר&rdquo; בדף הבית, לפי הסדר שנבחר.
            גרור כדי לסדר, או הוסף מוצר חדש לפי קישור / קוד מוצר.
            מוצר שמופיע כאן ונמכר גם אוטומטית — יופיע פעם אחת בלבד (במיקום הידני).
          </p>
        </div>

        {manualLoading ? (
          <div className="p-6 text-gray-400 text-sm">טוען...</div>
        ) : (
          <div className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Current manual list */}
            {manualProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {manualProducts.map((p, idx) => {
                  const isDragging = dragIndex === idx;
                  const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
                  return (
                    <div
                      key={p.id}
                      draggable={!manualSaving}
                      onDragStart={() => setDragIndex(idx)}
                      onDragEnter={() => setOverIndex(idx)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null) moveItem(dragIndex, idx);
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '8px 12px',
                        background: isOver ? '#eef6ff' : '#fafafa',
                        border: isOver ? '1px solid #93c5fd' : '1px solid #e8e8ea',
                        opacity: isDragging ? 0.4 : 1,
                        cursor: 'grab',
                        transition: 'background 0.12s, border 0.12s',
                      }}
                    >
                      <span style={{ color: '#c4c4c8', fontSize: 16, cursor: 'grab', flexShrink: 0, lineHeight: 1 }} title="גרור לסידור">
                        ⠿
                      </span>
                      <span style={{ width: 20, textAlign: 'center', fontSize: 12, color: '#aaa', fontFamily: 'monospace' }}>
                        {idx + 1}
                      </span>
                      {(p.imgUrl || p.image_url) && (
                        <img
                          src={p.imgUrl || p.image_url}
                          alt=""
                          style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
                        />
                      )}
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ys-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          disabled={idx === 0 || manualSaving}
                          onMouseDown={e => {
                            e.preventDefault();
                            if (idx === 0) return;
                            moveItem(idx, idx - 1);
                          }}
                          style={{
                            padding: '2px 8px', border: '1px solid #d0d0d0',
                            background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer',
                            opacity: idx === 0 ? 0.3 : 1, fontSize: 11,
                          }}
                          title="הזז למעלה"
                        >▲</button>
                        <button
                          disabled={idx === manualIds.length - 1 || manualSaving}
                          onMouseDown={e => {
                            e.preventDefault();
                            if (idx === manualIds.length - 1) return;
                            moveItem(idx, idx + 1);
                          }}
                          style={{
                            padding: '2px 8px', border: '1px solid #d0d0d0',
                            background: 'transparent', cursor: idx === manualIds.length - 1 ? 'default' : 'pointer',
                            opacity: idx === manualIds.length - 1 ? 0.3 : 1, fontSize: 11,
                          }}
                          title="הזז למטה"
                        >▼</button>
                        <button
                          disabled={manualSaving}
                          onMouseDown={e => {
                            e.preventDefault();
                            saveManualIds(manualIds.filter(x => x !== p.id));
                          }}
                          style={{
                            padding: '2px 10px', border: '1px solid #fca5a5',
                            background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 11,
                          }}
                          title="הסר"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                אין מוצרים ידניים — הסקרול מציג רק את הנמכרים ביותר אוטומטית
              </p>
            )}

            {/* Add by link / product code */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="הדבק קישור מלא או קוד מוצר..."
                  value={linkInput}
                  onChange={e => { setLinkInput(e.target.value); setLinkError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !addingByLink) addByLink(); }}
                  style={{
                    flex: 1, padding: '8px 12px',
                    border: '1px solid #d0d0d0', fontSize: 14,
                    direction: 'rtl', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  disabled={addingByLink || !linkInput.trim()}
                  onClick={addByLink}
                  style={{
                    padding: '8px 18px', border: 'none',
                    background: addingByLink || !linkInput.trim() ? '#d4b896' : '#b8860b',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: addingByLink || !linkInput.trim() ? 'default' : 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {addingByLink ? '...' : 'הוסף'}
                </button>
              </div>
              {linkError && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{linkError}</p>}
            </div>

            {/* Search / add from loaded catalog */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="או חפש מוצר לפי שם / מזהה..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setSearchQuery(''), 150)}
                style={{
                  width: '100%', padding: '8px 12px',
                  border: '1px solid #d0d0d0', fontSize: 14,
                  direction: 'rtl', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, left: 0,
                  background: '#fff', border: '1px solid #e0e0e0',
                  zIndex: 50, maxHeight: 280, overflowY: 'auto',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                }}>
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        saveManualIds([...manualIds, p.id]);
                        setSearchQuery('');
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'right', direction: 'rtl',
                      }}
                      className="hover:bg-gray-50"
                    >
                      {(p.imgUrl || p.image_url) && (
                        <img
                          src={p.imgUrl || p.image_url}
                          alt=""
                          style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                        />
                      )}
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ys-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace', flexShrink: 0 }}>
                        {p.id.slice(0, 8)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {manualSaving && <p className="text-xs text-gray-400">שומר...</p>}
          </div>
        )}
      </div>

      {/* ── Auto best sellers table ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-800">🏆 מוצרים נמכרים ביותר</h2>
          <span className="text-sm text-gray-400">
            מבוסס על {paidOrderCount} הזמנות ששולמו · {rows.length} מוצרים שונים
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right w-8">#</th>
                <th className="p-3 text-right">מוצר</th>
                <th className="p-3 text-right">קטגוריה</th>
                <th className="p-3 text-center">יחידות נמכרות</th>
                <th className="p-3 text-center">הכנסה</th>
                <th className="p-3 text-center">נמכר ביותר (דף הבית)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.productId}
                  className={`border-t hover:bg-gray-50 ${bestSellerMap[row.productId] ? 'bg-amber-50' : ''}`}
                >
                  <td className="p-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {row.imgUrl ? (
                        <img src={row.imgUrl} alt="" className="w-10 h-10 object-contain rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-lg">📦</div>
                      )}
                      <span className="font-medium text-gray-800 max-w-xs truncate">{row.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{row.cat || '—'}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{row.units}</td>
                  <td className="p-3 text-center font-bold text-green-700">{formatPrice(row.revenue)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleBestSeller(row.productId)}
                      disabled={saving === row.productId}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        bestSellerMap[row.productId]
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {saving === row.productId ? '...' : bestSellerMap[row.productId] ? '🏆 כן' : '— לא'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400">אין נתוני מכירות עדיין</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
