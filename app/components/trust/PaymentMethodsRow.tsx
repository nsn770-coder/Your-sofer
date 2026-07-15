import { ENABLED_PAYMENT_METHODS, TRUST_TEXT } from '@/app/config/siteTrust';

/**
 * PaymentMethodsRow — שורת אמצעי תשלום אחידה לכל האתר.
 *
 * - מציגה אך ורק אמצעים שמוגדרים פעילים ב-siteTrust.ts (מאומתים מול הסליקה).
 * - לוגואים רשמיים בלבד, מקבצים מקומיים ב-public/payment (ללא טעינה מ-CDN חיצוני).
 * - שורת אמון פסיבית: הלוגואים אינם לחיצים ואינם כפתורים.
 * - width/height קבועים למניעת Layout Shift; יחס רוחב-גובה מקורי נשמר.
 * - תצוגה מונוכרומית (grayscale, ללא מסגרות/רקע) — כדי שהלוגואים לא ייראו
 *   ככפתורים לחיצים ולא יבלבלו לקוחות (07/2026).
 *
 * רכיב שרת (ללא state) — לא מוסיף hydration.
 */

interface Props {
  /** sm — לפוטר ולאזורים משניים; md — לסל ול-Checkout */
  size?: 'sm' | 'md';
  /** הצגת "אפשר לשלם באמצעות" מעל השורה */
  showLabel?: boolean;
  /** רקע כהה (פוטר) — מתאים את צבע הטקסט והמסגרות */
  onDark?: boolean;
}

export default function PaymentMethodsRow({ size = 'md', showLabel = true, onDark = false }: Props) {
  const logoHeight = size === 'sm' ? 22 : 26;

  // לוגו שטוח ואפור — בלי רקע, מסגרת או ריפוד של "כפתור"
  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: logoHeight,
    filter: onDark ? 'grayscale(1) brightness(2.2)' : 'grayscale(1)',
    opacity: onDark ? 0.8 : 0.55,
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {showLabel && (
        <span style={{
          fontSize: size === 'sm' ? 11 : 12,
          fontWeight: 600,
          color: onDark ? 'rgba(255,255,255,0.75)' : '#666',
        }}>
          {TRUST_TEXT.payWithLabel}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {ENABLED_PAYMENT_METHODS.map(pm =>
          pm.logoSrc ? (
            <span key={pm.id} style={chipStyle}>
              <img
                src={pm.logoSrc}
                alt={pm.label}
                width={Math.round(logoHeight * pm.aspectRatio)}
                height={logoHeight}
                loading="lazy"
                style={{ display: 'block', width: 'auto', height: logoHeight }}
              />
            </span>
          ) : (
            /* bit — אין קובץ לוגו רשמי זמין; תג טקסט אפור (לא לוגו מדומה) */
            <span
              key={pm.id}
              role="img"
              aria-label={pm.label}
              style={{
                ...chipStyle,
                filter: 'none',
                fontSize: size === 'sm' ? 13 : 15,
                fontWeight: 900,
                color: onDark ? 'rgba(255,255,255,0.8)' : '#8a8a8a',
                fontFamily: 'Arial, sans-serif',
                direction: 'ltr',
                lineHeight: 1,
              }}
            >
              bit
            </span>
          )
        )}
      </div>
    </div>
  );
}
