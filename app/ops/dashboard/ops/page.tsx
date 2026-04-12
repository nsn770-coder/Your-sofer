'use client';
import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';
import type { InternalOrder } from '@/app/ops/types';
import OrdersTable from '@/components/ops/OrdersTable';
import StatusBadge from '@/components/ops/StatusBadge';

const TERMINAL = new Set(['completed', 'delivered', 'cancelled']);

async function detectDelayed(orders: InternalOrder[]) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  for (const o of orders) {
    if (o.isDelayed || TERMINAL.has(o.status)) continue;
    const updated = o.updatedAt?.toDate ? o.updatedAt.toDate() : o.updatedAt ? new Date(o.updatedAt) : null;
    if (updated && updated < cutoff) {
      await updateDoc(doc(db, 'internalOrders', o.id), { isDelayed: true });
    }
  }
}

export default function OpsDashboard() {
  const { opsUser } = useOpsAuth();
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'priorities' | 'all' | 'unassigned' | 'overdue'>('priorities');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'internalOrders'), orderBy('createdAt', 'desc'))
      );
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder));
      setOrders(loaded);
      await detectDelayed(loaded);
      setLoading(false);
    }
    load();
  }, []);

  const active = useMemo(
    () => orders.filter((o) => !TERMINAL.has(o.status)),
    [orders]
  );

  const unassigned = useMemo(
    () => active.filter((o) => !o.primaryOwner || o.primaryOwner.trim() === ''),
    [active]
  );

  const overdue = useMemo(
    () => active.filter((o) => o.isDelayed || o.isBlocked),
    [active]
  );

  const priorities = useMemo(
    () =>
      active
        .filter((o) => o.priority === 'high' || o.priority === 'urgent')
        .sort((a, b) => (a.priority === 'urgent' ? -1 : b.priority === 'urgent' ? 1 : 0)),
    [active]
  );

  // Breakdown by owner
  const byOwner = useMemo(() => {
    const map = new Map<string, InternalOrder[]>();
    for (const o of active) {
      const owner = o.primaryOwner || 'לא הוקצה';
      if (!map.has(owner)) map.set(owner, []);
      map.get(owner)!.push(o);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [active]);

  const TABS = [
    { id: 'priorities', label: `עדיפויות היום (${priorities.length})` },
    { id: 'unassigned', label: `לא הוקצו (${unassigned.length})` },
    { id: 'overdue', label: `בעיכוב (${overdue.length})` },
    { id: 'all', label: `כל הפעילות (${active.length})` },
  ] as const;

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">טוען נתונים...</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#0c1a35' }}>
            שלום {opsUser?.name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">דשבורד תפעול — ניהול הזמנות</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
          <div className="text-3xl font-black text-blue-600">{active.length}</div>
          <div className="text-sm text-gray-500 mt-1">הזמנות פעילות</div>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm text-center ${unassigned.length > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}>
          <div className={`text-3xl font-black ${unassigned.length > 0 ? 'text-yellow-600' : 'text-gray-800'}`}>{unassigned.length}</div>
          <div className="text-sm text-gray-500 mt-1">לא הוקצו</div>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm text-center ${overdue.length > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
          <div className={`text-3xl font-black ${overdue.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{overdue.length}</div>
          <div className="text-sm text-gray-500 mt-1">בעיכוב / חסומות</div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm text-center">
          <div className="text-3xl font-black text-orange-500">{priorities.length}</div>
          <div className="text-sm text-gray-500 mt-1">עדיפות גבוהה/דחופה</div>
        </div>
      </div>

      {/* Breakdown by owner */}
      {byOwner.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
          <h2 className="font-bold text-gray-800 mb-3">פירוט לפי אחראי</h2>
          <div className="flex flex-wrap gap-3">
            {byOwner.map(([owner, ownerOrders]) => (
              <div key={owner} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center min-w-24">
                <div className="text-xl font-bold text-gray-800">{ownerOrders.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">{owner}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        {activeTab === 'priorities' && (
          <>
            {priorities.length === 0 ? (
              <div className="text-center text-gray-400 py-10">אין הזמנות בעדיפות גבוהה</div>
            ) : (
              <OrdersTable orders={priorities} showFinancial={false} highlightDelayed highlightBlocked />
            )}
          </>
        )}

        {activeTab === 'unassigned' && (
          <>
            {unassigned.length === 0 ? (
              <div className="text-center text-gray-400 py-10">כל ההזמנות הוקצו ✓</div>
            ) : (
              <div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                  ⚠️ {unassigned.length} הזמנות ממתינות לשיוך אחראי
                </div>
                <OrdersTable orders={unassigned} showFinancial={false} />
              </div>
            )}
          </>
        )}

        {activeTab === 'overdue' && (
          <>
            {overdue.length === 0 ? (
              <div className="text-center text-gray-400 py-10">אין הזמנות בעיכוב ✓</div>
            ) : (
              <div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  🚨 {overdue.length} הזמנות מאוחרות או חסומות — נדרשת התערבות מיידית
                </div>
                <OrdersTable orders={overdue} showFinancial={false} highlightDelayed highlightBlocked />
              </div>
            )}
          </>
        )}

        {activeTab === 'all' && (
          <OrdersTable orders={active} showFinancial={false} highlightDelayed highlightBlocked />
        )}
      </div>
    </div>
  );
}
