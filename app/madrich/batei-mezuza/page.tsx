import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'סוגי בתי מזוזה – איך לבחור נכון לכל דלת',
  description:
    'מדריך לבחירת בית מזוזה: עץ, אלומיניום, זכוכית, קרמיקה – מה מתאים לחוץ ומה לפנים, ודרישות הלכתיות שחייבים לדעת.',
  alternates: { canonical: `${BASE_URL}/madrich/batei-mezuza` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/batei-mezuza`,
    siteName: 'Your Sofer',
    title: 'סוגי בתי מזוזה | Your Sofer',
    description: 'מדריך לבחירת בית מזוזה – חומרים, עיצוב ודרישות הלכתיות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'סוגי בתי מזוזה – איך להתאים בין יופי אסתטי להגנה הלכתית',
  description: 'מדריך לבחירת בית מזוזה לפי מיקום, חומר ועיצוב.',
  url: `${BASE_URL}/madrich/batei-mezuza`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BateiMezuzaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="עיצוב ושמירה"
          title="סוגי בתי מזוזה"
          subtitle="איך לבחור את הבית הנכון – עיצוב, חומר, ודרישות הלכתיות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            בית המזוזה הוא האלמנט העיצובי הראשון שפוגש כל מי שנכנס בדלת הבית. מעבר לפן האסתטי, תפקידו המרכזי הוא להגן על הקלף הקדוש שבתוכו. הבחירה בחומר הנכון יכולה להציל קלף מהודר מנזק – ובחירה לא נכונה יכולה להרוס אותו תוך שנה.
          </p>

          <QuoteBlock text='בית מזוזה יפה שאינו אטום בחוץ עולה יקר – כשהקלף נהרס בגשם הראשון.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            לפי מיקום – מה מתאים לאן
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'דלתות חיצוניות',
                color: '#0e6ba8',
                bg: '#e8f4fd',
                items: ['אלומיניום – עמיד ואטום', 'מתכת אל-חלד – לעיצוב מודרני', 'פלסטיק קשיח איכותי', 'חובה: אטימת סיליקון בצדדים', 'הגנה מגשם ושמש ישירה'],
              },
              {
                title: 'דלתות פנימיות',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['עץ זית / עץ משובח', 'זכוכית עדינה', 'בטון אדריכלי מעוצב', 'שיש / קרמיקה', 'חופש עיצובי מלא'],
              },
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
            דרישות הלכתיות לבית המזוזה
          </h2>

          {[
            { title: 'נראות האות שד"י', desc: 'נהגו שבחלק החיצוני של בית המזוזה תופיע האות ש' (שומר דלתות ישראל), או חלון שקוף דרכו ניתן לראות אותה.' },
            { title: 'מרחב פנימי מספק', desc: 'בית המזוזה צריך להיות רחב מספיק כדי להכיל את הקלף המגולגל בחופשיות, מבלי ללחוץ או לקמט את האותיות.' },
            { title: 'אטימה בחוץ', desc: 'בעת התקנה בפתח חשוף לגשם, יש לאטום את החלק העליון והצדדים בסיליקון שקוף או דבק ייעודי כדי למנוע חדירת מים.' },
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
          <FAQItem q='האם מותר להשתמש בבית מזוזה מפלסטיק פשוט?' a='כן, מבחינה הלכתית כל חומר שמגן על הקלף הוא כשר. עם זאת, לטובת הידור מצווה ומכיוון שמדובר בפתח הבית, נהוג לבחור בבית מכובד ואסתטי.' />
          <FAQItem q='בית מזוזה עם ציור של ירושלים – האם זה כשר?' a='כן, הציור החיצוני אינו משפיע על כשרות המזוזה. חשוב שהבית יגן על הקלף ושאת ש"ד"י ניתן לראות.' />
          <FAQItem q='מה גודל בית המזוזה שצריך לקנות?' a='תמיד מדדו את "החלל הפנימי" של בית המזוזה ולא את האורך החיצוני שלו. לקלף 12 ס"מ – בחרו בית עם חלל פנימי של 13 ס"מ לפחות.' />
          <FAQItem q='האם מותר לדביק בית מזוזה לדלת זכוכית?' a='כן, ניתן להשתמש בדבק תעשייתי כפול דו-צדדי שקוף, עמיד בחום חיצוני. לא ניתן לקדוח בזכוכית מחוסמת, ולכן הדבקה היא הפתרון המקובל.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='📏' title='גודל המזוזה' desc='10 ס"מ, 12 ס"מ, 15 ס"מ – מה ההבדל?' href='/madrich/godel-mezuza' />
            <RelatedCard emoji='🏠' title='קביעת מזוזה' desc='מדריך שלב אחר שלב' href='/madrich/kviyas-mezuza' />
          </div>

          <CTAStrip
            title='מחפשים בתי מזוזה מעוצבים?'
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
