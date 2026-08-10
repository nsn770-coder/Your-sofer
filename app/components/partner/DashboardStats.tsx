'use client';
import { useEffect, useState } from 'react';

interface Stats {
  revenue: number;
  commission: number;
  orders: number;
  visitors: number;
  previousMonthRevenue?: number;
  previousMonthCommission?: number;
  conversionRate: number;
  averageOrderValue: number;
}

export function DashboardStats({ idToken }: { idToken: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/partner/dashboard', {
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) {
        console.error('Load stats error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [idToken]);

  if (loading) return <div>בטעינה...</div>;
  if (!stats) return <div>לא ניתן לטעון סטטיסטיקות</div>;

  const revenueChange = stats.previousMonthRevenue
    ? Math.round(((stats.revenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100)
    : 0;

  const commissionChange = stats.previousMonthCommission
    ? Math.round(((stats.commission - stats.previousMonthCommission) / stats.previousMonthCommission) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card
        title="מכירות"
        value={`₪${stats.revenue.toLocaleString('he-IL')}`}
        change={revenueChange}
      />
      <Card
        title="רווח שלך"
        value={`₪${stats.commission.toLocaleString('he-IL')}`}
        change={commissionChange}
      />
      <Card title="הזמנות" value={stats.orders.toString()} change={0} />
      <Card title="מבקרים" value={stats.visitors.toString()} change={0} />
    </div>
  );
}

function Card({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: number;
}) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      <p className={`text-xs mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% מחודש שעבר
      </p>
    </div>
  );
}
