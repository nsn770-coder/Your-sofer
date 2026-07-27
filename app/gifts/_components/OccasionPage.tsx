import Link from 'next/link';
import type { Occasion } from '@/data/occasions';
import { fetchMomentProducts } from '@/app/moment/[id]/fetchMomentProducts';
import FaqSection from '@/app/components/FaqSection';
import OccasionGrid from './OccasionGrid';

/**
 * OccasionPage — התבנית המשותפת לכל עמודי /gifts/[occasion].
 *
 * Server Component: המוצרים נשלפים בשרת דרך אותה שכבה מקווששת של עמודי
 * ה-moment (Firestore REST + next revalidate), כך שאין שליפה חיה פר-מבקר
 * ואין שלד טעינה שפוגע ב-LCP.
 *
 * מבנה: Hero → פס יתרונות → גריד מוצרים (עוגן #collection) → FAQ.
 */

const NAVY = '#373A5A';
const GOLD = '#C5A028';
const CREAM = '#FAF8F3';

// כל שורה כאן מגובה בקוד או במדיניות בפועל — אין להוסיף טענה שלא ניתן לאמת.
// המשלוח והתשלום מאומתים ב-siteTrust.ts; החריטה ב-personalization.ts.
const BENEFITS = [
  { icon: '🚚', label: 'משלוח מהיר לכל הארץ' },
  { icon: '🔒', label: 'תשלום 100% מאובטח' },
  { icon: '✏️', label: 'חריטה והדפסה אישית' },
  { icon: '💬', label: 'שירות אישי בוואטסאפ' },
];

export default async function OccasionPage({ occasion }: { occasion: Occasion }) {
  // 250 לקטגוריה: הגריד מציג 24 בכל פעם ומרחיב ב-24. גם אחרי הסינון
  // וה-dedup נשארים כאן מאות מוצרים — הרבה מעבר למה שמבקר גולל בפועל.
  const products = await fetchMomentProducts(occasion, { perCategoryLimit: 250 });

  return (
    <main dir="rtl" style={{ background: '#FFFFFF' }}>
      {/* ── Hero ── */}
      <section style={{ background: CREAM, borderBottom: '1px solid #E7E2D8', padding: '56px 16px 48px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(26px, 5.2vw, 42px)',
              fontWeight: 800,
              color: NAVY,
              lineHeight: 1.25,
              margin: '0 0 14px',
            }}
          >
            {occasion.h1}
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', color: '#5A5A5A', lineHeight: 1.6, margin: '0 0 28px' }}>
            {occasion.subtitle}
          </p>

          <a
            href="#collection"
            style={{
              display: 'inline-block',
              background: NAVY,
              color: '#FFFFFF',
              padding: '14px 44px',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
              border: `1px solid ${NAVY}`,
            }}
          >
            לצפייה בקולקציה
          </a>

          {occasion.relatedMoment && (
            <div style={{ marginTop: 22 }}>
              <Link
                href={occasion.relatedMoment.href}
                style={{ fontSize: 13.5, color: '#6B7280', textDecoration: 'underline', textUnderlineOffset: 4 }}
              >
                {occasion.relatedMoment.label} ←
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── פס יתרונות ── */}
      <section aria-label="למה לקנות אצלנו" style={{ background: '#FFFFFF', borderBottom: '1px solid #F0EDE6' }}>
        <ul
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '22px 12px',
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
          className="ys-benefits"
        >
          {BENEFITS.map(b => (
            <li key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{b.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, lineHeight: 1.35 }}>{b.label}</span>
            </li>
          ))}
        </ul>
        {/* 2 עמודות במובייל → 4 מדסקטופ. mobile-first, בלי CLS. */}
        <style>{`@media (min-width: 768px){.ys-benefits{grid-template-columns:repeat(4,1fr)!important}}`}</style>
      </section>

      {/* ── גריד המוצרים ── */}
      <section id="collection" style={{ scrollMarginTop: 90, padding: '44px 16px 16px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 6 }}>
            הקולקציה
          </h2>
          <div style={{ width: 48, height: 2, background: GOLD, marginBottom: 26 }} />
          <OccasionGrid products={products} />
        </div>
      </section>

      {/* ── FAQ ── */}
      <div style={{ marginTop: 40, borderTop: '1px solid #F0EDE6' }}>
        <FaqSection items={occasion.faq} title="שאלות ותשובות" background={CREAM} />
      </div>
    </main>
  );
}
