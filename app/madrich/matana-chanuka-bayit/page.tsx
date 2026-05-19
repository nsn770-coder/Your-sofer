import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מתנה לחנוכת בית – איך בוחרים מזוזה מהודרת',
  description:
    'איך בוחרים מזוזה מהודרת כמתנה לחנוכת בית? מה ההבדל בין כשר למהודר, איך לוודא שהמתנה תעמוד בסטנדרטים הגבוהים ביותר, ומה חשוב לדעת על הנוסח.',
  alternates: { canonical: `${BASE_URL}/madrich/matana-chanuka-bayit` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/matana-chanuka-bayit`,
    siteName: 'Your Sofer',
    title: 'מתנה לחנוכת בית – מזוזה מהודרת | Your Sofer',
    description: 'מדריך לבחירת מזוזה מהודרת כמתנה לחנוכת בית ללא ספקות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מתנה מכובדת לחנוכת בית – איך בוחרים מזוזה מהודרת',
  description: 'מדריך לבחירת מזוזה מהודרת כמתנה לחנוכת בית.',
  url: `${BASE_URL}/madrich/matana-chanuka-bayit`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MatanaChanukaBayitPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מתנות חנוכת בית"
          title="מתנה מכובדת לחנוכת בית"
          subtitle="איך בוחרים מזוזה מהודרת שלא תשאיר מקום לספקות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כשחברים קרובים או בני משפחה יקרים עוברים לדירה חדשה, אין מתנה מתאימה ומכובדת יותר ממזוזה מהודרת. אך בציבור התורני, איכות והידור של סת"ם הם נושאים רגישים מאוד. מתנה שאינה ברמה הנכונה עלולה להכניס מבוכה – לקונה ולמקבל כאחד.
          </p>

          <QuoteBlock text='מתנת מזוזה מהודרת אומרת: אני מעריך אותך ומכבד את הרוחניות שלך.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה הופך קלף למתנה מושלמת?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כדי שמתנת מזוזה תהיה מכובדת, יש להפריד בין שני חלקים: קלף המזוזה עצמו ובית המזוזה המעוצב. הקלף הוא הלב – ויש לבחור בכתב המוגדר "מהודר" ולא רק כשר בסיסי.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתב מהודר נראה אחיד, נקי ויפהפה לעין. כל תלמיד חכמים שיפתח אותו מיד יזהה שמדובר בהשקעה אמיתית. שילוב של קלף מהודר עם בית מזוזה יוקרתי ומעוצב – יוצר מתנה מושלמת רוחנית, הלכתית ואסתטית כאחד.
          </p>

          {[
            { title: 'רמת יראת השמיים של הסופר', desc: 'הכשרות תלויה בנאמנותו של הכותב. סופרים מוסמכים מחזיקים תעודות בתוקף מגופים הלכתיים מוכרים כמו ועד משמרת סת"ם.' },
            { title: 'אחידות הכתב', desc: 'ככל שהסופר מנוסה יותר, הכתב שלו אחיד מתחילת הפרשה ועד סופה. זהו "יופי הכתב" – חלק ממצוות "זה קלי ואנוהו".' },
            { title: 'תיעוד דיגיטלי', desc: 'מתנה איכותית מגיעה עם צילום הקלף הספציפי, כך שמקבל המתנה יכול לראות את היופי מבלי לפתוח את הגלילה ולסכן את הקלף.' },
            { title: 'בית מזוזה מתאים', desc: 'בית מזוזה יוקרתי המשתלב עם עיצוב הבית משלים את המתנה ומראה שחשבתם על כל פרט.' },
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
            כשר מול מהודר – מה ההבדל?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'כשר', color: '#0e6ba8', bg: '#e8f4fd', items: ['עומד בדרישות מינימליות', 'מחיר נגיש', 'מצווה מקוימת', 'לא לכל קהל'] },
              { title: 'מהודר', color: '#1a5c3a', bg: '#f0fff5', items: ['כתיבה ברמה גבוהה', 'הידורים מעבר לדין', 'מתאים כמתנה', 'מוקדם יותר'] },
              { title: 'מהודר מאוד', color: '#7c3a00', bg: '#fff8f0', items: ['רמה הגבוהה ביותר', 'בדיקות מרובות', 'לתלמידי חכמים', 'מתנה יוקרתית'] },
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

          <QuoteBlock text='מזוזה מהודרת כמתנה – בחרו ברמה שתכבד גם את הנותן וגם את המקבל.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם כדאי לקנות בית מזוזה יחד עם הקלף?' a='מומלץ מאוד לשלב ביניהם כדי שהמתנה תהיה מוכנה לשימוש מיידי. ניתן להתאים בין קלפים מהודרים לבתי מזוזה מעוצבים בסגנונות שונים.' />
          <FAQItem q='איך יודעים איזה נוסח לקנות כמתנה?' a='הכלל הפשוט: לבדוק את מוצא המשפחה של בעל הבית. משפחה מעדות המזרח – נוסח ספרדי. משפחה ממוצא אירופאי – נוסח אשכנזי. אם לא בטוחים – שאלו ישירות.' />
          <FAQItem q='מה הגודל המומלץ למזוזה מתנה?' a='לדלת כניסה ראשית: 12 ס"מ לפחות, עדיף 15 ס"מ. קלף גדול מאפשר כתב מהודר יותר ונראה ייצוגי יותר כמתנה.' />
          <FAQItem q='האם מתנה של מזוזה דורשת אישור בדיקה?' a='כן, מתנה איכותית מגיעה עם תעודת בדיקה רשמית. זה מעניק למקבל ביטחון הלכתי ומראה שהקלף עבר בדיקה מקצועית.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='⭐' title='מה זה מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
            <RelatedCard emoji='🏠' title='סוגי בתי מזוזה' desc='להתאים עיצוב לאיכות' href='/madrich/batei-mezuza' />
          </div>

          <CTAStrip
            title='מחפשים מזוזה מהודרת כמתנה?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'לשאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
