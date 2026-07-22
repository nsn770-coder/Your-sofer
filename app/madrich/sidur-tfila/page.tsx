import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'איך בוחרים סידור תפילה – נוסחים, גדלים והקדשה אישית',
  description:
    'מחפשים סידור תפילה? מדריך מלא לבחירת סידור: ההבדלים בין נוסח אשכנז, ספרד ועדות המזרח, איזה גודל נוח לשימוש יומיומי ולבית הכנסת, ואיך סידור עם הקדשה הופך למתנה מרגשת.',
  alternates: { canonical: `${BASE_URL}/madrich/sidur-tfila` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/sidur-tfila`,
    siteName: 'Your Sofer',
    title: 'איך בוחרים סידור תפילה | Your Sofer',
    description: 'נוסחים, גדלים והקדשה אישית – המדריך המלא לבחירת סידור.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'איך בוחרים סידור תפילה',
  description: 'מדריך לבחירת סידור תפילה: נוסחים, גדלים, כריכות והקדשות אישיות.',
  url: `${BASE_URL}/madrich/sidur-tfila`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'איך יודעים איזה נוסח תפילה מתאים לי?',
      acceptedAnswer: { '@type': 'Answer', text: 'הנוסח נקבע בדרך כלל לפי מסורת המשפחה או בית הכנסת שבו מתפללים: אשכנז ליוצאי אשכנז וליטא, ספרד לציבור החסידי וחלק מהדתי-לאומי, ועדות המזרח ליוצאי ספרד וארצות המזרח. אם אינכם בטוחים – בדקו איזה סידור נמצא בבית הכנסת שלכם.' },
    },
    {
      '@type': 'Question',
      name: 'איזה גודל סידור הכי נוח?',
      acceptedAnswer: { '@type': 'Answer', text: 'סידור כיס קטן וקל לנשיאה יומיומית, גודל בינוני הוא הנפוץ לבית הכנסת, וסידור גדול עם אותיות מוגדלות מתאים למבוגרים ולמתקשים בקריאה.' },
    },
    {
      '@type': 'Question',
      name: 'האם אפשר להוסיף הקדשה אישית לסידור?',
      acceptedAnswer: { '@type': 'Answer', text: 'כן. הטבעה או הדפסת הקדשה על הכריכה – שם, תאריך וברכה – הופכת סידור למתנה מרגשת לבר מצווה, לחתונה ולאירועים, ולמזכרת מכובדת לאורחים.' },
    },
  ],
};

export default function SidurTfilaPage() {
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
          badge="מדריך סידורים"
          title="איך בוחרים סידור תפילה"
          subtitle="נוסחים, גדלים, כריכות והקדשה אישית – כל מה שצריך לדעת"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            סידור תפילה הוא ספר שמלווה את בעליו כל יום, לפעמים עשרות שנים – ולכן שווה לבחור אותו נכון. שלוש השאלות המרכזיות: איזה נוסח, איזה גודל, ואיזו כריכה. במדריך הזה נעבור על כולן, ונוסיף גם את האפשרות שהופכת סידור למתנה בלתי נשכחת: הקדשה אישית.
          </p>

          <QuoteBlock text="סידור עם הקדשה אישית היא אחת המתנות המרגשות ביותר לבר מצווה ולחתן וכלה." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '36px 0 16px' }}>
            ההבדלים בין הנוסחים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'נוסח אשכנז', color: '#0c447c', bg: '#e6f1fb', desc: 'נוסח יוצאי אשכנז וליטא. הנוסח המקובל בקהילות אשכנזיות ובחלק גדול מהציבור הדתי-לאומי.' },
              { title: 'נוסח ספרד', color: '#1a5c3a', bg: '#f0fff5', desc: 'שילוב של מסורת אשכנז עם קבלת האר״י. הנוסח של רוב הציבור החסידי וחלק מהדתי-לאומי.' },
              { title: 'עדות המזרח', color: '#993C1D', bg: '#faece7', desc: 'נוסח יוצאי ספרד וארצות המזרח. מקובל בקהילות הספרדיות ובבתי כנסת ספרדיים בכל הארץ.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            איך יודעים מה הנוסח שלכם? הכלל הפשוט: לפי מסורת המשפחה או לפי בית הכנסת שבו אתם מתפללים. קונים מתנה ולא בטוחים? נוסח ספרד ועדות המזרח הם הנפוצים בישראל, ותמיד אפשר לשאול את המשפחה – או אותנו בוואטסאפ.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '36px 0 16px' }}>
            גודל, כריכה וניקוד
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            סידור כיס נכנס לכל תיק ומתאים למי שמתפלל בדרכים; גודל בינוני הוא הסטנדרט לבית הכנסת; וסידור באותיות מוגדלות הוא הבחירה הנכונה למבוגרים. בכריכות – קשה מחזיקה שנים ומתאימה לשימוש יומיומי, רכה קלה יותר, וכריכות מהודרות (עור, דמוי עור, עיצובים מוטבעים) מתאימות למתנה. לילדים ולמתחילים כדאי לוודא שהסידור מנוקד במלואו.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '36px 0 16px' }}>
            סידור כמתנה – עם הקדשה אישית
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הטבעת שם על הכריכה, תאריך האירוע וברכה קצרה הופכות סידור רגיל למתנה אישית שנשמרת לכל החיים. זו קלאסיקה לבר מצווה ולחתן וכלה, וגם מזכרת מכובדת לאורחים באירועים – סידורים ותהילים קטנים עם הקדשה הם מהמזכרות המבוקשות ביותר לבתי כנסת ולאזכרות.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q="איך יודעים איזה נוסח מתאים לי?" a="לפי מסורת המשפחה או בית הכנסת שבו אתם מתפללים. אשכנז – ליוצאי אשכנז וליטא; ספרד – לציבור החסידי וחלק מהדתי-לאומי; עדות המזרח – ליוצאי ספרד והמזרח." />
          <FAQItem q="איזה גודל סידור הכי נוח?" a="כיס לנשיאה יומיומית, בינוני לבית הכנסת, ואותיות מוגדלות למבוגרים ולמתקשים בקריאה." />
          <FAQItem q="אפשר להוסיף הקדשה אישית?" a="כן – הטבעה או הדפסה על הכריכה של שם, תאריך וברכה. מתנה מרגשת לבר מצווה, חתונה ואירועים." />
          <FAQItem q="מה ההבדל בין סידור לתהילים?" a="הסידור מכיל את סדר התפילות היומיות; ספר תהילים מכיל את מזמורי דוד ומשמש לאמירת תהילים. באירועים רבים נהוג לחלק דווקא תהילים קטנים עם הקדשה." />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji="🧢" title="סוגי כיפות" desc="המדריך המלא לכל הסוגים" href="/madrich/sugei-kipot" />
            <RelatedCard emoji="📜" title="נוסחי הסת״ם" desc="אשכנזי, ספרדי והאר״י בכתב" href="/madrich/nosachim" />
          </div>

          <CTAStrip
            title="סידורים ותהילים בכל הנוסחים – גם עם הקדשה אישית"
            buttons={[
              { label: 'לסידורים ותהילים ←', href: '/category/ספרי קודש וסידורים', variant: 'primary' },
              { label: 'מתנות לאירועים', href: '/category/מתנות', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
