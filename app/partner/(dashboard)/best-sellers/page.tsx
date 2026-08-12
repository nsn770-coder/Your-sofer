'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface Row {
  productId: string;
  name: string;
  units: number;
  revenue: number;
  orders: number;
}

interface NeverSold {
  productId: string;
  name: string;
  price: number;
  stock: number;
}

const RANGES = [30, 90, 365];
const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

export default function PartnerBestSellersPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(90);
  const [rows, setRows] = useState<Row[]>([]);
  const [neverSold, setNeverSold] = useState<NeverSold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/partner/best-sellers?days=${days}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הנתונים נכשלה');
        if (!cancelled) {
          setRows(data.products || []);
          setNeverSold(data.neverSold || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.idToken, days]);

  const maxUnits = rows.length ? rows[0].units : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">נמכרים ביותר</h1>
          <p className="text-gray-600 mt-1">דירוג המוצרים שלכם לפי כמות מכירות.</p>
        </div>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                days === r
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r === 365 ? 'שנה' : `${r} ימים`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
          🏆 המובילים
        </h2>
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-gray-500">אין מכירות בתקופה שנבחרה</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.slice(0, 25).map((r, i) => (
              <div key={r.productId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0
                          ? 'bg-amber-100 text-amber-700'
                          : i < 3
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm flex-shrink-0">
                    <span className="text-gray-600">{r.units} יח׳</span>
                    <span className="text-gray-600">{r.orders} הזמנות</span>
                    <span className="font-semibold text-gray-900 w-24 text-left">
                      {shekel(r.revenue)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${maxUnits ? (r.units / maxUnits) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {neverSold.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <h2 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
            💤 לא נמכרו בתקופה ({neverSold.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right font-medium px-4 py-3">מוצר</th>
                <th className="text-right font-medium px-4 py-3">מחיר</th>
                <th className="text-right font-medium px-4 py-3">מלאי</th>
              </tr>
            </thead>
            <tbody>
              {neverSold.slice(0, 50).map((p) => (
                <tr key={p.productId} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">{shekel(p.price)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
