'use client';

import { useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';
import type { FulfillmentPlan, ShipmentRecord, WarehouseAddress } from '@/app/lib/types';

interface PlanOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: { id?: string; name?: string; productName?: string; quantity: number; price: number }[];
  fulfillmentPlan: FulfillmentPlan;
}

interface FulfillmentPlanModalProps {
  order: PlanOrder;
  onClose: () => void;
  onDone: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  main: 'מחסן ראשי — Your Sofer',
};

function sourceLabel(source: string) {
  if (source === 'main') return SOURCE_LABELS.main;
  return `שותף — ${source.replace('partner_', '')}`;
}

export default function FulfillmentPlanModal({ order, onClose, onDone }: FulfillmentPlanModalProps) {
  const [overrides, setOverrides] = useState<Record<string, Partial<WarehouseAddress>>>({});
  const [results, setResults] = useState<Record<string, 'pending' | 'ok' | 'error'>>({});
  const [errorMsg, setErrorMsg] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const shipments = order.fulfillmentPlan.shipments || [];

  function itemNames(itemIds: string[]) {
    return order.items
      .filter((i) => itemIds.includes(i.id || ''))
      .map((i) => `${i.name || i.productName || 'מוצר'} ×${i.quantity}`)
      .join(', ');
  }

  function updateOverride(shipmentId: string, field: keyof WarehouseAddress, value: string) {
    setOverrides((prev) => ({
      ...prev,
      [shipmentId]: { ...prev[shipmentId], [field]: value },
    }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const auth = await getAuthLazy();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('לא מחובר');

      for (const shipment of shipments) {
        if (shipment.status !== 'pending') {
          setResults((prev) => ({ ...prev, [shipment.id]: 'ok' }));
          continue;
        }
        setResults((prev) => ({ ...prev, [shipment.id]: 'pending' }));
        const pickupAddress = { ...shipment.pickupAddress, ...overrides[shipment.id] };
        try {
          const res = await fetch('/api/lionwheel/create-shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              shipmentId: shipment.id,
              orderId: order.id,
              source: shipment.source,
              pickupAddress,
              destinationAddress: shipment.destinationAddress,
              itemIds: shipment.itemIds,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || data.error || 'שגיאה ביצירת משלוח');
          setResults((prev) => ({ ...prev, [shipment.id]: 'ok' }));
        } catch (e) {
          setResults((prev) => ({ ...prev, [shipment.id]: 'error' }));
          setErrorMsg((prev) => ({ ...prev, [shipment.id]: e instanceof Error ? e.message : 'שגיאה' }));
        }
      }
    } finally {
      setSubmitting(false);
      onDone();
    }
  }

  const allDone = shipments.length > 0 && shipments.every((s) => results[s.id] === 'ok' || s.status !== 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-800">יצירת משלוחים — הזמנה {order.orderNumber}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{order.customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {shipments.length === 0 && (
            <div className="text-center text-gray-400 py-6">אין תוכנית משלוחים להזמנה זו</div>
          )}
          {shipments.map((shipment: ShipmentRecord) => {
            const result = results[shipment.id];
            const alreadyCreated = shipment.status !== 'pending';
            return (
              <div key={shipment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-gray-800">{sourceLabel(shipment.source)}</div>
                  {alreadyCreated && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                      ✓ נוצר כבר ({shipment.status})
                    </span>
                  )}
                  {!alreadyCreated && result === 'ok' && (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">✓ נוצר</span>
                  )}
                  {!alreadyCreated && result === 'pending' && (
                    <span className="text-xs font-semibold text-amber-600">שולח...</span>
                  )}
                  {!alreadyCreated && result === 'error' && (
                    <span className="text-xs font-semibold text-red-600">✕ {errorMsg[shipment.id]}</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-3">{itemNames(shipment.itemIds)}</div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex flex-col gap-1">
                    <span className="text-gray-500">עיר איסוף</span>
                    <input
                      disabled={alreadyCreated}
                      defaultValue={shipment.pickupAddress.city}
                      onChange={(e) => updateOverride(shipment.id, 'city', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 disabled:bg-gray-50"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-gray-500">רחוב ומספר</span>
                    <input
                      disabled={alreadyCreated}
                      defaultValue={shipment.pickupAddress.street}
                      onChange={(e) => updateOverride(shipment.id, 'street', e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 disabled:bg-gray-50"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200">
            סגור
          </button>
          {!allDone && (
            <button
              onClick={handleConfirm}
              disabled={submitting || shipments.length === 0}
              style={{ background: 'var(--ys-heading)', color: 'var(--ys-accent)' }}
              className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
            >
              {submitting ? 'יוצר משלוחים...' : 'אישור — יצור בLionWheel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
