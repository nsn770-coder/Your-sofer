import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'שמירה על תפילין בנסיעות ובצבא – המדריך המלא',
  description:
    'איך שומרים על תפילין בצבא, בטיולים ובנסיעות לחו"ל? חום, לחות, מכות – הסכנות הנפוצות ואיך מגנים על הריבוע ועל הכשרות לאורך שנים.',
  alternates: { canonical: `${BASE_URL}/madrich/tefillin-nesia` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tefillin-nesia`,
    siteName: 'Your Sofer',
    title: 'שמירה על תפילין בנסיעות | Your Sofer',
    description: 'מדריך לשמירה על תפילין בתנאי שטח, צבא ונסיעות בינלאומיות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'שמירה על תפילין בנסיעות ובצבא',
  description: 'מדריך מעשי להגנה על תפילין מחום, לחות ומכות בנסיעות ובשירות צבאי.',
  url: `${BASE_URL}/madrich/tefillin-nesia`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TefillinNesiaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="שמירה על הציוד"
          title="תפילין בנסיעות ובצבא"
          subtitle="איך מגנים על ההשקעה מחום, לחות ומכות – מדריך מעשי"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            התפילין מלוות אותנו לאורך כל החיים – לשירות הצבאי, לטיולים ולנסיעות עבודה. אולם תנאי השטח מסכנים את הפריט הקדוש הזה יותר מכל דבר אחר. חום קיצוני, קור עז ולחות גבוהה יכולים להרוס זוג תפילין בתוך ימים בודדים.
          </p>

          <QuoteBlock text='הלכה למשה מסיני קובעת "תפילין מרובעות". עיוות של הזוויות פוסל את המצווה לחלוטין.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            הסכנות הנפוצות לתפילין בשטח
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'חום קיצוני',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['מרכך את העור ועיוות הריבוע', 'מייבש ומסדק את הדיו על הקלף', 'רכב סגור בקיץ – סכנה מיידית', 'בסיסים בנגב ובדרום – סיכון גבוה'],
              },
              {
                title: 'לחות וגשם',
                color: '#1d4ed8',
                bg: '#eff6ff',
                items: ['מרגיעה את קשיחות הבית', 'גורמת לדיו לזחול ולדבק אותיות', 'שינויי לחץ באוירון – פחות מסוכן', 'חשיפה לגשם ישיר – פסול'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>⚠</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כיצד להגן על התפילין
          </h2>

          {[
            { title: 'כיסויי תפילין קשיחים', desc: 'מגני פלסטיק מותאמים למידה המולבשים על הבתים ושומרים על הזוויות ממכות. הגנה פיזית בסיסית שכל מי שנוסע חייב לרכוש.' },
            { title: 'נרתיק טרמי', desc: 'בעל שכבת בידוד מיוחדת נגד חום ולחות. שומר על טמפרטורה יציבה גם בנסיעות מטוס ובבסיסים ביישובי הנגב.' },
            { title: 'אחסון בצל', desc: 'לעולם אין להשאיר תפילין חשופות לשמש ישירה. יש לאחסן תמיד בצל, בתוך הנרתיק, ולא בבטן תיק מחומם.' },
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
          <FAQItem q='האם מותר להשאיר תפילין בתוך רכב סגור בקיץ?' a='בשום אופן לא. הטמפרטורה ברכב עשויה להגיע ל-70 מעלות בתוך דקות, מה שימיס את הדיו ויעוות את העור כמעט מיד.' />
          <FAQItem q='האם כיסוי קטיפה מספיק להגנה?' a='כיסוי קטיפה שומר על אסתטיקה בלבד. להגנה פיזית וטמפרטורה נדרש נרתיק טרמי וכיסויי מגן קשיחים לבתים.' />
          <FAQItem q='האם מכשירי רנטגן בשדה תעופה פוגעים בתפילין?' a='לא. סורקי הרנטגן הסטנדרטיים אינם מייצרים חום או קרינה שמשפיעים על הדיו האורגני. הפריטים נשארים כשרים.' />
          <FAQItem q='מה עושים אם הפינות התעגלו?' a='יש לפנות לאיש מקצוע (מעבדת בתי תפילין) שיכניס את הבית למכבש ויישר את הפינות מחדש. זה משתלם בהרבה מרכישת בתים חדשים.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🔧' title='תיקון תפילין' desc='מתי מתקנים ומתי קונים חדש' href='/madrich/tikun-tefillin' />
            <RelatedCard emoji='🐂' title='בהמה גסה' desc='למה לא להתפשר על סוג העור' href='/madrich/behema-gasa' />
          </div>

          <CTAStrip
            title='תפילין עם הגנה מושלמת'
            buttons={[
              { label: 'לגלריית התפילין ←', href: '/', variant: 'primary' },
              { label: 'ליצירת קשר', href: '/contact', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
