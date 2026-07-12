import Link from 'next/link';
import { BUSINESS, POLICY_URLS, TRUST_TEXT } from '@/app/config/siteTrust';

/**
 * TrustCluster — אזור חיזוקי אמון קצר וקריא ליד נקודות החלטה
 * (כפתור הוספה לסל / המשך לתשלום / מעבר לסליקה).
 *
 * עד 4 מסרים, כולם מגובים במדיניות או בקוד:
 *   1. תשלום מאובטח ומוצפן (טוקניזציה בדפדפן מול Sumit)
 *   2. משלוח לכל הארץ עם מעקב (Sendit)
 *   3. שירות לקוחות אנושי ב-WhatsApp (קישור אמיתי)
 *   4. ביטול והחזרה בהתאם למדיניות האתר (קישור למדיניות המלאה)
 *
 * רכיב שרת — ללא state, אייקוני SVG מקומיים, ניגודיות תקינה (#555 ומעלה).
 */

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function IconMessage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconReturn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </svg>
  );
}

interface Props {
  /** 'column' — שורה מתחת לשורה (סל, עמוד מוצר); 'grid' — שתי עמודות (סיכום הזמנה) */
  layout?: 'column' | 'grid';
  fontSize?: number;
}

export default function TrustCluster({ layout = 'column', fontSize = 12 }: Props) {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize,
    color: '#555',
    lineHeight: 1.5,
  };
  const linkStyle: React.CSSProperties = {
    color: '#555',
    textDecorationLine: 'underline',
    textDecorationColor: '#bbb',
    textUnderlineOffset: 2,
  };

  return (
    <div
      dir="rtl"
      style={
        layout === 'grid'
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
          : { display: 'flex', flexDirection: 'column', gap: 8 }
      }
    >
      <div style={rowStyle}><IconLock /> {TRUST_TEXT.paymentShort}</div>
      <div style={rowStyle}><IconTruck /> {TRUST_TEXT.shippingShort}</div>
      <div style={rowStyle}>
        <IconMessage />
        <a href={BUSINESS.whatsappHref} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          {TRUST_TEXT.supportShort}
        </a>
      </div>
      <div style={rowStyle}>
        <IconReturn />
        <Link href={POLICY_URLS.returns} style={linkStyle}>
          {TRUST_TEXT.returnsShort}
        </Link>
      </div>
    </div>
  );
}
