'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';
import type { InternalOrder } from '@/app/ops/types';
import OrdersTable from '@/components/ops/OrdersTable';

export default function AllOrdersPage() {
  const { opsUser } = useOpsAuth();
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'internalOrders'), orderBy('createdAt', 'desc'))
      );
      let loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder));

      // Fulfillment: only relevant orders
      if (opsUser?.role === 'fulfillment') {
        const FULFILLMENT_STATUSES = new Set([
          'in_fulfillment', 'waiting_supplier', 'fulfillment_ready',
          'ready_for_shipment', 'shipped', 'delivered',
        ]);
        loaded = loaded.filter((o) => FULFILLMENT_STATUSES.has(o.status));
      }

      setOrders(loaded);
      setLoading(false);
    }
    load();
  }, [opsUser]);

  const showFinancial = opsUser?.role !== 'fulfillment';

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">טוען הזמנות...</div>;
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#0c1a35' }}>כל ההזמנות</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} הזמנות במערכת</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <OrdersTable orders={orders} showFinancial={showFinancial} highlightDelayed highlightBlocked />
      </div>
    </div>
  );
}
