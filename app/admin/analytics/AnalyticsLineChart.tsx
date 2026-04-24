'use client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DayStat {
  date: string;
  orders: number;
  revenue: number;
}

const navy = '#0c1a35';
const gold = '#b8972a';

export default function AnalyticsLineChart({ data }: { data: DayStat[] }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 20px' }}>📈 הזמנות — 7 ימים אחרונים</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#666' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#666' }} width={30} />
          <Tooltip
            formatter={(val, name) =>
              name === 'revenue'
                ? [`₪${Number(val).toLocaleString('he-IL')}`, 'הכנסות']
                : [val, 'הזמנות']
            }
            labelStyle={{ fontFamily: 'Heebo, Arial', direction: 'rtl' }}
            contentStyle={{ borderRadius: 8, fontSize: 13 }}
          />
          <Line type="monotone" dataKey="orders" stroke={navy} strokeWidth={2.5} dot={{ r: 4, fill: navy }} name="orders" />
          <Line type="monotone" dataKey="revenue" stroke={gold} strokeWidth={2} dot={{ r: 3, fill: gold }} name="revenue" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 24, height: 3, background: navy, display: 'inline-block', borderRadius: 2 }} /> הזמנות
        </span>
        <span style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 24, height: 3, background: gold, display: 'inline-block', borderRadius: 2, borderTop: '2px dashed ' + gold }} /> הכנסות (₪)
        </span>
      </div>
    </div>
  );
}
