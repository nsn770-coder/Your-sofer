// Phase 10: Mobile-Optimized Payout Request Form
'use client';

import { useState } from 'react';

interface PayoutFormProps {
  idToken: string;
  availableBalance: number;
  onSuccess?: () => void;
}

export function PayoutRequestForm({ idToken, availableBalance, onSuccess }: PayoutFormProps) {
  const [amount, setAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/partner/payouts/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bankAccountId,
          notes,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'שגיאה ברישום בקשה');
        return;
      }

      setSuccess(true);
      setAmount('');
      setBankAccountId('');
      setNotes('');

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError('שגיאת חיבור. אנא נסה שוב.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MIN_PAYOUT = 200;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4 text-right">בקשת משיכה</h3>

      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 text-right">
        <p className="text-sm text-gray-600">יתרה זמינה</p>
        <p className="text-2xl font-bold text-blue-600">
          ₪{availableBalance.toLocaleString('he-IL')}
        </p>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-right">
          <p className="text-green-700">✓ בקשת משיכה נשלחה בהצלחה</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-right">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            סכום
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`מינימום ₪${MIN_PAYOUT}`}
              min={MIN_PAYOUT}
              step="10"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right"
            />
            <span className="text-gray-600">₪</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            חשבון בנק
          </label>
          <input
            type="text"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            placeholder="ID החשבון"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 text-right mb-1">
            הערות (אופציונלי)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות נוספות"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !amount || !bankAccountId}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'שולח...' : 'שלח בקשה'}
        </button>
      </form>
    </div>
  );
}
