'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface PartnerOrder {
  id: string;
  orderNumber?: string;
  customerName?: string;
  total?: number;
  status?: string;
  commission?: number;
  createdAt?: { _seconds?: number } | string | null;
}

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתינה',
  paid: 'שולמה',
  processing: 'בטיפול',
  shipped: 'נשלחה',
  delivered: 'נמסרה',
  cancelled: 'בוטלה',
  refunded: 'זוכתה',
};

function formatDate(value: PartnerOrder['createdAt']): string {
  if (!value) return '—';
  const d =
    typeof value === 'string'
      ? new Date(value)
      : value?._seconds
      ? new Date(value._seconds * 1000)
      : null;
  return d ? d.toLocaleDateString('he-IL') : '—';
}

const shekel = (n?: number) => `₪${(n ?? 0).toLocaleString('he-IL')}`;

export default function PartnerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextOffset: number) => {
      if (!user?.idToken) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/partner/orders?limit=${PAGE_SIZE}&offset=${nextOffset}`,
          { headers: { Authorization: `Bearer ${user.idToken}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת ההזמנות נכשלה');
        setOrders(data.orders || []);
        setHasMore(!!data.hasMore);
        setOffset(nextOffset);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'שגיאה');
      } finally {
        setLoading(false);
      }
    },
    [user?.idToken]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalCommission = orders.reduce((s, o) => s + (o.commission || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ההזמנות שלי</h1>
        <p className="text-gray-600 mt-1">כל ההזמנות שבוצעו דרך החנות שלכם.</p>
      </div>

      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="הזמנות בעמוד" value={String(orders.length)} />
          <Stat label="מחזור בעמוד" value={shekel(totalRevenue)} />
          <Stat label="עמלה בעמוד" value={shekel(totalCommission)} />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-500">אין הזמנות להצגה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th>מספר</Th>
                <Th>לקוח</Th>
                <Th>תאריך</Th>
                <Th>סכום</Th>
                <Th>עמלה</Th>
                <Th>סטטוס</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <Td>{o.orderNumber || o.id.slice(0, 8)}</Td>
                  <Td>{o.customerName || '—'}</Td>
                  <Td>{formatDate(o.createdAt)}</Td>
                  <Td>{shekel(o.total)}</Td>
                  <Td>{shekel(o.commission)}</Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                      {STATUS_LABELS[o.status || ''] || o.status || '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
          disabled={loading || offset === 0}
          className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-40"
        >
          הקודם
        </button>
        <button
          onClick={() => load(offset + PAGE_SIZE)}
          disabled={loading || !hasMore}
          className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-40"
        >
          הבא
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right font-medium px-4 py-3">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-gray-800">{children}</td>;
}
