import Link from 'next/link';
import { POLICY_URLS, TRUST_TEXT } from '@/app/config/siteTrust';

/**
 * SecurePaymentNotice — הודעת אבטחת תשלום באזור התשלום.
 *
 * הנוסח מאומת מול הקוד: SumitPaymentForm מבצע טוקניזציה בדפדפן ישירות מול
 * Sumit (OfficeGuy.Payments.CreateToken) — פרטי האשראי לא עוברים בשרת האתר
 * ואינם נשמרים בו. תשלום bit מתבצע בדף תשלום מאובטח של Sumit.
 *
 * רכיב שרת — ללא state.
 */
export default function SecurePaymentNotice() {
  return (
    <div
      dir="rtl"
      style={{
        background: '#f0faf4',
        border: '1px solid #b7e4c7',
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <div>
        <div style={{ fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>{TRUST_TEXT.paymentTitle}</div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 2, lineHeight: 1.6 }}>
          {TRUST_TEXT.paymentBody}
        </div>
        <Link
          href={POLICY_URLS.privacy}
          style={{
            display: 'inline-block',
            marginTop: 4,
            fontSize: 11,
            color: '#1a6b3c',
            textDecorationLine: 'underline',
            textDecorationColor: '#9dd5b3',
            textUnderlineOffset: 2,
          }}
        >
          {TRUST_TEXT.securityLinkLabel}
        </Link>
      </div>
    </div>
  );
}
