import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'הזמנת סת"ם לחו"ל – שילוח בינלאומי מאובטח',
  description:
    'כיצד מזמינים מזוזות ותפילין מישראל לחו"ל בבטחה? אריזה עמידה לחום ולחות, ביטוח, מעקב אחר המשלוח ומה לעשות עם מכס.',
  alternates: { canonical: `${BASE_URL}/madrich/mishloach-lachul` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/mishloach-lachul`,
    siteName: 'Your Sofer',
    title: 'הזמנת סת"ם לחו"ל | Your Sofer',
    description: 'מדריך לשילוח בינלאומי של סת"ם – אריזה, ביטוח ומעקב.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'הזמנת סת"ם לחו"ל – שילוח בינלאומי מאובטח',
  description: 'כיצד לשלוח סת"ם מישראל לחו"ל בבטחה מלאה – אריזה, ביטוח ומכס.',
  url: `${BASE_URL}/madrich/mishloach-lachul`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MishloachLachulPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="שילוח בינלאומי"
          title='הזמנת סת"ם לחו"ל'
          subtitle='איך מגיע קלף מישראל לניו יורק בשלמות – אריזה, ביטוח ומעקב'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            המהפכה הדיגיטלית מאפשרת להזמין תשמישי קדושה ישירות מישראל לכל בית בעולם. שילוח בינלאומי של סת"ם שונה משילוח בגדים – קלף ודיו רגישים לשינויי אקלים, במיוחד באחסון בבטן המטוס. לכן אריזה מקצועית היא קריטית.
          </p>

          <QuoteBlock text='אריזה נכונה מוציאה את הקלף מישראל בריא – וכך הוא מגיע לדלת הלקוח.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            פרוטוקול אריזה נכון לשילוח בינלאומי
          </h2>

          {[
            { num: 1, title: 'אטימה לחותית', desc: 'כל קלף עובר איטום ואקום עדין (ניילון נצמד המיועד לסת"ם) מיד לאחר הבדיקה הסופית. זה מגן מפני שינויי לחות בטיסה.' },
            { num: 2, title: 'אריזה קשיחה', desc: 'תפילין נארזות בתוך מגני קלקר ייעודיים, ומזוזות בתוך שרוולי פלסטיק עבים. הקשיחות מגנה מפני לחצים ומכות בזמן הובלה.' },
            { num: 3, title: 'שילוח אקספרס מבוטח', desc: 'חברות שילוח אקספרס בינלאומיות מבטיחות מסירה תוך 3-5 ימי עסקים, ביטוח מלא ומעקב דיגיטלי צמוד.' },
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
            שאלות נפוצות
          </h2>
          <FAQItem q='האם צריך לשלם מכס על קבלת סת"ם בארה"ב או אירופה?' a='פריטי דת נהנים לעתים מפטורים מכסוניים במדינות רבות, אך מס יבוא סטנדרטי עשוי לחול. מומלץ לבדוק עם המשלחת ביחס לחוקי המדינה הספציפית.' />
          <FAQItem q='האם מכשירי רנטגן בשדה תעופה פוגעים במזוזה?' a='לא. סורקי רנטגן סטנדרטיים אינם מייצרים חום או קרינה שמשפיעים על הדיו האורגני. הפריטים נשארים כשרים לחלוטין.' />
          <FAQItem q='כמה זמן לוקח שילוח מישראל לחו"ל?' a='בשילוח אקספרס – לרוב 3-5 ימי עסקים לארה"ב ואירופה. שילוח רגיל – שבועיים עד שלושה שבועות, אך לא מומלץ לפריטי קלף רגישים.' />
          <FAQItem q='מה קורה אם החבילה אבדה או נפגעה?' a='חבילות עם ביטוח מלא מכוסות לשווי המלא. אצל ספק מהימן, כל משלוח כזה מגיע עם תעודת ביטוח ומספר מעקב.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🛡️' title='קניית סת"ם אונליין' desc='4 סימני אמינות לבדיקה' href='/madrich/knia-online' />
            <RelatedCard emoji='⚠️' title='זיופי סת"ם' desc='ממה להיזהר ברשת' href='/madrich/ziyufei-stam' />
          </div>

          <CTAStrip
            title='הביאו קדושה מישראל לביתכם'
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
