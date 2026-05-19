import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קלף משורטט – למה יש קווים חרוטים על עור המזוזה?',
  description:
    'מה זה "שרטוט" בסת"ם? למה הסופר חורץ שורות בעור לפני הכתיבה, מה ההלכה קובעת, וכיצד לזהות קלף אמיתי לעומת הדפסה לפי סימני השרטוט.',
  alternates: { canonical: `${BASE_URL}/madrich/klaf-meshurtat` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/klaf-meshurtat`,
    siteName: 'Your Sofer',
    title: 'קלף משורטט | Your Sofer',
    description: 'הסבר על "שרטוט" בסת"ם – ההלכה, המשמעות וכיצד לזהות קלף אמיתי.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קלף משורטט – למה יש קווים חרוטים על עור המזוזה?',
  description: 'הסבר על "שרטוט" בהלכות סת"ם וחשיבותו לכשרות הקלף.',
  url: `${BASE_URL}/madrich/klaf-meshurtat`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KlafMeshurtatPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="חומרי גלם"
          title="קלף משורטט"
          subtitle="למה יש קווים חרוטים על עור המזוזה – ומה זה אומר על הכשרות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            אם הסתכלתם מקרוב על קלף מקורי של מזוזה, ודאי שמתם לב לחריצים עדינים מעל ומתחת לשורות הטקסט. קונה לא מנוסה עשוי לחשוב שמדובר בפגם. למעשה, החריצים האלו הם הלכה יסודית המכונה "שרטוט" – ובלעדיהם המזוזה פסולה לחלוטין.
          </p>

          <QuoteBlock text='הלכה למשה מסיני: "מזוזה צריכה שרטוט". אם לא שורטט – הקלף פסול.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מהו השרטוט ולמה הוא הכרחי
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הסופר חורץ את הקלף לפני תחילת הכתיבה. התהליך נקרא "שרטוט". הסופר משתמש במרצע דק וחורץ שורות אופקיות בעור. חובה שהאותיות ייכתבו כשהן "נתלות" מתחת לקו השרטוט העליון, ולא יושבות מעליו כמו במחברת רגילה.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 24 }}>
            השרטוט גם תוחם גבולות ושוליים ימניים ושמאליים לקלף, מבטיח שהפסוקים מסודרים במרכז ומוקפים בשוליים חלקים המכבדים את הקדושה (קרויים "גוילים").
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שרטוט כאמצעי לזיהוי קלף אמיתי
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בתמונות מקרו איכותיות של קלפים אמיתיים ניתן לראות ממש את הצל שיוצרת התעלה הדקה של השרטוט לאורך שורות הדיו. אם קונים מזוזה אונליין ואין בה שום סימני שרטוט – מדובר כנראה בהדפסה או זיוף, שכן קלף כשר לעולם לא יגיע בלי שרטוט פיזי מורגש.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם אפשר לשרטט עם עיפרון או עט במקום מרצע?' a='בשום אופן. השרטוט חייב להיות חריטה חסרת צבע שנוצרת מלחץ פיזי על העור. שימוש בעופרת או דיו לסימון פוסל את הכתיבה.' />
          <FAQItem q='האם שרטוט קיים גם בספר תורה?' a='כן, ספר תורה גם צריך שרטוט. בספר תורה הגיליון ארוך מאוד ולכן הסופר משרטט בכלים מיוחדים לשמירת ישרות השורות לאורך מטרים.' />
          <FAQItem q='האם ניתן להרגיש את השרטוט בידיים?' a='כן. על קלף אמיתי ניתן להרגיש בעדינות את החריצים הדקים על פני העור, בייחוד בצד האחורי של הקלף.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🖐️' title='קלף עבודת יד' desc='למה קלף ידני עדיף על מכונה' href='/madrich/klaf-ivduat-yad' />
            <RelatedCard emoji='⚠️' title='זיופי סת"ם' desc='כיצד לזהות הדפסה וזיוף' href='/madrich/ziyufei-stam' />
          </div>

          <CTAStrip
            title='קלפים עם שרטוט פיזי – ראו בזום הדיגיטלי'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'מדריך הבחירה', href: '/madrich/bechira', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
