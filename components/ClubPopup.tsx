'use client';
import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';

const STORAGE_KEY = 'ys_club_popup_seen';
const COUPON_CODE = 'AM_ISRAEL_CHAI10';
const DELAY_MS = 8000;
const IMAGE_URL = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780510230/%D7%A4%D7%95%D7%A4%D7%90%D7%A4_rnyoth.png';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function isValidIsraeliPhone(v: string) {
  const digits = v.replace(/[-\s]/g, '');
  return /^0(5\d{8}|[2-9]\d{7})$/.test(digits);
}

export default function ClubPopup() {
  const [visible, setVisible]   = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [screen, setScreen]     = useState<'form' | 'thanks'>('form');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [consent, setConsent]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; phone?: string; consent?: string }>({});
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setIsMobile(window.innerWidth < 640);
    const t = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!isValidEmail(email))        e.email   = 'נא להזין כתובת מייל תקינה';
    if (!isValidIsraeliPhone(phone)) e.phone   = 'נא להזין מספר טלפון ישראלי תקין (05X-XXXXXXX)';
    if (!consent)                    e.consent = 'יש לאשר קבלת דיוור לפני ההצטרפות';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), {
        email:     email.trim().toLowerCase(),
        phone:     phone.trim(),
        source:    'club',
        consent:   true,
        createdAt: serverTimestamp(),
      });
      await fetch('/api/send-club-welcome', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      localStorage.setItem(STORAGE_KEY, '1');
      setScreen('thanks');
    } catch {
      setErrors({ email: 'אירעה שגיאה — נסו שוב בעוד רגע' });
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes club-popup-in {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .club-input {
          width: 100%; box-sizing: border-box;
          border: 1.5px solid #d4cfc6; border-radius: 10px;
          padding: 11px 14px; font-size: 14px;
          outline: none; background: #fff; color: #1a1a1a;
          font-family: inherit; direction: rtl;
          transition: border-color 0.2s;
        }
        .club-input:focus { border-color: #2563EB; }
        .club-input.error  { border-color: #dc2626; }
      `}</style>

      {/* Overlay */}
      <div
        onClick={close}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9100, backdropFilter: 'blur(3px)' }}
      />

      {/* Modal */}
      <div
        dir="rtl"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9101,
          width: isMobile ? 'min(95vw, 420px)' : 'min(92vw, 820px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          fontFamily: 'Heebo, Arial, sans-serif',
          animation: 'club-popup-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* ── Image panel ── */}
        <div style={{
          width:     isMobile ? '100%' : '44%',
          height:    isMobile ? 190 : 'auto',
          minHeight: isMobile ? 190 : 520,
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <img
            src={IMAGE_URL}
            alt="מועדון YourSofer"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* ── Content panel ── */}
        <div style={{
          flex: 1,
          background: '#F8F6F1',
          padding: isMobile ? '24px 20px 28px' : '36px 32px 36px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* X */}
          <button
            onClick={close}
            aria-label="סגור"
            style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(0,0,0,0.07)', border: 'none',
              color: '#555', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>

          {screen === 'form' ? (
            <>
              {/* Header */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  מועדון לקוחות
                </div>
                <h2 style={{ fontSize: isMobile ? 20 : 23, fontWeight: 900, color: '#1E3A8A', margin: '0 0 8px', lineHeight: 1.3 }}>
                  הצטרפו למועדון YourSofer
                </h2>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75, margin: 0 }}>
                  10% הנחה על הרכישה הראשונה<br />
                  <span style={{ color: '#2563EB', fontWeight: 700 }}>+ 5% הנחה קבועה</span> לכל חברי המועדון
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Email */}
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
                    placeholder="כתובת מייל"
                    className={`club-input${errors.email ? ' error' : ''}`}
                  />
                  {errors.email && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.email}</div>}
                </div>

                {/* Phone */}
                <div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: undefined })); }}
                    placeholder="מספר טלפון (05X-XXXXXXX)"
                    className={`club-input${errors.phone ? ' error' : ''}`}
                    style={{ direction: 'ltr', textAlign: 'right' } as React.CSSProperties}
                  />
                  {errors.phone && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.phone}</div>}
                </div>

                {/* Consent */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => { setConsent(e.target.checked); setErrors(p => ({ ...p, consent: undefined })); }}
                      style={{ marginTop: 3, flexShrink: 0, accentColor: '#2563EB' }}
                    />
                    <span style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                      אני מאשר/ת קבלת דיוור שיווקי ומסכים/ה{' '}
                      <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'underline' }}>
                        למדיניות הפרטיות
                      </a>
                    </span>
                  </label>
                  {errors.consent && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 3 }}>{errors.consent}</div>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? '#93a8d4' : '#1E3A8A',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '13px', fontSize: 15, fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%', marginTop: 4,
                    fontFamily: 'inherit',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? '⏳ שומר...' : 'הצטרפו וקבלו 10% הנחה'}
                </button>
              </form>
            </>
          ) : (
            /* ── Screen 2: Thank you ── */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: isMobile ? 20 : 23, fontWeight: 900, color: '#1E3A8A', margin: '0 0 10px' }}>
                ברוכים הבאים למועדון!
              </h2>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: '0 0 20px' }}>
                הנה קוד ההנחה שלכם ל-10% על הרכישה הראשונה:
              </p>

              {/* Coupon + copy */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', justifyContent: 'center', marginBottom: 14 }}>
                <input
                  readOnly
                  value={COUPON_CODE}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  style={{
                    flex: 1, border: '2px dashed #2563EB', borderRadius: 10,
                    padding: '12px 14px', fontSize: isMobile ? 15 : 18,
                    fontWeight: 900, color: '#1E3A8A',
                    letterSpacing: 2, background: '#EFF6FF',
                    textAlign: 'center', outline: 'none',
                    fontFamily: 'inherit', cursor: 'text', direction: 'ltr',
                  }}
                />
                <button
                  onClick={copyCode}
                  style={{
                    background: copied ? '#15803d' : '#2563EB',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '12px 16px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'inherit', flexShrink: 0,
                    transition: 'background 0.25s',
                  }}
                >
                  {copied ? '✓ הועתק!' : 'העתק'}
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#888', margin: '0 0 24px', lineHeight: 1.6 }}>
                שמרו את הקוד — שלחנו אותו גם למייל שלכם.
              </p>

              <button
                onClick={close}
                style={{
                  background: '#1E3A8A', color: '#fff',
                  border: 'none', borderRadius: 10,
                  padding: '12px 32px', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
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
