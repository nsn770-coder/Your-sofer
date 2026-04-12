'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, limit, writeBatch } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';
import type { InternalOrder, AuditEntry } from '@/app/ops/types';
import OrdersTable from '@/components/ops/OrdersTable';
import AuditTimeline from '@/components/ops/AuditTimeline';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-black mb-1" style={{ color: color || '#0c1a35' }}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function startOfDay() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function startOfWeek() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
}
function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

function countAndRevenue(orders: InternalOrder[], since: Date) {
  const filtered = orders.filter((o) => {
    const ts = o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt ? new Date(o.createdAt) : null;
    return ts && ts >= since;
  });
  return {
    count: filtered.length,
    revenue: filtered.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
  };
}

async function detectDelayed(orders: InternalOrder[]) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const TERMINAL = new Set(['completed', 'delivered', 'cancelled']);

  const toFlag = orders.filter((o) => {
    if (o.isDelayed || TERMINAL.has(o.status)) return false;
    const updated = o.updatedAt?.toDate ? o.updatedAt.toDate() : o.updatedAt ? new Date(o.updatedAt) : null;
    return updated && updated < cutoff;
  });

  if (toFlag.length === 0) return;

  const { doc, updateDoc } = await import('firebase/firestore');
  for (const o of toFlag) {
    await updateDoc(doc(db, 'internalOrders', o.id), { isDelayed: true });
  }
}

export default function OwnerDashboard() {
  const { opsUser } = useOpsAuth();
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'all-orders'>('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ordersSnap, auditSnap] = await Promise.all([
        getDocs(query(collection(db, 'internalOrders'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(20))),
      ]);

      const loadedOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder));
      setOrders(loadedOrders);
      setAuditEntries(auditSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry)));

      // Auto-detect delays
      await detectDelayed(loadedOrders);
      setLoading(false);
    }
    load();
  }, []);

  const today = countAndRevenue(orders, startOfDay());
  const week = countAndRevenue(orders, startOfWeek());
  const month = countAndRevenue(orders, startOfMonth());

  const delayed = orders.filter((o) => o.isDelayed && !['completed', 'delivered', 'cancelled'].includes(o.status));
  const blocked = orders.filter((o) => o.isBlocked && !['completed', 'delivered', 'cancelled'].includes(o.status));

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">טוען נתונים...</div>
    );
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#0c1a35' }}>
            שלום {opsUser?.name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">דשבורד בעלים — סקירה מלאה</p>
        </div>
        <div className="text-xs text-gray-400 bg-white border rounded-lg px-3 py-1.5">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {([['overview', 'סקירה כללית'], ['all-orders', 'כל ההזמנות']] as [string, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-5 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
              activeTab === id
                ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Alerts */}
          {(delayed.length > 0 || blocked.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {delayed.length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <div className="font-bold text-red-700 mb-2">⚠️ הזמנות מאוחרות ({delayed.length})</div>
                  <div className="space-y-1">
                    {delayed.slice(0, 5).map((o) => (
                      <div key={o.id} className="text-sm text-red-600 flex justify-between">
                        <span>{o.customerName}</span>
                        <a href={`/ops/orders/${o.id}`} className="underline text-red-700">פתח</a>
                      </div>
                    ))}
                    {delayed.length > 5 && <div className="text-xs text-red-400">ועוד {delayed.length - 5}...</div>}
                  </div>
                </div>
              )}
              {blocked.length > 0 && (
                <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4">
                  <div className="font-bold text-red-800 mb-2">🚨 הזמנות חסומות ({blocked.length})</div>
                  <div className="space-y-1">
                    {blocked.slice(0, 5).map((o) => (
                      <div key={o.id} className="text-sm text-red-700 flex justify-between">
                        <span>{o.customerName}</span>
                        <a href={`/ops/orders/${o.id}`} className="underline text-red-800">פתח</a>
                      </div>
                    ))}
                    {blocked.length > 5 && <div className="text-xs text-red-500">ועוד {blocked.length - 5}...</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <StatCard label="הזמנות היום" value={today.count} />
            <StatCard label="הזמנות השבוע" value={week.count} />
            <StatCard label="הזמנות החודש" value={month.count} />
            <StatCard label="הכנסות היום" value={`₪${today.revenue.toLocaleString()}`} color="#15803d" />
            <StatCard label="הכנסות השבוע" value={`₪${week.revenue.toLocaleString()}`} color="#15803d" />
            <StatCard label="הכנסות החודש" value={`₪${month.revenue.toLocaleString()}`} color="#15803d" />
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">פירוט לפי סטטוס</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(byStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-800">{count}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {status === 'new_order' ? 'הזמנה חדשה'
                        : status === 'awaiting_review' ? 'ממתין לבדיקה'
                        : status === 'shipped' ? 'נשלח'
                        : status === 'completed' ? 'הושלם'
                        : status === 'cancelled' ? 'בוטל'
                        : status}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4">פעילות אחרונה</h2>
            <AuditTimeline entries={auditEntries} />
          </div>
        </>
      )}

      {activeTab === 'all-orders' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">כל ההזמנות ({orders.length})</h2>
          <OrdersTable orders={orders} showFinancial highlightDelayed highlightBlocked />
        </div>
      )}
    </div>
  );
}
