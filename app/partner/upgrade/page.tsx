'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import SumitPaymentForm from '@/app/components/SumitPaymentForm';

const SETUP_FEE = 5000;

const FEATURES = [
  { icon: '📊', title: 'דשבורד ניהול', desc: 'עקוב אחרי מכירות, הזמנות ולקוחות במקום אחד' },
  { icon: '💰', title: 'משיכות כסף', desc: 'בקש משיכת רווחים בקלות, ישירות לחשבון הבנק שלך' },
  { icon: '💳', title: 'עמלה של 20% בלבד', desc: 'אתה משאיר 80% מכל מכירה שנעשית דרך החנות שלך' },
  { icon: '📱', title: 'ממשק נייד', desc: 'נהל את החנות שלך מכל מקום, ישירות מהנייד' },
];

interface AppliedCoupon {
  code: string;
  type: 'percent' | 'fixed' | 'free';
  value: number;
  description: string;
  discountAmount: number;
  finalAmount: number;
}

export default function PartnerUpgradePage() {
  const { user, loading, signInWithGoogle } = useAuth();

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<{ amount: number; message: string } | null>(null);

  // Auto-create (or reuse) a minimal pending application for this user —
  // /api/payment/partner-setup-fee requires an existing partners_applications
  // doc before it will accept a charge.
  useEffect(() => {
    if (loading || !user || user.role === 'partner') return;

    let cancelled = false;
    async function ensureApplication() {
      try {
        const [{ getFirestore, collection, query, where, limit, getDocs, addDoc, serverTimestamp }, { default: firebaseApp }] = await Promise.all([
          import('firebase/firestore'),
          import('@/app/firebase-app'),
        ]);
        const db = getFirestore(firebaseApp);
        const email = (user!.email || '').toLowerCase().trim();

        const existingSnap = await getDocs(
          query(
            collection(db, 'partners_applications'),
            where('email', '==', email),
            where('status', '==', 'pending'),
            limit(1)
          )
        );

        if (!existingSnap.empty) {
          if (!cancelled) setApplicationId(existingSnap.docs[0].id);
          return;
        }

        const created = await addDoc(collection(db, 'partners_applications'), {
          email,
          businessName: user!.displayName || 'העסק שלי',
          firstName: user!.firstName || '',
          lastName: user!.lastName || '',
          phone: user!.phone || '',
          city: '',
          status: 'pending',
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          approvedBy: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (!cancelled) setApplicationId(created.id);
      } catch (e) {
        console.error('[partner/upgrade] failed to create application:', e);
        if (!cancelled) setApplicationError('שגיאה בהכנת הבקשה. אנא רענן את הדף ונסה שוב.');
      }
    }

    ensureApplication();
    return () => { cancelled = true; };
  }, [user, loading]);

  async function checkCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponMessage(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          description: data.coupon.description,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
        });
        setCouponMessage({ text: `קופון "${data.coupon.code}" הופעל: ${data.coupon.description}`, ok: true });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({ text: data.message || 'קוד קופון לא תקין', ok: false });
      }
    } catch (e) {
      setAppliedCoupon(null);
      setCouponMessage({ text: 'שגיאה בבדיקת הקופון, נסה שוב', ok: false });
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage(null);
  }

  async function handlePaymentToken(token: string, paymentsCount: number) {
    if (!applicationId || !user?.email) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/payment/partner-setup-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          email: user.email,
          businessName: user.displayName || 'העסק שלי',
          singleUseToken: token,
          paymentsCount,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPayError(data.error || 'התשלום נכשל, נסה שוב');
        return;
      }
      setPaySuccess({ amount: data.amount, message: data.message });
    } catch (e) {
      setPayError('שגיאה בעת עיבוד התשלום');
    } finally {
      setPaying(false);
    }
  }

  function handlePaymentError(message: string) {
    setPayError(message);
  }

  const finalPrice = appliedCoupon ? appliedCoupon.finalAmount : SETUP_FEE;
  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500" dir="rtl">בטעינה...</div>;
  }

  if (!user) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--ys-page)' }}>
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--ys-heading)' }}>שדרוג ל-Partner</h1>
          <p className="text-gray-600 mb-6">יש להתחבר כדי להמשיך בתהליך השדרוג</p>
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--ys-accent)' }}
          >
            התחברות עם Google
          </button>
        </div>
      </div>
    );
  }

  if (user.role === 'partner') {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--ys-page)' }}>
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--ys-heading)' }}>כבר יש לך חשבון Partner!</h1>
          <Link href="/partner" className="inline-block mt-2 px-5 py-2 rounded-xl font-bold text-white" style={{ background: 'var(--ys-accent)' }}>
            למעבר לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  if (paySuccess) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--ys-page)' }}>
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--ys-heading)' }}>ברוך הבא ל-Partner!</h1>
          <p className="text-gray-600 mb-6">{paySuccess.message}</p>
          <Link href="/partner" className="inline-block px-5 py-2 rounded-xl font-bold text-white" style={{ background: 'var(--ys-accent)' }}>
            למעבר לדשבורד
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: 'var(--ys-page)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--ys-heading)' }}>שדרוג ל-Partner</h1>
          <p className="text-gray-600">פתח חנות משלך ותתחיל למכור עוד היום</p>
        </header>

        {/* Features */}
        <section className="mb-10">
          <h2 className="text-lg font-black mb-4" style={{ color: 'var(--ys-heading)' }}>מה אתה מקבל?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl shadow p-5 flex gap-4 items-start">
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-bold mb-1" style={{ color: 'var(--ys-heading)' }}>{f.title}</h3>
                  <p className="text-sm text-gray-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coupon */}
        <section className="mb-10">
          <h2 className="text-lg font-black mb-4" style={{ color: 'var(--ys-heading)' }}>קוד קופון</h2>
          <div className="bg-white rounded-xl shadow p-5">
            {appliedCoupon ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-black tracking-widest">{appliedCoupon.code}</span>
                  <span className="text-sm text-gray-500 mr-2">{appliedCoupon.description}</span>
                </div>
                <button onClick={removeCoupon} className="text-sm text-red-500 font-bold hover:underline">הסר</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="הזן קוד קופון"
                  className="flex-1 min-w-[160px] border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={checkCoupon}
                  disabled={couponChecking || !couponInput.trim()}
                  className="px-5 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: 'var(--ys-accent)' }}
                >
                  {couponChecking ? 'בודק...' : 'בדוק'}
                </button>
              </div>
            )}
            {couponMessage && (
              <p className={`text-sm mt-3 font-bold ${couponMessage.ok ? 'text-green-700' : 'text-red-600'}`}>
                {couponMessage.text}
              </p>
            )}
          </div>
        </section>

        {/* Price summary */}
        <section className="mb-10">
          <h2 className="text-lg font-black mb-4" style={{ color: 'var(--ys-heading)' }}>סיכום מחיר</h2>
          <div className="bg-white rounded-xl shadow p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">דמי הקמה</span>
              <span>₪{SETUP_FEE.toLocaleString()}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-700 font-bold">
                <span>הנחה ({appliedCoupon.code})</span>
                <span>-₪{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100 text-lg font-black" style={{ color: 'var(--ys-heading)' }}>
              <span>סה"כ</span>
              <span>₪{finalPrice.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section>
          {applicationError && <p className="text-red-600 text-sm font-bold mb-3">{applicationError}</p>}
          {payError && <p className="text-red-600 text-sm font-bold mb-3">{payError}</p>}

          {!showPayment ? (
            <button
              onClick={() => setShowPayment(true)}
              disabled={!applicationId}
              className="w-full py-4 rounded-xl font-black text-white text-lg disabled:opacity-50"
              style={{ background: 'var(--ys-accent)' }}
            >
              המשך לתשלום
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow p-5">
              <SumitPaymentForm
                companyId={Number(process.env.NEXT_PUBLIC_SUMIT_COMPANY_ID)}
                apiPublicKey={process.env.NEXT_PUBLIC_SUMIT_API_PUBLIC_KEY || ''}
                disabled={paying}
                onToken={handlePaymentToken}
                onError={handlePaymentError}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
