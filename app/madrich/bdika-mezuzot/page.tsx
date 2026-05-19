import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'בדיקת מזוזות ותפילין – מתי צריך לבדוק ומה ההבדל בין מחשב לאדם',
  description:
    'כמה פעמים צריך לבדוק מזוזות? ההבדל בין בדיקת מחשב לבדיקת מגיה אנושי, מתי מחליפים מזוזה, ואיך שומרים על כשרות לאורך שנים.',
  alternates: { canonical: `${BASE_URL}/madrich/bdika-mezuzot` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/bdika-mezuzot`,
    siteName: 'Your Sofer',
    title: 'בדיקת מזוזות ותפילין | Your Sofer',
    description: 'מתי לבדוק מזוזות, ומה ההבדל בין בדיקת מחשב לבדיקת מגיה.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'בדיקת מזוזות ותפילין – מתי צריך לבדוק ומה ההבדל',
  description: 'מדריך מקיף לבדיקת מזוזות ותפילין – תדירות, שיטות ומה לחפש.',
  url: `${BASE_URL}/madrich/bdika-mezuzot`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BdikaMezuzotPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="בדיקה תקופתית"
          title="בדיקת מזוזות ותפילין"
          subtitle="מתי לבדוק, שילוב מחשב ואדם, ומה עושים כשמוצאים בעיה"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            רבים מאיתנו בטוחים שברגע שרכשנו מזוזות כשרות, המשימה הושלמה לתמיד. אך האמת ההלכתית שונה: קלף המזוזה עשוי מחומר אורגני (עור ודיו) המושפע מתנאי הסביבה. לחות, חום, קור ותנאי מזג האוויר עלולים לגרום לדיו להיסדק ולמזוזה להיפסל – מבלי שאף אחד יבחין מבחוץ.
          </p>

          <QuoteBlock text='מזוזה פסולה שאינה בדוקה אינה מגינה – ואינה מקיימת את המצווה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מתי צריך לבדוק?
          </h2>

          {[
            { title: 'פעמיים בשבע שנים', desc: 'החיוב ההלכתי הבסיסי – כלומר כל 3.5 שנים בממוצע. מזוזה חיצונית החשופה למזג אוויר: כל שנה-שנתיים.' },
            { title: 'לאחר לחות או נזק', desc: 'מזוזה שנרטבה, נחשפה לחום קיצוני (בצד שמש), או הושפעה מנזק פיזי – יש לבדוק מיד.' },
            { title: 'בכניסה לדירה חדשה', desc: 'מזוזות שהשאיר הדייר הקודם – יש לבדוק לפני השימוש. אל תסמכו על מוניטין הדייר הקודם.' },
            { title: 'לאחר בעיות בבית', desc: 'מסורת יהודית: כאשר בבית יש מחלה, תאונה או ירידה בפרנסה – כדאי לבדוק מזוזות.' },
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
            שתי שיטות הבדיקה – ולמה צריך שתיהן
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'בדיקת מחשב',
                color: '#0e6ba8',
                bg: '#e8f4fd',
                items: [
                  'סריקה ממוחשבת של האותיות',
                  'מזהה אותיות דבוקות וחסרות',
                  'מאה אחוז דיוק גרפי',
                  'אינה מתעייפת',
                  'אינה מבינה הלכה',
                ],
              },
              {
                title: 'בדיקת מגיה (אנושית)',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: [
                  'מגיה מוסמך על כל מילה',
                  'בודק שינויי צורה הלכתיים',
                  'מזהה אות שנראית כאחרת',
                  'מכיר מציאות הלכתית',
                  'בלעדי – לא ניתן להחליף',
                ],
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

          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בדיקה ללא שילוב של שניהם אינה בדיקה שלמה. המחשב מגלה פגמים גרפיים שהעין הרואה מתעייפת ומפספסת. המגיה האנושי מבין הלכה ומזהה אות שנראית כאות אחרת – דבר שהמחשב יאשר כתקין.
          </p>

          <QuoteBlock text='הסופר כותב את הקדושה – המגיה שומר עליה לאורך הדורות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='כמה זמן לוקח תהליך בדיקת מזוזות?' a='בדיקה מקצועית משולבת (מחשב + מגיה) לוקחת בדרך כלל ימים בודדים מרגע קבלת הקלפים. הקלפים נסרקים, נבדקים ומוחזרים עם דוח מפורט.' />
          <FAQItem q='מה עושים אם המזוזה נמצאה פסולה?' a='מזוזה פסולה יש להחליף מיד. לעיתים ניתן לתקן פגמים קלים – אך זאת רק בהחלטת מגיה מוסמך. לא תמיד ניתן לתקן (עניין "כסדרן").' />
          <FAQItem q='איך שומרים על המזוזה מפני לחות?' a='מומלץ לעטוף את קלף המזוזה בניילון נצמד לפני הכנסה לבית המזוזה, ולוודא שבית המזוזה אטום לחלוטין – בייחוד בדלתות חיצוניות.' />
          <FAQItem q='האם תפילין צריכות בדיקה?' a='תפילין שמורות במקום יבש ומונחות באופן קבוע – לא חייבות בדיקה מדין. אבל מומלץ לבדוק כל כמה שנים, ובוודאי אחרי חשיפה לחום, לחות או נפילה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🖐️' title='קלף עבודת יד' desc='למה איכות הקלף משפיעה על העמידות' href='/madrich/klaf-ivduat-yad' />
            <RelatedCard emoji='🔍' title='תהליך הבדיקה' desc='איך נבדקת כל מזוזה' href='/madrich/bedika' />
          </div>

          <CTAStrip
            title='רוצים לבדוק מזוזות?'
            buttons={[
              { label: 'לצור קשר ←', href: '/contact', variant: 'primary' },
              { label: 'לשאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
