import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תיוג סת"ם – סוד הכתרים מעל האותיות ומדוע הם מייקרים את הקלף',
  description:
    'מה זה "תגים" בסת"ם? אילו 7 אותיות חייבות שלושה כתרים, מה הפסול אם תג נוגע בתג שלידו, ומדוע תיוג מושלם מאריך את הכתיבה בשעות.',
  alternates: { canonical: `${BASE_URL}/madrich/tiyug-stam` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tiyug-stam`,
    siteName: 'Your Sofer',
    title: 'תיוג סת"ם | Your Sofer',
    description: 'הסבר על תגים בסת"ם – שעטנ"ז ג"ץ, כללי התיוג וחשיבותם.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תיוג סת"ם – סוד הכתרים מעל האותיות',
  description: 'הסבר מלא על תגים בסת"ם – אילו אותיות חייבות תגים, הכללים ומה פוסל.',
  url: `${BASE_URL}/madrich/tiyug-stam`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TiyugStamPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="אמנות הכתיבה"
          title='תיוג סת"ם'
          subtitle='הכתרים המסתוריים מעל האותיות – הלכה, קבלה ואמנות בתנועה אחת של קולמוס'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            אחד המאפיינים הבולטים ביותר בכתב הסת"ם הוא ה"תיוג" – עיטור של ראשי האותיות בכתרים קטנים. הכתרים האלו אינם סתם אלמנט עיצובי. בעולם הסת"ם, לכל תג יש משמעות הלכתית קריטית – ופגיעה בתג יכולה לפסול קלף שלם.
          </p>

          <QuoteBlock text='שבע אותיות שעטנ"ז ג"ץ חייבות שלושה תגים כל אחת. זוהי הלכה למשה מסיני.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            אותיות שעטנ"ז ג"ץ – ומה חייב בשלושה תגים
          </h2>

          <div style={{ background: '#f0f4ff', border: '1px solid #1E3A8A33', borderRadius: 10, padding: '24px', margin: '16px 0 32px' }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#1E3A8A', marginBottom: 16, textAlign: 'center' }}>ש ע ט נ ז ג ץ</div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, textAlign: 'center' }}>
              שבע אותיות אלו חייבות כל אחת שלושה תגים (כתרים) מעל ראשן. אותיות אחרות מקבלות תג אחד בלבד לפי המנהג.
            </p>
          </div>

          {[
            { title: 'חוקי התיוג', desc: 'הסופר משתמש בקצה הדק ביותר של הקולמוס כדי למשוך קווים זעירים. כל כתר חייב לגעת בדיוק בראש האות אך לא ייגע בכתר שלידו.' },
            { title: 'פסולי דיבוק', desc: 'נגיעה בין תגים של אותיות שונות פוסלת את המזוזה מיד. זוהי אחת הסיבות הנפוצות ביותר לפסילת קלפים בבדיקה ממוחשבת.' },
            { title: 'ממד קבלי', desc: 'על פי סודות הקבלה, התגים מושכים השפעות רוחניות עליונות שאינן קיימות באות עצמה. סופר חסיד מייחס לתגים חשיבות רוחנית מיוחדת.' },
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
          <FAQItem q='האם אפשר לקנות מזוזה בלי תגים כדי לחסוך?' a='לא. מזוזה ללא תגי שעטנ"ז ג"ץ פסולה לכתחילה. יש אותיות אחרות שתיוגן הוא הידור בלבד, אך שעטנ"ז ג"ץ הם חובה מוחלטת.' />
          <FAQItem q='האם יש מקצוע נפרד של "מתייג"?' a='כן, בספרי תורה ארוכים לעיתים יש מתייג ייעודי. אך במזוזה ובתפילין לרוב הסופר מתייג בעצמו תוך כדי כתיבה.' />
          <FAQItem q='מה קורה אם תג אחד נוגע בתג של האות שלידו?' a='נגיעה בין תגים פוסלת את המזוזה מיד. בחלק מהמקרים מגיה מוסמך יכול להפריד בעדינות, בתנאי שלא עוברים על "חק תוכות".' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🔤' title='אותיות ותגים' desc='סודות האותיות בסת"ם' href='/madrich/otiyot-vetaguim' />
            <RelatedCard emoji='🪶' title='הקולמוס' desc='הכלים שבהם נכתבת הקדושה' href='/madrich/kulmus' />
          </div>

          <CTAStrip
            title='קלפים עם תיוג מושלם – ראו בזום'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'שאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
