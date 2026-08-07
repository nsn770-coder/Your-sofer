import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'כיפות לאירועים – כמה להזמין, מה להדפיס וכמה זה עולה',
  description:
    'מזמינים כיפות לבר מצווה, חתונה או ברית? המדריך המלא: כמה כיפות להזמין ביחס למספר האורחים, אילו חומרים מתאימים להדפסה ורקמה, לוחות זמנים, וטעויות נפוצות שכדאי להימנע מהן.',
  alternates: { canonical: `${BASE_URL}/madrich/kipot-le-eruim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/kipot-le-eruim`,
    siteName: 'Your Sofer',
    title: 'כיפות לאירועים – המדריך המלא | Your Sofer',
    description: 'כמה כיפות להזמין, מה להדפיס, לוחות זמנים וטעויות נפוצות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'כיפות לאירועים – כמה להזמין ומה חשוב לדעת',
  description: 'מדריך הזמנת כיפות מודפסות לאירועים: כמויות, חומרים, לוחות זמנים וטיפים.',
  url: `${BASE_URL}/madrich/kipot-le-eruim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'כמה כיפות להזמין לאירוע?',
      acceptedAnswer: { '@type': 'Answer', text: 'כלל האצבע: כיפה לכל גבר ונער מוזמן, בתוספת רזרבה של 10–15 אחוזים. באירוע של 300 אורחים שבו כמחצית גברים – הזמינו 160–175 כיפות. עדיף שיישארו כיפות למזכרת מאשר שיחסרו.' },
    },
    {
      '@type': 'Question',
      name: 'כמה זמן מראש צריך להזמין כיפות מודפסות?',
      acceptedAnswer: { '@type': 'Answer', text: 'מומלץ להזמין 3–4 שבועות לפני האירוע. הזמנה מוקדמת מאפשרת אישור הדמיה בנחת, זמן ייצור מסודר ומרווח ביטחון למשלוח.' },
    },
    {
      '@type': 'Question',
      name: 'מה נהוג להדפיס על כיפות לאירוע?',
      acceptedAnswer: { '@type': 'Answer', text: 'הנוסח הנפוץ: שם בעל השמחה ותאריך האירוע, למשל "בר המצווה של דניאל, ט״ו בסיוון תשפ״ו". יש שמוסיפים איור, לוגו משפחתי או ברכה קצרה. ההדפסה נעשית בצד הפנימי או החיצוני, לפי הסגנון.' },
    },
  ],
};

export default function KipotLeEruimPage() {
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
          badge="מדריך אירועים"
          title="כיפות לאירועים"
          subtitle="כמה להזמין, מה להדפיס, ואיך לא ליפול בטעויות הנפוצות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כיפות מודפסות הן מזכרת האירועים הקלאסית: הן שימושיות בזמן האירוע עצמו, נשארות אצל האורחים שנים אחרי, ומזכירות להם את השמחה שלכם בכל פעם שהם חובשים אותן. אבל בין ההחלטה להזמין לבין קבלת קופסה עם כיפות מושלמות יש כמה החלטות חשובות – והמדריך הזה יעשה לכם סדר.
          </p>

          <QuoteBlock text="כיפה מודפסת עולה פחות ממנת קינוח – ונשארת עם האורח שנים." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            כמה כיפות להזמין?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כלל האצבע: כיפה אחת לכל גבר ונער ברשימת המוזמנים, בתוספת רזרבה של 10–15 אחוזים. באירוע של 300 אורחים שבו כמחצית גברים, הזמינו 160–175 כיפות. חשוב לזכור: באירועים דתיים יותר שיעור חובשי הכיפות גבוה יותר, ובאירועים מעורבים רבים אורחים חילונים ישמחו לחבוש כיפה מודפסת דווקא בגלל המזכרת. עדיף שיישארו כיפות – מאשר לגלות באמצע החופה שנגמרו.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            איזה סוג כיפה לבחור לאירוע?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'סאטן', color: '#0c447c', bg: '#e6f1fb', desc: 'הקלאסיקה של אירועים. מבריקה, חגיגית וידידותית לתקציב. מתאימה במיוחד לחתונות ובריתות ולכמויות גדולות.' },
              { title: 'פשתן', color: '#5F5E5A', bg: '#f1efe8', desc: 'מראה טבעי ומט. מושלמת לחתונות בוטיק, אירועים בטבע ועיצוב מודרני בגוני בז\', שמנת וזית.' },
              { title: 'אלקנטרה וזמש', color: '#4a1b6b', bg: '#f8f0ff', desc: 'מרקם קטיפתי יוקרתי והדפסה חדה במיוחד. הבחירה המובילה לבר מצווה מהודרת ולאירועי חורף.' },
              { title: 'בוכרית מודפסת', color: '#993C1D', bg: '#faece7', desc: 'גדולה, בולטת ולא נופלת מהראש. אהובה על ילדים ומצטלמת נהדר.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            איזה צבע לבחור?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            לבן – הקלאסיקה של חופות ובר מצוות, מצטיין עם הדפסה בזהב או כסף. שחור – שימושי לכל אירוע, והאורחים ממשיכים לחבוש אותו גם אחרי. כחול כהה – חגיגי ושימושי, עובד מצוין עם הדפסה לבנה או זהובה. גוני בז' ופשתן – לאירועי בוטיק וחתונות בטבע. טיפ חשוב: הכיפה לא חייבת להתאים לצבע המפות – לפעמים עדיף צבע ניטרלי שהאורחים ישמחו לחבוש גם אחרי האירוע.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            לוח זמנים מומלץ
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הזמינו 3–4 שבועות לפני האירוע. השבוע הראשון מוקדש לבחירת דגם, צבע ונוסח ההדפסה ולאישור הדמיה; שבועיים לייצור; והשבוע האחרון הוא מרווח ביטחון למשלוח. מזמינים ברגע האחרון? צרו קשר בוואטסאפ – בחלק מהדגמים אפשר לקצר משמעותית.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            שלוש טעויות נפוצות
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הראשונה – הזמנה לפי מספר המוזמנים הכולל במקום לפי מספר הגברים, שמובילה לעודף גדול מדי או להוצאה מיותרת. השנייה – נוסח הדפסה ארוך מדי: שם ותאריך נראים מצוין, פסקה שלמה לא. השלישית – השוואת מחירים לפי מחיר ליחידה בלבד, בלי לבדוק אם המחיר כולל את ההדפסה, ההדמיה והמשלוח.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            צ'ק-ליסט לפני אישור ההדמיה
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            לפני שמאשרים ייצור, עברו על הרשימה הזו: איות מדויק של השמות, התאריך (עברי ולועזי), נוסח ההקדשה, צבע הכיפה, צבע ההדפס, מיקום ההדפסה (חיצוני או פנימי), והכמות והמידות – כולל מידות ילדים אם יש הרבה ילדים באירוע. דקה של בדיקה חוסכת הזמנה חוזרת.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ys-text)', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q="כמה כיפות להזמין לאירוע?" a="כיפה לכל גבר ונער מוזמן + רזרבה של 10–15%. באירוע של 300 אורחים שכמחציתם גברים – 160–175 כיפות." />
          <FAQItem q="כמה זמן מראש צריך להזמין?" a="3–4 שבועות לפני האירוע: בחירה ואישור הדמיה, ייצור, ומרווח ביטחון למשלוח. בלחץ זמן – דברו איתנו בוואטסאפ." />
          <FAQItem q="מה נהוג להדפיס?" a='שם בעל השמחה ותאריך האירוע. יש שמוסיפים איור או ברכה קצרה. כלל הזהב: קצר וקריא.' />
          <FAQItem q="האם אפשר לקבל הדמיה לפני הייצור?" a="כן. לפני כל הזמנת הדפסה נשלחת הדמיה דיגיטלית לאישור שלכם – מייצרים רק אחרי שאישרתם." />
          <FAQItem q="איפה מדפיסים על הכיפה?" a="תלוי בדגם: בחלק העליון, בשוליים החיצוניים או בצד הפנימי. הדפסה פנימית שומרת על מראה נקי מבחוץ; חיצונית הופכת את הכיפה למיתוג בולט של האירוע." />
          <FAQItem q="האם אפשר להדפיס על כל סוגי הכיפות?" a="לא על כולן באותה שיטה – סאטן, אלקנטרה ובד מתאימות להדפסה; קטיפה ובוכרית לרוב לרקמה או הטבעה. בדף כל דגם מצוין מה אפשרי, ואפשר תמיד לשאול בוואטסאפ." />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ys-text)', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji="🧢" title="סוגי כיפות" desc="המדריך המלא לכל הסוגים" href="/madrich/sugei-kipot" />
            <RelatedCard emoji="🎓" title="חבילות בר מצווה" desc="כל מה שצריך לחגיגה" href="/madrich/chavilot-bar-mitzva" />
          </div>

          <CTAStrip
            title="כיפות לאירועים עם הדפסה אישית – הדמיה חינם"
            buttons={[
              { label: 'לכיפות לאירועים ←', href: '/event-kippot', variant: 'primary' },
              { label: 'לכל הכיפות', href: '/category/כיפות', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
