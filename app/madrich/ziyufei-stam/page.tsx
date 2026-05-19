import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'זיופי סת"ם ברשת – כיצד מזהים וממה להתרחק',
  description:
    'הדפסות לייזר, כותבים לא מוסמכים, קלפים פסולים – איך מזהים זיוף בסת"ם לפני הקנייה ואחריה? מדריך לקניה בטוחה של מזוזות ותפילין אונליין.',
  alternates: { canonical: `${BASE_URL}/madrich/ziyufei-stam` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/ziyufei-stam`,
    siteName: 'Your Sofer',
    title: 'זיופי סת"ם ברשת | Your Sofer',
    description: 'מדריך לזיהוי זיופי סת"ם – הדפסות, סופרים לא מוסמכים וקלפים פסולים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'זיופי סת"ם ברשת – כיצד מזהים וממה להתרחק',
  description: 'כיצד להבדיל בין סת"ם אמיתי לזיוף כשקונים אונליין – סימנים ובדיקות מעשיות.',
  url: `${BASE_URL}/madrich/ziyufei-stam`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function ZiyufeiStamPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="אזהרת זיוף"
          title='זיופי סת"ם ברשת'
          subtitle='כיצד מזהים הדפסה, סופר לא מוסמך וקלף פסול – לפני שמשלמים'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            רשת האינטרנט מוצפת באתרים המוכרים "קלפי מזוזה מהודרים" במחירי רצפה, שמתגלים לעיתים כצילומים, הדפסות מכונה או עבודות של כותבים שאינם מוסמכים כלל. הדרך היחידה להתגונן היא לדרוש שקיפות מוחלטת. אתר שאינו מציג תמונה של הקלף הספציפי שתקבלו – כנראה מסתיר משהו.
          </p>

          <QuoteBlock text='אתר סת"ם מהימן מציג תמונה ייחודית לכל קלף – לא תמונה גנרית אחת ל-100 מוצרים.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שלושת סוגי הזיוף הנפוצים
          </h2>

          {[
            { num: 1, title: 'הדפסת לייזר על קלף', desc: 'הקלף אמיתי, אבל הכתב הוא הדפסת מדפסת לייזר. הדפסה תיראה מושלמת ושטוחה לחלוטין, ללא כל מרקם של דיו.' },
            { num: 2, title: 'כתיבה של אדם לא מוסמך', desc: 'הכתב עשוי להיראות יפה, אך נכתב ללא כוונות, ללא "לשמה" ועל ידי מי שאינו מחויב להלכה – הקלף פסול מהיסוד.' },
            { num: 3, title: 'קלף פסול מהלבנה כימית', desc: 'עור שלא עובד "לשם קדושת קלף" ושעבר הלבנה כימית פשוטה – אינו כשר לכתיבת סת"ם כלל.' },
          ].map(item => (
            <div key={item.num} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <div style={{ background: '#b91c1c', color: '#fff', fontWeight: 900, fontSize: 18, minWidth: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.num}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כיצד לזהות הדפסה עם קבלת הקלף
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתב יד אמיתי יציג שינויים קלים בעובי הדיו ובלחץ הקולמוס – אף פעם לא מושלם באופן מכאני. בצד האחורי של הקלף ניתן לעיתים להרגיש בלטות עדינות של האותיות. הדפסת לייזר תיראה שטוחה ומושלמת באופן מלאכותי, ואינה משאירה שום עקבות על הצד האחורי.
          </p>

          <QuoteBlock text='מוצר אמיתי מגיע עם שם הסופר, תעודת בדיקה, ותמונת הקלף הספציפי – לא תמונות גנריות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך מזהים הדפסה כשהמזוזה מגיעה לידיים?' a='הדפסה תהיה מושלמת ושטוחה לחלוטין. כתיבה אמיתית מותירה מרקם של דיו מתנוסס, סימני קולמוס קלים, ולאורך גב הקלף ניתן לעיתים להרגיש את בלטות האותיות.' />
          <FAQItem q='האם ניתן לסמוך על ביקורות לקוחות כהוכחה לכשרות?' a='ביקורות יכולות לעזור, אך אינן מספיקות. הוכחה אמיתית לכשרות היא צילום הקלף הספציפי ותעודת הסמכה – לא ביקורות שיווקיות.' />
          <FAQItem q='מה עושים אם קיבלתי מוצר שנראה מזויף?' a='פנו מיד לאתר ממנו קניתם ובקשו הסבר. אם לא מגיבים – פנו לרב מוסמך לבדיקה עצמאית ושקלו הגשת תלונה לצרכנות.' />
          <FAQItem q='מחיר זול מאוד הוא בהכרח סימן אזהרה?' a='כן. סופר שמשקיע 3-4 שעות בכתיבת מזוזה לא יכול למכור אותה ב-100 ש"ח ולהתפרנס. מחיר מתחת לרף מינימלי הגיוני הוא אות אזהרה ברורה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🛡️' title='קניית סת"ם באינטרנט' desc='4 סימני אמינות שיש לבדוק' href='/madrich/knia-online' />
            <RelatedCard emoji='💰' title='מחירי סופרי סת"ם' desc='מה מרכיב מחיר הוגן' href='/madrich/michrei-soferim' />
          </div>

          <CTAStrip
            title='קנו עם שקיפות מלאה – תמונה אחת לקלף אחד'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'שאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
