import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'סוגי כיפות – המדריך המלא: סרוגה, בד, קטיפה, בוכרית וירושלמית',
  description:
    'כיפה סרוגה, כיפת בד, קטיפה, כיפה בוכרית או ירושלמית? מדריך מלא לכל סוגי הכיפות: מה מאפיין כל סוג, מידות מומלצות למבוגרים ולילדים, ואיך בוחרים כיפה שמחזיקה שנים.',
  alternates: { canonical: `${BASE_URL}/madrich/sugei-kipot` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/sugei-kipot`,
    siteName: 'Your Sofer',
    title: 'סוגי כיפות – המדריך המלא | Your Sofer',
    description: 'סרוגה, בד, קטיפה, בוכרית וירושלמית – מה מאפיין כל סוג ואיך בוחרים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'סוגי כיפות – המדריך המלא',
  description: 'מדריך לכל סוגי הכיפות: סרוגה, בד, קטיפה, בוכרית וירושלמית – מאפיינים, מידות ובחירה נכונה.',
  url: `${BASE_URL}/madrich/sugei-kipot`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'מה ההבדל בין כיפה בוכרית לכיפה רגילה?',
      acceptedAnswer: { '@type': 'Answer', text: 'כיפה בוכרית גדולה ומכסה את רוב הראש, בדרך כלל עם רקמה צבעונית עשירה. היא נוחה מאוד לילדים כי היא לא זזה ולא נופלת, ולכן פופולרית גם כמזכרת לאירועים.' },
    },
    {
      '@type': 'Question',
      name: 'איזו מידת כיפה מתאימה לילד?',
      acceptedAnswer: { '@type': 'Answer', text: 'לילדים מומלץ קוטר 17–19 ס"מ או כיפה בוכרית שמכסה את הראש. למבוגרים המידה הנפוצה היא 19–21 ס"מ, תלוי בסוג הכיפה ובסגנון החבישה.' },
    },
    {
      '@type': 'Question',
      name: 'איזו כיפה הכי מתאימה להדפסה לאירועים?',
      acceptedAnswer: { '@type': 'Answer', text: 'כיפות סאטן, אלקנטרה ובד הן הנפוצות ביותר להדפסה ורקמה של שם ותאריך האירוע, בזכות משטח חלק וצבעים זמינים. כיפה בוכרית מודפסת היא בחירה בולטת לבר מצווה.' },
    },
  ],
};

export default function SugeiKipotPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מדריך כיפות"
          title="סוגי כיפות – המדריך המלא"
          subtitle="סרוגה, בד, קטיפה, בוכרית או ירושלמית? כל מה שצריך לדעת לפני שבוחרים"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הכיפה היא הפריט הנפוץ ביותר בארון היהודי – אבל מעטים יודעים כמה סוגים, חומרים ומסורות מסתתרים מאחוריה. הבחירה בין כיפה סרוגה, כיפת בד או כיפה בוכרית היא לא רק עניין של נוחות: היא מספרת סיפור על סגנון, קהילה ואישיות. במדריך הזה נעבור על כל הסוגים המרכזיים ונעזור לכם לבחור נכון – לשימוש יומיומי, לאירוע או כמתנה.
          </p>

          <QuoteBlock text="עם מעל 800 דגמי כיפות באתר – לכל ראש יש כיפה שמתאימה לו בדיוק." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            הסוגים המרכזיים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'כיפה סרוגה', color: '#1a5c3a', bg: '#f0fff5', desc: 'הכיפה המזוהה עם הציבור הדתי-לאומי. נסרגת מחוטי כותנה או משי, בשלל צבעים ודוגמאות. עמידה, נוחה ומתאימה לכל גיל.' },
              { title: 'כיפת בד', color: 'var(--ys-text)', bg: '#f0f4ff', desc: 'קלאסית ופשוטה, בדרך כלל שחורה. נפוצה בציבור החרדי והמסורתי. קלה, זולה יחסית ומצוינת גם לאירועים בהדפסה אישית.' },
              { title: 'כיפת קטיפה', color: '#4a1b6b', bg: '#f8f0ff', desc: 'מחומר קטיפתי יוקרתי, לרוב שחורה עם בטנה. מזוהה עם הציבור החסידי והליטאי, ופופולרית מאוד גם לילדים.' },
              { title: 'כיפה בוכרית', color: '#993C1D', bg: '#faece7', desc: 'גדולה, צבעונית ומכסה את רוב הראש. רקמה עשירה בסגנון מסורתי. אהובה על ילדים כי היא פשוט לא נופלת.' },
              { title: 'כיפה ירושלמית', color: '#0c447c', bg: '#e6f1fb', desc: 'סרוגה בלבן עם עיטור אופייני בשוליים. מזוהה עם ירושלים של פעם ועם חסידויות מסוימות. קלילה ומאווררת.' },
              { title: 'כיפות מודפסות', color: '#854F0B', bg: '#faeeda', desc: 'כל סוג כיפה שמוסיפים לו הדפסה או רקמה אישית – שם, תאריך ועיצוב. הלהיט של אירועים: בר מצווה, חתונה וברית.' },
              { title: 'כיפות פשתן', color: '#5F5E5A', bg: '#f1efe8', desc: 'מראה טבעי, מט ומודרני. הבחירה המובילה לחתונות בוטיק ואירועים בטבע, בגוני בז\', שמנת, זית ואפור.' },
              { title: 'זמש ועור', color: '#712B13', bg: '#faece7', desc: 'מרקם רך ויוקרתי במראה שקט ולא מבריק. זמש לאירועים מעוצבים בגוונים חמים; עור – מתנה אישית עמידה לחתן.' },
              { title: 'כיפות ברסלב', color: '#085041', bg: '#e1f5ee', desc: 'כיפות בד גדולות, לרוב לבנות, עם כיתוב או עיטור המזוהים עם רבי נחמן. נפוצות בהילולות, אומן ואירועים קהילתיים.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            איך בוחרים מידה?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מידת כיפה נמדדת לפי הקוטר בסנטימטרים. לילדים מתאים בדרך כלל קוטר 17–19 ס"מ, למבוגרים 19–21 ס"מ, ולמי שמעדיף כיסוי מלא – כיפה בוכרית שמגיעה עד 26 ס"מ. כלל אצבע: כיפה סרוגה ובד נוטות להרגיש קטנות יותר מקטיפה באותו קוטר, בגלל צורת הישיבה על הראש. אם הכיפה מיועדת לחבישה יומיומית ארוכה – עדיף לבחור קוטר גדול במעט, שמתייצב טוב יותר.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            כיפה כמתנה וכמזכרת
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כיפות הן מזכרת האירועים הפופולרית ביותר בישראל: הדפסה או רקמה של שם החתן, תאריך האירוע או לוגו משפחתי הופכות כיפה פשוטה למזכרת שנשארת עם האורחים שנים. באתר תמצאו מגוון ענק של כיפות להדפסה אישית לצד כיפות מעוצבות ליום-יום – לילדים, לנוער ולמבוגרים.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q="מה ההבדל בין כיפה בוכרית לכיפה רגילה?" a="כיפה בוכרית גדולה ומכסה את רוב הראש, עם רקמה צבעונית עשירה בסגנון מסורתי. היא נוחה מאוד לילדים כי היא לא זזה ולא נופלת – ולכן פופולרית גם כמזכרת לאירועים." />
          <FAQItem q="איזו מידת כיפה מתאימה לילד?" a='לילדים מומלץ קוטר 17–19 ס"מ, או כיפה בוכרית שמכסה את הראש ולא דורשת סיכות. למבוגרים המידה הנפוצה היא 19–21 ס"מ.' />
          <FAQItem q="איזו כיפה הכי מתאימה להדפסה לאירועים?" a="כיפות סאטן, אלקנטרה ובד הן הנפוצות ביותר להדפסה ורקמה, בזכות משטח חלק ומגוון צבעים. כיפה בוכרית מודפסת היא בחירה בולטת ומרשימה לבר מצווה." />
          <FAQItem q="איך מכבסים כיפה?" a="כיפות סרוגות ובד אפשר לכבס ביד במים קרים עם סבון עדין ולייבש בצל. קטיפה עדיף לנקות בניקוי מקומי בלבד, כדי לשמור על מרקם החומר." />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ys-text)', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji="🎉" title="כיפות לאירועים" desc="כמה להזמין ואיך זה עובד" href="/madrich/kipot-le-eruim" />
            <RelatedCard emoji="🎁" title="מתנת חנוכת בית" desc="רעיונות למתנה יהודית מרגשת" href="/madrich/matana-chanuka-bayit" />
          </div>

          <CTAStrip
            title="מעל 800 דגמי כיפות – סרוגות, בד, קטיפה ובוכריות"
            buttons={[
              { label: 'לכל הכיפות ←', href: '/category/כיפות', variant: 'primary' },
              { label: 'כיפות לאירועים בהדפסה', href: '/event-kippot', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
