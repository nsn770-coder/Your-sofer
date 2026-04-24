'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const AnalyticsLineChart = dynamic(() => import('./AnalyticsLineChart'), {
  ssr: false,
  loading: () => <div style={{ height: 340, background: '#fff', borderRadius: 14, marginBottom: 28 }} />,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt?: Timestamp;
}

interface DayStat {
  date: string;   // 'DD/MM'
  orders: number;
  revenue: number;
}

interface Stats {
  ordersToday: number;
  revenueToday: number;
  newUsersToday: number;
  newSoferimToday: number;
  recentOrders: Order[];
  last7Days: DayStat[];
  funnelOrders: number;     // all orders ever created (checkout initiated)
  funnelPaid: number;       // paid orders
  funnelPending: number;    // pending_payment orders
}

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function tsToDate(ts: Timestamp | undefined): Date | null {
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date((ts as unknown as { seconds: number }).seconds * 1000);
}

// ── Status badge helper ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    paid:            { bg: '#dcfce7', color: '#15803d', label: '✅ שולם' },
    pending_payment: { bg: '#fef9c3', color: '#854d0e', label: '⏳ ממתין לתשלום' },
    shipped:         { bg: '#dbeafe', color: '#1d4ed8', label: '🚚 נשלח' },
    delivered:       { bg: '#d1fae5', color: '#065f46', label: '📦 נמסר' },
    cancelled:       { bg: '#fee2e2', color: '#b91c1c', label: '❌ בוטל' },
  };
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') loadAll();
  }, [user]);

  async function loadAll() {
    setDataLoading(true);
    try {
      const today = startOfToday();
      const todayTs = Timestamp.fromDate(today);

      // ── Build last-7-days date buckets ──
      const buckets: DayStat[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        buckets.push({ date: dayLabel(d), orders: 0, revenue: 0 });
      }
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      // ── Orders ──
      const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const allOrders: Order[] = [];
      ordersSnap.forEach(d => allOrders.push({ id: d.id, ...d.data() } as Order));

      let ordersToday = 0;
      let revenueToday = 0;
      let funnelPaid = 0;
      let funnelPending = 0;

      allOrders.forEach(o => {
        const date = tsToDate(o.createdAt);
        if (!date) return;

        if (o.status === 'paid') funnelPaid++;
        if (o.status === 'pending_payment') funnelPending++;

        if (date >= today) {
          ordersToday++;
          revenueToday += o.total || 0;
        }
        if (date >= sevenDaysAgo) {
          const label = dayLabel(date);
          const bucket = buckets.find(b => b.date === label);
          if (bucket) {
            bucket.orders++;
            bucket.revenue += o.total || 0;
          }
        }
      });

      const recentOrders = allOrders.slice(0, 10);

      // ── New users today ──
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('createdAt', '>=', todayTs))
      );
      const newUsersToday = usersSnap.size;

      // ── New soferim today ──
      const soferimSnap = await getDocs(
        query(collection(db, 'soferim'), where('createdAt', '>=', todayTs))
      );
      const newSoferimToday = soferimSnap.size;

      setStats({
        ordersToday,
        revenueToday,
        newUsersToday,
        newSoferimToday,
        recentOrders,
        last7Days: buckets,
        funnelOrders: allOrders.length,
        funnelPaid,
        funnelPending,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  if (loading || (!user && !loading)) return null;
  if (user?.role !== 'admin') return null;

  const navy = '#0c1a35';
  const gold = '#b8972a';

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: navy, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            ← אדמין
          </button>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: 0 }}>📊 Analytics Dashboard</h1>
        </div>
        <button onClick={loadAll}
          style={{ background: gold, color: navy, border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🔄 רענן
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px' }}>

        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#888', fontSize: 18 }}>טוען נתונים...</div>
        ) : stats ? (
          <>
            {/* ── Summary cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              <Card icon="📦" label="הזמנות היום" value={stats.ordersToday} color="#16a34a" />
              <Card icon="₪"  label="סכום היום"   value={`₪${stats.revenueToday.toLocaleString('he-IL', { minimumFractionDigits: 0 })}`} color="#b8972a" />
              <Card icon="👤" label="משתמשים חדשים" value={stats.newUsersToday} color="#7c3aed" />
              <Card icon="✍️" label="סופרים חדשים" value={stats.newSoferimToday} color="#0c1a35" />
            </div>

            {/* ── Line chart ── */}
            <AnalyticsLineChart data={stats.last7Days} />

            {/* ── Funnel + Recent orders ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 20, marginBottom: 28, alignItems: 'start' }}>

              {/* Funnel */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 20px' }}>🔽 Funnel רכישות</h2>
                <FunnelBar label="הגיעו לצ׳קאאוט" value={stats.funnelOrders} max={stats.funnelOrders} color="#6366f1" />
                <FunnelBar label="ממתינים לתשלום" value={stats.funnelPending} max={stats.funnelOrders} color="#f59e0b" />
                <FunnelBar label="רכישות הושלמו" value={stats.funnelPaid} max={stats.funnelOrders} color="#16a34a" />
                {stats.funnelOrders > 0 && (
                  <p style={{ fontSize: 12, color: '#888', marginTop: 14, textAlign: 'center' }}>
                    שיעור המרה: <strong style={{ color: navy }}>{Math.round(stats.funnelPaid / stats.funnelOrders * 100)}%</strong>
                  </p>
                )}
                <p style={{ fontSize: 11, color: '#bbb', marginTop: 8, textAlign: 'center' }}>
                  * נתוני כניסות ועגלות דרך GA4
                </p>
              </div>

              {/* Recent orders */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 16px' }}>🕐 הזמנות אחרונות</h2>
                {stats.recentOrders.length === 0 ? (
                  <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>אין הזמנות עדיין</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['מספר הזמנה', 'לקוח', 'סכום', 'סטטוס', 'תאריך'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map(o => {
                        const d = tsToDate(o.createdAt);
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>{o.orderNumber}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: navy }}>{o.customerName}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: gold }}>₪{(o.total || 0).toLocaleString('he-IL')}</td>
                            <td style={{ padding: '8px 10px' }}><StatusBadge status={o.status} /></td>
                            <td style={{ padding: '8px 10px', color: '#888', whiteSpace: 'nowrap' }}>
                              {d ? d.toLocaleDateString('he-IL') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 80, color: '#c00' }}>שגיאה בטעינת הנתונים</div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Card({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
        <span style={{ color: '#444', fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value} <span style={{ color: '#aaa', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 10, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}
