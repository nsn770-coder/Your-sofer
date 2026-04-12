'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { InternalOrder, OrderStatus, OrderType, Priority } from '@/app/ops/types';
import { STATUS_LABELS, PRIORITY_LABELS, ORDER_TYPE_LABELS } from '@/app/ops/types';
import StatusBadge from './StatusBadge';

interface Props {
  orders: InternalOrder[];
  showFinancial?: boolean;
  highlightDelayed?: boolean;
  highlightBlocked?: boolean;
  defaultStatusFilter?: OrderStatus | '';
}

const ALL_STATUSES: OrderStatus[] = [
  'new_order', 'awaiting_review', 'assigned', 'in_fulfillment',
  'waiting_supplier', 'stam_processing', 'stam_sent_checking', 'stam_approved',
  'fulfillment_ready', 'ready_for_shipment', 'shipped', 'delivered',
  'completed', 'delayed', 'blocked', 'cancelled',
];

const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];
const ORDER_TYPES: OrderType[] = ['judaica', 'stam', 'mixed'];

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'text-gray-500',
  normal: 'text-gray-700',
  high: 'text-orange-600 font-semibold',
  urgent: 'text-red-600 font-bold',
};

function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function OrdersTable({
  orders,
  showFinancial = true,
  highlightDelayed = true,
  highlightBlocked = true,
  defaultStatusFilter = '',
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>(defaultStatusFilter);
  const [typeFilter, setTypeFilter] = useState<OrderType | ''>('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const filtered = useMemo(() => {
    let result = orders;

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName?.toLowerCase().includes(s) ||
          o.orderId?.toLowerCase().includes(s) ||
          o.id?.toLowerCase().includes(s)
      );
    }

    if (statusFilter) result = result.filter((o) => o.status === statusFilter);
    if (typeFilter) result = result.filter((o) => o.orderType === typeFilter);
    if (ownerFilter) result = result.filter((o) => o.primaryOwner?.includes(ownerFilter));
    if (priorityFilter) result = result.filter((o) => o.priority === priorityFilter);
    if (delayedOnly) result = result.filter((o) => o.isDelayed);
    if (blockedOnly) result = result.filter((o) => o.isBlocked);

    return result;
  }, [orders, search, statusFilter, typeFilter, ownerFilter, priorityFilter, delayedOnly, blockedOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setOwnerFilter('');
    setPriorityFilter('');
    setDelayedOnly(false);
    setBlockedOnly(false);
    setPage(1);
  }

  const hasActiveFilters = !!(search || statusFilter || typeFilter || ownerFilter || priorityFilter || delayedOnly || blockedOnly);

  return (
    <div dir="rtl">
      {/* Filter bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 block mb-1">חיפוש</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="שם לקוח או מספר הזמנה..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">סטטוס</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as OrderStatus | ''); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">כל הסטטוסים</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">סוג</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as OrderType | ''); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">כל הסוגים</option>
              {ORDER_TYPES.map((t) => (
                <option key={t} value={t}>{ORDER_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">עדיפות</label>
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value as Priority | ''); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">כל העדיפויות</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">אחראי</label>
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}
              placeholder="שם אחראי..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={delayedOnly}
                onChange={(e) => { setDelayedOnly(e.target.checked); setPage(1); }}
                className="rounded"
              />
              <span className="text-red-600">⚠ מאוחרות</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={blockedOnly}
                onChange={(e) => { setBlockedOnly(e.target.checked); setPage(1); }}
                className="rounded"
              />
              <span className="text-red-800">🚨 חסומות</span>
            </label>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-gray-500 hover:text-gray-800 underline py-2"
            >
              נקה סינון
            </button>
          )}
        </div>

        <div className="mt-2 text-xs text-gray-400">
          מציג {paginated.length} מתוך {filtered.length} הזמנות
          {hasActiveFilters && ` (מסוננות מתוך ${orders.length})`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead style={{ background: '#0c1a35' }}>
            <tr>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">מספר</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">לקוח</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">סוג</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">סטטוס</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">עדיפות</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">אחראי</th>
              {showFinancial && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">סכום</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">נוצר</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">תאריך יעד</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-yellow-300 uppercase tracking-wider">פעולות</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={showFinancial ? 10 : 9} className="px-4 py-12 text-center text-gray-400">
                  אין הזמנות להצגה
                </td>
              </tr>
            ) : (
              paginated.map((order) => {
                const isDelayedHighlight = highlightDelayed && order.isDelayed;
                const isBlockedHighlight = highlightBlocked && order.isBlocked;
                const rowClass = isBlockedHighlight
                  ? 'bg-red-50 border-r-4 border-r-red-600'
                  : isDelayedHighlight
                  ? 'bg-red-50 border-r-4 border-r-orange-400'
                  : 'hover:bg-gray-50';

                return (
                  <tr key={order.id} className={`transition-colors ${rowClass}`}>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {order.orderId ? `#${order.orderId.slice(-6).toUpperCase()}` : order.id.slice(-6).toUpperCase()}
                      {isDelayedHighlight && <span className="mr-1 text-orange-500">⚠️</span>}
                      {isBlockedHighlight && <span className="mr-1 text-red-600">🚨</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-400">{order.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} small />
                    </td>
                    <td className="px-4 py-3">
                      <span className={PRIORITY_STYLES[order.priority] || 'text-gray-600'}>
                        {PRIORITY_LABELS[order.priority] || order.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.primaryOwner || <span className="text-yellow-600 font-medium">לא הוקצה</span>}
                    </td>
                    {showFinancial && (
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        ₪{order.totalAmount?.toLocaleString()}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {order.dueDate ? formatDate(order.dueDate) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/ops/orders/${order.id}`)}
                        style={{ background: '#0c1a35', color: '#b8972a' }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                      >
                        פתח
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            הקודם
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            עמוד {page} מתוך {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
}
