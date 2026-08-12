'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { PayoutRequestForm } from '@/app/components/partner/PayoutRequestForm';

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt?: { _seconds?: number } | string | null;
  completedAt?: { _seconds?: number } | string | null;
  transactionId?: string | null;
  rejectionReason?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתינה לאישור',
  approved: 'אושרה',
  paid: 'שולמה',
  rejected: 'נדחתה',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function formatDate(value: Payout['createdAt']): string {
  if (!value) return '—';
  const d =
    typeof value === 'string'
      ? new Date(value)
      : value?._seconds
      ? new Date(value._seconds * 1000)
      : null;
  return d ? d.toLocaleDateString('he-IL') : '—';
}

const shekel = (n: number) => `₪${n.toLocaleString('he-IL')}`;

export default function PartnerPayoutsPage() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.idToken) return;
    setLoading(true);
    setError(null);
    try {
      const [payoutsRes, earningsRes] = await Promise.all([
        fetch('/api/partner/payouts/request', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
        fetch('/api/partner/earnings?days=365', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        }),
      ]);

      const payoutsData = await payoutsRes.json();
      if (!payoutsRes.ok) throw new Error(payoutsData.error || 'טעינת המשיכות נכשלה');
      const list: Payout[] = payoutsData.payouts || [];
      setPayouts(list);

      const earningsData = await earningsRes.json();
      if (earningsRes.ok && earningsData.summary) {
        const net =
          (earningsData.summary.totalRevenue || 0) -
          (earningsData.summary.totalCommission || 0);
        const alreadyRequested = list
          .filter((p) => p.status !== 'rejected')
          .reduce((s, p) => s + (p.amount || 0), 0);
        setBalance(Math.max(0, net - alreadyRequested));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }, [user?.idToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">משיכות כספים</h1>
        <p className="text-gray-600 mt-1">
          הגשת בקשות למשיכת היתרה הצבורה ומעקב אחר הסטטוס.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-sm text-green-800">יתרה זמינה למשיכה</div>
        <div className="text-3xl font-bold text-green-700 mt-1">
          {loading ? '…' : shekel(balance)}
        </div>
        <p className="text-xs text-green-800/70 mt-2">
          מחושב מהמחזור בשנה האחרונה בניכוי עמלות ובקשות משיכה קודמות.
        </p>
      </div>

      {user?.idToken && (
        <PayoutRequestForm
          idToken={user.idToken}
          availableBalance={balance}
          onSuccess={load}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="font-semibold text-gray-900 px-4 py-3 border-b border-gray-100">
          היסטוריית משיכות
        </h2>
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : payouts.length === 0 ? (
          <p className="p-6 text-gray-500">אין בקשות משיכה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-right font-medium px-4 py-3">תאריך</th>
                <th className="text-right font-medium px-4 py-3">סכום</th>
                <th className="text-right font-medium px-4 py-3">סטטוס</th>
                <th className="text-right font-medium px-4 py-3">הערות</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{shekel(p.amount || 0)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.rejectionReason || p.transactionId || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
