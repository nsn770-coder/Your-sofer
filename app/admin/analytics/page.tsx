'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatPrice } from '@/app/lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  type OrderLike,
  type OrderItemLike,
  getOrderDate,
  getOrderTotal,
  getStatusLabel,
  isAbandonedCheckout,
  isFailedPayment,
  isPaidOrder,
  isPendingPayment,
} from '@/app/lib/orderStatus';
import { type AccountEra, isOrderInEra } from '@/app/lib/accountEra';
import EraToggle from '@/app/components/EraToggle';

const AnalyticsLineChart = dynamic(() => import('./AnalyticsLineChart'), {
  ssr: false,
  loading: () => <div style={{ height: 340, background: '#fff', borderRadius: 14, marginBottom: 28 }} />,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Order extends OrderLike {
  id: string;
  orderNumber: string;
  customerName?: string;
  email?: string;
  address?: string;
  notes?: string;
  account?: string; // 'business' | 'amuta' — stamped from 10/07/2026; older orders have none
}

interface DayStat {
  date: string;   // 'DD/MM'
  orders: number;
  revenue: number;
}

type RangePreset = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

// ── Date range helpers ────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function computeRange(preset: RangePreset, customFrom: string, customTo: string): DateRange {
  const now = new Date();
  const today0 = startOfDay(now);

  if (preset === 'today') return { from: today0, to: endOfDay(now) };

  if (preset === 'yesterday') {
    const y = new Date(today0);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }

  if (preset === '7d') {
    const f = new Date(today0);
    f.setDate(f.getDate() - 6);
    return { from: f, to: endOfDay(now) };
  }

  if (preset === '30d') {
    const f = new Date(today0);
    f.setDate(f.getDate() - 29);
    return { from: f, to: endOfDay(now) };
  }

  if (preset === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }

  // custom
  const f = customFrom ? startOfDay(new Date(customFrom)) : today0;
  const t = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
  return { from: f, to: t };
}

const MAX_CHART_DAYS = 366;

function buildDayBuckets(range: DateRange): DayStat[] {
  const buckets: DayStat[] = [];
  const cursor = startOfDay(range.from);
  const last = startOfDay(range.to);
  let guard = 0;
  while (cursor.getTime() <= last.getTime() && guard < MAX_CHART_DAYS) {
    buckets.push({ date: dayLabel(cursor), orders: 0, revenue: 0 });
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return buckets;
}

// ── WhatsApp helper ────────────────────────────────────────────────────────

const ABANDONED_WA_MESSAGE = 'היי, ראינו שהתחלת הזמנה באתר Your Sofer ורצינו לבדוק אם אפשר לעזור להשלים את ההזמנה.';

function buildWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('972') ? digits : digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(ABANDONED_WA_MESSAGE)}`;
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [era, setEra] = useState<AccountEra>('business');
  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState(toInputDate(new Date(Date.now() - 29 * 86400000)));
  const [customTo, setCustomTo] = useState(toInputDate(new Date()));

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') loadAll();
  }, [user]);

  async function loadAll() {
    setDataLoading(true);
    setLoadError(null);
    try {
      const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const data: Order[] = [];
      ordersSnap.forEach(d => data.push({ id: d.id, ...d.data() } as Order));
      setAllOrders(data);
    } catch (e) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setDataLoading(false);
    }
  }

  const range = useMemo(() => computeRange(rangePreset, customFrom, customTo), [rangePreset, customFrom, customTo]);

  const ordersInRange = useMemo(() => {
    return allOrders.filter(o => {
      const d = getOrderDate(o);
      if (!isOrderInEra(o, d, era)) return false;
      if (!d) return false;
      return d.getTime() >= range.from.getTime() && d.getTime() <= range.to.getTime();
    });
  }, [allOrders, range, era]);

  const stats = useMemo(() => {
    const paid = ordersInRange.filter(isPaidOrder);
    const pending = ordersInRange.filter(isPendingPayment);
    const abandoned = ordersInRange.filter(isAbandonedCheckout);
    const failed = ordersInRange.filter(isFailedPayment);

    const revenue = paid.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const aov = paid.length > 0 ? revenue / paid.length : null;

    const buckets = buildDayBuckets(range);
    paid.forEach(o => {
      const d = getOrderDate(o);
      if (!d) return;
      const bucket = buckets.find(b => b.date === dayLabel(d));
      if (bucket) {
        bucket.orders++;
        bucket.revenue += getOrderTotal(o);
      }
    });

    // ── Best sellers (paid orders only, gift line-items excluded) ──
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    paid.forEach(o => {
      (o.items || []).forEach((item: OrderItemLike) => {
        if (item.isGift) return;
        const key = item.productId || item.id || item.name || 'unknown';
        const name = item.productName || item.name || 'מוצר לא ידוע';
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const existing = productMap.get(key);
        if (existing) {
          existing.quantity += qty;
          existing.revenue += qty * price;
        } else {
          productMap.set(key, { name, quantity: qty, revenue: qty * price });
        }
      });
    });
    const bestSellers = [...productMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    const abandonmentRows = [...pending, ...abandoned, ...failed].sort((a, b) => {
      const da = getOrderDate(a)?.getTime() || 0;
      const db_ = getOrderDate(b)?.getTime() || 0;
      return db_ - da;
    });

    const paidRows = [...paid].sort((a, b) => {
      const da = getOrderDate(a)?.getTime() || 0;
      const db_ = getOrderDate(b)?.getTime() || 0;
      return db_ - da;
    });

    return {
      paidCount: paid.length,
      revenue,
      aov,
      pendingCount: pending.length,
      abandonedCount: abandoned.length,
      failedCount: failed.length,
      chartData: buckets,
      bestSellers,
      abandonmentRows,
      paidRows,
    };
  }, [ordersInRange, range]);

  if (loading || (!user && !loading)) return null;
  if (user?.role !== 'admin') return null;

  const navy = '#3B3B41';
  const gold = '#C5A028';

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Heebo, Arial, sans-serif', paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <div style={{ background: navy, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── Account era toggle (business vs. amuta history) ── */}
        <EraToggle era={era} setEra={setEra} />

        {/* ── Date range bar ── */}
        <DateRangeBar
          preset={rangePreset}
          setPreset={setRangePreset}
          customFrom={customFrom}
          customTo={customTo}
          setCustomFrom={setCustomFrom}
          setCustomTo={setCustomTo}
        />

        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#888', fontSize: 18 }}>טוען נתונים...</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#c00' }}>שגיאה בטעינת הנתונים: {loadError}</div>
        ) : (
          <>
            {/* ── KPI cards: real purchase data ── */}
            <SectionTitle>📦 ביצועי מכירות בטווח הנבחר</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
              <Card icon="✅" label="רכישות ששולמו בפועל" value={stats.paidCount} color="#16a34a" />
              <Card icon="₪" label="הכנסות בפועל" value={formatPrice(stats.revenue)} color="#16a34a" />
              <Card icon="📈" label="ממוצע הזמנה (AOV)" value={stats.aov === null ? 'אין נתונים זמינים' : formatPrice(stats.aov)} color="#16a34a" small={stats.aov === null} />
              <Card icon="⏳" label="ממתינים לתשלום" value={stats.pendingCount} color="#f59e0b" />
              <Card icon="🚫" label="נטישות צ׳קאאוט" value={stats.abandonedCount} color="#f59e0b" />
              <Card icon="❌" label="תשלום נכשל / בוטל" value={stats.failedCount} color="#dc2626" />
            </div>

            {/* ── KPI cards: traffic placeholders (no event data in Firestore yet) ── */}
            <SectionTitle>👀 תנועה באתר (ממתין לחיבור GA4 / Meta)</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
              <Card icon="👁️" label="כניסות לאתר" value="אין נתונים זמינים" color="#9ca3af" small />
              <Card icon="🧍" label="מבקרים ייחודיים" value="אין נתונים זמינים" color="#9ca3af" small />
              <Card icon="🛍️" label="צפיות במוצר" value="אין נתונים זמינים" color="#9ca3af" small />
              <Card icon="🛒" label="הוספות לעגלה" value="אין נתונים זמינים" color="#9ca3af" small />
            </div>

            {/* ── Chart ── */}
            <AnalyticsLineChart data={stats.chartData} title="📈 רכישות ששולמו והכנסות — לפי יום" />

            {/* ── Paid orders table ── */}
            <PaidOrdersTable rows={stats.paidRows} onOpen={setDetailOrder} />

            {/* ── Abandonment table ── */}
            <AbandonmentTable rows={stats.abandonmentRows} onOpen={setDetailOrder} />

            {/* ── Best sellers ── */}
            <BestSellersTable rows={stats.bestSellers} />
          </>
        )}
      </div>

      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  );
}

// ── Date range bar ───────────────────────────────────────────────────────────

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'היום' },
  { value: 'yesterday', label: 'אתמול' },
  { value: '7d', label: '7 ימים' },
  { value: '30d', label: '30 ימים' },
  { value: 'month', label: 'החודש' },
  { value: 'custom', label: 'טווח מותאם' },
];

function DateRangeBar({ preset, setPreset, customFrom, customTo, setCustomFrom, setCustomTo }: {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (s: string) => void;
  setCustomTo: (s: string) => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      {RANGE_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => setPreset(opt.value)}
          style={{
            background: preset === opt.value ? '#3B3B41' : '#f3f4f6',
            color: preset === opt.value ? '#fff' : '#444',
            border: 'none', borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
          {opt.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: '#666' }}>מ-:</label>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
          <label style={{ fontSize: 12, color: '#666' }}>עד:</label>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 800, color: '#3B3B41', margin: '0 0 14px' }}>{children}</h2>;
}

function Card({ icon, label, value, color, small }: { icon: string; label: string; value: number | string; color: string; small?: boolean }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: small ? 15 : 26, fontWeight: 900, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | undefined }) {
  const colorMap: Record<string, { bg: string; color: string }> = {
    paid: { bg: '#dcfce7', color: '#15803d' },
    magiah: { bg: '#ccfbf1', color: '#0f766e' },
    sofer: { bg: '#dbeafe', color: '#1d4ed8' },
    packing: { bg: '#ede9fe', color: '#6d28d9' },
    shipped: { bg: '#dbeafe', color: '#1d4ed8' },
    delivered: { bg: '#d1fae5', color: '#065f46' },
    completed: { bg: '#bbf7d0', color: '#166534' },
    needs_care: { bg: '#fee2e2', color: '#b91c1c' },
    abandoned: { bg: '#f3f4f6', color: '#6b7280' },
    cancelled: { bg: '#fee2e2', color: '#b91c1c' },
    pending_payment: { bg: '#fef9c3', color: '#854d0e' },
  };
  const s = (status && colorMap[status]) || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {getStatusLabel(status)}
    </span>
  );
}

function formatDateTime(d: Date | null): string {
  if (!d) return '-';
  return `${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
}

function PaidOrdersTable({ rows, onOpen }: { rows: Order[]; onOpen: (o: Order) => void }) {
  const navy = '#3B3B41';
  const gold = '#C5A028';
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto', marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 16px' }}>✅ הזמנות ששולמו ({rows.length})</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>אין הזמנות ששולמו בטווח הנבחר</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['מספר הזמנה', 'לקוח', 'תאריך', 'סכום', 'סטטוס תשלום', ''].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(o => {
              const d = getOrderDate(o);
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: '#333' }}>{o.orderNumber}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: navy }}>{o.customerName || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#888', whiteSpace: 'nowrap' }}>{formatDateTime(d)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: gold }}>{formatPrice(getOrderTotal(o))}</td>
                  <td style={{ padding: '8px 10px' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: '8px 10px' }}>
                    <button onClick={() => onOpen(o)}
                      style={{ background: '#f0f4ff', color: navy, border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      פתח הזמנה
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function stageLabel(o: Order): string {
  if (isFailedPayment(o)) return '❌ נכשל';
  if (isAbandonedCheckout(o)) return '🚫 נטישה';
  return '⏳ ממתין';
}

function AbandonmentTable({ rows, onOpen }: { rows: Order[]; onOpen: (o: Order) => void }) {
  const navy = '#3B3B41';
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto', marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 16px' }}>🛒 נטישות עגלה / צ׳קאאוט ({rows.length})</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>אין נטישות בטווח הנבחר</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['תאריך ושעה', 'שלב', 'לקוח', 'טלפון', 'סכום', 'מוצרים בעגלה', ''].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(o => {
              const d = getOrderDate(o);
              const products = (o.items || []).filter(i => !i.isGift).map(i => i.productName || i.name).filter(Boolean).join(', ');
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', color: '#888', whiteSpace: 'nowrap' }}>{formatDateTime(d)}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{stageLabel(o)}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: navy }}>{o.customerName || '-'}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{o.phone || '-'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700 }}>{formatPrice(getOrderTotal(o))}</td>
                  <td style={{ padding: '8px 10px', maxWidth: 240, color: '#555' }}>{products || '-'}</td>
                  <td style={{ padding: '8px 10px', display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                    <button onClick={() => onOpen(o)}
                      style={{ background: '#f0f4ff', color: navy, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      פרטים
                    </button>
                    {o.phone && (
                      <a href={buildWhatsAppLink(o.phone)} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                        💬 WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BestSellersTable({ rows }: { rows: { name: string; quantity: number; revenue: number }[] }) {
  const navy = '#3B3B41';
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '24px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto', marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: navy, margin: '0 0 16px' }}>🏆 המוצרים הנמכרים ביותר בטווח (מתוך הזמנות ששולמו)</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>אין מכירות בטווח הנבחר</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['מוצר', 'כמות שנמכרה', 'הכנסה'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#555', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: navy }}>{r.name}</td>
                <td style={{ padding: '8px 10px' }}>{r.quantity}</td>
                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#C5A028' }}>{formatPrice(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const navy = '#3B3B41';
  const d = getOrderDate(order);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', padding: 22, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: navy }}>הזמנה {order.orderNumber}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#333', marginBottom: 14 }}>
          <div><strong>סטטוס:</strong> <StatusBadge status={order.status} /></div>
          <div><strong>תאריך:</strong> {formatDateTime(d)}</div>
          <div><strong>לקוח:</strong> {order.customerName || '-'}</div>
          <div><strong>טלפון:</strong> {order.phone || '-'}</div>
          <div><strong>אימייל:</strong> {order.email || '-'}</div>
          <div><strong>כתובת:</strong> {order.address || '-'}</div>
          <div><strong>סכום:</strong> {formatPrice(getOrderTotal(order))}</div>
          {order.notes && <div><strong>הערות:</strong> {order.notes}</div>}
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: navy, marginBottom: 8 }}>פריטים</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {(order.items || []).map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span>{item.productName || item.name}{item.isGift ? ' (מתנה)' : ''} × {item.quantity || 1}</span>
              <span style={{ fontWeight: 700 }}>{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
