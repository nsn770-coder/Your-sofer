'use client';
import { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
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

  const paidOrderCount = orders.filter(o => PAID_STATUSES.has(o.status)).length;

  return (
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
  );
}
