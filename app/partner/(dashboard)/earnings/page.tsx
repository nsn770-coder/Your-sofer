'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePartner } from '@/app/contexts/PartnerContext';
import { PartnerEarningsChart } from '@/app/components/partner/PartnerEarningsChart';

interface Summary {
  totalRevenue: number;
  totalCommission: number;
  totalOrders: number;
}

const RANGES = [7, 30, 90];
const shekel = (n: number) => `₪${n.toLocaleString('he-IL')}`;

export default function PartnerEarningsPage() {
  const { user } = useAuth();
  const { partner } = usePartner();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/partner/earnings?days=${days}`, {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הנתונים נכשלה');
        if (!cancelled) setSummary(data.summary || null);
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

  // The partner keeps the revenue minus the platform commission.
  const commissionPercent = partner?.commissionPercent ?? 20;
  const netToPartner = summary ? summary.totalRevenue - summary.totalCommission : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הרווחים שלי</h1>
          <p className="text-gray-600 mt-1">
            עמלת הפלטפורמה: {commissionPercent}% מכל מכירה.
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
              {r} ימים
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="מחזור" value={loading ? '…' : shekel(summary?.totalRevenue ?? 0)} />
        <Card label="הזמנות" value={loading ? '…' : String(summary?.totalOrders ?? 0)} />
        <Card label="עמלת הפלטפורמה" value={loading ? '…' : shekel(summary?.totalCommission ?? 0)} />
        <Card label="נטו לחנות" value={loading ? '…' : shekel(netToPartner)} highlight />
      </div>

      {user?.idToken && <PartnerEarningsChart idToken={user.idToken} />}

      <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">משיכת כספים</h2>
          <p className="text-sm text-gray-600 mt-1">
            ניתן להגיש בקשת משיכה עבור היתרה הצבורה.
          </p>
        </div>
        <Link
          href="/partner/payouts"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
        >
          למסך המשיכות
        </Link>
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
        className={`text-2xl font-bold mt-1 ${
          highlight ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
