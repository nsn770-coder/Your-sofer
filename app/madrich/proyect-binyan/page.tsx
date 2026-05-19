import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'רכישת מזוזות לבניין מגורים ומוסדות – הזמנה מרוכזת',
  description:
    'קבלנים ויזמים שרוכשים עשרות מזוזות למבנה: כיצד לנהל הזמנה גדולה בשקיפות, מה ההבדל בין מזוזות לדלתות כניסה לדלתות פנים, ואיך לקבל מספר סידורי לכל קלף.',
  alternates: { canonical: `${BASE_URL}/madrich/proyect-binyan` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/proyect-binyan`,
    siteName: 'Your Sofer',
    title: 'מזוזות לפרויקטי בנייה | Your Sofer',
    description: 'מדריך לרכישה מרוכזת של מזוזות לבניינים ומוסדות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'רכישת מזוזות לבניין מגורים ומוסדות',
  description: 'כיצד קבלנים ויזמים מנהלים הזמנה מרוכזת של מזוזות לפרויקטים גדולים.',
  url: `${BASE_URL}/madrich/proyect-binyan`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function ProyectBinyanPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="פרויקטים"
          title="מזוזות לבנייה ומוסדות"
          subtitle="כיצד לנהל הזמנה גדולה של עשרות קלפים בשקיפות ובכשרות מוקפדת"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            יזמים ומנהלי רכש שמחפשים "מחיר סיטונאי זול" עלולים ליפול במלכודת של מזוזות בדיעבד או אפילו פסולות, מה שפוגע בדיירים ובמוניטין הקבלן. הזמנה מרוכזת של עשרות מזוזות מצריכה ניהול ממוחשב ומסודר.
          </p>

          <QuoteBlock text='כל קלף בהזמנה גדולה מגיע עם מספר סידורי, דוח סריקה וחשבונית מס – לא שק אנונימי.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            אסטרטגיית הרכש לפרויקט
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'דלתות כניסה ושערים',
                color: '#1E3A8A',
                bg: '#f0f4ff',
                items: ['מזוזות גדולות 12-15 ס"מ', 'רמת הידור גבוהה', 'בתי מזוזה מרשימים', 'תעודת כשרות נפרדת'],
              },
              {
                title: 'דלתות פנים הדירות',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['מזוזות 10-12 ס"מ', 'כשרות מוקפדת בסיסית', 'תקציב סביר לדירה', 'אריזה ואחסון קבוצתי'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>✓</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם אפשר להזמין גם בתי מזוזה בהתאמה לקו העיצובי של הפרויקט?' a='כן. ניתן לבצע הזמנה מרוכזת של בתי מזוזה ממותגים מאלומיניום או פרספקס, שיותאמו ספציפית לצבע הדלתות של הפרויקט.' />
          <FAQItem q='מהו זמן האספקה להזמנה של 50 קלפים ומעלה?' a='תלוי במלאי הקיים. בפרויקטים גדולים שמוזמנים עם תיאום מוקדם, ניתן לספק בתוך שבועות ספורים בסיוע מספר סופרים.' />
          <FAQItem q='כיצד מנהלים מעקב אחר תקינות כל קלף בהזמנה גדולה?' a='כל קלף מקבל מספר סידורי אישי, תמונה ייחודית ודוח בדיקת מחשב. מנהל הפרויקט מקבל קובץ Excel מרוכז עם כל הפרטים.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='📏' title='גודל המזוזה' desc='10, 12, 15 ס"מ – מה ההבדל?' href='/madrich/godel-mezuza' />
            <RelatedCard emoji='🏠' title='סוגי בתי מזוזה' desc='חומרים ועיצובים לכל דלת' href='/madrich/batei-mezuza' />
          </div>

          <CTAStrip
            title='רכישה מוסדית – צרו קשר לפרויקט שלכם'
            buttons={[
              { label: 'ליצירת קשר ←', href: '/contact', variant: 'primary' },
              { label: 'לגלריית הקלפים', href: '/', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
