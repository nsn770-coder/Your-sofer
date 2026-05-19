import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קניית סת"ם באינטרנט – איך לא ליפול בהונאה',
  description:
    'איך קונים מזוזות ותפילין באינטרנט בבטחה? 4 סימני אמינות שכל אתר סת"ם חייב לעמוד בהם, ואיך מזהים זיופים לפני שמשלמים.',
  alternates: { canonical: `${BASE_URL}/madrich/knia-online` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/knia-online`,
    siteName: 'Your Sofer',
    title: 'קניית סת"ם באינטרנט | Your Sofer',
    description: 'מדריך לרכישת סת"ם מהימן באינטרנט – אותנטיות, כשרות ובטיחות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קניית סת"ם באינטרנט – איך לוודא שלא נופלים בהונאה',
  description: 'מדריך מעשי לרכישת מזוזות ותפילין באינטרנט בבטחה.',
  url: `${BASE_URL}/madrich/knia-online`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KniaOnlinePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="רכישה בטוחה"
          title='קניית סת"ם באינטרנט'
          subtitle='4 סימני אמינות שכל אתר חייב לעמוד בהם – ואיך מזהים זיוף'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            המהפכה הדיגיטלית מאפשרת להזמין תשמישי קדושה ישירות מישראל לכל בית בעולם. אך לצד הנוחות, הרשת מלאה בסכנות: אתרים פיקטיביים, קלפים מזויפים בהדפסת מכונה, וסופרים לא מוסמכים שמוכרים במצח נחושה. כיצד קונים בטחון הלכתי ודיגיטלי?
          </p>

          <QuoteBlock text='הכלל הראשון: אתר סת"ם מהימן מראה לכם פנים ושמות – לא תמונות גנריות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            4 סימני אמינות שיש לבדוק
          </h2>

          {[
            { num: 1, title: 'צילום קלף ייחודי', desc: 'אתר מקצועי לא יציג תמונה גנרית אחת עבור 100 מוצרים. לכל קלף מהודר צריך להיות צילום ייחודי עם מספר סידורי משלו.' },
            { num: 2, title: 'תעודות הסמכה בתוקף', desc: 'ודאו שלסופרים יש תעודות בתוקף מגופים מוכרים כמו "לשכת הקודש", "משמרת סת"ם" או הרבנות הראשית.' },
            { num: 3, title: 'אבטחת תשלום ופרטיות', desc: 'אתר אמין משתמש בפרוטוקולי אבטחה (SSL) ומציע תשלום בטוח. כתובת פיזית ברורה ומספר טלפון – סימנים חיוביים.' },
            { num: 4, title: 'מדיניות החזרות וכשרות', desc: 'אתר אמין יאפשר לכם לקחת את המוצר לבדיקה עצמאית אצל כל רב מוסמך שתבחרו, וייתן אחריות על הכשרות.' },
          ].map(item => (
            <div key={item.num} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <div style={{ background: '#1E3A8A', color: '#C5A028', fontWeight: 900, fontSize: 18, minWidth: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.num}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            איך מזהים זיוף ביד?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כשהחבילה מגיעה, בדקו: כתב יד אמיתי תמיד יציג שינויים קלים בעובי הדיו ובלחץ הקולמוס – אף פעם לא מושלם באופן מכאני. בצד האחורי של הקלף ניתן לעיתים להרגיש בלטות עדינות של האותיות. הדפסת לייזר תיראה שטוחה ומושלמת באופן מלאכותי.
          </p>

          <QuoteBlock text='מוצר אמיתי מישראל – מגיע עם שם הסופר, תעודת בדיקה, ותמונת הקלף הספציפי.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך מזהים הדפסה כשהמזוזה מגיעה?' a='הדפסה תיראה מושלמת ושטוחה לחלוטין. כתיבה אמיתית מותירה מרקם של דיו מתנוסס, סימני קולמוס קלים, ולאורך גב הקלף ניתן לעיתים להרגיש את בלטות האותיות.' />
          <FAQItem q='האם אפשר לסמוך על ביקורות של לקוחות?' a='ביקורות יכולות לעזור, אך אינן מספיקות. הוכחה אמיתית לכשרות היא צילום הקלף הספציפי ותעודת הסמכה – לא ביקורות שיווקיות.' />
          <FAQItem q='מה עושים אם קיבלתי מוצר שנראה זייפני?' a='פנו מיד לאתר ממנו קניתם ובקשו הסבר. אם האתר לא מגיב – פנו לרב מוסמך לבדיקה עצמאית ושקלו הגשת תלונה לצרכנות.' />
          <FAQItem q='האם כדאי לקנות מסופר ישירות?' a='בהחלט! קניה ישירה מהסופר מבטיחה שקיפות מקסימלית. אפשר לראות את כתבו, לשאול שאלות, ולקבל קלף שהסופר אחראי עליו באופן אישי.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='⚠️' title='זיופי סת"ם ברשת' desc='איך מזהים ממה להתרחק' href='/madrich/ziyufei-stam' />
            <RelatedCard emoji='💰' title='מחירי סופרי סת"ם' desc='מה מרכיב מחיר הוגן' href='/madrich/michrei-soferim' />
          </div>

          <CTAStrip
            title='רוצים לקנות עם שקיפות מלאה?'
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
