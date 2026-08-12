'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

const PAGE_SIZE = 50;

// Mirrors the admin order pipeline so both sides speak the same language.
const STATUSES = [
  { value: 'paid', label: '⏳ חדש', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'pending', label: '🕐 ממתין', color: 'bg-orange-100 text-orange-700' },
  { value: 'magiah', label: '✅ מגיה', color: 'bg-teal-100 text-teal-700' },
  { value: 'sofer', label: '✍️ אצל הסופר', color: 'bg-blue-100 text-blue-700' },
  { value: 'packing', label: '📦 באריזה', color: 'bg-purple-100 text-purple-700' },
  { value: 'shipped', label: '🚚 נשלח', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'delivered', label: '✅ נמסר', color: 'bg-green-100 text-green-700' },
  { value: 'completed', label: '🏁 הושלם', color: 'bg-green-200 text-green-800' },
  { value: 'needs_care', label: '⚠️ דורש טיפול', color: 'bg-red-100 text-red-700' },
  { value: 'abandoned', label: '🚫 נטוש', color: 'bg-gray-200 text-gray-600' },
  { value: 'cancelled', label: '❌ בוטל', color: 'bg-red-100 text-red-500' },
];

const STATUS_MAP = new Map(STATUSES.map((s) => [s.value, s]));

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

const shekel = (n?: number) => `₪${Math.round(n ?? 0).toLocaleString('he-IL')}`;

export default function PartnerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

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

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[o.status || ''] = (m[o.status || ''] || 0) + 1;
    return m;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => (statusFilter === 'all' ? true : o.status === statusFilter))
      .filter((o) =>
        q
          ? [o.orderNumber, o.customerName, o.id].some((v) =>
              String(v || '').toLowerCase().includes(q)
            )
          : true
      );
  }, [orders, statusFilter, search]);

  const totalRevenue = filtered.reduce((s, o) => s + (o.total || 0), 0);
  const totalCommission = filtered.reduce((s, o) => s + (o.commission || 0), 0);

  function exportCsv() {
    const header = ['מספר', 'לקוח', 'תאריך', 'סכום', 'עמלה', 'סטטוס'];
    const rows = filtered.map((o) => [
      o.orderNumber || o.id,
      o.customerName || '',
      formatDate(o.createdAt),
      Math.round(o.total || 0),
      Math.round(o.commission || 0),
      STATUS_MAP.get(o.status || '')?.label.replace(/^\S+\s/, '') || o.status || '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ההזמנות שלי</h1>
          <p className="text-gray-600 mt-1">כל ההזמנות שבוצעו דרך החנות שלכם.</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm disabled:opacity-40"
        >
          ייצוא CSV
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="הזמנות מוצגות" value={String(filtered.length)} />
        <Stat label="מחזור" value={shekel(totalRevenue)} />
        <Stat label="עמלה" value={shekel(totalCommission)} />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            statusFilter === 'all'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          הכל ({orders.length})
        </button>
        {STATUSES.filter((s) => counts[s.value]).map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              statusFilter === s.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s.label} ({counts[s.value]})
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="חיפוש לפי מספר הזמנה או שם לקוח..."
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
      />

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : filtered.length === 0 ? (
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
                <Th>נטו</Th>
                <Th>סטטוס</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const s = STATUS_MAP.get(o.status || '');
                return (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <Td>{o.orderNumber || o.id.slice(0, 8)}</Td>
                    <Td>{o.customerName || '—'}</Td>
                    <Td>{formatDate(o.createdAt)}</Td>
                    <Td>{shekel(o.total)}</Td>
                    <Td className="text-gray-500">{shekel(o.commission)}</Td>
                    <Td className="font-medium text-green-700">
                      {shekel((o.total || 0) - (o.commission || 0))}
                    </Td>
                    <Td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                          s?.color || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {s?.label || o.status || '—'}
                      </span>
                    </Td>
                  </tr>
                );
              })}
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
  return <th className="text-right font-medium px-4 py-3 whitespace-nowrap">{children}</th>;
}

function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-gray-800 whitespace-nowrap ${className}`}>{children}</td>;
}
