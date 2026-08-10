'use client';

import { useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

interface Shipment {
  taskId?: string | null;
  publicId?: string | null;
  trackingLink?: string | null;
  barcode?: string | null;
  createdAt?: string;
}

interface SendToLionWheelButtonProps {
  orderId: string;
  orderNumber: string;
  /** משלוח קיים שנשמר בהזמנה — מוצג מיד בטעינת הדף */
  existingShipment?: Shipment | null;
  onSuccess?: (shipmentData: Shipment) => void;
}

export function SendToLionWheelButton({
  orderId,
  orderNumber,
  existingShipment,
  onSuccess,
}: SendToLionWheelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(existingShipment ?? null);
  const [error, setError] = useState('');

  const sent = !!shipment?.publicId;

  const handleSend = async () => {
    // משלוח כבר קיים — דורש אישור מפורש כדי לא ליצור כפילות בטעות
    if (sent) {
      const ok = window.confirm(
        `להזמנה ${orderNumber} כבר קיים משלוח (${shipment!.publicId}).\n\nליצור משלוח נוסף?`
      );
      if (!ok) return;
    }

    setIsLoading(true);
    setError('');

    try {
      const auth = await getAuthLazy();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('לא מחובר — התחבר מחדש ונסה שוב');

      const response = await fetch('/api/lionwheel/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId, force: sent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || data.details?.error || 'שגיאה בשליחה ל-LionWheel');
      }

      setShipment(data.shipment);
      onSuccess?.(data.shipment);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא ידועה');
      setTimeout(() => setError(''), 8000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleSend}
        disabled={isLoading}
        className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-red-300 text-red-700 bg-red-50'
            : sent
              ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
              : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
        }`}
        title={
          sent
            ? `משלוח קיים: ${shipment!.publicId} — לחיצה תיצור משלוח נוסף`
            : 'שלח הזמנה ל-LionWheel'
        }
      >
        {isLoading ? 'שולח...' : error ? '✕ שגיאה' : sent ? '✓ נשלח' : '🚚 LionWheel'}
      </button>

      {sent && !error && (
        shipment!.trackingLink ? (
          <a
            href={shipment!.trackingLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
          >
            {shipment!.publicId}
          </a>
        ) : (
          <span className="text-xs font-medium text-green-600">{shipment!.publicId}</span>
        )
      )}

      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}
