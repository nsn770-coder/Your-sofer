// Phase 10: Mobile-Optimized Earnings Chart Component
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EarningsData {
  date: string;
  revenue: number;
  commission: number;
  orders: number;
}

interface DailyData {
  date: string;
  revenue: number;
  commission: number;
  orders: number;
}

export function PartnerEarningsChart({ idToken }: { idToken: string }) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    async function fetchEarnings() {
      setError('');
      try {
        const res = await fetch(`/api/partner/earnings?days=${period}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const result = await res.json();
        if (result.success) {
          setData(result.dailyData || []);
        } else {
          setError(result.error || 'שגיאה בטעינת נתונים');
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'שגיאת חיבור';
        setError(errMsg);
        console.error('Failed to fetch earnings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, [period, idToken]);

  if (loading) {
    return (
      <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-400">טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        {(['7', '30', '90'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p} ימים
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString('he-IL')}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => `₪${Number(value).toLocaleString('he-IL')}`}
            labelFormatter={(label) => new Date(label).toLocaleDateString('he-IL')}
          />
          <Line
            type="monotone"
            dataKey="commission"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="עמלה"
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="הכנסה"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
