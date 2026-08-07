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
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  useEffect(() => {
    if (sumitReady) {
      try {
        window.OfficeGuy?.Payments.InitEditors();
      } catch (err) {
        console.error('[SumitPaymentForm] InitEditors failed:', err);
        setScriptError('Sumit');
      }
    }
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
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafafa', color: 'var(--ys-text)',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 };

  const busy = disabled || tokenizing;
  const [scriptError, setScriptError] = useState<string | null>(null);

  return (
    <>
      {scriptError && (
        <div style={{
          background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12,
          padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">⚠️</span>
          <div style={{ fontSize: 13, color: '#b91c1c', fontWeight: 600, lineHeight: 1.5 }}>
            שגיאה בטעינת מודול התשלום. אנא רענן את הדף ונסה שוב. אם הבעיה נמשכת, אנא צור קשר: 058-747-9933
          </div>
        </div>
      )}
      {termsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxHeight: '90vh',
            width: '100%',
            maxWidth: 700,
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ position: 'sticky', top: 0, background: 'var(--ys-dark-surface)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10000 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>תקנון התשלום</span>
              <button
                onClick={() => setTermsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ys-accent)',
                  fontSize: 28,
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '32px 28px', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
              <TermsContent />
            </div>
          </div>
        </div>
      )}

      <Script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        strategy="afterInteractive"
        onLoad={() => setJqueryReady(true)}
        onError={() => setScriptError('jQuery')}
      />
      {jqueryReady && (
        <Script
          src="https://app.sumit.co.il/scripts/payments.js"
          strategy="afterInteractive"
          onLoad={() => setSumitReady(true)}
          onError={() => setScriptError('Sumit')}
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
              onClick={() => setTermsModalOpen(true)}
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

function TermsContent() {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: יולי 2026</p>

      <TermsSection title="1. כללי">
        ברוכים הבאים לאתר Your Sofer (להלן: "האתר"). האתר מופעל על-ידי Your Sofer ומשמש כפלטפורמה למכירת מוצרי סת"מ ויודאיקה מאומתים. השימוש באתר מהווה הסכמה מלאה לתנאי תקנון זה.
      </TermsSection>

      <TermsSection title="2. הזמנות ורכישות">
        כל הזמנה כפופה לאישור זמינות המוצר ואימות פרטי התשלום. האתר שומר לעצמו את הזכות לבטל הזמנה שנעשתה עקב טעות בתמחור או בתיאור המוצר. לאחר אישור ההזמנה תשלח הודעת אישור לכתובת האימייל שסופקה.
      </TermsSection>

      <TermsSection title="3. מחירים ותשלום">
        כל המחירים באתר כוללים מע"מ (17%) אלא אם צוין אחרת. התשלום מתבצע באמצעות כרטיס אשראי דרך מערכת סליקה מאובטחת. האתר אינו שומר פרטי כרטיס אשראי.
      </TermsSection>

      <TermsSection title="4. אספקה ומשלוחים">
        זמני האספקה המוערכים מפורטים בדף המוצר. האתר אינו אחראי לעיכובים הנובעים מגורמים חיצוניים (שביתות, מזג אוויר, עיכובי שליחות). ניתן לתאם איסוף עצמי בדימונה בתיאום מוקדם.
      </TermsSection>

      <TermsSection title="5. ביטולים והחזרות">
        ניתן לבטל עסקה בהתאם לחוק הגנת הצרכן (תשנ"ח–1997). מוצרי סת"מ שנפתחה אריזתם ו/או שנעשה בהם שימוש אינם ניתנים להחזרה מטעמי קדושה וכשרות. פרטים מלאים בעמוד מדיניות ההחזרים.
      </TermsSection>

      <TermsSection title="6. אחריות למוצרים">
        כל מוצרי הסת"מ באתר כשרים לכתחילה ובודקו על-ידי סופרים מוסמכים. במקרה של פגם המתגלה תוך 30 יום מהאספקה יוחלף המוצר ללא עלות.
      </TermsSection>

      <TermsSection title="7. קניין רוחני">
        כל התכנים באתר - תמונות, טקסטים, לוגו ועיצוב - הם רכוש Your Sofer. אין להעתיק, לשכפל או לעשות שימוש מסחרי בתכנים ללא אישור מפורש בכתב.
      </TermsSection>

      <TermsSection title="8. תנאים ספציפיים לתשלום בכרטיס Diners Club">
        גם כרטיסי Diners Club ניתנים לשימוש באתר דרך מערכת התשלומים המאובטחת שלנו. כל רוכש המשתמש בכרטיס Diners Club מסכים לתקנון זה והמחייב הסכמה פעיל למטרות ציות להוראות חברת Diners Club הבינלאומית. חייבים להסכים לתקנון זה כדי להשלים את ההזמנה, וסירוב להסכמה ימנע את ביצוע התשלום.
      </TermsSection>

      <TermsSection title="9. שינויים בתקנון">
        האתר רשאי לעדכן תקנון זה בכל עת. המשך השימוש באתר לאחר פרסום עדכון מהווה הסכמה לנוסח המעודכן.
      </TermsSection>

      <TermsSection title="10. יצירת קשר">
        לכל שאלה: טלפון 058-4877-770 | וואטסאפ: 058-747-9933 | אימייל: support@your-sofer.com
      </TermsSection>
    </div>
  );
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ys-text)', marginBottom: 8, borderRight: '3px solid var(--ys-accent)', paddingRight: 10 }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}
