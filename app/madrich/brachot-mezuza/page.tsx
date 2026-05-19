import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'הלכות ברכות קביעת מזוזה – מתי מברכים ומתי לא?',
  description:
    'האם מברכים על כל דלת בנפרד? מה עושים אחרי בדיקה שחזרתם ממנה? ומתי השוכר מברך? הלכות ברכות קביעת מזוזה במקרים נפוצים.',
  alternates: { canonical: `${BASE_URL}/madrich/brachot-mezuza` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/brachot-mezuza`,
    siteName: 'Your Sofer',
    title: 'הלכות ברכות מזוזה | Your Sofer',
    description: 'מדריך מעשי לברכות קביעת מזוזה – מתי מברכים ומתי לא.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'הלכות ברכות קביעת מזוזה – מתי מברכים ומתי לא?',
  description: 'הלכות ברכות קביעת מזוזה לפי מקרים שונים – דירה חדשה, החלפת קלף ושוכר.',
  url: `${BASE_URL}/madrich/brachot-mezuza`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BrachotMezuzaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="הלכה מעשית"
          title="ברכות קביעת מזוזה"
          subtitle="ברכה אחת פוטרת את כל הבית – ומתי חייבים לברך שוב?"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הברכה על המזוזה, "אשר קדשנו במצוותיו וציוונו לקבוע מזוזה", היא הצהרה רוחנית על קיום המצווה. כלל יסוד: <strong>ברכה אחת על הדלת הראשונה פוטרת את כל שאר דלתות הבית</strong> – אך בתנאי שהקביעה נעשית ברצף, ללא הפסק.
          </p>

          <QuoteBlock text='הברכה הראשונה על דלת הכניסה פוטרת את כל הבית – בתנאי שמשנה לא תפסיק לדבר שיחת חולין.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מקרים נפוצים ומה הדין
          </h2>

          {[
            { title: 'דירה חדשה – קביעה ראשונה', desc: 'מברכים על הדלת הראשית ומיד ממשיכים לכל שאר הדלתות ברצף ללא הפסק. הברכה הראשונה פוטרת הכל.' },
            { title: 'הסרה לבדיקה ממושכת', desc: 'אם שלחתם את המזוזות לבדיקת מחשב ומגיה (כמה ימים), ועכשיו מחזירים – לפי רוב הפוסקים יש לברך מחדש, שכן חל נתק משמעותי במצווה.' },
            { title: 'החלפת קלף פסול', desc: 'אם הורדתם קלף פסול ומיד הכנסתם קלף חדש מהודר – מברכים על קביעת המזוזה החדשה.' },
            { title: 'שוכר דירה', desc: 'שוכר דירה חייב לקבוע מזוזה בברכה, בדיוק כמו בעל בית.' },
            { title: 'הוספת חדרים חדשים', desc: 'אם שיפצתם ובניתם חדרים חדשים שלא היו קודם – מברכים ברכה חדשה על המזוזות החדשות, גם אם מזוזת הכניסה כבר מותקנת.' },
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
          <FAQItem q='מה קורה אם דיברתי בטעות בין הדלת הראשונה לאחרת?' a='אם דיברת שיחת חולין, לפי פוסקים מסוימים הברכה הראשונה לא פוטרת יותר, ותצטרך לברך שוב על הדלת הבאה.' />
          <FAQItem q='האם אישה יכולה לקבוע מזוזה ולברך?' a='בהחלט. אישה מחויבת במצוות מזוזה ויכולה לברך ולקבוע בעצמה לכתחילה.' />
          <FAQItem q='האם מברכים על מזוזה בעסק?' a='ברוב מקרי העסק קובעים ללא ברכה, מאחר שאין "בית דירה" מובהק. אם בעל העסק ישן שם – יש להתייעץ עם פוסק.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='📿' title='קביעת מזוזה' desc='מדריך שלב אחר שלב' href='/madrich/kviyas-mezuza' />
            <RelatedCard emoji='🔍' title='בדיקת מזוזות' desc='מתי לבדוק ואיך' href='/madrich/bdika-mezuzot' />
          </div>

          <CTAStrip
            title='כל שאלה הלכתית – ייעוץ מומחה'
            buttons={[
              { label: 'ליצירת קשר ←', href: '/contact', variant: 'primary' },
              { label: 'שאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
