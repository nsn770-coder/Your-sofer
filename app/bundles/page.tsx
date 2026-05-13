import type { Metadata } from 'next';
import Link from 'next/link';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'ערכות מומלצות | Your Sofer',
  description: 'ערכות מומלצות לבר מצווה, מזוזות לבית חדש ומתנות יוקרתיות — הכול במקום אחד עם כשרות מובטחת.',
  alternates: { canonical: `${BASE_URL}/bundles` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/bundles`,
    siteName: 'Your Sofer',
    title: 'ערכות מומלצות | Your Sofer',
    description: 'ערכות מומלצות לבר מצווה, מזוזות לבית חדש ומתנות יוקרתיות',
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Your Sofer' }],
  },
};

const BUNDLES = [
  {
    title: 'ערכת בר מצווה — הרמה הגבוהה ביותר',
    desc: 'ערכת תפילין מהודרת לבר מצווה — תפילין בכתיבת סופר מוסמך ברמה הגבוהה ביותר, שקית תפילין, מדריך הנחה, ותעודת כשרות. מתנה שתישאר לכל החיים.',
    badge: 'הכי פופולרי',
    featured: true,
    items: [
      'תפילין מהודרים — כתיבת סופר מוסמך',
      'שקית תפילין איכותית',
      'מדריך הנחת תפילין',
      'תעודת כשרות מודפסת',
      'אריזת מתנה יוקרתית (+₪10)',
    ],
    cta: 'בנה את הערכה שלך ←',
    href: '/category/תפילין',
  },
  {
    title: 'ערכת מזוזות לבית החדש',
    desc: 'קלפי מזוזה לבחירה + בתי מזוזה תואמים — 10% הנחה על כל רכישה משולבת. כי לכל קלף מזוזה נדרש גם בית מזוזה.',
    badge: '10% הנחה',
    featured: false,
    items: [
      'קלפי מזוזה לבחירה (לפי מספר הדלתות)',
      'בתי מזוזה תואמים — 10% הנחה',
      'בדיקת מגיה על כל קלף',
      'הוראות תליה',
      'אריזת מתנה יוקרתית (+₪10)',
    ],
    cta: 'בחר קלפים ובתים ←',
    href: '/category/מזוזות',
  },
  {
    title: 'ערכת מתנה יוקרתית',
    desc: 'בחר מוצרים מקטגוריות כלי הגשה, יודאיקה או עיצוב הבית — פריט שני ב-10% הנחה, פריט שלישי ב-20% הנחה. מגיע מוכן למסירה באריזה יוקרתית.',
    badge: 'עד 20% הנחה',
    featured: false,
    items: [
      'פריט ראשון — במחיר מלא',
      'פריט שני — 10% הנחה אוטומטית',
      'פריט שלישי — 20% הנחה אוטומטית',
      'אריזת מתנה יוקרתית מוכנה למסירה (+₪10)',
      'כרטיס ברכה אישי',
    ],
    cta: 'בנה את המתנה שלך ←',
    href: '/',
  },
];

export default function BundlesPage() {
  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F5F2EC', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 900, margin: '0 0 10px' }}>ערכות מומלצות</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          הכול במקום אחד — חסכון אמיתי, כשרות מובטחת
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 28 }}>
          {BUNDLES.map(bundle => (
            <div
              key={bundle.title}
              style={{
                background: '#fff',
                border: bundle.featured ? '2px solid #C5A028' : '1px solid #E0D8CC',
                borderRadius: 14,
                padding: 24,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: '#C5A028',
                color: '#1E3A8A',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 20,
              }}>
                {bundle.badge}
              </div>

              <h2 style={{ color: '#1E3A8A', fontSize: 17, fontWeight: 800, margin: '28px 0 12px', lineHeight: 1.4 }}>
                {bundle.title}
              </h2>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, margin: '0 0 18px', flex: 1 }}>
                {bundle.desc}
              </p>

              {/* Items */}
              <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0 }}>
                {bundle.items.map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7, fontSize: 13.5, color: '#333' }}>
                    <span style={{ color: '#C5A028', fontWeight: 900, fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={bundle.href}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#C5A028',
                  color: '#1E3A8A',
                  padding: '12px 20px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                {bundle.cta}
              </Link>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888' }}>
          * ההנחות מחושבות אוטומטית בסל הקניות. אריזת מתנה יוקרתית — תוספת של ₪10 לכל אריזה.
        </p>
      </div>
    </div>
  );
}
