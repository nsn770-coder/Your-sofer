'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    jQuery?: unknown;
    OfficeGuy?: {
      Payments: {
        InitEditors: () => void;
        CreateToken: (settings: {
          FormSelector: unknown;
          CompanyID: number;
          APIPublicKey: string;
          ResponseLanguage?: string;
          Callback: (token: string | null) => void;
        }) => boolean;
      };
    };
  }
}

const PAYMENTS_COUNT_OPTIONS = [1, 2, 3, 4, 6, 8, 10, 12];

interface Props {
  companyId: number;
  apiPublicKey: string;
  disabled?: boolean;
  onToken: (token: string, paymentsCount: number) => void;
  onError: (message: string) => void;
}

export default function SumitPaymentForm({ companyId, apiPublicKey, disabled, onToken, onError }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [jqueryReady, setJqueryReady] = useState(false);
  const [sumitReady, setSumitReady] = useState(false);
  const [tokenizing, setTokenizing] = useState(false);
  const [paymentsCount, setPaymentsCount] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (sumitReady) window.OfficeGuy?.Payments.InitEditors();
  }, [sumitReady]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = formRef.current;
    if (!form || !window.OfficeGuy || !window.jQuery) {
      onError('מודול התשלום עדיין נטען, נסה שוב בעוד רגע');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!termsAccepted) {
      onError('חייב להסכים לתקנון כדי להמשיך בתשלום');
      return;
    }

    setTokenizing(true);
    const started = window.OfficeGuy.Payments.CreateToken({
      FormSelector: (window.jQuery as (s: HTMLFormElement) => unknown)(form),
      CompanyID: companyId,
      APIPublicKey: apiPublicKey,
      ResponseLanguage: 'he',
      Callback: (token) => {
        setTokenizing(false);
        if (token) {
          onToken(token, paymentsCount);
        } else {
          onError('פרטי כרטיס האשראי שגויים, נסה שוב');
        }
      },
    });
    if (!started) {
      setTokenizing(false);
      onError('שגיאה בשליחת פרטי האשראי, נסה שוב');
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafafa',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 };

  const busy = disabled || tokenizing;

  return (
    <>
      <Script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        strategy="afterInteractive"
        onLoad={() => setJqueryReady(true)}
      />
      {jqueryReady && (
        <Script
          src="https://app.sumit.co.il/scripts/payments.js"
          strategy="afterInteractive"
          onLoad={() => setSumitReady(true)}
        />
      )}

      <form ref={formRef} onSubmit={handleSubmit} dir="rtl">
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>מספר כרטיס אשראי <span style={{ color: '#c0392b' }}>*</span></label>
          <input type="tel" id="og-ccnum" name="og-ccnum" data-og="cardnumber" maxLength={20}
            autoComplete="off" required disabled={busy} placeholder="0000 0000 0000 0000" style={fieldStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>חודש תפוגה <span style={{ color: '#c0392b' }}>*</span></label>
            <select id="og-expmonth" name="og-expmonth" data-og="expirationmonth" required disabled={busy} style={fieldStyle} defaultValue="">
              <option value="" disabled>חודש</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>שנת תפוגה <span style={{ color: '#c0392b' }}>*</span></label>
            <select id="og-expyear" name="og-expyear" data-og="expirationyear" required disabled={busy} style={fieldStyle} defaultValue="">
              <option value="" disabled>שנה</option>
              {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>CVV <span style={{ color: '#c0392b' }}>*</span></label>
            <input type="tel" id="og-cvv" name="og-cvv" data-og="cvv" maxLength={4}
              autoComplete="off" required disabled={busy} placeholder="123" style={fieldStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>תעודת זהות (לאימות מול חברת האשראי)</label>
          <input type="tel" id="og-citizenid" name="og-citizenid" data-og="citizenid" maxLength={20}
            autoComplete="off" disabled={busy} placeholder="000000000" style={fieldStyle} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>מספר תשלומים</label>
          <select value={paymentsCount} onChange={e => setPaymentsCount(Number(e.target.value))} disabled={busy} style={fieldStyle}>
            {PAYMENTS_COUNT_OPTIONS.map(n => (
              <option key={n} value={n}>{n === 1 ? 'תשלום אחד' : `${n} תשלומים`}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="terms-checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={busy}
            required
            style={{ width: 20, height: 20, cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0 }}
          />
          <label htmlFor="terms-checkbox" style={{ fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', margin: 0, color: '#333', lineHeight: 1.4 }}>
            אני מסכים ל
            <button
              type="button"
              onClick={() => window.open('/legal/takanon', '_blank')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1F3D8F',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 14,
                fontWeight: 600,
                padding: 0,
                marginRight: 4,
                marginLeft: 4,
              }}
            >
              תקנון התשלום
            </button>
            (דרישה חובה להשלמת התשלום) <span style={{ color: '#c0392b' }}>*</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || !sumitReady || !termsAccepted}
          style={{
            width: '100%', background: (busy || !termsAccepted) ? '#888' : '#C9A227', color: (busy || !termsAccepted) ? '#fff' : '#1F3D8F',
            border: 'none', borderRadius: 14, height: 52, fontSize: 16, fontWeight: 800,
            cursor: (busy || !termsAccepted) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {!sumitReady ? 'טוען מודול תשלום...' : busy ? 'מבצע תשלום...' : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              תשלום מאובטח באשראי
            </>
          )}
        </button>
      </form>
    </>
  );
}
