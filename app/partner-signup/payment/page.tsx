'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import SumitPaymentForm from '@/app/components/SumitPaymentForm';

const SETUP_FEE = 5000;

type StatusCheck = 'loading' | 'ok' | 'missing_params' | 'not_found' | 'already_paid' | 'rejected';

interface AppliedCoupon {
  code: string;
  type: 'percent' | 'fixed' | 'free';
  value: number;
  description: string;
  discountAmount: number;
  finalAmount: number;
}

function formatCouponMessage(coupon: AppliedCoupon): string {
  const saved = `חסוך ₪${coupon.discountAmount.toLocaleString()}`;
  if (coupon.type === 'percent') return `${coupon.value}% הנחה - ${saved}`;
  if (coupon.type === 'fixed') return `₪${coupon.value} הנחה - ${saved}`;
  return `קופון חינם - ${saved}`;
}

export default function PartnerSignupPaymentPage() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') || '';
  const email = searchParams.get('email') || '';
  const businessName = searchParams.get('businessName') || '';

  const [statusCheck, setStatusCheck] = useState<StatusCheck>('loading');

  const [couponInput, setCouponInput] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState<{ amount: number; message: string } | null>(null);

  useEffect(() => {
    if (!applicationId || !email) {
      setStatusCheck('missing_params');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/partner/application-status?applicationId=${encodeURIComponent(applicationId)}`);
        const data = await res.json();
        if (data.status === 'pending') setStatusCheck('ok');
        else if (data.status === 'approved') setStatusCheck('already_paid');
        else if (data.status === 'rejected') setStatusCheck('rejected');
        else setStatusCheck('not_found');
      } catch {
        setStatusCheck('not_found');
      }
    })();
  }, [applicationId, email]);

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
        const coupon: AppliedCoupon = {
          code: data.coupon.code,
          type: data.coupon.type,
          value: data.coupon.value,
          description: data.coupon.description,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
        };
        setAppliedCoupon(coupon);
        setCouponMessage({ text: formatCouponMessage(coupon), ok: true });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({ text: data.message || 'קוד קופון לא תקין', ok: false });
      }
    } catch {
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
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch('/api/payment/partner-setup-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          email,
          businessName,
          singleUseToken: token,
          paymentsCount,
          amount: finalPrice, // display-only — the server independently re-validates the coupon and computes the real charge
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPayError(data.error || 'התשלום נכשל, נסה שוב');
        return;
      }
      setPaySuccess({ amount: data.amount, message: data.message });
    } catch {
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

  if (statusCheck === 'loading') {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen text-gray-500">
        בודק את הבקשה...
      </div>
    );
  }

  if (statusCheck !== 'ok' && !paySuccess) {
    const messages: Record<Exclude<StatusCheck, 'loading' | 'ok'>, { title: string; body: string }> = {
      missing_params: { title: 'חסרים פרטי בקשה', body: 'הקישור אינו תקין. אנא התחל את תהליך ההרשמה מחדש.' },
      not_found: { title: 'הבקשה לא נמצאה', body: 'ייתכן שהקישור שגוי או שפג תוקפו. אנא הירשם מחדש.' },
      already_paid: { title: 'התשלום כבר בוצע', body: 'הבקשה שלך כבר אושרה ושולמה. נהיה בקשר בקרוב!' },
      rejected: { title: 'הבקשה נדחתה', body: 'לפרטים נוספים ניתן ליצור איתנו קשר.' },
    };
    const m = messages[statusCheck as Exclude<StatusCheck, 'loading' | 'ok'>];
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--ys-page)' }}>
        <div className="bg-white rounded-2xl shadow p-6 sm:p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--ys-heading)' }}>{m.title}</h1>
          <p className="text-gray-600 mb-6">{m.body}</p>
          {statusCheck !== 'already_paid' && (
            <Link href="/partner-signup" className="inline-block px-5 py-2 rounded-xl font-bold text-white" style={{ background: 'var(--ys-accent)' }}>
              חזרה להרשמה
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (paySuccess) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen px-4" style={{ background: 'var(--ys-page)' }}>
        <div className="bg-white rounded-2xl shadow p-6 sm:p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--ys-heading)' }}>התשלום בוצע בהצלחה!</h1>
          <p className="text-gray-600">{paySuccess.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ background: 'var(--ys-page)', minHeight: '100vh' }}>
      <div className="max-w-md mx-auto px-4 py-8 sm:py-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: 'var(--ys-heading)' }}>תשלום הקמה</h1>
          <p className="text-gray-600">₪5,000 דמי התקנה חד פעמיים</p>
        </header>

        {/* Coupon */}
        <section className="mb-8">
          <label className="block text-sm font-bold text-gray-600 mb-2">קוד קופון (אופציונלי)</label>
          <div className="bg-white rounded-xl shadow p-4 sm:p-5">
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono font-black tracking-widest">{appliedCoupon.code}</span>
                  <p className="text-xs text-gray-500 truncate">{appliedCoupon.description}</p>
                </div>
                <button onClick={removeCoupon} className="text-sm text-red-500 font-bold hover:underline shrink-0">הסר</button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="הזן קוד קופון"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={checkCoupon}
                  disabled={couponChecking || !couponInput.trim()}
                  className="px-5 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-50 shrink-0"
                  style={{ background: 'var(--ys-accent)' }}
                >
                  {couponChecking ? 'בודק...' : 'בדוק קופון'}
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
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow p-4 sm:p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">מחיר מקורי</span>
              <span>₪{SETUP_FEE.toLocaleString()}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-700 font-bold">
                <span>הנחה</span>
                <span>-₪{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-100 text-lg font-black" style={{ color: 'var(--ys-heading)' }}>
              <span>סה"כ לתשלום</span>
              <span>₪{finalPrice.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section>
          {payError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-bold mb-4">
              {payError}
            </div>
          )}

          {!showPayment ? (
            <button
              onClick={() => setShowPayment(true)}
              className="w-full py-4 rounded-xl font-black text-white text-lg"
              style={{ background: 'var(--ys-accent)' }}
            >
              המשך לתשלום
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow p-4 sm:p-5">
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
