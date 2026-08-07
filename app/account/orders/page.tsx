'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import PageFaqSection from '@/app/components/faq/PageFaqSection';
import { buildWhatsAppLink, WA_PREFILL } from '@/lib/whatsapp';
import { trackFaqEvent } from '@/lib/faqAnalytics';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: Timestamp | null;
  status: string;
  total: number;
  items: OrderItem[];
  address?: string;
  shippingType?: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  paid:       { label: 'ממתין לטיפול', color: '#92400e', bg: '#FEF3C7' },
  processing: { label: 'בטיפול',        color: '#3B3B41', bg: '#DBEAFE' },
  shipped:    { label: 'במשלוח',        color: '#065f46', bg: '#D1FAE5' },
  delivered:  { label: 'נמסר',          color: '#166534', bg: '#DCFCE7' },
  cancelled:  { label: 'בוטל',          color: '#991b1b', bg: '#FEE2E2' },
};

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const status = STATUS_LABEL[order.status] || { label: order.status, color: '#555', bg: '#F3F4F6' };
  const date = order.createdAt?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div style={{ background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      {/* שורת כותרת */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{order.orderNumber}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 12, padding: '3px 10px', background: status.bg, color: status.color, fontWeight: 700 }}>
            {status.label}
          </span>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>
            ₪{order.total?.toFixed(2) ?? '—'}
          </div>
          <span style={{ fontSize: 11, color: '#888', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
        </div>
      </button>

      {/* פרטי הזמנה — נפתחים */}
      {open && (
        <div style={{ borderTop: '1px solid #F0EDE8', padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 10, letterSpacing: 0.5 }}>מוצרים</div>
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 6 }}>
              <span>{item.name} × {item.quantity}</span>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>₪{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {order.address && (
            <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
              <span style={{ fontWeight: 700 }}>כתובת: </span>{order.address}
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 12, color: '#888' }}>
            <span style={{ fontWeight: 700 }}>אופן משלוח: </span>
            {order.shippingType === 'express' ? 'משלוח מהיר' : order.shippingType === 'pickup' ? 'איסוף עצמי' : 'משלוח רגיל'}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0EDE8', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
            <span>סה"כ</span>
            <span>₪{order.total?.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Capture synchronously so the async closure always sees non-null values
    const userUid   = user.uid;
    const userEmail = user.email;

    async function fetchOrders() {
      const seen = new Set<string>();
      const all: Order[] = [];

      async function runQuery(constraints: QueryConstraint[]) {
        try {
          const snap = await getDocs(query(collection(db, 'orders'), ...constraints, orderBy('createdAt', 'desc')));
          for (const d of snap.docs) {
            if (!seen.has(d.id)) { seen.add(d.id); all.push({ id: d.id, ...d.data() } as Order); }
          }
        } catch {
          // missing composite index — retry without orderBy
          try {
            const snap = await getDocs(query(collection(db, 'orders'), ...constraints));
            for (const d of snap.docs) {
              if (!seen.has(d.id)) { seen.add(d.id); all.push({ id: d.id, ...d.data() } as Order); }
            }
          } catch (e) { console.error('[orders] query failed', e); }
        }
      }

      // Primary: uid-based (logged-in orders after uid fix)
      if (userUid)   await runQuery([where('uid',   '==', userUid)]);
      // Fallback: email-based (legacy orders without uid)
      if (userEmail) await runQuery([where('email', '==', userEmail)]);

      all.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setOrders(all);
      setLoading(false);
    }

    fetchOrders().catch(e => { console.error('[orders]', e); setError('שגיאה בטעינת הזמנות'); setLoading(false); });
  }, [user?.uid, user?.email]);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 300, color: '#1a1a1a', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
        ההזמנות שלי
      </h2>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E7E2D8', borderTopColor: '#C5A028', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && <div style={{ color: '#c0392b', fontSize: 13, padding: 20 }}>{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>עדיין אין הזמנות</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>הזמנות שתבצע יופיעו כאן</div>
          <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 24, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 24px' }}>
            לא מופיעה הזמנה? ודאו שהתחברתם עם אותו חשבון Google שכתובת המייל שלו זהה לכתובת ששימשה בהזמנה.
          </div>
          <a href="/" style={{ background: '#1a1a1a', color: '#fff', padding: '11px 28px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            לחנות
          </a>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}

      {/* בירור מהיר בוואטסאפ עם קוד הזמנה */}
      {!loading && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a
            href={buildWhatsAppLink(WA_PREFILL.orderStatus)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFaqEvent('faq_order_status_click', { page: '/account/orders' })}
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '11px 24px', borderRadius: 10, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}
          >
            שליחת קוד הזמנה בוואטסאפ 💬
          </a>
        </div>
      )}

      {/* FAQ ממוקד — סטטוס הזמנה ושירות (מקור: data/faq.ts) */}
      <PageFaqSection pageKey="account" title="שאלות נפוצות" max={6} showWhatsAppCta={false} />
    </div>
  );
}
