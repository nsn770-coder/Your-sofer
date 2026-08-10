'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

interface ShipmentDoc {
  id: string;
  shipmentId: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  source?: string;
  pickupAddress?: { city?: string; street?: string };
  destinationAddress?: { city?: string; street?: string };
  items?: { name?: string; quantity?: number }[];
  status: 'created' | 'picked' | 'shipped' | 'delivered';
  lionwheelData?: { publicId?: string | null; trackingLink?: string | null };
}

const STATUS_LABELS: Record<string, string> = {
  created: 'נוצר',
  picked: 'נאסף',
  shipped: 'בדרך',
  delivered: 'נמסר',
};

const NEXT_STATUS: Record<string, string | null> = {
  created: 'picked',
  picked: 'shipped',
  shipped: 'delivered',
  delivered: null,
};

const TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'active', label: 'פעילים', statuses: ['created', 'picked', 'shipped'] },
  { key: 'delivered', label: 'נמסרו', statuses: ['delivered'] },
];

export default function ShipmentsTable() {
  const [shipments, setShipments] = useState<ShipmentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [advancing, setAdvancing] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await getAuthLazy();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;
      const res = await fetch('/api/ops/fulfillment-shipments', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (res.ok) setShipments(data.shipments || []);
    } catch (e) {
      console.error('[ShipmentsTable] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function advance(shipment: ShipmentDoc) {
    const next = NEXT_STATUS[shipment.status];
    if (!next) return;
    setAdvancing((s) => ({ ...s, [shipment.id]: true }));
    try {
      const auth = await getAuthLazy();
      const idToken = await auth.currentUser?.getIdToken();
      await fetch('/api/ops/fulfillment-shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ shipmentId: shipment.shipmentId, status: next }),
      });
      await load();
    } catch (e) {
      console.error('[ShipmentsTable] advance failed:', e);
    } finally {
      setAdvancing((s) => ({ ...s, [shipment.id]: false }));
    }
  }

  const tab = TABS.find((t) => t.key === activeTab)!;
  const filtered = shipments.filter((s) => tab.statuses.includes(s.status));

  if (loading) {
    return <div className="text-center text-gray-400 py-10">טוען משלוחים...</div>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
              activeTab === t.key ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} ({shipments.filter((s) => t.statuses.includes(s.status)).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">אין משלוחים בקטגוריה זו</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl border border-gray-200 overflow-hidden">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="p-3 text-right">משלוח</th>
                <th className="p-3 text-right">הזמנה</th>
                <th className="p-3 text-right">מקור</th>
                <th className="p-3 text-right">יעד</th>
                <th className="p-3 text-right">מעקב</th>
                <th className="p-3 text-right">סטטוס</th>
                <th className="p-3 text-right">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="p-3 font-mono text-xs">{s.shipmentId.slice(0, 8)}</td>
                  <td className="p-3">{s.orderNumber || s.orderId} <span className="text-gray-400">— {s.customerName}</span></td>
                  <td className="p-3">{s.pickupAddress?.city || '—'}</td>
                  <td className="p-3">{s.destinationAddress?.city || '—'}</td>
                  <td className="p-3">
                    {s.lionwheelData?.trackingLink ? (
                      <a href={s.lionwheelData.trackingLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                        {s.lionwheelData.publicId}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="p-3">{STATUS_LABELS[s.status] || s.status}</td>
                  <td className="p-3">
                    {NEXT_STATUS[s.status] && (
                      <button
                        onClick={() => advance(s)}
                        disabled={advancing[s.id]}
                        className="text-xs font-bold px-2 py-1 rounded border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {advancing[s.id] ? '...' : `סמן כ${STATUS_LABELS[NEXT_STATUS[s.status]!]}`}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
