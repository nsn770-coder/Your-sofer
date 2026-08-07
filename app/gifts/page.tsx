import type { Metadata } from 'next';
import Link from 'next/link';
import { OCCASIONS } from '@/data/occasions';

const BASE_URL = 'https://your-sofer.com';
const NAVY = '#373A5A';
const GOLD = 'var(--ys-accent)';
const CREAM = 'var(--ys-bg-warm)';

const TITLE = 'מתנות לאירועים | תכשיטים בחריטה אישית ומזכרות מהודרות | YourSofer';
const DESCRIPTION =
  'מתנות לאירועים עם נגיעה אישית: מתנות לבר מצווה, מתנות לחתונה, מתנות לגבר ותכשיטים עם שם. משלוח מהיר לכל הארץ · חריטה והדפסה אישית.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ['מתנות לאירועים', 'מתנות לבר מצווה', 'מתנות לחתונה', 'מתנות לגבר', 'תכשיטים עם שם'],
  alternates: { canonical: `${BASE_URL}/gifts` },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: `${BASE_URL}/gifts`,
    siteName: 'Your Sofer',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: `${BASE_URL}/og-default.png`, width: 1200, height: 630, alt: 'מתנות לאירועים' }],
  },
};

export default function GiftsHubPage() {
  return (
    <main dir="rtl" style={{ background: '#FFFFFF' }}>
      <section style={{ background: CREAM, borderBottom: '1px solid #E7E2D8', padding: '52px 16px 44px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(26px, 5.2vw, 40px)', fontWeight: 800, color: NAVY, lineHeight: 1.25, margin: '0 0 14px' }}>
            מתנות לאירועים
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2.4vw, 18px)', color: '#5A5A5A', lineHeight: 1.6, margin: 0 }}>
            תכשיטים בחריטה אישית, כיפות מעוצבות ומזכרות מהודרות — מתנה עם שם, עם תאריך, עם משמעות
          </p>
        </div>
      </section>

      <section style={{ padding: '44px 16px 64px' }}>
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {OCCASIONS.map(o => (
            <Link
              key={o.slug}
              href={`/gifts/${o.slug}`}
              style={{
                display: 'block',
                border: '1px solid #E7E2D8',
                padding: '26px 22px',
                textDecoration: 'none',
                background: '#FFFFFF',
              }}
            >
              <div style={{ width: 34, height: 2, background: GOLD, marginBottom: 14 }} />
              <h2 style={{ fontSize: 19, fontWeight: 700, color: NAVY, margin: '0 0 8px', lineHeight: 1.35 }}>
                {o.h1}
              </h2>
              <p style={{ fontSize: 14, color: '#5A5A5A', lineHeight: 1.6, margin: '0 0 14px' }}>
                {o.subtitle}
              </p>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: GOLD }}>לצפייה בקולקציה ←</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
