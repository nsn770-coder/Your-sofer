import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, Step } from '../InfoComponents';

const BASE_URL = 'https://yoursofer.com';
const C = { navy: '#0c1a35', gold: '#b8972a', muted: '#666', border: '#e0e0e0', white: '#fff' };

export const metadata: Metadata = {
  title: 'מזוזה זולה יכולה לעלות לך ביוקר',
  description:
    'למה לא לקנות מזוזה זולה — ההבדל האמיתי בין מזוזה ב-150₪ למזוזה ב-400₪ ומה זה אומר על הכשרות.',
  alternates: { canonical: `${BASE_URL}/madrich/mezuza-zola` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/mezuza-zola`,
    siteName: 'Your Sofer',
    title: 'מזוזה זולה יכולה לעלות לך ביוקר | Your Sofer',
    description: 'למה לא לקנות מזוזה זולה — ההבדל האמיתי בין מחירים ומה זה אומר על הכשרות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מזוזה זולה יכולה לעלות לך ביוקר',
  description: 'למה לא לקנות מזוזה זולה — ההבדל האמיתי בין מזוזה ב-150₪ למזוזה ב-400₪.',
  url: `${BASE_URL}/madrich/mezuza-zola`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MezuzaZolaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    <ArticleLayout>
      <PageHero
        badge="חשוב לדעת"
        title="מזוזה זולה יכולה לעלות לך ביוקר"
        subtitle="הנה מה שאף אחד לא מספר לך על הפער האמיתי בין מזוזה ב־150₪ למזוזה ב־400₪"
      />

      <div style={{ padding: '40px 0' }}>

        {/* Intro */}
        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          רוב האנשים רואים מזוזה ב־150₪ ומזוזה ב־400₪ ושואלים: למה לשלם יותר? זה נראה אותו דבר.
          הבעיה היא שהמילים "נראה אותו דבר" הן בדיוק הבעיה.
        </p>

        <QuoteBlock text="מזוזה היא לא מוצר רגיל. זו כתיבה ידנית שבה כל אות, כל צורה, כל רווח — משפיעים על הכשרות." />

        {/* Section 1 */}
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          אי אפשר לראות את ההבדל בעין רגילה
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          בניגוד לרוב המוצרים — במזוזה לא תוכלו לראות את ההבדל מבחוץ. הבית המזוזה יכול להיות יפה, הקלף יכול להיראות בסדר, אבל מה שקובע הוא מה שבפנים — האותיות עצמן.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          ספר סת"ם מנוסה יכול לזהות בהסתכלות אחת אם הכתיבה הייתה זהירה או מהירה. לקוח רגיל — לא יכול.
        </p>

        {/* Section 2 */}
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          במזוזה זולה — חוסכים בזמן, בדיוק ובבדיקות
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מזוזה מהודרת לוקחת לסופר מיומן שעות ארוכות לכתוב. כל אות נכתבת בקפידה, כל שורה נבדקת, כל ספק מטופל.
          כשהמחיר נמוך — מישהו חוסך בדרך. לא תמיד בחומרים. לרוב — בזמן.
        </p>

        {/* Info boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '28px 0' }}>
          {[
            { icon: '⏱️', title: 'מזוזה זולה', items: ['כתיבה מהירה', 'פחות בדיקות', 'מחיר נמוך = לחץ על הסופר', 'פחות דיוק בצורת האותיות'] },
            { icon: '✨', title: 'מזוזה מהודרת', items: ['כתיבה מדוקדקת', 'בדיקה כפולה', 'הסופר עובד בלי לחץ', 'כל אות נבחנת בנפרד'] },
          ].map(box => (
            <div key={box.title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{box.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 12 }}>{box.title}</div>
              {box.items.map(item => (
                <div key={item} style={{ fontSize: 14, color: '#444', marginBottom: 6, display: 'flex', gap: 8 }}>
                  <span style={{ color: C.gold }}>•</span>{item}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Section 3 */}
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          זה לא עניין של יופי — זה עניין של כשרות ושקט נפשי
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מזוזה פסולה שמוצגת בבית לא ממלאת את המצווה. הבעיה היא שלקוח רגיל לא ידע על כך אלא אם בודק — ורוב האנשים לא בודקים.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          הרעיון הוא פשוט: אתם מוציאים כסף על מוצר שאתם לא יכולים לבחון בעצמכם. לכן, מה שצריך לקנות הוא לא רק הקלף — אלא גם האמון במי שמכר לכם.
        </p>

        <QuoteBlock text="הבעיה הכי גדולה בשוק הסת״ם היא שהלקוח לא באמת יודע מה הוא קונה. אנחנו כאן כדי לשנות את זה." />

        {/* Section 4 */}
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
          אז מה כן כדאי לשים לב אליו?
        </h2>

        <Step num={1} title="מי כתב את המזוזה?" desc="האם הסופר ידוע? האם יש מידע עליו? האם ניתן לסמוך על המוכר?" />
        <Step num={2} title="האם ניתן לראות את הקלף עצמו?" desc="לא תמונת מלאי — אלא הקלף הספציפי שתקבלו. ב-Your Sofer, כל קלף מצולם ומוצג לפני מכירה." />
        <Step num={3} title="האם המזוזה נבדקה?" desc="מי בדק? איך? האם ניתן לדעת שהיא כשרה ומהודרת?" />
        <Step num={4} title="מה המחיר אומר?" desc="מחיר נמוך מאוד הוא לא בהכרח טוב. הוא לרוב אומר שמישהו חסך מאיפשהו." />

        {/* Related */}
        <h3 style={{ fontSize: 18, fontWeight: 900, color: C.navy, margin: '48px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="🎯" title="איך לבחור מזוזה נכון" desc="מדריך שלב-אחר-שלב לבחירה נכונה" href="/madrich/bechira" />
          <RelatedCard emoji="🔍" title="איך אנחנו בודקים" desc="כל מזוזה עוברת בדיקה לפני שמגיעה אליך" href="/madrich/bedika" />
          <RelatedCard emoji="⭐" title="מה זה מהודר באמת" desc="ההבדל בין כשר למהודר — בשפה פשוטה" href="/madrich/mehudar" />
        </div>

        <CTAStrip
          title="רוצים לראות מזוזות עם שקיפות מלאה?"
          buttons={[
            { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
            { label: 'שאלות נפוצות', href: '/madrich/faq', variant: 'secondary' },
          ]}
        />
      </div>
    </ArticleLayout>
    </>
  );
}
