import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'ההבדלים בין נוסחי הסת"ם – אשכנזי, ספרדי והאר"י',
  description:
    'מה ההבדל בין כתב אשכנזי, ספרדי וכתב האר"י? מדריך מקיף לבחירת הנוסח המתאים לתפילין, מזוזות וספרי תורה – כולל הרקע ההלכתי והקבלי.',
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
            כשאומרים "נוסח" בסת"ם, מדברים על סגנון כתיבת האותיות על הקלף – לא על תוכן הפרשיות. שלושת הנוסחים העיקריים הם אשכנזי, ספרדי וכתב האר"י, וכל אחד מהם הוא מסורת עתיקה עם מאפיינים ויזואליים ברורים. לרוב היהודים בעולם, בחירת הנוסח הנכון היא שאלה של מסורת משפחתית – לא של העדפה אישית.
          </p>

          <QuoteBlock text='הנוסח שבו נכתבו התפילין שלך קשור למסורת המשפחה שלך – לא רק לאסתטיקה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב אשכנזי (בית יוסף)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכתב האשכנזי, המכונה "כתב בית יוסף" על שם השולחן ערוך, הוא הנוסח המסורתי של יהודי אירופה. האותיות מרובעות יותר, עם זוויות חדות ומבנה קשיח. נהוג בקרב אשכנזים, חלק מהחסידים, ובחלק מעדות המזרח שאימצו מסורת זו.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: האות בי"ת שטוחה יותר בתחתיתה, האות שי"ן עם שלושה ראשים ישרים, וקווים אנכיים בולטים ומרובעים. כתב זה דורש דיוק זוויתי גבוה מאוד בראשי האותיות, ולכן סופרים מיומנים במיוחד נחשבים כמומחים לכתב בית יוסף.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב ספרדי (וולאש)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכתב הספרדי, הנקרא גם "כתב וולאש", הוא מסורת יהודי ספרד וצפון אפריקה. האותיות עגולות יותר, עם קווים זורמים ופחות זוויות חדות. נהוג בקרב יהודי עדות המזרח, ספרד, תימן ועוד. הכתב הספרדי מאופיין בקווים מאוזנים ורחבים יחסית, המקנים לטקסט מראה פתוח ומאיר עיניים.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: האות בי"ת עגולה יותר, הקווים האנכיים נוטים לכיפוף קל, וגמישות רבה יותר בצורות האותיות.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כתב האר"י (חב"ד)
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתב האר"י פותח על ידי תלמידי האר"י הקדוש (רבי יצחק לוריא) בצפת, ואומץ על ידי תנועת החסידות ובעיקר חב"ד. זהו כתב ייחודי המשלב מאפיינים מהכתב האשכנזי והספרדי, עם שינויים בצורת חלק מהאותיות שנקבעו על בסיס קבלי. הכתב מכיל כוונות רוחניות מוגדרות – למשל, האות א' מורכבת משתי יו"דים ווא"ו הפוכה בצורה ספציפית.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מאפיינים: שינוי בצורת הדל"ת, הרי"ש, הצד"י, האל"ף וכמה אותיות נוספות בהשוואה לכתב האשכנזי הרגיל. רוב חסידי חב"ד מקפידים על כתב זה דווקא.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            הרקע ההיסטורי וההלכתי
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            ההבדלים בין נוסחי הכתב נקבעו לאורך מאות שנים על ידי גדולי הפוסקים. כתב בית יוסף נקרא על שם רבי יוסף קארו (מחבר השולחן ערוך), אך התקבל דווקא אצל האשכנזים בהתאם לפסיקות הרמ"א. כתב האר"י מבוסס על תורת הקבלה ומשלב כוונות רוחניות בכל אות. כל הנוסחים כשרים לחלוטין מבחינה הלכתית – ההבדל הוא מסורתי, לא עניין של כשרות.
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
          <FAQItem q='האם מותר לשנות נוסח מאב לבן?' a='לדעות רבות, עדיף שלא לשנות ממסורת האבות ללא סיבה מיוחדת. עם זאת, אדם שעבר לזרם שונה (למשל, הפך לחסיד) יכול לנהוג כמסורת הזרם שאליו הצטרף. כדאי להתייעץ עם רב.' />
          <FAQItem q='האם יש הבדל בטקסט בין מזוזה אשכנזית לספרדית?' a='הטקסט של הפסוקים זהה לחלוטין. ההבדל היחיד הוא בקליגרפיה ובמבנה הוויזואלי של האותיות הבודדות על הקלף.' />
          <FAQItem q='מה קורה אם אשכנזי משתמש במזוזה ספרדית?' a='מבחינה הלכתית, המזוזה עדיין כשרה. אך ההלכה ממליצה שכל אחד יפעל לפי מסורת קהילתו ("אל תיטוש תורת אמך"). כדאי לבדוק עם רב.' />
          <FAQItem q='האם אפשר לרכוש מזוזה בכתב שונה מהתפילין שלי?' a='כן. בדרך כלל, גם מי שמניח תפילין בכתב אשכנזי יכול לקנות מזוזה בכל כתב כשר. אמנם יש מחמירים – כדאי לשאול רב.' />
          <FAQItem q='מה ההבדל המעשי בין הנוסחים?' a='ההבדל הוא בצורת כמה אותיות בלבד – לא בתוכן ולא במשמעות ההלכתית. כל הנוסחים כשרים לכל שיטה, אם נכתבו כהלכה.' />

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
