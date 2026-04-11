import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard } from '../InfoComponents';

const BASE_URL = 'https://yoursofer.com';
const C = { navy: '#0c1a35', gold: '#b8972a', border: '#e0e0e0', white: '#fff' };

export const metadata: Metadata = {
  title: 'מי הסופרים שלנו — הקריטריונים לבחירת סופר סת"מ',
  description:
    'איך אנחנו בוחרים עם מי לעבוד — ומה מייחד כל סופר סת"מ שעובד עם Your Sofer. הקריטריונים, תהליך הכניסה, והמחויבות לאיכות.',
  alternates: { canonical: `${BASE_URL}/madrich/soferim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/soferim`,
    siteName: 'Your Sofer',
    title: 'מי הסופרים שלנו | Your Sofer',
    description: 'הקריטריונים שלנו לבחירת סופר סת"מ ותהליך העבודה המשותפת.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מי הסופרים שלנו',
  description: 'איך אנחנו בוחרים עם מי לעבוד — ומה מייחד כל סופר שעובד איתנו.',
  url: `${BASE_URL}/madrich/soferim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function SoferimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    <ArticleLayout>
      <PageHero
        badge="הסופרים שלנו"
        title="מי הסופרים שלנו"
        subtitle="איך אנחנו בוחרים עם מי לעבוד — ומה מייחד כל סופר שעובד איתנו"
      />

      <div style={{ padding: '40px 0' }}>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          אנחנו לא עובדים עם כל מי שמחזיק בד ועט. הסופרים שעובדים איתנו עמדו בסטנדרט מסוים — ואנחנו ממשיכים לבדוק.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          הקריטריונים שלנו
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
          {[
            { icon: '🕍', title: 'יראת שמיים', desc: 'שומר תורה ומצוות בהידור' },
            { icon: '📜', title: 'הסמכה מוכרת', desc: 'תעודה ממוסד מוכר' },
            { icon: '✍️', title: 'רמת כתיבה גבוהה', desc: 'כתיבה מדוקדקת ויפה' },
            { icon: '🔍', title: 'קפידה על הלכה', desc: 'כתיבה עם כוונה ודקדוק' },
            { icon: '💬', title: 'שיתוף פעולה', desc: 'מוכן לקבל הערות ולשפר' },
            { icon: '⭐', title: 'עקביות', desc: 'רמה גבוהה לאורך זמן' },
          ].map(c => (
            <div key={c.title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.navy, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{c.desc}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          אנחנו לא רק קונים — אנחנו מעלים את הרמה
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          עם כל סופר שעובד איתנו נבנה קשר אישי ואמיתי. אנחנו בודקים את הכתבים שמגיעים, נותנים הערות, ומוכנים לשלם יותר עבור כתיבה טובה יותר.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          למה זה חשוב? כי כשהסופר יודע שמישהו שם לב — הוא כותב בתשומת לב. כשאין מי שמבחין, קשה לשמור על סטנדרט לאורך זמן.
        </p>

        <QuoteBlock text="אנחנו לא רק קונים מסופרים — אנחנו מעלים את הרמה שלהם." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          תהליך הכניסה לעבודה איתנו
        </h2>

        <div style={{ borderRight: `3px solid ${C.gold}`, paddingRight: 24, marginBottom: 32 }}>
          {[
            { title: 'פגישה והיכרות', desc: 'אנחנו פוגשים את הסופר, בודקים את הכתבים שלו, ומבררים על הרקע שלו.' },
            { title: 'בדיקת דוגמאות', desc: 'מעיינים בכתבים, מקבלים המלצות מרבנים ומוסמכים.' },
            { title: 'הסכמה על סטנדרט', desc: 'מגדירים יחד את רמת הכתיבה המינימלית שנקבל.' },
            { title: 'ביקורת שוטפת', desc: 'כל מזוזה שמגיעה עוברת בדיקה. אם יש הערות — הסופר מקבל אותן.' },
            { title: 'תמריץ לאיכות', desc: 'אנחנו מוכנים לשלם יותר עבור כתיבה יוצאת דופן.' },
          ].map((s, i) => (
            <div key={s.title} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.navy, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 900, color: C.navy, margin: '40px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="🔍" title="איך אנחנו בודקים" desc="תהליך הבדיקה לפני כל מכירה" href="/madrich/bedika" />
          <RelatedCard emoji="🏛️" title="האמת על השוק" desc="למה השוק מבולבל וכיצד אנחנו שונים" href="/madrich/shuk" />
        </div>

        <CTAStrip
          title="רוצים לדעת מאיזה סופר המזוזה שלכם?"
          buttons={[
            { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
            { label: 'שאלות נפוצות', href: '/madrich/faq', variant: 'secondary' },
          ]}
        />
      </div>
    </ArticleLayout>
    </>
  );
}
