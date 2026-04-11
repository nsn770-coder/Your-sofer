import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard } from '../InfoComponents';

const BASE_URL = 'https://yoursofer.com';

export const metadata: Metadata = {
  title: 'האמת על שוק המזוזות — למה קשה לדעת מה קונים',
  description:
    'למה כל כך קשה לדעת מה באמת קונים בשוק המזוזות — הבעיות המבניות בשוק וכיצד המודל של Your Sofer שונה.',
  alternates: { canonical: `${BASE_URL}/madrich/shuk` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/shuk`,
    siteName: 'Your Sofer',
    title: 'האמת על שוק המזוזות | Your Sofer',
    description: 'שרשרת הסיטונאים, חוסר השקיפות, וכיצד אנחנו עושים אחרת.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'האמת על שוק המזוזות',
  description: 'למה כל כך קשה לדעת מה באמת קונים — וכיצד המודל שלנו שונה.',
  url: `${BASE_URL}/madrich/shuk`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function ShukPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    <ArticleLayout>
      <PageHero
        badge="שקיפות מלאה"
        title="האמת על שוק המזוזות"
        subtitle="למה כל כך קשה לדעת מה באמת קונים — וכיצד המודל שלנו שונה"
      />

      <div style={{ padding: '40px 0' }}>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          אנחנו לא כאן כדי להגיד שכולם רעים. יש בשוק מקומות טובים. הבעיה היא שקשה מאוד לדעת מי הם.
        </p>

        <QuoteBlock text="הבעיה הכי גדולה בשוק הסת״ם היא שהלקוח לא באמת יודע מה הוא קונה." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          בלבול שמתחיל מהמינוח
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          שני מוכרים שונים יכולים להציג מזוזה ולהגיד "מהודר" — וכוונתם תהיה שונה לחלוטין. אין תקן אחיד, אין הגדרה מחייבת. המילה "מהודר" יכולה להגיד הרבה, או כלום.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          הלקוח לא יכול באמת לדעת. הוא בוטח במוכר. ואם המוכר לא יודע מה הוא מוכר — הבטחון הזה נבנה על אוויר.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          שרשרת הסיטונאים
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מרבית החנויות לא עובדות ישירות עם הסופר. הן קונות מסיטונאים שקונים מסיטונאים. כל ביניים לוחץ על מחיר. כל לחץ על מחיר עובר בסוף לסופר — שמוצא עצמו עם פחות זמן וציפיות נמוכות יותר.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          זה לא שהסופר רצה לכתוב גרוע. זה שהמערכת לא נותנת לו תמריץ לכתוב טוב.
        </p>

        {/* Problem/Solution grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '32px 0' }}>
          <div style={{ background: '#fff5f5', border: '1px solid #ffcccc', borderRadius: 10, padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#c0392b', marginBottom: 14 }}>❌ הבעיה בשוק</div>
            {[
              'לא ברור מי הסופר',
              '"מהודר" אין לו הגדרה אחידה',
              'קנייה דרך שרשרת סיטונאים',
              'לחץ על מחיר = לחץ על איכות',
              'הלקוח לא יכול לראות את הקלף',
            ].map(p => <div key={p} style={{ fontSize: 14, color: '#666', marginBottom: 8, display: 'flex', gap: 8 }}><span>•</span>{p}</div>)}
          </div>
          <div style={{ background: '#f0fff5', border: '1px solid #b2dfdb', borderRadius: 10, padding: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a5c3a', marginBottom: 14 }}>✅ המודל שלנו</div>
            {[
              'כל סופר ידוע ומוכר אישית',
              'כל קלף מצולם ומוצג לפני מכירה',
              'עבודה ישירה עם הסופרים',
              'תמריץ לאיכות — לא לכמות',
              'בדיקה לפני כל מכירה',
            ].map(p => <div key={p} style={{ fontSize: 14, color: '#444', marginBottom: 8, display: 'flex', gap: 8 }}><span style={{ color: '#27ae60' }}>✓</span>{p}</div>)}
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          הבעיה היא לא שאין מקומות טובים
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          יש מקומות טובים. יש סופרים מעולים. הבעיה היא שהלקוח לא יכול בקלות לדעת מי הם. השוק לא שקוף מספיק.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          אנחנו לא אומרים "כולם רמאים" — אנחנו אומרים: תבקשו ראיות. תראו את הקלף. תדעו מי כתב. ואם מישהו לא מוכן לתת לכם את זה — זה כבר אומר משהו.
        </p>

        <QuoteBlock text="מזוזה כשרה באמת — עם שקיפות מלאה. זה הדבר שאנחנו בנינו כאן." />

        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="✍️" title="מי הסופרים שלנו" desc="איך אנחנו בוחרים עם מי לעבוד" href="/madrich/soferim" />
          <RelatedCard emoji="🔍" title="איך אנחנו בודקים" desc="התהליך המלא לפני כל מכירה" href="/madrich/bedika" />
        </div>

        <CTAStrip
          title="רוצים לראות את השקיפות בפועל?"
          buttons={[
            { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
            { label: 'מי הסופרים שלנו', href: '/madrich/soferim', variant: 'secondary' },
          ]}
        />
      </div>
    </ArticleLayout>
    </>
  );
}
