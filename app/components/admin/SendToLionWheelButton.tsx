'use client';
import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';

interface SendToLionWheelButtonProps {
  orderId: string;
  orderNumber?: string;
  existingShipment: any;
}

export function SendToLionWheelButton({
  orderId,
  orderNumber,
  existingShipment,
}: SendToLionWheelButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSendToLionWheel() {
    if (existingShipment?.publicId && !window.confirm('משלוח כבר קיים. לצור משלוח חדש?')) {
      return;
    }

    setLoading(true);
    try {
      const _auth = await getAuthLazy();
      const idToken = await _auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('לא ניתן להוציא token');

      const res = await fetch('/api/lionwheel/create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId, force: !!existingShipment?.publicId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ שגיאה:\n${data.error || 'שגיאה לא ידועה'}\n\n${data.message || ''}`);
        return;
      }

      if (data.alreadyExists) {
        alert(`✅ משלוח כבר קיים\n\nמזהה: ${data.shipment.publicId}\nעמוד שלוח: ${data.shipment.trackingLink || 'טרם זמין'}`);
        return;
      }

      alert(
        `✅ משלוח נוצר בהצלחה!\n\n` +
        `מזהה: ${data.shipment.publicId || 'טרם זמין'}\n` +
        `ברקוד: ${data.shipment.barcode || 'טרם זמין'}\n` +
        `עמוד שלוח: ${data.shipment.trackingLink || 'טרם זמין'}`
      );

      // רענון הדף כדי שיעדכן את הנתונים
      window.location.reload();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSendToLionWheel}
      disabled={loading}
      className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap transition ${
        existingShipment?.publicId
          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50'
          : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50'
      }`}
      title={existingShipment?.publicId ? 'משלוח כבר קיים — לחץ ליצור משלוח חדש' : 'יצירת משלוח ב-LionWheel'}
    >
      {loading ? '⏳ טוען...' : existingShipment?.publicId ? '🔄 משלוח קיים' : '📦 יצור משלוח'}
    </button>
  );
}
