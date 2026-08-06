'use client';

import { useState } from 'react';

interface SendToLionWheelButtonProps {
  orderId: string;
  orderNumber: string;
  onSuccess?: (shipmentData: any) => void;
}

export function SendToLionWheelButton({
  orderId,
  orderNumber,
  onSuccess,
}: SendToLionWheelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/lionwheel/create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details?.error || 'שגיאה בשליחה ל-LionWheel');
      }

      setStatus('success');
      setMessage(`✓ משלוח נוצר: ${data.shipment.publicId}`);

      if (onSuccess) {
        onSuccess(data.shipment);
      }

      setTimeout(() => setStatus('idle'), 4000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      setStatus('error');
      setMessage(errorMessage);
      setTimeout(() => setStatus('idle'), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSend}
        disabled={isLoading || status !== 'idle'}
        className={`
          text-xs font-bold px-2 py-1 rounded border whitespace-nowrap transition-all
          ${
            status === 'success'
              ? 'border-green-300 text-green-700 bg-green-50'
              : status === 'error'
                ? 'border-red-300 text-red-700 bg-red-50'
                : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed'
          }
        `}
        title={
          status === 'success'
            ? 'משלוח נוצר בהצלחה'
            : status === 'error'
              ? 'שגיאה בשליחה'
              : 'שלח הזמנה ל-LionWheel'
        }
      >
        {isLoading ? '...שולח' : status === 'success' ? '✓ שנשלח' : status === 'error' ? '✕ שגיאה' : '🚚 LionWheel'}
      </button>

      {message && (
        <span
          className={`text-xs font-medium ${
            status === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
