import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מתנה לחתן – איך בוחרים סט טלית ותפילין יוקרתי?',
  description:
    'כיצד בוחרים סט חתן מכובד? טלית, תפילין, נרתיקי קטיפה ורקמה אישית. מה הדרישות ההלכתיות ומה מקובל לפי מנהגי כל עדה.',
  alternates: { canonical: `${BASE_URL}/madrich/set-chatan` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/set-chatan`,
    siteName: 'Your Sofer',
    title: 'מתנה לחתן – סט טלית ותפילין | Your Sofer',
    description: 'מדריך לבחירת סט חתן מפואר – טלית, תפילין ונרתיקים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מתנה לחתן – סט טלית ותפילין יוקרתי',
  description: 'כיצד לבחור סט חתן מכובד הכולל תפילין, טלית ונרתיקים עם רקמה אישית.',
  url: `${BASE_URL}/madrich/set-chatan`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function SetChatanPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מתנת אירוסין"
          title="מתנה לחתן"
          subtitle="סט טלית ותפילין יוקרתי – כיצד לבחור מתנה שמשדרת הדר, כבוד וקדושה"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            המסורת מחייבת את משפחת הכלה להעניק לחתן מתנה בעלת ערך רוחני עצום: סט חתן הכולל טלית מפוארת, נרתיקים מעוצבים ולעיתים גם תפילין מהודרות חדשות. בחירת הסט אינה רק עניין כספי – מדובר בסמל לכבוד שהמשפחה רוחשת לחתן ולציפיות הרוחניות מהבית החדש.
          </p>

          <QuoteBlock text='חובה לברר את מנהג משפחת החתן לפני הרכישה: כתב ספרדי, אשכנזי, או האר"י?' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            רכיבי סט החתן האידיאלי
          </h2>

          {[
            { title: 'טלית חתן מפוארת', desc: 'טלית מצמר רחלים טהור, לרוב בעלת עיטורים מכספים (במגזר המסורתי) או פסים לבנים/שחורים קלאסיים (במגזר החרדי). חובה לוודא 100% צמר טהור עם חותמת נגד שעטנז.' },
            { title: 'נרתיקי קטיפה או עור', desc: 'כיסויים איכותיים לטלית ולתפילין עם רקמה בהתאמה אישית של שם החתן. רקמה של ברכה "מכלה לחתן" על הנרתיק הפנימי היא תוספת מומלצת ומקובלת.' },
            { title: 'תפילין ברמת הידור רב', desc: 'אם משפחת הכלה קונה תפילין, חובה שיהיו ברמת "הידור הרב" – עור בהמה גסה עם פרשיות שנכתבו בסגנון הכתיבה התואם לעדת החתן.' },
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
          <FAQItem q='מתי מקובל להעניק את הסט לחתן?' a='ברוב העדות הסט מוענק במסיבת האירוסין או סמוך לחתונה – בשבת חתן או כמתנה אישית מהכלה ביום חופתם.' />
          <FAQItem q='האם אפשר לרקום על הנרתיק ברכה אישית?' a='בהחלט. רקמה של שם החתן או ברכה מיוחדת על הנרתיק הפנימי היא תוספת מומלצת ומקובלת מאוד.' />
          <FAQItem q='האם חובה לקנות תפילין חדשות לחתן?' a='לא חובה. אם לחתן יש תפילין כשרות ומהודרות ממשפחתו, אפשר להסתפק בטלית ונרתיקים מפוארים. התייעצו עם החתן עצמו.' />
          <FAQItem q='כמה זמן לפני החתונה להזמין?' a='מומלץ לפחות חודש-חודשיים מראש, כדי לאפשר רקמה אישית בזמן ומשלוח נוח.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎁' title='מתנה לחנוכת בית' desc='מדריך לבחירת מזוזה כמתנה' href='/madrich/matana-chanuka-bayit' />
            <RelatedCard emoji='🏷️' title='מחירי סת"ם' desc='מה מרכיב מחיר הוגן' href='/madrich/michrei-soferim' />
          </div>

          <CTAStrip
            title='מחפשים סט חתן מפואר?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'ליצירת קשר', href: '/contact', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
