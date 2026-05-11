import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';
const C = { navy: '#0c1a35', gold: '#b8972a', border: '#e0e0e0', white: '#fff' };

export const metadata: Metadata = {
  title: 'מה כדאי לדעת לפני שקונים מזוזה? | המדריך המלא | YourSofer',
  description:
    'מדריך מלא לבחירת מזוזה כשרה ומהודרת. למה הסופר חשוב יותר מבית המזוזה, ההבדל בין כשר למהודר, ולמה יש פערי מחירים.',
  alternates: { canonical: `${BASE_URL}/madrich/mah-kadai-mezuza` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/mah-kadai-mezuza`,
    siteName: 'Your Sofer',
    title: 'מה כדאי לדעת לפני שקונים מזוזה? | YourSofer',
    description: 'מדריך מלא לבחירת מזוזה כשרה ומהודרת. למה הסופר חשוב יותר מבית המזוזה.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מה כדאי לדעת לפני שקונים מזוזה? המדריך המלא',
  description: 'מדריך מלא לבחירת מזוזה כשרה ומהודרת. למה הסופר חשוב יותר מבית המזוזה, ההבדל בין כשר למהודר, ולמה יש פערי מחירים.',
  url: `${BASE_URL}/madrich/mah-kadai-mezuza`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MahKadaiMezuzaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="המדריך המלא"
          title="מה כדאי לדעת לפני שקונים מזוזה?"
          subtitle="המדריך המלא לבחירת מזוזה כשרה ומהודרת באמת"
        />

        <div style={{ padding: '40px 0' }}>

          {/* Intro */}
          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>
            כשאנשים קונים מזוזה, רובם מסתכלים קודם על: בית המזוזה, המחיר, המראה החיצוני.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>
            אבל האמת היא שמה שקובע אם המזוזה באמת כשרה — הוא בכלל הקלף שנמצא בפנים.
          </p>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 16 }}>
            ומכיוון שרוב האנשים אינם מומחים לסת"מ, נוצר מצב שבו אנשים קונים מזוזה שנאמר להם שהיא "מהודרת",
            למרות שבפועל היא יכולה להיות גבולית, לא מהודרת, או אפילו פסולה לגמרי.
          </p>

          <QuoteBlock text='במדריך הזה נסביר: איך באמת בוחרים מזוזה, למה יש פערי מחירים עצומים, מה ההבדל בין כשר למהודר, ולמה חשוב לדעת מי הסופר שכתב את המזוזה שלכם.' />

          {/* Section 1 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            מזוזה היא לא קישוט
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            על המזוזה כתוב: <strong>"שומר דלתות ישראל"</strong>. לכן מזוזה איננה רק פריט עיצובי.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            יהודים במשך דורות ראו במזוזה שמירה לבית, מקור לברכה, וקדושה שנמצאת בפתח הבית.
            ולכן חשוב כל כך לדעת: מה באמת נכנס לבית שלכם.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            הדבר הכי חשוב במזוזה: הסופר שכתב אותה
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            אפשר לראות מזוזה שנראית יפה מאוד לעין. אבל יש דברים שאף אדם בעולם לא יכול לזהות —
            חוץ מהסופר עצמו.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            למשל: אם סופר שכח לומר בתחילת הכתיבה "הריני כותב לשם קדושת מזוזה" —
            המזוזה פסולה לחלוטין. גם אם הכתב מושלם, הקלף יפה, ואף רב לא יצליח לזהות את הבעיה. רק הסופר יודע.
          </p>

          <QuoteBlock text='יראת השמים והאמינות של הסופר הם חלק מרכזי בכשרות המזוזה.' />

          {/* Section 3 - Real story */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            סיפור אמיתי מהעולם של סופר סת"מ
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            המזוזה הראשונה שנכתבה אצלנו לקחה כ־12 שעות עבודה. כל שורה נכתבה באיטיות, בדקדוק ובהשקעה עצומה.
            בסיום הכתיבה התברר שנשכח לומר "לשם קדושת מזוזה" — באותו רגע, כל המזוזה נפסלה.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            שווי המזוזה היה כ־700₪. ואף לקוח בעולם לא היה יכול לדעת שהיא פסולה — רק הסופר עצמו.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            זה בדיוק ההבדל בין אדם שמוכר מהר לבין סופר ירא שמים שאומר את האמת גם כשהיא עולה לו כסף.
          </p>

          {/* Section 4 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            לא כל "מהודר" באמת מהודר
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            אחת הבעיות הגדולות בעולם המזוזות היא השימוש במילה "מהודר".
            כיום אפשר למצוא מזוזות רבות שנמכרות בתור "מהודר", "מהודר מאוד", "מהודר למהדרין" —
            אבל בפועל חלק מהרבנים יכולים להכשיר, וחלק יכולים לפסול.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 8 }}>
            לכן חשוב להבין: <strong>"כשר" לא תמיד אומר "מהודר".</strong>
          </p>

          {/* Section 5 - How to identify */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            איך מזהים מזוזה מהודרת?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 20 }}>
            גם אדם שלא מומחה יכול להתחיל לראות הבדלים:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '0 0 28px' }}>
            {[
              {
                icon: '✨',
                title: 'מזוזה מהודרת',
                items: ['סימטריה ורווחים מדויקים', 'ניקיון וחדות האותיות', 'צורת אות ברורה וזהה', 'אין ספקות בצורת האותיות'],
              },
              {
                icon: '⚠️',
                title: 'מזוזה פשוטה / גבולית',
                items: ['נון יכולה להיראות כמו כף', 'יוד ארוכה כמו ו\'', 'ו\' ארוכה כמו נון סופית', 'ספק קטן — משמעותי מאוד'],
              },
            ].map(box => (
              <div key={box.title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{box.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 12 }}>{box.title}</div>
                {box.items.map(item => (
                  <div key={item} style={{ fontSize: 14, color: '#444', marginBottom: 6, display: 'flex', gap: 8 }}>
                    <span style={{ color: C.gold }}>•</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Section 6 - Price differences */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            למה יש פערי מחירים בין מזוזות?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            אנשים רבים שואלים: "למה מזוזה אחת עולה 170₪ ואחרת 700₪?" הסיבה היא שלא משלמים רק על החומרים.
            עיקר המחיר הוא העבודה והאיכות של הכתיבה.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מזוזה פשוטה יכולה להיכתב בזמן קצר יחסית. אבל מזוזה מהודרת באמת דורשת ריכוז עצום,
            השקעה בכל אות, בדיקות חוזרות — ולעיתים יומיים עבודה ויותר. לפעמים אפילו עבודה של ימים נפסלת ברגע.
          </p>

          {/* Section 7 - Why know the sofer */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            למה חשוב להכיר את הסופר?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כשאתם יודעים מי כתב את המזוזה, איך הוא עובד, מה רמת היראת שמים שלו, ומה הסטנדרטים שלו —
            יש לכם הרבה יותר שקט נפשי. כי בסופו של דבר הדבר החשוב ביותר הוא האמון.
          </p>

          {/* Section 8 - Your Sofer */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            איך אנחנו עושים את זה אחרת ב־Your Sofer
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            ב־Your Sofer אנחנו מנסים ליצור סטנדרט חדש בעולם הסת"מ. אצלנו אפשר לראות את הסופר שכתב את המזוזה,
            לראות תמונות של הקלף עצמו, לבחור את הקלף הספציפי שיגיע אליכם, ולהבין מה באמת אתם קונים.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בנוסף — לא כל סופר יכול להגדיר את המזוזות שלו כ"מהודרות". יש סינון ובקרה, ונשמר תיעוד של הקלף לאורך זמן.
          </p>

          {/* Section 9 - Accountability */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            אחריות ותיעוד לכל החיים
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בחלק מהמזוזות באתר נשמרת תמונת הקלף שנרכש. כך שאם בעוד שנים המזוזה תימצא פסולה —
            אפשר לבדוק האם הפסול היה קיים בזמן הרכישה, או נוצר עם השנים. זה מעניק שקיפות, ביטחון ואחריות אמיתית.
          </p>

          {/* Summary */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            לסיכום
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מזוזה יכולה להיראות יפה מאוד מבחוץ. אבל בדיוק כמו רכב — גם רכב נוצץ בלי מנוע לא באמת שווה משהו.
          </p>
          <Step num={1} title="קנו ממקום אמין" desc="בדקו שיש שקיפות על המוצר ועל הסופר." />
          <Step num={2} title="הכירו את הסופר" desc="דעו מי כתב את המזוזה, מה הסטנדרטים שלו, ורמת האמינות שלו." />
          <Step num={3} title="הבינו מה קונים" desc="אל תסתמכו רק על המילה 'מהודר'. בקשו לראות את הקלף עצמו." />
          <Step num={4} title="זכרו: מזוזה היא לא עוד מוצר" desc="היא הדבר שנמצא בפתח הבית שלכם — כל יום, כל השנה." />

          {/* Related */}
          <h3 style={{ fontSize: 18, fontWeight: 900, color: C.navy, margin: '48px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji="🎯" title="איך לבחור מזוזה נכון" desc="מדריך שלב-אחר-שלב לבחירה נכונה" href="/madrich/bechira" />
            <RelatedCard emoji="🔍" title="איך אנחנו בודקים" desc="כל מזוזה עוברת בדיקה לפני שמגיעה אליך" href="/madrich/bedika" />
            <RelatedCard emoji="⭐" title="מה זה מהודר באמת" desc="ההבדל בין כשר למהודר בשפה פשוטה" href="/madrich/mehudar" />
          </div>

          <CTAStrip
            title="מחפשים מזוזה כשרה ומהודרת עם שקיפות מלאה?"
            buttons={[
              { label: 'לקלפי מזוזה ←', href: '/category/קלפי מזוזה', variant: 'primary' },
              { label: 'שאלות נפוצות', href: '/madrich/faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
