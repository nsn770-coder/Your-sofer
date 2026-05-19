import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קלף עבודת יד מול קלף מכונה – למה זה משנה?',
  description:
    'מה ההבדל בין קלף עבודת יד לקלף מכונה בסת"ם? ההשלכות ההלכתיות, איכותיות, ולמה הבחירה משפיעה על כשרות המזוזה.',
  alternates: { canonical: `${BASE_URL}/madrich/klaf-ivduat-yad` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/klaf-ivduat-yad`,
    siteName: 'Your Sofer',
    title: 'קלף עבודת יד מול קלף מכונה | Your Sofer',
    description: 'ההבדל בין קלף עבודת יד לקלף מכונה – הלכה, איכות, ומחיר.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קלף עבודת יד מול קלף מכונה – למה זה משנה?',
  description: 'הסבר מקיף על סוגי הקלף בסת"ם והשלכותיהם ההלכתיות.',
  url: `${BASE_URL}/madrich/klaf-ivduat-yad`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KlafIvduatYadPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="חומר הגלם"
          title="קלף עבודת יד מול קלף מכונה"
          subtitle="למה הבחירה בחומר הגלם משפיעה על כשרות, איכות, ואורך החיים של המזוזה"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            קלף הוא עור הבהמה שעליו נכתבים כל פריטי הסת"ם. לא כל קלף שווה – יש הבדל משמעותי בין קלף שעובד לגמרי בידי אדם לבין קלף שחלק מעיבודו נעשה במכונה.
          </p>

          <QuoteBlock text='הקלף הוא הבית של הקדושה – חשוב לבחור אותו בקפידה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה זה בכלל "קלף"?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            קלף (גוויל) הוא עור בהמה טהורה (בדרך כלל פרה, עגל, עז או כבש) שעבר עיבוד מיוחד לשם כתיבת סת"ם. תהליך עיבוד הקלף כולל: הסרת שיער, הכשרה לשם מצווה, מתיחה, ייבוש, ולעיתים שימוש בסיד ואמצעים נוספים.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            ההבדל בין עבודת יד למכונה
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'קלף עבודת יד',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: [
                  'כל תהליך העיבוד נעשה ביד',
                  'הכשרה לשם מצווה על ידי אדם',
                  'עובי אחיד יותר',
                  'עמידות גבוהה יותר לאורך זמן',
                  'מחיר גבוה יותר',
                  'מהודר ועדיף לכתחילה',
                ],
              },
              {
                title: 'קלף מכונה',
                color: '#0e6ba8',
                bg: '#e8f4fd',
                items: [
                  'חלק מהעיבוד נעשה בתהליך תעשייתי',
                  'לדעת רוב הפוסקים – כשר בדיעבד',
                  'עלות נמוכה יותר',
                  'איכות אחידה פחות',
                  'יש פוסקים שפוסלים לכתחילה',
                  'נפוץ בשוק ההמוני',
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

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            ההשלכות ההלכתיות
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            לעיבוד הקלף יש חשיבות הלכתית. ההלכה דורשת שהעיבוד יֵעשה "לשם קדושת סת"ם" – כלומר, האדם המעבד צריך לכוון בדעתו שהקלף מיועד לכתיבת מזוזה, תפילין או ספר תורה. כשמכונה מעבדת את הקלף, יש שאלה אם "כוונת מכונה" מספקת.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            רוב הפוסקים מתירים קלף מכונה בדיעבד, אך לכתחילה עדיף קלף עבודת יד – בייחוד לתפילין ולמזוזת הפתח הראשי.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            השפעה על אורך חיי המזוזה
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            קלף איכותי עמיד יותר לשינויי לחות וטמפרטורה. מזוזה שנכתבה על קלף ירוד עלולה להתכווץ, להיסדק, ולהפסל תוך שנים בודדות. קלף עבודת יד מאיכות גבוהה יכול לשמור על המזוזה לעשרות שנים.
          </p>

          {[
            { title: 'אחסון בתוך הבית', desc: 'קלף שמאוחסן בבית בתנאים רגילים יחזיק מעמד שנים רבות אם האיכות גבוהה.' },
            { title: 'חשיפה לחוץ', desc: 'מזוזה שנמצאת בחוץ (שער, מרפסת) חשופה לרוח, גשם, וקרינה. קלף איכותי עמיד יותר.' },
            { title: 'בדיקה תקופתית', desc: 'גם קלף מעולה דורש בדיקה כל כמה שנים – תנאי מזג האוויר משפיעים על כולם.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <span style={{ color: '#C5A028', fontSize: 20, flexShrink: 0 }}>✦</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <QuoteBlock text='קלף טוב הוא השקעה ארוכת טווח – מזוזה על קלף ירוד תדרוש החלפה מהר יותר.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך יודעים אם הקלף הוא עבודת יד?' a='שאלו את הסופר ישירות ובקשו לדעת ממי רכש את הקלף. יש בתי מלאכה ידועים שמייצרים קלף עבודת יד – שמות הבתים מוכרים בקהילת הסת"ם.' />
          <FAQItem q='האם ניתן לראות את ההבדל בעין?' a='לעיתים כן – קלף עבודת יד לעיתים שונה בצבעו ובמרקמו. אבל ההבדל האמיתי אינו תמיד ויזואלי, אלא בתהליך העיבוד.' />
          <FAQItem q='מה זה "גוויל"?' a='גוויל הוא שם נרדף לקלף, אך לעיתים מתייחס ספציפית לסוג קלף שעובד בצורה מסוימת (צד השיער). נהוג בכתיבת ספרי תורה בנוסחים מסוימים.' />
          <FAQItem q='האם כדאי לשלם יותר על קלף עבודת יד?' a='בהחלט, בייחוד לתפילין ולמזוזת הכניסה הראשית. ההפרש במחיר לא גדול יחסית לסך כל עלות הסת"ם, אבל ההשפעה על הכשרות והאורך חשובה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🔬' title='האותיות והתגים' desc='מה עוד משפיע על כשרות' href='/madrich/otiyot-vetaguim' />
            <RelatedCard emoji='⭐' title='מה זה מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
          </div>

          <CTAStrip
            title='רוצים קלפים על קלף עבודת יד?'
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
