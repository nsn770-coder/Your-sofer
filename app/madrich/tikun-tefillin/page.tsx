import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תיקון ושיקום תפילין ומזוזות – מתי מתקנים ומתי קונים חדש?',
  description:
    'הצבע דהה, הפינות נשחקו, הרצועות בלויות – מה ניתן לתקן ומה לא? מדריך לשיפוץ תפילין וכמה זה עולה לעומת קניית סט חדש.',
  alternates: { canonical: `${BASE_URL}/madrich/tikun-tefillin` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tikun-tefillin`,
    siteName: 'Your Sofer',
    title: 'תיקון תפילין | Your Sofer',
    description: 'מדריך לשיפוץ ותיקון תפילין – מה ניתן לתקן ומה לא.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תיקון ושיקום תפילין ומזוזות',
  description: 'מדריך מעשי לתיקון תפילין ומזוזות – מה כדאי לשפץ ומה חייב להיות מוחלף.',
  url: `${BASE_URL}/madrich/tikun-tefillin`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TikunTefillinPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="תחזוקה וטיפול"
          title="תיקון ושיקום תפילין"
          subtitle="מתי כדאי לשפץ ומתי להחליף – המדריך לתחזוקת ציוד הסת"ם שלכם"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            במהלך השנים, בלאי טבעי פוגע גם בפריטים הקדושים ביותר. הצבע השחור דהה, הפינות קצת נשחקו, או שהמגיה אמר שיש בעיה באחת האותיות. הדילמה: לשלוח לשיקום וצביעה, או לקנות סט חדש לחלוטין?
          </p>

          <QuoteBlock text='תמיד יש לבדוק את הקלף לפני שמחליטים על גורל הבתים. לעיתים קלף מושלם מסתתר בתוך בית בלוי.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            תיקון בתים לעומת תיקון קלף
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'תיקון בתים – אפשרי',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['צביעה שחורה מחדש', 'יישור זוויות במכבש', 'החלפת רצועות בלויות', 'פתיחה וסגירה הרמטית', 'משתלם בהרבה מחדש'],
              },
              {
                title: 'תיקון קלף – מוגבל',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['כסדרן אוסר תוספת אות', 'אות נמחקה – קלף פסול', 'נגיעה קלה – תלוי פוסק', 'אות שנשברה – חובה קלף חדש', 'לא ניתן לתקן בדיעבד'],
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
            הצבע השחור של התפילין נוטה לדהות בגלל זיעה ולחות. אם הצבע דהה עד שרואים עור לבן/חום, חובה לצבוע מיד ב"טוש תפילין" כשר. אם ריבוע הבית נפגע ממכה, חייבים לתת לאיש מקצוע שישתמש במכבש מיוחד ליישור מחדש.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='כמה עולה שיפוץ של בתי תפילין ישנים?' a='שיפוץ יסודי של בהמה גסה (צביעה, יישור, פתיחה וסגירה) עולה לרוב כמה מאות שקלים – משתלם בהרבה מקניית בתים חדשים (בתנאי שהפרשיות כשרות).' />
          <FAQItem q='מתי אי אפשר לשפץ בתים?' a='אם מדובר בתפילין "בהמה דקה" שהתעוותו, או בעור שנקרע לגמרי ומים חדרו אליו – לרוב לא ניתן להציל את המבנה ויש להזמין בתים חדשים.' />
          <FAQItem q='האם כדאי לרשת תפילין ישנות של סבא?' a='בהחלט כדאי לבדוק לפני שמשליכים. לעיתים הקלף הפנימי מצוין ורק הבית צריך שיפוץ. פנו לאיש מקצוע לאבחון לפני כל החלטה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🐂' title='בהמה גסה' desc='למה לא להתפשר על סוג העור' href='/madrich/behema-gasa' />
            <RelatedCard emoji='🔍' title='בדיקת מזוזות' desc='מתי לבדוק ושיטות הבדיקה' href='/madrich/bdika-mezuzot' />
          </div>

          <CTAStrip
            title='ייעוץ מקצועי לתיקון או החלפה'
            buttons={[
              { label: 'ליצירת קשר ←', href: '/contact', variant: 'primary' },
              { label: 'לגלריית התפילין', href: '/', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
