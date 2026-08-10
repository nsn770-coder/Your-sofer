'use client';
import { useEffect, useState } from 'react';
import type { PartnerProduct } from '@/app/lib/partner-types';

export default function ProductsTable({
  idToken,
  status,
  refreshKey,
  onEdit,
}: {
  idToken: string;
  status: 'active' | 'all';
  refreshKey: number;
  onEdit: (product: PartnerProduct) => void;
}) {
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/products?status=${status}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch (err) {
      console.error('Load products error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, status, refreshKey]);

  async function handleDeactivate(id: string) {
    if (!confirm('להסיר את המוצר? הוא יעבור למצב לא פעיל.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/partner/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) load();
    } catch (err) {
      console.error('Deactivate product error:', err);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div>בטעינה...</div>;
  if (products.length === 0) return <div className="text-gray-500 text-sm">אין מוצרים להצגה</div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-600 text-right">
            <th className="px-4 py-3">תמונה</th>
            <th className="px-4 py-3">שם</th>
            <th className="px-4 py-3">מחיר</th>
            <th className="px-4 py-3">מלאי</th>
            <th className="px-4 py-3">קטגוריה</th>
            <th className="px-4 py-3">סטטוס</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-3">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded" />
                )}
              </td>
              <td className="px-4 py-3 font-medium">{p.name}</td>
              <td className="px-4 py-3">₪{p.price?.toLocaleString('he-IL')}</td>
              <td className="px-4 py-3">{p.stock}</td>
              <td className="px-4 py-3">{p.category}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {p.status === 'active' ? 'פעיל' : 'לא פעיל'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button onClick={() => onEdit(p)} className="text-blue-600 hover:underline ml-3">
                  עריכה
                </button>
                {p.status === 'active' && (
                  <button
                    onClick={() => handleDeactivate(p.id)}
                    disabled={busyId === p.id}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    הסר
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
