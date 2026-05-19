import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'גודל המזוזה – 10, 12 ו-15 ס"מ: מה ההבדל?',
  description:
    'האם גודל הקלף משפיע על הכשרות? מה הסטנדרט הזהב בתעשייה, מדוע מזוזה גדולה יותר אמינה יותר לאורך שנים, ואיך לבחור נכון לבית המזוזה שרכשתם.',
  alternates: { canonical: `${BASE_URL}/madrich/godel-mezuza` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/godel-mezuza`,
    siteName: 'Your Sofer',
    title: 'גודל המזוזה | Your Sofer',
    description: 'מדריך לבחירת גודל קלף מזוזה – 10, 12 ו-15 ס"מ.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'גודל המזוזה – 10, 12 ו-15 ס"מ: מה ההבדל?',
  description: 'הסבר על ההשפעה של גודל קלף המזוזה על הכשרות, ההידור והעמידות.',
  url: `${BASE_URL}/madrich/godel-mezuza`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function GodelMezuzaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="גדלים ומידות"
          title="גודל המזוזה"
          subtitle='10 ס"מ, 12 ס"מ, 15 ס"מ – מה ההבדל ומה הסטנדרט המומלץ?'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            גודל המזוזה אינו רק עניין של טעם אסתטי. הוא משפיע ישירות על רמת ההידור של הכתב ועל אורך חיי המזוזה. מבחינה הלכתית כל הגדלים כשרים, אך בפועל יש הבדל משמעותי.
          </p>

          <QuoteBlock text='הפוסקים ממליצים תמיד לבחור בכתב גדול וברור – "גדול אותיותיה".' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            השוואת הגדלים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: '10 ס"מ', color: '#6b7280', bg: '#f9fafb', desc: 'כשר בדיעבד. אותיות צפופות שעלולות להידבק עם השנים. מתאים לדלתות פנים קטנות בלבד.' },
              { title: '12 ס"מ', color: '#1a5c3a', bg: '#f0fff5', desc: 'הסטנדרט הזהב. מרווח לכתיבה מהודרת. מתאים לרובם המוחלט של בתי המזוזה.' },
              { title: '15 ס"מ', color: '#1E3A8A', bg: '#f0f4ff', desc: 'מהודר מאוד. מומלץ לדלתות כניסה ראשיות. נוכחות יוקרתית ויפה.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 24, color: c.color, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מדוע גדול יותר עדיף?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            במזוזה של 10 ס"מ, המקום שיש לסופר לכתוב קטן וצפוף מאוד. אותיות זעירות עלולות עם השנים (בגלל שינויי מזג אוויר) "לנזול" ולהידבק זו לזו. לעומת זאת, במזוזות של 12 ס"מ ו-15 ס"מ השורות מרווחות יותר, האותיות גדולות וברורות, ולסופר קל יותר לצייר את התגים בדיוק מושלם.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='קניתי בית מזוזה מעוצב, איזה קלף לקנות לו?' a='תמיד מדדו את "החלל הפנימי" של בית המזוזה. אם החלל הפנימי הוא 13 ס"מ, קנו קלף 12 ס"מ, כדי שיישאר מרווח והקלף לא יימחץ.' />
          <FAQItem q='האם מזוזה קטנה זולה יותר ממזוזה גדולה?' a='לא בהכרח. לעיתים כתיבה מיקרוסקופית של 10 ס"מ דורשת מאמץ עיניים עצום מהסופר ולכן תומחרה גבוה, בעוד 12 ס"מ מאפשרת עבודה זורמת.' />
          <FAQItem q='לאיזה גודל מוצרים קיימות תעודות כשרות מוגברת?' a='הגדל אינו משפיע על הכשרות עצמה, אלא רק על ההידור. תעודות כשרות ניתנות לפי איכות כתיבת הסופר, לא לפי הגודל.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🏠' title='בתי מזוזה' desc='איך לבחור בית מזוזה מתאים' href='/madrich/batei-mezuza' />
            <RelatedCard emoji='⭐' title='מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
          </div>

          <CTAStrip
            title='קלפים מרווחים ומהודרים בכל גודל'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'מדריך הבחירה', href: '/madrich/bechira', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
