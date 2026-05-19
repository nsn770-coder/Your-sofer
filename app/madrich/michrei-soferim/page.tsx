import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מחירי סופרי סת"ם – למה יש הבדלים גדולים?',
  description:
    'למה מזוזה אחת עולה 150 ש"ח ואחרת 600 ש"ח? מה מרכיב את מחיר הסת"ם, איך מזהים מחיר הוגן, ומה ההבדל בין כתיבה מהירה לכתיבה מהודרת.',
  alternates: { canonical: `${BASE_URL}/madrich/michrei-soferim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/michrei-soferim`,
    siteName: 'Your Sofer',
    title: 'מחירי סופרי סת"ם | Your Sofer',
    description: 'מדריך להבנת מחירי הסת"ם ומניעת הונאות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מחירי סופרי סת"ם - למה יש הבדלים גדולים ואיך להימנע מחובבנים',
  description: 'הסבר מקיף על רכיבי מחיר הסת"ם וכיצד לזהות מחיר הוגן.',
  url: `${BASE_URL}/madrich/michrei-soferim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MichreiSoferimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מחירי סת&quot;ם"
          title='מחירי סופרי סת"ם'
          subtitle='למה יש הבדלים כה גדולים ואיך להימנע ממחיר זול שמסתיר פשרה'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כשמחפשים קלף מזוזה באינטרנט, נתקלים בתופעה מבלבלת: מזוזה ב-120 ש"ח לצד מזוזה שנראית דומה ב-600 ש"ח. ההבדלים האלו אינם שיווקיים – הם משקפים מציאות הלכתית ואיכותית אמיתית. עולם הסת"ם מבוסס על עבודת יד ועל מיומנות רוחנית, מה שהופך את השקיפות לקריטית.
          </p>

          <QuoteBlock text='מזוזה ב-50 ש"ח – בדרך כלל לא כשרה. מזוזה ב-200 ש"ח – כשרה בסיסית. מזוזה ב-500 ש"ח – מהודרת.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה מרכיב את מחיר הסת"ם?
          </h2>

          {[
            { title: 'חומרי הגלם', desc: 'קלף עבודת יד איכותי עולה פי כמה מקלף מכונה פשוט. הדיו, הקולמוס, ואיכות העור - כולם משפיעים על המחיר הסופי.' },
            { title: 'זמן הכתיבה', desc: 'כתיבת מזוזה מהודרת לוקחת בין 3 ל-5 שעות עבודה רצופות בריכוז עילאי. מחיר הוגן לשעת עבודה של איש מקצוע מיומן – לא יכול להיות נמוך.' },
            { title: 'עלויות הגהה', desc: 'כל מוצר חייב לעבור הגהת אדם ובדיקה ממוחשבת. עלות הבדיקות משולבת במחיר המוצר.' },
            { title: 'ניסיון הסופר', desc: 'סופר מומחה בעל שנות ניסיון רבות מייצר יצירת אמנות. הכתב שלו אחיד, מדויק ויפה – ומתומחר בהתאם.' },
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
            טווח המחירים המקובל
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'כשר בסיסי', price: '150-250 ש"ח', color: '#0e6ba8', bg: '#e8f4fd', desc: 'עומד בדרישות המינימליות. כשרות בדיעבד. מתאים לתקציב מוגבל.' },
              { title: 'מהודר', price: '350-600 ש"ח', color: '#1a5c3a', bg: '#f0fff5', desc: 'הידורים מעבר לדין. כתב יפה ואחיד. הבחירה המומלצת לרוב.' },
              { title: 'מהודר מאוד', price: '600+ ש"ח', color: '#7c3a00', bg: '#fff8f0', desc: 'רמה עילאית. בדיקות מרובות. למהדרים ולמתנות ייצוגיות.' },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: c.color, marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: c.color, marginBottom: 12 }}>{c.price}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <QuoteBlock text='סופר שמשקיע 3-4 שעות בכתיבת מזוזה לא יכול למכור אותה ב-100 ש"ח ולהתפרנס.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם מזוזה זולה היא בהכרח פסולה?' a='לא בהכרח פסולה, אך היא לרוב ברמת הכשרות המינימלית ביותר ("בדיעבד"), וקיים סיכון גבוה שנכתבה במהירות רבה מדי או ללא פיקוח הדוק.' />
          <FAQItem q='למה יש פערי מחיר כה גדולים בין אותרים?' a='חלק מהפלטפורמות עובדות ישירות מול סופרים ומבטלות פערי תיווך. חנויות פיזיות ואתרים עם מתווכים גובים יותר על אותה רמה.' />
          <FAQItem q='האם מחיר גבוה מבטיח איכות?' a='לא בהכרח. הגנה הטובה ביותר היא שקיפות: צילום של הקלף הספציפי שאתם מקבלים + תעודת בדיקה + זיהוי הסופר.' />
          <FAQItem q='כמה עולה כתיבת מזוזה לסופר?' a='כתיבת מזוזה מהודרת לוקחת 3-5 שעות. בחשב שכר מקצועי הוגן ועלויות חומרים, מחיר של פחות מ-200 ש"ח הוא אות אזהרה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🛡️' title='קניית סת"ם באינטרנט' desc='איך לוודא שלא נופלים בהונאה' href='/madrich/knia-online' />
            <RelatedCard emoji='⭐' title='מה זה מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
          </div>

          <CTAStrip
            title='רוצים לראות קלפים עם שקיפות מחירים מלאה?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'לשאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
