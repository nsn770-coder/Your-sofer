import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'למה לקנות סת"ם בפלטפורמה דיגיטלית? הסטנדרט החדש בעולם הסת"ם',
  description:
    'מה ההבדל בין חנות סת"ם רגילה לפלטפורמה דיגיטלית? צילום אישי לכל קלף, זום דיגיטלי, שרשרת אחריות מלאה ואחריות כשרות לכל החיים – ההסבר המלא.',
  alternates: { canonical: `${BASE_URL}/madrich/lamah-your-sofer` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/lamah-your-sofer`,
    siteName: 'Your Sofer',
    title: 'למה לקנות סת"ם דיגיטלי? | Your Sofer',
    description: 'היתרונות של פלטפורמת סת"ם דיגיטלית: שקיפות, תיעוד מלא ואחריות לכל החיים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'למה לקנות סת"ם בפלטפורמה דיגיטלית? הסטנדרט החדש',
  description: 'השוואה בין חנות סת"ם מסורתית לפלטפורמה דיגיטלית – שקיפות, תיעוד ואחריות.',
  url: `${BASE_URL}/madrich/lamah-your-sofer`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function LamahYourSoferPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="שקיפות דיגיטלית"
          title="הסטנדרט החדש בעולם הסת&quot;ם"
          subtitle="מהו ההבדל בין חנות סת&quot;ם ישנה לפלטפורמה דיגיטלית שקופה - ולמה זה חשוב לכם"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            עד לפני שנים ספורות, רכישת מזוזה או תפילין דרשה "אמון עיוור": נכנסת לחנות פיזית, משלם סכום גבוה, ומקבל גליל קלף סגור שלא ראית מעולם – עם הבטחה בעל פה. חוסר השקיפות הזה הוביל לבעיות חמורות בתעשייה. הדור החדש של פלטפורמות הסת"ם הדיגיטליות קם בדיוק כדי לפתור כאב זה: שקיפות מוחלטת, חיבור ישיר לסופר, וביטחון הלכתי ודיגיטלי.
          </p>

          <QuoteBlock text='לא צריך לסמוך על מילים. בפלטפורמה דיגיטלית – רואים בדיוק מה קונים, מי כתב, ומה הבדיקות שעבר.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            חנות מסורתית מול פלטפורמה דיגיטלית
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'חנות סת"ם מסורתית',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['מלאי אנונימי ממחסן', 'תמונות גנריות מהאינטרנט', 'לא ניתן לבדוק את הסופר', 'אין תיעוד שרשרת אספקה', 'אחריות מינימלית בעל פה'],
              },
              {
                title: 'פלטפורמה דיגיטלית',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['צילום אישי לכל קלף', 'זום דיגיטלי לכל אות ותג', 'פרופיל סופר עם תעודות', 'שרשרת אספקה מתועדת מלאה', 'אחריות כשרות לכל החיים'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>{c.title.includes('דיגיטלית') ? '✓' : '✗'}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שרשרת האחריות המלאה
          </h2>

          {[
            { title: 'הסופר', desc: 'סופר כותב בביתו בריכוז ובכוונה. לאחר הכתיבה מעביר את הקלף לבדיקה עצמאית - הסופר אינו גם המוכר, מה שמבטל ניגוד עניינים.' },
            { title: 'הבדיקה והתיעוד', desc: 'הקלף נסרק בבדיקת מחשב אוטומטית, ולאחר מכן עובר הגהה על ידי מגיה מומחה. רק לאחר אישור כפול הקלף עולה לאתר תחת פרופיל הסופר.' },
            { title: 'הרכישה', desc: 'הלקוח רואה תמונה אמיתית, בוחר בעצמו, ומשלם אונליין בצורה מאובטחת. ה"יצירה" שבחר היא יחידה - ברגע שנרכשת, יורדת מהאוויר ואינה זמינה לאחר.' },
            { title: 'המשלוח והאחריות', desc: 'הקלף נאטם בוואקום, נארז הרמטית ונשלח עם תעודת אחריות עולמית לכל החיים על כשרות הקלף הכתוב, כל עוד נשמר בתנאים סבירים.' },
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
          <FAQItem q='מה קורה אם רב אחר בודק את הקלף ומחליט שהוא פסול?' a='פלטפורמות מובילות עומדות מאחורי המוצרים ב-100%. אם סמכות הלכתית מוסמכת מצאה פגם שמקורו בסופר – הקלף יוחלף מיידית בחדש, ללא עלות, במסגרת האחריות.' />
          <FAQItem q='כיצד ניתן להיות בטוח שהמזוזה לא נמכרה כבר למישהו אחר?' a='מערכת המלאי החי (Live Inventory) מעדכנת בזמן אמת. ברגע שלקוח מוסיף קלף ייחודי לסל ומשלם – הקלף יורד מהאוויר ואינו זמין לאחרים. כל קלף הוא "אחד ויחידה".' />
          <FAQItem q='האם ניתן לפגוש את הסופר לפני הרכישה?' a='ברוב הפלטפורמות הדיגיטליות ניתן לשאול שאלות ישירות לסופר דרך המערכת. חלק מהסופרים מרשים גם ביקורים ואפילו צפייה בתהליך הכתיבה עצמו.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='סופר ברוח טובה' desc='כלכלה הוגנת ואיכות כתיבה' href='/madrich/sofer-ruach' />
            <RelatedCard emoji='🔍' title='בדיקת מזוזות' desc='תהליך הבדיקה הדיגיטלית' href='/madrich/bdika-mezuzot' />
          </div>

          <CTAStrip
            title='השקיפות המלאה – בלחיצת כפתור'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'הכירו את הסופרים', href: '/madrich/soferim', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
