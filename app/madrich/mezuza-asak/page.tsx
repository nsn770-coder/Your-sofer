import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מזוזה בעסק, משרד וקליניקה – האם חובה ואיך עושים נכון?',
  description:
    'האם יש חובה לקבוע מזוזה בעסק? מה ההבדל בין בית דירה למשרד, האם מברכים, ואיך מתקינים מזוזה על דלתות זכוכית במשרדים מודרניים.',
  alternates: { canonical: `${BASE_URL}/madrich/mezuza-asak` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/mezuza-asak`,
    siteName: 'Your Sofer',
    title: 'מזוזה בעסק ובמשרד | Your Sofer',
    description: 'הלכות מזוזה בעסק – חיוב, ברכה והתקנה על דלתות זכוכית.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מזוזה בעסק, משרד וקליניקה',
  description: 'האם חובה לקבוע מזוזה בעסק? הלכות ופתרונות עיצוביים למשרדים מודרניים.',
  url: `${BASE_URL}/madrich/mezuza-asak`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MezuzaAsakPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="עסקים ומשרדים"
          title="מזוזה בעסק ובמשרד"
          subtitle="האם יש חובה, מתי מברכים, ואיך מתקינים על דלתות זכוכית"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            פתיחת עסק חדש מלווה בציפיות לברכה ושגשוג. רבים מבעלי העסקים מקפידים לקבוע מזוזה בכניסה, מתוך אמונה שהמזוזה מביאה הגנה. אך מבחינה הלכתית – האם באמת חובה לשים מזוזה במקום שאיש לא ישן בו בלילה?
          </p>

          <QuoteBlock text='כל חלל שאדם עובד בו שעות ארוכות באופן קבוע – חייב במזוזה לשמירה על האדם ועסקיו.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            בית דירה לעומת עסק – ההבדלים ההלכתיים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'בית מגורים', color: '#1E3A8A', bg: '#f0f4ff', items: ['חיוב מוחלט מהתורה', 'מברכים על הקביעה', 'כל חדר חייב', 'כולל חדרי שינה'] },
              { title: 'עסק ומשרד', color: '#1a5c3a', bg: '#f0fff5', items: ['חיוב מדרבנן על פי רוב', 'קובעים לרוב ללא ברכה', 'כל חדר עבודה עם דלת', 'חדרי שירותים פטורים'] },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>✓</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            התקנה על דלתות זכוכית במשרדים מודרניים
          </h2>

          {[
            { title: 'הדבקה דו-צדדית חזקה', desc: 'לא ניתן לקדוח בזכוכית מחוסמת. בתי מזוזה לעסקים מגיעים עם דבק תעשייתי כפול ושקוף, עמיד גם בחום חיצוני.' },
            { title: 'פס הסתרה אחורי', desc: 'לדלתות זכוכית מומלץ בית מזוזה עם גב אטום, כדי שהדבק והקלף לא ייראו בצורה לא אסתטית מצידה השני של הדלת.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <span style={{ color: '#C5A028', fontSize: 20, flexShrink: 0 }}>✦</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם צריך לשים מזוזה בכל חדר במשרד?' a='כן, כל חדר עבודה שיש לו דלת ומשקוף בגודל תקני מצריך מזוזה. חדרי שירותים ומטבחונים קטנים פטורים.' />
          <FAQItem q='אם אני עוזב את המשרד לשוכר אחר, להשאיר את המזוזות?' a='אם השוכר הבא הוא יהודי, אסור להוריד את המזוזות מהפתחים. זכותך לבקש ממנו תשלום על שוויין.' />
          <FAQItem q='האם מברכים על מזוזה בעסק?' a='ברוב המקרים קובעים ללא ברכה, מאחר שאין "בית דירה" מובהק. אם בעל העסק ישן שם לעיתים – יש לשאול פוסק מה דינו.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🏠' title='סוגי בתי מזוזה' desc='חומרים ועיצוב לכל דלת' href='/madrich/batei-mezuza' />
            <RelatedCard emoji='📿' title='קביעת מזוזה' desc='מדריך שלב אחר שלב' href='/madrich/kviyas-mezuza' />
          </div>

          <CTAStrip
            title='בתי מזוזה מינימליסטיים למשרדים'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'ליצירת קשר', href: '/contact', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
