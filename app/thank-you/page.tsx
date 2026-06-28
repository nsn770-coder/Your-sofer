'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as pixel from '@/lib/metaPixel';
import { useAuth } from '../contexts/AuthContext';

// ── Gematria blessing system ───────────────────────────────────────────────────

/**
 * Customer number formula (deterministic):
 *   customerNumber = max(1, hour × 20 + floor(minute / 3))
 *
 * Examples:
 *   10:00 → 10×20 + 0 = 200
 *   00:00 → 0 + 0 → clamped to 1
 *   23:59 → 460 + 19 = 479
 *
 * The formula maps any hour:minute to a value in [1, 479].
 * We then find the Hebrew word whose gematria value is closest.
 */
function computeCustomerNumber(createdAtSeconds: number): number {
  const d = new Date(createdAtSeconds * 1000);
  const hour = d.getHours();
  const minute = d.getMinutes();
  return Math.max(1, hour * 20 + Math.floor(minute / 3));
}

interface GematriaBlessingEntry {
  value: number;
  word: string;
  blessing: string;
}

const GEMATRIA_BLESSINGS: GematriaBlessingEntry[] = [
  { value: 17,  word: 'טוב',     blessing: 'יהיה לך טוב בכל דרכיך' },
  { value: 18,  word: 'חי',      blessing: 'חיים ארוכים ובריאים לך ולביתך' },
  { value: 29,  word: 'חדווה',   blessing: 'חדווה ושמחה ימלאו את ביתך' },
  { value: 34,  word: 'כוח',     blessing: 'תמיד יהיה לך כוח להצליח' },
  { value: 45,  word: 'גאולה',   blessing: 'גאולה ופדיה לך ולכל ישראל' },
  { value: 58,  word: 'חן',      blessing: 'חן וחסד ימצאו עמך בכל מקום' },
  { value: 67,  word: 'בינה',    blessing: 'בינה ודעת יואירו את דרכך' },
  { value: 68,  word: 'חיים',    blessing: 'חיים מלאי אושר ובריאות' },
  { value: 72,  word: 'חסד',     blessing: 'חסד אלוקי ילווה אותך תמיד' },
  { value: 73,  word: 'חכמה',    blessing: 'חכמה ובינה יישרו את דרכך' },
  { value: 91,  word: 'אמן',     blessing: 'אמן — כל ברכותיך יתקיימו' },
  { value: 97,  word: 'אמון',    blessing: 'אמון ונאמנות ילוו את חייך' },
  { value: 103, word: 'נחמה',    blessing: 'נחמה ושלווה ימלאו את לבך' },
  { value: 106, word: 'יופי',    blessing: 'יופי ועושר יגיעו אליך' },
  { value: 123, word: 'ענג',     blessing: 'עונג ושפע ישרו על ביתך' },
  { value: 130, word: 'צהלה',    blessing: 'צהלה ורינה בביתך לעולם' },
  { value: 138, word: 'הצלחה',   blessing: 'הצלחה ושגשוג בכל אשר תפנה' },
  { value: 148, word: 'נצח',     blessing: 'ניצחון ותהילה לך ולמשפחתך' },
  { value: 207, word: 'אור',     blessing: 'אור גדול יאיר את דרכך' },
  { value: 209, word: 'הדר',     blessing: 'הדר ותפארת ילוו אותך' },
  { value: 214, word: 'ניצחון',  blessing: 'ניצחון בכל אתגריך' },
  { value: 227, word: 'ברכה',    blessing: 'ברכה והצלחה בכל מעשה ידיך' },
  { value: 255, word: 'רנה',     blessing: 'שיר ורנה ישמע מביתך' },
  { value: 292, word: 'רפואה',   blessing: 'רפואה שלמה לך ולכל יקיריך' },
  { value: 306, word: 'דבש',     blessing: 'מתיקות ושפע יגיעו אליך' },
  { value: 347, word: 'שלווה',   blessing: 'שלווה ומנוחה בכל מקום שתלך' },
  { value: 353, word: 'שמחה',    blessing: 'שמחה אמיתית תמלא את לבך' },
  { value: 376, word: 'שלום',    blessing: 'שלום ושלווה בביתך לעולם' },
  { value: 391, word: 'ישועה',   blessing: 'ישועה ורחמים ישרו עליך' },
  { value: 441, word: 'אמת',     blessing: 'תמיד תלך בדרך האמת' },
  { value: 450, word: 'שפע',     blessing: 'שפע ברכות מהשמים יגיעו אליך' },
  { value: 474, word: 'דעת',     blessing: 'דעת ואמונה ינחו את צעדיך' },
];

