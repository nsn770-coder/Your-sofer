import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'סופר ירא שמיים – למה זה קריטי לכשרות הסת"ם',
  description:
    'מדוע יראת שמיים של הסופר היא התכונה החשובה ביותר בסת"ם? מה זה "כתיבה לשמה", מה פוסל מזוזה מבחינה רוחנית, ואיך מוודאים שהסופר ירא שמיים.',
  alternates: { canonical: `${BASE_URL}/madrich/yirat-shamayim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/yirat-shamayim`,
    siteName: 'Your Sofer',
    title: 'סופר ירא שמיים בסת"ם | Your Sofer',
    description: 'למה יראת שמיים של הסופר קובעת את כשרות הסת"ם.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מה הופך סופר סת"ם לירא שמיים ולמה זה קריטי לכשרות',
  description: 'הסבר על חשיבות יראת השמיים בכתיבת סת"ם ומה זה אומר מבחינה הלכתית.',
  url: `${BASE_URL}/madrich/yirat-shamayim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function YiratShamayimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="הממד הרוחני"
          title='סופר ירא שמיים בסת"ם'
          subtitle='למה יראת שמיים קובעת את כשרות הסת"ם – גם כשהכתב נראה מושלם'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            בעולם המסחר המודרני אנחנו בוחנים את התוצאה הסופית: האם המוצר עובד? האם הכתב יפה? אבל בעולם הסת"ם ישנו ממד נסתר שהוא קריטי לחלוטין – הממד הרוחני של הכותב. תפילין, מזוזות וספרי תורה שנכתבו על ידי מי שאינו מאמין או אינו מחויב להלכה – פסולים לחלוטין, גם אם האותיות נראות יפהפיות ומושלמות.
          </p>

          <QuoteBlock text='כתב יפה יכול להטעות. יראת השמיים של הסופר היא מה שקובע את קדושת הקלף.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה זה "כתיבה לשמה"?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתיבת מזוזה או תפילין דורשת מהסופר ריכוז פנימי עמוק וכוונות מוגדרות. לפני כתיבת כל שם משמות ה' הסופר חייב לעצור, לומר בפה מלא: "הריני כותב לשם קדושת השם", ולכוון את ליבו לקדושה. אם כתב את שם ה' ללא כוונה זו – המזוזה כולה פסולה ואין שום דרך לתקן בדיעבד.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מכיוון שאף אחד אינו עומד מעל ראשו של הסופר בכל רגע, הכשרות תלויה לחלוטין ביושרתו הפנימית ובמחויבותו הרוחנית.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            חובות הסופר במהלך הכתיבה
          </h2>

          {[
            { title: 'כתיבה לשמה', desc: 'כל תהליך הכתיבה חייב להיעשות מתוך כוונה מפורשת לקיים את מצוות כתיבת מזוזה או תפילין.' },
            { title: 'קידוש השמות', desc: 'לפני כל שם ה', הסופר עוצר, מכוון מחדש ומוציא בפה את כוונתו. אי-קידוש השם פוסל את הקלף מיד.' },
            { title: 'כסדרן', desc: 'במזוזה ובתפילין יש לכתוב את המילים לפי סדר הופעתן בתורה. תיקון אות שכבר נכתבו אחריה אחרות – פוסל.' },
            { title: 'טבילה לפני הכתיבה', desc: 'סופרים יראי שמיים טובלים במקווה לפני כתיבה כדי לכתוב בטהרה. לא חובה הלכתית, אך מנהג קדוש.' },
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
            איך לוודא שהסופר ירא שמיים?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            סינון סופרים צריך לכלול יותר מבדיקת תעודת כתיבה. כדאי לבדוק המלצות מרבני קהילות, לוודא תעודות הסמכה בתוקף מגופים הלכתיים מובילים, ולשאול על הקשר שלו לקהילה ולמסגרת תורנית. פלטפורמות אמינות מנהלות קשר רציף ואישי עם הסופרים ומבצעות בדיקות קבועות של חומרי הגלם.
          </p>

          <QuoteBlock text='בדיקת מחשב מגלה פגמים גרפיים – אבל אינה יכולה לגלות מה היה בלב הסופר.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם בדיקת מחשב יכולה לגלות אם המזוזה נכתבה לשמה?' a='לא. מחשב יודע לזהות רק את הצורה הגרפית של האותיות. הוא אינו יכול לדעת מה הייתה כוונת הסופר בלב. לכן הפיקוח על אישיות הסופר הוא החלק החשוב ביותר.' />
          <FAQItem q='מה קורה אם סופר כתב מזוזה בלי כוונה?' a='המזוזה פסולה לחלוטין – גם אם האותיות מושלמות. אין אפשרות לתקן בדיעבד. לכן בחירת סופר מוסמך ויראת שמיים חשובה יותר מכל פרמטר אחר.' />
          <FAQItem q='האם ניתן לסמוך על תעודת הסמכה לבדה?' a='תעודה היא תנאי הכרחי אך לא מספיק. יש לבדוק גם את הרקע הקהילתי של הסופר ואת אורח חייו. סופר שאינו שומר מצוות – גם אם יש לו תעודה – כותב קלפים פסולים.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='מי הסופרים' desc='קריטריונים לבחירת סופר' href='/madrich/soferim' />
            <RelatedCard emoji='🔍' title='תהליך הבדיקה' desc='איך נבדקת כל מזוזה' href='/madrich/bedika' />
          </div>

          <CTAStrip
            title='רוצים לקנות מסופרים שמזוהים בשמם?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'מי הסופרים', href: '/madrich/soferim', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
