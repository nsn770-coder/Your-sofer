'use client';
import { useState, useEffect, useRef } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

// sessionStorage → shows once per browser session, resets on each new visit
const SESSION_KEY = 'ys_club_popup_seen';
const COUPON_CODE = 'TAMUZ10';
const DELAY_MS    = 8000;
const IMAGE_URL   = optimizeCloudinaryUrl('https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780510230/%D7%A4%D7%95%D7%A4%D7%90%D7%A4_rnyoth.png', 800);

const GOLD   = '#C9A14A';
const GOLD_D = '#a07c30';
const DARK   = '#111111';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidIsraeliPhone(v: string) {
  const d = v.replace(/[-\s]/g, '');
  return /^0(5\d{8}|[2-9]\d{7})$/.test(d);
}

export default function ClubPopup() {
  const [visible, setVisible]       = useState(false);
  const [isMobile, setIsMobile]     = useState(false);
  const [screen, setScreen]         = useState<'form' | 'thanks'>('form');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [consent, setConsent]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<{ email?: string; phone?: string; consent?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied]         = useState(false);

  // Refs to read autofill values at submit time, in case autofill skips onChange
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setIsMobile(window.innerWidth < 640);
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function close() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  function validate(emailVal: string, phoneVal: string): boolean {
    const e: typeof errors = {};
    if (!isValidEmail(emailVal))        e.email   = 'נא להזין כתובת מייל תקינה';
    if (!isValidIsraeliPhone(phoneVal)) e.phone   = 'נא להזין מספר טלפון ישראלי תקין (05X-XXXXXXX)';
    if (!consent)                       e.consent = 'יש לאשר קבלת דיוור לפני ההצטרפות';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitError(null);

    // Read from refs to catch autofill values that may not have triggered onChange
    const emailVal = emailRef.current?.value ?? email;
    const phoneVal = phoneRef.current?.value ?? phone;

    // Sync state if autofill populated without onChange
    if (emailVal !== email) setEmail(emailVal);
    if (phoneVal !== phone) setPhone(phoneVal);

    if (!validate(emailVal, phoneVal)) return;

    setLoading(true);
    const normalizedEmail = emailVal.trim().toLowerCase();
    const normalizedPhone = phoneVal.trim();

    // Step 1: save lead — critical
    try {
      await addDoc(collection(db, 'leads'), {
        email:     normalizedEmail,
        phone:     normalizedPhone,
        source:    'club',
        consent:   true,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[ClubPopup] addDoc leads failed:', e);
      setSubmitError('אירעה שגיאה בשליחה — נסו שוב בעוד רגע');
      setLoading(false);
      return;
    }

    // Step 2: send welcome email — best-effort, never blocks the user
    try {
      const res = await fetch('/api/send-club-welcome', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: normalizedEmail }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[ClubPopup] send-club-welcome failed:', res.status, text);
      }
    } catch (e) {
      console.error('[ClubPopup] send-club-welcome network error:', e);
    }

    sessionStorage.setItem(SESSION_KEY, '1');
    setLoading(false);
    setScreen('thanks');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard unavailable */ }
  }

  if (!visible) return null;

  const pad = isMobile ? '28px 22px 32px' : '44px 40px 44px';

  return (
    <>
      <style>{`
        @keyframes club-in {
          from { opacity: 0; transform: translate(-50%,-46%) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        .ci {
          width: 100%; box-sizing: border-box;
          border: 1.5px solid rgba(201,161,74,0.55);
          border-radius: 10px; padding: 11px 14px; font-size: 14px;
          outline: none; background: rgba(255,255,255,0.08);
          color: #fff; font-family: inherit; direction: rtl;
          transition: border-color 0.2s;
        }
        .ci::placeholder { color: rgba(255,255,255,0.45); }
        .ci:focus  { border-color: ${GOLD}; background: rgba(255,255,255,0.13); }
        .ci.err    { border-color: #f87171; }
        .cgold {
          background: ${GOLD}; color: ${DARK};
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 800;
          cursor: pointer; font-family: inherit;
          transition: background 0.18s, transform 0.12s;
        }
        .cgold:hover:not(:disabled) { background: ${GOLD_D}; transform: scale(1.01); }
        .cgold:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9100, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 9101,
          width: isMobile ? 'min(95vw, 440px)' : 'min(92vw, 500px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          borderRadius: 18,
          boxShadow: '0 28px 90px rgba(0,0,0,0.55)',
          fontFamily: 'Heebo, Arial, sans-serif',
          animation: 'club-in 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          backgroundImage: `url(${IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', borderRadius: 18 }} />

        {/* Content above overlay */}
        <div style={{ position: 'relative', zIndex: 1, padding: pad }}>

          {/* X button */}
          <button
            onClick={close}
            aria-label="סגור"
            style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: 'rgba(255,255,255,0.75)', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >✕</button>

          {screen === 'form' ? (
            <>
              {/* Label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
                מועדון לקוחות
              </div>

              {/* Title */}
              <h2 style={{ fontSize: isMobile ? 21 : 25, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.3 }}>
                הצטרפו למועדון YourSofer
              </h2>

              {/* Subtitle */}
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, margin: '0 0 22px' }}>
                <span style={{ color: GOLD, fontWeight: 700 }}>10% הנחה</span> על הרכישה הראשונה<br />
                <span style={{ color: GOLD, fontWeight: 700 }}>+ 10% הנחה קבועה</span> לכל חברי המועדון
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Email */}
                <div>
                  <input
                    ref={emailRef}
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="כתובת מייל"
                    className={`ci${errors.email ? ' err' : ''}`}
                  />
                  {errors.email && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 3 }}>{errors.email}</div>}
                </div>

                {/* Phone */}
                <div>
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })); }}
                    placeholder="מספר טלפון (05X-XXXXXXX)"
                    className={`ci${errors.phone ? ' err' : ''}`}
                    style={{ direction: 'ltr', textAlign: 'right' } as React.CSSProperties}
                  />
                  {errors.phone && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 3 }}>{errors.phone}</div>}
                </div>

                {/* Consent */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => { setConsent(e.target.checked); setErrors(p => ({ ...p, consent: undefined })); }}
                      style={{ marginTop: 3, flexShrink: 0, accentColor: GOLD }}
                    />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
                      אני מאשר/ת קבלת דיוור שיווקי ומסכים/ה{' '}
                      <a href="/legal/privacy" target="_blank" rel="noopener noreferrer"
                         style={{ color: GOLD, textDecoration: 'underline' }}>
                        למדיניות הפרטיות
                      </a>
                    </span>
                  </label>
                  {errors.consent && <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 3 }}>{errors.consent}</div>}
                </div>

                {/* General submit error — shown only when Firestore write fails */}
                {submitError && (
                  <div style={{
                    background: 'rgba(248,113,113,0.15)',
                    border: '1px solid rgba(248,113,113,0.5)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 12,
                    color: '#fca5a5',
                    textAlign: 'center',
                  }}>
                    {submitError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="cgold"
                  style={{ padding: '13px', width: '100%', marginTop: 6 }}
                >
                  {loading ? '⏳ שומר...' : 'הצטרפו וקבלו 10% הנחה'}
                </button>
              </form>
            </>
          ) : (
            /* ── Screen 2: Thank you ── */
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <div style={{ fontSize: 46, marginBottom: 14 }}>🎉</div>

              <h2 style={{ fontSize: isMobile ? 21 : 25, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>
                ברוכים הבאים למועדון!
              </h2>

              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.7, margin: '0 0 22px' }}>
                הנה קוד ההנחה שלכם ל-10% על הרכישה הראשונה:
              </p>

              {/* Coupon box + copy */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 16 }}>
                <input
                  readOnly
                  value={COUPON_CODE}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1,
                    border: `2px dashed ${GOLD}`,
                    borderRadius: 10,
                    padding: '13px 12px',
                    fontSize: isMobile ? 15 : 18,
                    fontWeight: 900,
                    color: GOLD,
                    letterSpacing: 2,
                    background: 'rgba(201,161,74,0.12)',
                    textAlign: 'center',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'text',
                    direction: 'ltr',
                  }}
                />
                <button
                  onClick={copyCode}
                  style={{
                    background: copied ? '#15803d' : GOLD,
                    color: copied ? '#fff' : DARK,
                    border: 'none', borderRadius: 10,
                    padding: '12px 16px', fontSize: 13, fontWeight: 800,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'inherit', flexShrink: 0,
                    transition: 'background 0.22s',
                  }}
                >
                  {copied ? '✓ הועתק!' : 'העתק'}
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '0 0 26px', lineHeight: 1.6 }}>
                שמרו את הקוד — שלחנו אותו גם למייל שלכם.
              </p>

              <button
                onClick={close}
                className="cgold"
                style={{ padding: '12px 36px', fontSize: 14 }}
              >
                לקנייה עכשיו ←
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
