'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdvancedAnalyticsPanel } from '@/app/components/partner/AdvancedAnalyticsPanel';

interface Totals {
  revenue: number;
  commission: number;
  orders: number;
  visitors: number;
}

const RANGES = [7, 30, 90, 365];

export default function PartnerAnalyticsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/partner/analytics?days=${days}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הנתונים נכשלה');
        if (!cancelled) setTotals(data.totals || null);
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

  async function exportCsv() {
    if (!user?.idToken) return;
    const res = await fetch(`/api/partner/analytics/export?days=${days}`, {
      headers: { Authorization: `Bearer ${user.idToken}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-analytics-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">אנליטיקה</h1>
          <p className="text-gray-600 mt-1">ביצועי החנות שלכם לאורך זמן.</p>
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
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
          >
            ייצוא CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="מבקרים" value={loading ? '…' : (totals?.visitors ?? 0).toLocaleString('he-IL')} />
        <Card label="הזמנות" value={loading ? '…' : (totals?.orders ?? 0).toLocaleString('he-IL')} />
        <Card
          label="מחזור"
          value={loading ? '…' : `₪${(totals?.revenue ?? 0).toLocaleString('he-IL')}`}
        />
        <Card
          label="עמלות"
          value={loading ? '…' : `₪${(totals?.commission ?? 0).toLocaleString('he-IL')}`}
        />
      </div>

      {user?.idToken && <AdvancedAnalyticsPanel idToken={user.idToken} />}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
