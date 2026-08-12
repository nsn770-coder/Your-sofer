'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProductRow {
  productId: string;
  name: string;
  units: number;
  revenue: number;
  commission: number;
  net: number;
}

interface MonthRow {
  month: string;
  revenue: number;
  commission: number;
  net: number;
  orders: number;
}

interface Summary {
  days: number;
  orders: number;
  revenue: number;
  commission: number;
  net: number;
  averageOrderValue: number;
}

const RANGES = [30, 90, 365];
const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

export default function PartnerProfitabilityPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(90);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byProduct, setByProduct] = useState<ProductRow[]>([]);
  const [byMonth, setByMonth] = useState<MonthRow[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/partner/profitability?days=${days}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הנתונים נכשלה');
        if (!cancelled) {
          setSummary(data.summary || null);
          setByProduct(data.byProduct || []);
          setByMonth(data.byMonth || []);
          setCommissionPercent(data.commissionPercent ?? 20);
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

  const maxMonthRevenue = byMonth.reduce((m, r) => Math.max(m, r.revenue), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">רווחיות</h1>
          <p className="text-gray-600 mt-1">
            מחזור בניכוי עמלת פלטפורמה של {commissionPercent}%.
          </p>
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="הזמנות" value={loading ? '…' : String(summary?.orders ?? 0)} />
        <Card label="מחזור" value={loading ? '…' : shekel(summary?.revenue ?? 0)} />
        <Card label="עמלה" value={loading ? '…' : shekel(summary?.commission ?? 0)} />
        <Card label="נטו לחנות" value={loading ? '…' : shekel(summary?.net ?? 0)} highlight />
        <Card
          label="ממוצע להזמנה"
          value={loading ? '…' : shekel(summary?.averageOrderValue ?? 0)}
        />
      </div>

      {byMonth.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">לפי חודש</h2>
          <div className="space-y-3">
            {byMonth.map((m) => (
              <div key={m.month}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{m.month}</span>
                  <span className="text-gray-600">
                    {m.orders} הזמנות · מחזור {shekel(m.revenue)} ·{' '}
                    <span className="text-green-700 font-medium">נטו {shekel(m.net)}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${maxMonthRevenue ? (m.net / maxMonthRevenue) * 100 : 0}%`,
                    }}
                  />
                  <div
                    className="h-full bg-gray-300"
                    style={{
                      width: `${maxMonthRevenue ? (m.commission / maxMonthRevenue) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-green-500 rounded-sm inline-block" /> נטו לחנות
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-gray-300 rounded-sm inline-block" /> עמלת פלטפורמה
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <h2 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
          לפי מוצר
        </h2>
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : byProduct.length === 0 ? (
          <p className="p-6 text-gray-500">אין נתונים בתקופה שנבחרה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right font-medium px-4 py-3">מוצר</th>
                <th className="text-right font-medium px-4 py-3">יחידות</th>
                <th className="text-right font-medium px-4 py-3">מחזור</th>
                <th className="text-right font-medium px-4 py-3">עמלה</th>
                <th className="text-right font-medium px-4 py-3">נטו</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map((p) => (
                <tr key={p.productId} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">{p.units}</td>
                  <td className="px-4 py-3">{shekel(p.revenue)}</td>
                  <td className="px-4 py-3 text-gray-500">{shekel(p.commission)}</td>
                  <td className="px-4 py-3 font-semibold text-green-700">{shekel(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`text-xl font-bold mt-1 ${highlight ? 'text-green-700' : 'text-gray-900'}`}
      >
        {value}
      </div>
    </div>
  );
}
