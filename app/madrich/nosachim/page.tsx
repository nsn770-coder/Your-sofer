import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'ההבדלים בין נוסחי הסת"ם – אשכנזי, ספרדי והאר"י',
  description:
    'מה ההבדל בין כתב אשכנזי, ספרדי וכתב האר"י? מדריך מקיף לבחירת הנוסח המתאים לך לתפילין, מזוזות וספרי תורה.',
  alternates: { canonical: `${BASE_URL}/madrich/nosachim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/nosachim`,
    siteName: 'Your Sofer',
    title: 'ההבדלים בין נוסחי הסת"ם | Your Sofer',
    description: 'אשכנזי, ספרדי, האר"י – מה ההבדל ואיזה נוסח מתאים לך?',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'ההבדלים בין נוסחי הסת"ם – אשכנזי, ספרדי והאר"י',
  description: 'מדריך מקיף לנוסחי הכתיבה בסת"ם ואיך לבחור את הנוסח המתאים.',
  url: `${BASE_URL}/madrich/nosachim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function NosachimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מדריך נוסחים"
          title='ההבדלים בין נוסחי הסת"ם'
          subtitle='אשכנזי, ספרדי, האר"י – מה ההבדל ואיזה נוסח מתאים לך?'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כשאומרים "נוסח" בסת"ם, מדברים על סגנון הכתיבה של האותיות עצמן – לא על תוכן הפרשיות. שלושת הנוסחים העיקריים הם אשכנזי, ספרדי וכתב האר"י, וכל אחד מהם הוא מסורת עתיקה עם מאפיינים ויזואליים ברורים.
          </p>

          <QuoteBlock text='הנוסח שבו נכתבו התפילין שלך קשור למסורת המשפחה שלך – לא רק לאסתטיקה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב אשכנזי (בית יוסף)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכתב האשכנזי, המכונה גם "כתב בית יוסף" על שם השולחן ערוך, הוא הנוסח המסורתי של יהודי אירופה. האותיות בכתב זה מרובעות יותר, עם זוויות חדות ומבנה קשיח. נהוג בקרב אשכנזים, חסידים רבים, ובחלק מעדות המזרח שאימצו מסורת זו.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: האות בי"ת שטוחה יותר בתחתיתה, האות שי"ן עם שלוש ראשים ישרים, וקווים אנכיים בולטים ומרובעים.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב ספרדי (וולאש)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכתב הספרדי, הנקרא גם "כתב וולאש", הוא מסורת יהודי ספרד וצפון אפריקה. האותיות עגולות יותר, עם קווים זורמים ופחות זוויות חדות. נהוג בקרב יהודי המזרח, ספרד, תימן ועוד.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: האות בי"ת עגולה יותר, הקווים האנכיים נוטים לכיפוף קל, ויש גמישות רבה יותר בצורות האותיות.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב האר"י (חב"ד)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתב האר"י פותח על ידי תלמידי האר"י הקדוש (רבי יצחק לוריא) בצפת, ואומץ על ידי תנועת החסידות ובעיקר חב"ד. זהו כתב ייחודי שמשלב מאפיינים מהכתב האשכנזי והספרדי, עם שינויים מסוימים בצורת חלק מהאותיות שנקבעו על בסיס קבלי.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: שינוי בצורת הדל"ת, הרי"ש, וכמה אותיות נוספות בהשוואה לכתב האשכנזי הרגיל. רוב חסידי חב"ד מקפידים להשתמש דווקא בכתב זה.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            איזה נוסח לבחור?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכלל הפשוט: כתוב כמסורת אביך ורבך. אם גדלת באשכנז – כתב אשכנזי. אם ספרדי – כתב ספרדי. אם חסיד חב"ד – כתב האר"י.
          </p>

          {[
            { title: 'אשכנזים', desc: 'כתב אשכנזי (בית יוסף) – ברירת המחדל לרוב יהודי אירופה ואמריקה' },
            { title: 'ספרדים ומזרחיים', desc: 'כתב ספרדי (וולאש) – נהוג בקרב יוצאי ספרד, מרוקו, עיראק ועוד' },
            { title: 'חסידים', desc: 'כתב האר"י – מקובל ברוב הזרמים החסידיים, בייחוד חב"ד' },
            { title: 'תימנים', desc: 'כתב תימני – מסורת ייחודית עם שינויים משמעותיים – יש לשאול דעת רב' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <span style={{ color: '#C5A028', fontSize: 20, flexShrink: 0 }}>✦</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <QuoteBlock text='לא בטוחים? שאלו רב מוסמך – הנוסח עשוי להשפיע על קיום המצווה לכמה שיטות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם מותר לשנות נוסח מאב לבן?' a='לדעות רבות, לא עדיף לשנות ממסורת האבות ללא סיבה מיוחדת. עם זאת, אדם שעבר לזרם שונה (למשל, הפך לחסיד) יכול לנהוג כמסורת הזרם שאליו הצטרף. כדאי להתייעץ עם רב.' />
          <FAQItem q='האם אפשר לרכוש מזוזה בכתב שונה מהתפילין שלי?' a='כן. בדרך כלל, גם מי שמניח תפילין בכתב אשכנזי יכול לקנות מזוזה בכל כתב כשר. אמנם יש מחמירים, כדאי לשאול רב.' />
          <FAQItem q='מה ההבדל המעשי בין הנוסחים?' a='ההבדל הוא בצורת כמה אותיות בלבד – לא בתוכן ולא במשמעות ההלכתית. כל הנוסחים כשרים לכל שיטה, אם נכתבו כהלכה.' />
          <FAQItem q='האם ניתן לראות את ההבדלים בין הנוסחים?' a='בהחלט. כל נוסח מוצג בגלריית המוצרים עם תמונת הקלף האמיתית – ניתן לראות ממש את הכתב לפני הרכישה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='⭐' title='מה זה מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
            <RelatedCard emoji='✍️' title='מי הסופרים' desc='קריטריונים לבחירת סופר' href='/madrich/soferim' />
          </div>

          <CTAStrip
            title='רוצים לראות מגוון נוסחים?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'לשאלות נפוצות', href: '/madrich/faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
