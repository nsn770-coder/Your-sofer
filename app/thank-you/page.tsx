'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
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
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [orderShippingCost, setOrderShippingCost] = useState(0);
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'success' | 'already' | 'error'>('idle');
  const [claimedPoints, setClaimedPoints] = useState(0);
  // true once we know the user was definitively logged out on this page visit
  const sawNullUserRef = useRef(false);
  // prevents calling claim-order more than once per page load
  const claimedRef = useRef(false);
  const orderNumber = searchParams.get('order');
  const orderId = searchParams.get('orderId');
  const [emailSent, setEmailSent] = useState(false);
  const [blessing, setBlessing] = useState<{ customerNumber: number; word: string; text: string } | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [checkoutEnabled, setCheckoutEnabled] = useState<boolean | null>(null);
  // ── Member points display (user already logged in on arrival) ──
  const [memberBalance, setMemberBalance] = useState<number | null>(null);
  const [orderPointsEarned, setOrderPointsEarned] = useState<number | null>(null);

  // Record when user is definitively not logged in (loading done, user null).
  // This distinguishes "user was a guest and just signed up" from "already logged in on arrival".
  useEffect(() => {
    if (!loading && !user) sawNullUserRef.current = true;
  }, [loading, user]);

  // After a fresh sign-in on this page: credit retroactive loyalty points exactly once.
  useEffect(() => {
    if (!user || !orderId || !sawNullUserRef.current || claimedRef.current) return;
    claimedRef.current = true;

    async function claimPoints() {
      setClaimState('claiming');
      try {
        const { getAuthLazy } = await import('@/lib/authLazy');
        const auth = await getAuthLazy();
        if (!auth.currentUser) { setClaimState('error'); return; }
        const idToken = await auth.currentUser.getIdToken();

        let totalPoints = 0;
        let anyOk = false;
        let alreadyProcessed = false;

        // 1) Credit THIS order (by orderId — covers guest orders too)
        try {
          const res = await fetch('/api/loyalty/claim-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ orderId }),
          });
          if (res.ok) {
            const data = await res.json() as { pointsEarned?: number; alreadyProcessed?: boolean };
            anyOk = true;
            if (data.alreadyProcessed) alreadyProcessed = true;
            else totalPoints += data.pointsEarned ?? 0;
          }
        } catch { /* club-join below may still succeed */ }

        // 2) Join the premium club + backfill any other historical orders
        //    (idempotent — orders already credited above are skipped)
        try {
          const res2 = await fetch('/api/club-join', {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res2.ok) {
            const d2 = await res2.json() as { ok?: boolean; pointsCredited?: number };
            if (d2.ok) {
              anyOk = true;
              totalPoints += Number(d2.pointsCredited ?? 0);
            }
          }
        } catch { /* non-fatal */ }

        if (!anyOk) { setClaimState('error'); return; }
        if (totalPoints > 0) {
          setClaimedPoints(totalPoints);
          setClaimState('success');
        } else {
          setClaimState(alreadyProcessed ? 'already' : 'success');
        }
      } catch {
        setClaimState('error');
      }
    }

    claimPoints();
  }, [user?.uid, orderId]);

  // Already logged in on arrival: fetch a FRESH points balance from Firestore
  // (user.loyaltyPoints from AuthContext was loaded before this purchase's accrual).
  useEffect(() => {
    if (loading || !user?.uid || sawNullUserRef.current) return;
    getDoc(doc(db, 'users', user.uid))
      .then(snap => {
        if (snap.exists()) setMemberBalance(Number(snap.data().loyaltyPoints ?? 0));
      })
      .catch(() => {});
  }, [loading, user?.uid]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDoc(doc(db, 'siteSettings', 'global'))
      .then(snap => { if (snap.exists()) setCheckoutEnabled(snap.data().checkoutEnabled ?? true); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!orderId || emailSent) return;

    async function processOrder() {
      try {
        // ── שליפת ההזמנה מ-Firestore ──
        // בתשלום כרטיס ההזמנה נוצרת כבר בסטטוס paid (רק אחרי חיוב מוצלח).
        // בתשלום ביט ה-IPN של Sumit מסמן paid בצד שרת — ייתכן עיכוב קצר,
        // לכן ממתינים עד ~15 שניות לפני ויתור.
        console.log('[thank-you] fetching order', orderId);
        let order: any = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          const orderSnap = await getDoc(doc(db, 'orders', orderId!));
          if (!orderSnap.exists()) {
            console.error('[thank-you] order not found:', orderId);
            return;
          }
          order = orderSnap.data();
          if (order.status === 'paid') break;
          await new Promise(res => setTimeout(res, 2500));
        }
        console.log('[thank-you] order loaded, status:', order.status, 'sessionId:', order.sessionId, 'email:', order.email);

        // Gematria blessing
        const createdSec: number =
          order.createdAt?.seconds ?? Math.floor(Date.now() / 1000);
        const customerNum = computeCustomerNumber(createdSec);
        const blessingEntry = findClosestBlessing(customerNum);
        setBlessing({ customerNumber: customerNum, word: blessingEntry.word, text: blessingEntry.blessing });
        setOrderTotal(order.total ?? 0);
        setOrderShippingCost(order.shippingCost ?? 0);
        if (typeof order.pointsEarned === 'number') setOrderPointsEarned(order.pointsEarned);

        // ── תשלום שלא אושר בצד שרת (למשל ביט שלא הושלם) — אין מעקב ואין מייל ──
        // הסטטוס paid נקבע אך ורק בצד השרת (route התשלום / IPN של ביט).
        // בעבר העמוד סימן כאן paid מצד לקוח — הוסר: אפשר היה "לאשר" הזמנה
        // רק ע"י פתיחת ה-URL, כולל הזמנות ביט שלא שולמו.
        if (order.status !== 'paid') {
          console.warn('[thank-you] order not confirmed paid — skipping tracking & email');
          return;
        }

        // ── הגנה מכפילויות: כל תופעות הלוואי (purchase, מייל, עדכוני לקוח) ──
        // רצות פעם אחת בלבד להזמנה. רענון או חזרה לעמוד לא ישלחו שוב כלום.
        const processedKey = `order_processed_${orderId}`;
        let alreadyProcessed = false;
        try { alreadyProcessed = !!localStorage.getItem(processedKey); } catch {}
        if (alreadyProcessed) { setEmailSent(true); return; }
        try { localStorage.setItem(processedKey, '1'); } catch {}

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
            const now = new Date().toISOString();
            const customerRef = doc(db, 'customers', email.toLowerCase());
            // כתיבה 1: כל השדות המתעדכנים (ללא firstOrderAt)
            await setDoc(
              customerRef,
              {
                name: order.customerName || '',
                email: email.toLowerCase(),
                phone: order.phone || '',
                address: order.address || '',
                lastOrderAt: now,
                totalOrders: increment(1),
                totalSpent: increment(Math.round((order.total || 0) * 100) / 100),
                isGuest: !order.uid,
                uid: order.uid || null,
              },
              { merge: true },
            );
            // כתיבה 2: firstOrderAt רק אם עדיין לא קיים — ה-rule דוחה שינוי שקטה
            try {
              await setDoc(customerRef, { firstOrderAt: now }, { merge: true });
            } catch {}
          } catch (e) {
            console.error('[thank-you] customer upsert failed:', e);
          }
        }

        // ── Enhanced Conversions — פרטי הלקוח מטופס הרכישה ──
        const ecEmail = String(order.email || '').trim().toLowerCase();
        const rawPhone = String(order.phone || '').replace(/\D/g, '');
        const ecPhone = rawPhone
          ? (rawPhone.startsWith('972') ? `+${rawPhone}` : `+972${rawPhone.replace(/^0/, '')}`)
          : '';
        const nameParts = String(order.customerName || '').trim().split(/\s+/);
        const userData: Record<string, unknown> = {};
        if (ecEmail) userData.email = ecEmail;
        if (ecPhone) userData.phone_number = ecPhone;
        if (nameParts[0]) {
          userData.address = {
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' ') || '',
            country: 'IL',
          };
        }

        // GA4 purchase — push יחיד ל-dataLayer הכולל user_data (אימייל) + ecommerce
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({
          event: 'purchase',
          user_data: userData,
          ecommerce: {
            transaction_id: order.orderNumber,
            value: order.total,
            currency: 'ILS',
            items: (order.items || []).map((i: { id: string; name: string; price: number; quantity: number }) => ({
              item_id: i.id,
              item_name: i.name,
              price: i.price,
              quantity: i.quantity,
            })),
          },
        });
        // זמין גם ל-Google tag (gtag) עבור Enhanced Conversions
        window.gtag?.('set', 'user_data', userData);

        // ── GA4 purchase — נשלח דרך תג "GA4 - Purchase" בקונטיינר GTM ──
        // התג (גרסה 6 ואילך) מאזין ל-push שלמעלה ושולח ל-GA4 עם נתוני ה-ecommerce.
        // אין לשלוח כאן גם gtag('event','purchase') — זה יוצר ספירה כפולה ב-GA4.

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
          const conversionValue = Number(
            String(order.total ?? 0).replace(/[^\d.]/g, '')
          ) || 0;
          window.gtag('event', 'conversion', {
            send_to: 'AW-18095875961/f0NoCLGexLIcEPnO5LRD',
            value: conversionValue,
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

        // שלח מייל ללקוח — אלא אם כבר נשלח בצד שרת (IPN של ביט מסמן confirmationEmailSent)
        if (order.confirmationEmailSent !== true) {
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
        }

        // סנכרן לתוך מערכת הניהול הפנימית — אלא אם כבר סונכרן ב-IPN
        if (order.opsSynced !== true) fetch('/api/ops/sync-order', {
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

    processOrder();
  }, [orderId]);

  const hasGift    = orderTotal >= GIFT_THRESHOLD;
  const pointsHint = Math.floor(Math.max(0, orderTotal - orderShippingCost) * 0.10);

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

      {/* ── Google sign-up / loyalty card ────────────────────────────────────
           Visible when: guest (idle) OR after sign-in (claiming/success/already).
           Hidden when: already logged in on arrival (claimState stays 'idle', !user is false)
           or when an error occurred (silently hide rather than break the page).       ── */}
      {claimState !== 'error' && (!user || claimState !== 'idle') && (
        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          padding: '28px 32px', marginTop: 20, textAlign: 'center',
        }}>

          {/* ── State: idle (before sign-in) — premium club offer + points hint ── */}
          {claimState === 'idle' && !user && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#C5A028', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                מועדון לקוחות פרימיום
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a', margin: '0 0 10px', lineHeight: 1.4 }}>
                🎉 הצטרפו למועדון ותתחילו להרוויח כבר מהקנייה הזו!
              </h2>

              {/* Purchase summary → points value */}
              {pointsHint > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, #fdf8ec, #faf3e0)',
                  border: '1.5px solid #C5A028',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 14,
                  fontSize: 14,
                  color: '#1a1a1a',
                  lineHeight: 1.8,
                }}>
                  סכום הרכישה שלך: <strong>₪{orderTotal.toLocaleString('he-IL')}</strong><br />
                  מגיעות לך <strong style={{ color: '#92400e' }}>~{pointsHint} נקודות</strong>
                  {' '}— שוות <strong style={{ color: '#92400e' }}>₪{pointsHint}</strong> למימוש בקנייה הבאה!
                </div>
              )}

              <p style={{ fontSize: 13.5, color: '#4b5563', lineHeight: 1.75, margin: '0 0 6px' }}>
                <span style={{ color: '#92400e', fontWeight: 700 }}>10% כסף</span> בחזרה בנקודות על כל קנייה במועדון.
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7, margin: '0 0 18px' }}>
                לדוגמה: קנייה ב־500 ₪ = 50 ₪ לקנייה הבאה | קנייה ב־1,000 ₪ = 100 ₪ לקנייה הבאה.
              </p>
              <button
                onClick={async () => {
                  setSigningIn(true);
                  try { await signInWithGoogle(); } finally { setSigningIn(false); }
                }}
                disabled={signingIn}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  padding: '13px 20px', background: signingIn ? '#555' : '#1a1a1a',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, cursor: signingIn ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.2s',
                }}
              >
                {signingIn ? (
                  <>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    מתחבר...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                    </svg>
                    הצטרפות למועדון עם Google
                  </>
                )}
              </button>
              <p style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.6, margin: '12px 0 0' }}>
                בהצטרפות למועדון אתם מאשרים קבלת דיוור שיווקי ומסכימים{' '}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                   style={{ color: '#92400e', textDecoration: 'underline' }}>
                  למדיניות הפרטיות
                </a>
              </p>
            </>
          )}

          {/* ── State: claiming — spinner while endpoint runs ── */}
          {claimState === 'claiming' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E7E2D8', borderTopColor: '#C5A028', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>מזכה נקודות על הקנייה...</p>
            </div>
          )}

          {/* ── State: success — points credited ── */}
          {claimState === 'success' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#166534', margin: '0 0 8px' }}>
                ברוכים הבאים למועדון!
              </h2>
              {claimedPoints > 0 ? (
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>
                  זוכית ב-<strong style={{ color: '#166534' }}>{claimedPoints} נקודות</strong>
                  {' '}— שוות ₪{claimedPoints} בקנייה הבאה.<br />
                  תוכל לממש אותן באזור האישי.
                </p>
              ) : (
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>
                  מעכשיו תצברו 10% בנקודות על כל קנייה.
                </p>
              )}
            </>
          )}

          {/* ── State: already — points were already credited ── */}
          {claimState === 'already' && (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                ברוכים הבאים למועדון! הנקודות על הזמנה זו כבר זוכו.
              </p>
            </>
          )}

        </div>
      )}

      {/* ── Member points card — user was already logged in on arrival ──────────
           Shows points earned on THIS order + fresh balance from Firestore.       ── */}
      {user && claimState === 'idle' && !sawNullUserRef.current && memberBalance !== null && (
        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          padding: '28px 32px', marginTop: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#C5A028', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
            מועדון לקוחות פרימיום
          </div>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
          {(orderPointsEarned ?? pointsHint) > 0 && (
            <p style={{ fontSize: 15, color: '#1a1a1a', lineHeight: 1.7, margin: '0 0 12px' }}>
              זוכו לך{' '}
              <strong style={{ color: '#166534' }}>
                {orderPointsEarned !== null ? orderPointsEarned : `~${pointsHint}`} נקודות
              </strong>
              {' '}על הזמנה זו 🎉
            </p>
          )}
          <div style={{
            background: 'linear-gradient(135deg, #fdf8ec, #faf3e0)',
            border: '1.5px solid #C5A028',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 14,
            fontSize: 14,
            color: '#1a1a1a',
            lineHeight: 1.8,
          }}>
            יתרת הנקודות שלך:{' '}
            <strong style={{ color: '#92400e' }}>{memberBalance.toLocaleString('he-IL')} נקודות</strong>
            <br />
            שוות <strong style={{ color: '#92400e' }}>₪{memberBalance.toLocaleString('he-IL')}</strong> למימוש בקנייה הבאה
          </div>
          <a
            href="/account/loyalty"
            style={{
              display: 'inline-block', fontSize: 13.5, fontWeight: 700,
              color: '#166534', textDecoration: 'underline',
            }}
          >
            לצפייה בנקודות ובהטבות באזור האישי ←
          </a>
        </div>
      )}

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
