'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { POLICY_URLS, SHIPPING } from '@/app/config/siteTrust';

/**
 * DeliveryEstimate — תיבת צפי משלוח.
 * ברירת מחדל: היום + 7 ימים (משלוח רגיל). אם התאריך נופל בשבת — נדחה ליום ראשון.
 * ניתן להעביר daysRange פר-מוצר (למשל product.days = '7-10') — אז מוצג טווח
 * ימי עסקים אמיתי במקום תאריך יחיד, כדי לא להציג צפי אחיד למוצרים שונים.
 * מוצגת בדף העגלה ובדף התשלום (אזור התשלום).
 * מחושב ב-useEffect כדי למנוע hydration mismatch בין SSR ללקוח.
 */

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDeliveryEstimate(): { dayName: string; dateStr: string } {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  // אם יוצא שבת — דוחים ליום ראשון
  if (d.getDay() === 6) d.setDate(d.getDate() + 1);
  return {
    dayName: HEBREW_DAYS[d.getDay()],
    dateStr: `${d.getDate()}.${d.getMonth() + 1}`,
  };
}

function IconTruckSmall({ size = 18, color = '#1E3A8A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

interface Props {
  compact?: boolean;
  /** טווח ימי עסקים פר-מוצר (למשל '7-10'). כשמועבר — מוצג טווח במקום תאריך. */
  daysRange?: string;
  /** מוצר בהתאמה אישית — מציג הערת זמן הכנה */
  customMade?: boolean;
}

export default function DeliveryEstimate({ compact = false, daysRange, customMade = false }: Props) {
  const [est, setEst] = useState<{ dayName: string; dateStr: string } | null>(null);

  useEffect(() => {
    setEst(getDeliveryEstimate());
  }, []);

  if (!est) return null;

  return (
    <div dir="rtl" style={{
      background: '#f0f7ff',
      border: '1px solid #bfdbfe',
      borderRadius: 10,
      padding: compact ? '8px 10px' : '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: compact ? 30 : 34,
        height: compact ? 30 : 34,
        borderRadius: '50%',
        background: '#dbeafe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <IconTruckSmall size={compact ? 15 : 17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: compact ? 12 : 13, fontWeight: 800, color: '#1E3A8A' }}>
          {daysRange
            ? `זמן אספקה משוער: ${daysRange} ימי עסקים`
            : `צפי משלוח: יום ${est.dayName}, ${est.dateStr} בשעות הצהריים`}
        </div>
        {customMade && (
          <div style={{ fontSize: compact ? 10.5 : 11, color: '#555', marginTop: 2 }}>
            מוצר בהתאמה אישית — זמן ההכנה כלול בצפי האספקה
          </div>
        )}
        <div style={{ fontSize: compact ? 10.5 : 11, color: '#555', marginTop: 2 }}>
          ההזמנה תישלח עם חברת המשלוחים {SHIPPING.carrierName} עד הבית — יישלח עדכון ומספר מעקב כשההזמנה תצא.
          {' '}
          <Link href={POLICY_URLS.shipping} style={{ color: '#1E3A8A', textDecorationLine: 'underline', textDecorationColor: '#93b8e8', textUnderlineOffset: 2 }}>
            מידע על משלוחים
          </Link>
        </div>
      </div>
    </div>
  );
}
