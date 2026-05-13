import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';
const C = { navy: '#1E3A8A', gold: '#C5A028', border: '#e0e0e0', white: '#fff' };

export const metadata: Metadata = {
  title: 'תפילין ספרדי – מה חשוב לדעת לפני שקונים? | YourSofer',
  description:
    'מדריך לבחירת תפילין ספרדי כשר ומהודר. ההבדל בין רמות הכתיבה, למה הסופר קובע הכל, ואיך בוחרים נכון.',
  alternates: { canonical: `${BASE_URL}/madrich/tefillin-sfaradi` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tefillin-sfaradi`,
    siteName: 'Your Sofer',
    title: 'תפילין ספרדי – מה חשוב לדעת לפני שקונים? | YourSofer',
    description: 'מדריך לבחירת תפילין ספרדי כשר ומהודר. ההבדל בין רמות הכתיבה ולמה הסופר קובע הכל.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תפילין ספרדי – מה חשוב לדעת לפני שקונים?',
  description: 'מדריך לבחירת תפילין ספרדי כשר ומהודר. ההבדל בין רמות הכתיבה, למה הסופר קובע הכל, ואיך בוחרים נכון.',
  url: `${BASE_URL}/madrich/tefillin-sfaradi`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TefillinSfaradiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מדריך לקונה"
          title="תפילין ספרדי – מה חשוב לדעת לפני שקונים?"
          subtitle="מה ההבדל בין רמות הכתיבה, למה הסופר קובע הכל, ואיך בוחרים נכון"
        />

        <div style={{ padding: '40px 0' }}>

          {/* Section 1 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '0 0 16px' }}>
            מה ההבדל בין תפילין ספרדי לתפילין אשכנזי?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            אחד הדברים הראשונים שאנשים מגלים כשהם מתחילים לברר על תפילין הוא שיש סוגים שונים של כתיבה ונוסחים.
            אחד המרכזיים שבהם הוא <strong>כתב ספרדי</strong>.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הכתב הספרדי נפוץ בקרב בני עדות המזרח, ספרדים, וחלק מקהילות החסידים.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            מה מיוחד בתפילין ספרדי?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            תפילין ספרדי נכתבים לפי מסורת כתיבה מיוחדת שעוברת מדור לדור. לכתב הספרדי יש:
          </p>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
            {['צורת אותיות ייחודית', 'מבנה שונה מכתב אשכנזי', 'סגנון כתיבה המזוהה עם מסורת ספרד'].map(item => (
              <div key={item} style={{ fontSize: 15, color: '#444', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: C.gold, fontWeight: 900 }}>✓</span>{item}
              </div>
            ))}
          </div>

          <QuoteBlock text='תפילין אינם רק כלי קיום המצווה — הם מצווה בפני עצמם. לכן איכות הכתיבה קריטית.' />

          {/* Section 3 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            לא כל תפילין "ספרדי" באמת מהודר
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 20 }}>
            בשוק קיימים הבדלים עצומים בין רמות התפילין. והפערים הם לא רק במחיר — אלא בעיקר ברמת הכתיבה, בדיוק האותיות, בהידורים ובאיכות העבודה.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, margin: '0 0 24px' }}>
            {[
              { icon: '①', title: 'כשר', items: ['עומד בדרישות הבסיסיות', 'מחיר נגיש', 'מתאים לאלו שאינם מחמירים'] },
              { icon: '②', title: 'מהודר', items: ['רמת כתיבה גבוהה', 'הידורים מעבר לדין', 'מומלץ לרוב האנשים'] },
              { icon: '③', title: 'מהודר בתכלית', items: ['כתיבה ברמה הגבוהה ביותר', 'בדיקות מרובות', 'למהדרים ולמדקדקים'] },
            ].map(box => (
              <div key={box.title} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px' }}>
                <div style={{ fontSize: 26, marginBottom: 8, color: C.gold, fontWeight: 900 }}>{box.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 10 }}>{box.title}</div>
                {box.items.map(item => (
                  <div key={item} style={{ fontSize: 13, color: '#444', marginBottom: 5, display: 'flex', gap: 8 }}>
                    <span style={{ color: C.gold }}>•</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Section 4 */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            למה תפילין איכותיים עולים יותר?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתיבת תפילין היא אחת העבודות המורכבות ביותר בעולם הסת"מ. מדובר בעבודה שיכולה לקחת ימים ארוכים,
            ריכוז עצום, והשקעה בלתי רגילה בכל אות.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            טעות קטנה אחת יכולה לפסול פרשייה שלמה — ולשלוח את הסופר להתחיל מחדש.
          </p>

          {/* Section 5 - The sofer */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            הדבר החשוב ביותר: הסופר
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בתפילין, יותר מכל דבר אחר — חשוב לדעת מי כתב אותן. סופר ירא שמים עובד באיטיות ובדיוק,
            מקפיד על כל הלכה, ומשקיע בכל פרט קטן.
          </p>

          <QuoteBlock text='כמו במזוזה — הסופר הוא לא רק הכותב. הוא האחריות שמאחורי המוצר.' />

          {/* Section 6 - How to choose */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            איך לבחור תפילין ספרדי?
          </h2>
          <Step num={1} title="מי הסופר?" desc="האם יש מידע על הסופר? האם ניתן לדעת מי כתב את הפרשיות?" />
          <Step num={2} title="רמת ההידור" desc="בדקו האם המוכר מסביר בבירור מה ההבדל בין הרמות." />
          <Step num={3} title="שקיפות על הקלף" desc="האם ניתן לראות תמונות של הפרשיות עצמן? לא תמונת מלאי — הקלף שלכם." />
          <Step num={4} title="רמת הבדיקה" desc="מי בדק? כיצד? האם יש פיקוח רבני ותעודת כשרות?" />

          {/* Section 7 - Your Sofer */}
          <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, margin: '36px 0 16px' }}>
            תפילין ב־Your Sofer
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            ב־Your Sofer ניתן למצוא תפילין ספרדי ברמות שונות — כשר, מהודר, ומהודר בתכלית — עם דגש על
            שקיפות מלאה: ניתן לראות את הסופר, לראות את הפרשיות, ולקבל פיקוח רבני מלא.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כל סופר עבר סינון קפדני. יש חיבור ישיר בין הלקוח לסופר שכתב את התפילין שלו.
          </p>

          {/* Related */}
          <h3 style={{ fontSize: 18, fontWeight: 900, color: C.navy, margin: '48px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji="📖" title="מדריך לבחירת תפילין" desc="כל מה שצריך לדעת לפני רכישת תפילין" href="/madrich/bechira" />
            <RelatedCard emoji="⭐" title="מה זה מהודר באמת" desc="ההבדל בין כשר למהודר בשפה פשוטה" href="/madrich/mehudar" />
            <RelatedCard emoji="🔍" title="תהליך הבדיקה שלנו" desc="איך כל קלף נבדק לפני שמגיע אליך" href="/madrich/bedika" />
          </div>

          <CTAStrip
            title="מחפשים תפילין ספרדי מהודר עם שקיפות מלאה?"
            buttons={[
              { label: 'לתפילין קומפלט ←', href: '/category/תפילין קומפלט', variant: 'primary' },
              { label: 'מדריך בר מצווה', href: '/bar-mitzva', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
