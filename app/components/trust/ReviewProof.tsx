import Link from 'next/link';
import { REVIEWS } from '@/app/config/siteTrust';

/**
 * ReviewProof — הוכחה חברתית ליד נקודות החלטה.
 *
 * הנתונים (דירוג + מספר ביקורות) מגיעים אך ורק מ-siteTrust.ts — אותו מקור
 * שמוצג בעמוד /reviews, כך שלא מוצגים מספרים סותרים באזורים שונים באתר.
 * הקישור מפנה לעמוד הביקורות האמיתי (ביקורות מאושרות מ-Firestore).
 *
 * רכיב שרת — ללא state, ללא Widget חיצוני.
 */

function Stars({ size = 13 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', gap: 1, color: '#C9A227' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function ReviewProof({ compact = false }: { compact?: boolean }) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        fontSize: compact ? 12 : 13,
        color: '#555',
      }}
    >
      <Stars size={compact ? 12 : 14} />
      <span style={{ fontWeight: 700, color: '#1F2937' }}>
        {REVIEWS.rating} מתוך 5
      </span>
      <span style={{ color: '#888' }}>על בסיס {REVIEWS.count}+ ביקורות</span>
      <Link
        href={REVIEWS.url}
        style={{
          color: '#2446A6',
          fontWeight: 600,
          textDecorationLine: 'underline',
          textDecorationColor: '#c3cdea',
          textUnderlineOffset: 2,
        }}
      >
        צפייה בביקורות
      </Link>
    </div>
  );
}
