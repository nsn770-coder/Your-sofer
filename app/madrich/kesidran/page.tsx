import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'כסדרן בסת"ם – למה תיקון קטן יכול לפסול מזוזה שלמה?',
  description:
    'מה זה "כסדרן" בהלכות סת"ם? למה לא ניתן לתקן אות שכבר נכתבו אחריה אותיות אחרות, ומה ההבדל בין מזוזה לספר תורה.',
  alternates: { canonical: `${BASE_URL}/madrich/kesidran` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/kesidran`,
    siteName: 'Your Sofer',
    title: 'כסדרן בסת"ם | Your Sofer',
    description: 'הסבר על כלל "כסדרן" בהלכות מזוזה ותפילין.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '"כסדרן" – למה טעות אחת פוסלת מזוזה שלמה',
  description: 'הסבר על כלל "כסדרן" בהלכות סת"ם ומדוע לא ניתן לתקן בדיעבד.',
  url: `${BASE_URL}/madrich/kesidran`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KesidranPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="עומק הלכתי"
          title='"כסדרן" בסת"ם'
          subtitle='למה תיקון קטן יכול לפסול מזוזה שלמה – ומה ההבדל לספר תורה'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            אחת הסיבות הנפוצות ביותר לפסילת קלף בבדיקה היא המילה "כסדרן". פעמים רבות לקוחות שומעים מהמגיה: "הכתב מדהים, יש פה רק אות אחת דבוקה, אבל אי אפשר לתקן אותה והקלף פסול." מדוע?
          </p>

          <QuoteBlock text='"כסדרן" – כתיבת המזוזה חייבת להיעשות לפי סדר המילים בתורה, מתחילה ועד סופה, מבלי לחזור אחורה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה זה "כסדרן"?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הסופר חייב לכתוב מתחילת הפסוק ועד סופו, מהאות הראשונה ועד לאחרונה, מבלי לחזור אחורה. אם סיים לכתוב מזוזה וגילה שהוא שכח לכתוב את האות ב' במילה "לבבך" בתחילת הקלף – אינו יכול פשוט להוסיף אותה. אם יוסיף אותה עתה, היא נכתבה <em>אחרי</em> האותיות שבסוף המזוזה, ולכן נכתבה "שלא כסדרן". המזוזה כולה פסולה.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מזוזה ותפילין לעומת ספר תורה
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'מזוזה ותפילין',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['חייב "כסדרן" – מהתורה', 'אות שנכתבה שלא בסדר – פסל', 'לא ניתן לתקן בדיעבד', 'הקלף הולך לגניזה'],
              },
              {
                title: 'ספר תורה ומגילה',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['ניתן לתקן אחורנית', 'מחיקה ותיקון – מותר', 'הרבה יותר גמישות הלכתית', 'לכן פחות יקר בתיקון'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>•</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכלל נובע מהפסוק "וכתבתם על מזוזות ביתך" – "וכתבתם: כדרך כתיבתן". לכן מיומנותו וריכוזו של הסופר קריטיים. סופר שחושב שיכול לכתוב מהר ולתקן אחר כך – מייצר קלפים פסולים ללא ידיעתו.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם שום דבר לא ניתן לתיקון במזוזה?' a='אם נמצאה נגיעה קלה מאוד שלא פגעה בצורת האות המקורית – ישנם מצבים שההלכה מתירה לגרד את הנגיעה מבלי לעבור על פסול כסדרן. זה נתון להחלטת פוסק מומחה בלבד.' />
          <FAQItem q='האם בדיקת מחשב מונעת בעיות כסדרן?' a='בדיקת מחשב מגלה את הטעות, אבל לא יכולה לתקן בדיעבד. מטרת הבדיקה היא לגלות קלפים פסולים לפני מכירתם ללקוח.' />
          <FAQItem q='כיצד סופר מנוסה מונע טעויות כסדרן?' a='סופר מקצועי כותב לאט, בריכוז מלא, וקורא כל מילה מתוך "תיקון סופרים" לפני הכתיבה. מהירות יתרה היא אויב הכשרות.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='סופר ירא שמיים' desc='למה הממד הרוחני קריטי' href='/madrich/yirat-shamayim' />
            <RelatedCard emoji='🔍' title='בדיקת מזוזות' desc='מתי לבדוק ושיטות הבדיקה' href='/madrich/bdika-mezuzot' />
          </div>

          <CTAStrip
            title='קלפים שנכתבו בריכוז ובדקדוק מלא'
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
