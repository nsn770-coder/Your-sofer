import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'איך אנחנו בודקים מזוזות — תהליך הבדיקה המלא',
  description:
    'כל מזוזה עוברת בדיקה מקצועית לפני שמגיעה אליך — בדיקה ידנית מוסמכת, בדיקת מחשב, וצילום הקלף. הנה התהליך המלא.',
  alternates: { canonical: `${BASE_URL}/madrich/bedika` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/bedika`,
    siteName: 'Your Sofer',
    title: 'איך אנחנו בודקים מזוזות | Your Sofer',
    description: 'תהליך בדיקת המזוזות שלנו — 6 שלבים מהסופר ועד אליך.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'איך אנחנו בודקים מזוזות',
  description: 'כל מזוזה עוברת בדיקה מקצועית לפני שמגיעה אליך — הנה התהליך המלא.',
  url: `${BASE_URL}/madrich/bedika`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BedikaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    <ArticleLayout>
      <PageHero
        badge="תהליך הבדיקה"
        title="איך אנחנו בודקים מזוזות"
        subtitle="כל מזוזה עוברת בדיקה מקצועית לפני שמגיעה אליך — הנה התהליך המלא"
      />

      <div style={{ padding: '40px 0' }}>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          אצלנו המזוזה לא הולכת ישר למדף. היא עוברת קודם דרך בדיקה — ורק אחרי שעברה, היא מצולמת ומוצגת לכם.
        </p>

        <QuoteBlock text="אצלנו המזוזה לא הולכת ישר למדף — היא עוברת קודם דרך בדיקה." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 20px' }}>
          התהליך שלב אחר שלב
        </h2>

        <Step num={1} title="קבלה מהסופר" desc="המזוזה מגיעה אלינו ישירות מהסופר — לא דרך סיטונאים." />
        <Step num={2} title="בדיקה ידנית מוסמכת" desc="רב/בודק מוסמך עובר על כל אות, כל מילה, כל שורה. הוא בודק צורת אותיות, רווחים, תגים ועוד." />
        <Step num={3} title="בדיקת מחשב (היכן שרלוונטי)" desc="לחלק מהמזוזות מתווספת גם בדיקת תוכנה שמאתרת שגיאות שקשה לאתר בעין." />
        <Step num={4} title="החלטה: כשר / לתיקון / גניזה" desc="מזוזה כשרה ממשיכה. מזוזה הניתנת לתיקון חוזרת לסופר. מזוזה פסולה — לגניזה." />
        <Step num={5} title="צילום הקלף" desc="כל מזוזה שעברה בדיקה מצולמת — קדמי ואחורי — ותמונה אמיתית שלה מועלית לאתר." />
        <Step num={6} title="מכירה ספציפית" desc="אתם בוחרים קלף ספציפי מהגלריה — לא קונים עיוור. אתם יודעים בדיוק מה מגיע אליכם." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>
          מה זה אומר עבורכם?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: '📸', title: 'תמונה אמיתית', desc: 'לא תמונת מלאי — הקלף שאתם רואים הוא הקלף שתקבלו' },
            { icon: '🛡️', title: 'בדיקה מוסמכת', desc: 'כל מזוזה נבדקה לפני המכירה' },
            { icon: '🔁', title: 'שקיפות מלאה', desc: 'אפשר לשלוח את התמונה לרב שלכם לאישור נוסף' },
            { icon: '❌', title: 'לא מוכרים פסול', desc: 'מזוזה שלא עברה בדיקה — לא מגיעה לאתר' },
          ].map(b => (
            <div key={b.title} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{b.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0c1a35', marginBottom: 8 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        <QuoteBlock text="אתם יכולים לשלוח את תמונת הקלף לרב שלכם לפני הקנייה. אנחנו מעודדים את זה." />

        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="⭐" title="מה זה מהודר באמת" desc="ההבדל בין כשר למהודר" href="/madrich/mehudar" />
          <RelatedCard emoji="✍️" title="מי הסופרים שלנו" desc="הקריטריונים לבחירת סופר" href="/madrich/soferim" />
        </div>

        <CTAStrip
          title="רוצים לבחור קלף ספציפי?"
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