function findClosestBlessing(n: number): GematriaBlessingEntry {
  let best = GEMATRIA_BLESSINGS[0];
  let bestDist = Math.abs(n - best.value);
  for (const entry of GEMATRIA_BLESSINGS) {
    const dist = Math.abs(n - entry.value);
    if (dist < bestDist) { best = entry; bestDist = dist; }
  }
  return best;
}

const GIFT_THRESHOLD = 250;

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const orderNumber = searchParams.get('order');
  const orderId = searchParams.get('orderId');
  const [emailSent, setEmailSent] = useState(false);
  const [blessing, setBlessing] = useState<{ customerNumber: number; word: string; text: string } | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [checkoutEnabled, setCheckoutEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDoc(doc(db, 'siteSettings', 'global'))
      .then(snap => { if (snap.exists()) setCheckoutEnabled(snap.data().checkoutEnabled ?? true); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!orderId || emailSent) return;

    async function sendEmail() {
      try {
        // קבל פרטי ההזמנה מ-Firestore
        console.log('[thank-you] fetching order', orderId);
        const orderSnap = await getDoc(doc(db, 'orders', orderId!));
        if (!orderSnap.exists()) {
          console.error('[thank-you] order not found:', orderId);
          return;
        }

        const order = orderSnap.data();
        console.log('[thank-you] order loaded, sessionId:', order.sessionId, 'email:', order.email);

        // Gematria blessing
        const createdSec: number =
          order.createdAt?.seconds ?? Math.floor(Date.now() / 1000);
        const customerNum = computeCustomerNumber(createdSec);
        const blessingEntry = findClosestBlessing(customerNum);
        setBlessing({ customerNumber: customerNum, word: blessingEntry.word, text: blessingEntry.blessing });
        setOrderTotal(order.total ?? 0);

        // עדכן סטטוס הזמנה ל-paid
        await updateDoc(doc(db, 'orders', orderId!), {
          status: 'paid',
          paidAt: new Date().toISOString(),
        });

        // סמן עגלה נטושה כמומרת
        try {
          if (order.sessionId) {
            await updateDoc(doc(db, 'abandoned_carts', order.sessionId), {
              converted: true,
              convertedOrderId: orderId,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.error('[thank-you] abandoned_cart update failed:', e);
        }

        // שמור / עדכן רשומת לקוח
        const email: string = order.email || '';
        if (email) {
          try {
            const customerRef = doc(db, 'customers', email.toLowerCase());
            const customerSnap = await getDoc(customerRef);
            const now = new Date().toISOString();
            if (customerSnap.exists()) {
              const existing = customerSnap.data();
              await updateDoc(customerRef, {
                lastOrderAt: now,
                totalOrders: (existing.totalOrders || 0) + 1,
                totalSpent: Math.round(((existing.totalSpent || 0) + (order.total || 0)) * 100) / 100,
              });
              console.log('[thank-you] customer updated:', email);
            } else {
              await setDoc(customerRef, {
                name: order.customerName || '',
                email: email.toLowerCase(),
                phone: order.phone || '',
                address: order.address || '',
                firstOrderAt: now,
                lastOrderAt: now,
                totalOrders: 1,
                totalSpent: order.total || 0,
                isGuest: !order.uid,
                uid: order.uid || null,
              });
              console.log('[thank-you] customer created:', email);
            }
          } catch (e) {
            console.error('[thank-you] customer upsert failed:', e);
          }
        }

        // GA4 purchase event
        window.gtag?.('event', 'purchase', {
          transaction_id: order.orderNumber,
          value: order.total,
          currency: 'ILS',
          items: (order.items || []).map((i: { id: string; name: string; price: number; quantity: number }) => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        });

        // ── Google Ads Conversion — קוד מהקמפיינר (Ben Amsalem) ──
        // מזהה המרה: AW-18095875961/f0NoCLGexLIcEPnO5LRD
        // נורה רק בעמוד הצלחת תשלום, מוגן מירי כפול דרך localStorage. אין לשנות.
        const adsConversionKey = `gads_conversion_fired_${orderId}`;
        let adsAlreadyFired = false;
        try {
          if (typeof window !== 'undefined') {
            adsAlreadyFired = !!localStorage.getItem(adsConversionKey);
          }
        } catch {}
        if (!adsAlreadyFired && typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('event', 'conversion', {
            send_to: 'AW-18095875961/f0NoCLGexLIcEPnO5LRD',
            value: order.total,
            currency: 'ILS',
            transaction_id: order.orderNumber,
          });
          try {
            localStorage.setItem(adsConversionKey, '1');
          } catch {}
        }

        // Meta Pixel purchase event — guarded against double-fire on page refresh
        const pixelKey = `purchase_fired_${orderId}`;
        let alreadyFired = false;
        try {
          if (typeof window !== 'undefined') {
            alreadyFired = !!localStorage.getItem(pixelKey);
          }
        } catch {}
        if (!alreadyFired) {
          pixel.purchase(
            order.orderNumber,
            (order.items || []).map((i: { id: string; name: string; price: number; quantity: number }) => ({
              id: i.id, name: i.name, price: i.price, quantity: i.quantity,
            })),
            order.total,
          );
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(pixelKey, '1');
            }
          } catch {}
        }

        // שלח מייל ללקוח
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: order.email,
            customerName: order.customerName,
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.total,
            address: order.address,
          }),
        });

        // סנכרן לתוך מערכת הניהול הפנימית
        fetch('/api/ops/sync-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            orderId: orderId,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.email,
            customerPhone: order.phone || '',
            items: order.items,
            total: order.total,
            address: order.address,
          }),
        }).catch((e) => console.error('Ops sync error (non-fatal):', e));

        setEmailSent(true);
      } catch (e) {
        console.error('Email send error:', e);
      }
    }

    sendEmail();
  }, [orderId]);

  const hasGift = orderTotal >= GIFT_THRESHOLD;

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 48px', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {/* ── Admin: checkout status indicator ── */}
      {user?.role === 'admin' && checkoutEnabled !== null && (
        <div style={{
          marginTop: 16, marginBottom: -8, padding: '8px 14px', borderRadius: 10,
          background: checkoutEnabled ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${checkoutEnabled ? '#86efac' : '#fed7aa'}`,
          fontSize: 12, fontWeight: 700,
          color: checkoutEnabled ? '#15803d' : '#9a3412',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {checkoutEnabled ? '🟢 הרכישות פעילות' : '🔴 הרכישות מושבתות'}
          <a href="/admin?tab=site_settings" style={{ fontWeight: 400, textDecoration: 'underline', opacity: 0.7 }}>שנה הגדרות</a>
        </div>
      )}
      {/* ── Order confirmation card ── */}
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 32px', marginTop: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#166534', marginBottom: 8 }}>ההזמנה התקבלה!</h1>
        {orderNumber && (
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            מספר הזמנה: <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{orderNumber}</span>
          </div>
        )}
        <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, marginBottom: 28 }}>
          תודה על הזמנתך! שלחנו אליך אישור במייל.<br />
          הסופר יתחיל לעבוד על המוצר שלך בהקדם.
        </p>

        {/* ── Gift section (if order total >= 250) ── */}
        {hasGift && (
          <div style={{ background: 'linear-gradient(135deg, #fef9c3, #fef3c7)', border: '1.5px solid #fbbf24', borderRadius: 14, padding: '16px 20px', marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#92400e', marginBottom: 4 }}>מתנה בהזמנתך!</div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              כתוצאה מהזמנה מעל ₪250, תקבל מתנה מיוחדת יחד עם המשלוח שלך.
            </div>
          </div>
        )}

        <button onClick={() => router.push('/')}
          style={{ width: '100%', background: '#166534', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 0 }}>
          חזרה לחנות
        </button>
      </div>

      {/* ── Gematria blessing card ── */}
      {blessing && (
        <div style={{ background: 'linear-gradient(135deg, #1a2744, #1e3a8a)', borderRadius: 20, boxShadow: '0 8px 40px rgba(30,58,138,0.25)', padding: '32px 28px', marginTop: 20, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#C5A028', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>
            ✦ ברכה אישית לך ✦
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#C5A028', letterSpacing: '0.05em', marginBottom: 6, fontFamily: "'Frank Ruhl Libre', serif" }}>
            {blessing.word}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 16 }}>
            גימטריה: {blessing.customerNumber}
          </div>
          <div style={{ fontSize: 17, fontWeight: 400, color: 'rgba(255,255,255,0.92)', lineHeight: 1.7 }}>
            {blessing.text}
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(197,160,40,0.7)', letterSpacing: '0.1em' }}>
            Your Sofer — עם תפילה לשלומך
          </div>
        </div>
      )}
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
