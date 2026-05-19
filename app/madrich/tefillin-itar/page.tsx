import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תפילין לשמאליים (איטר יד ימין) – מה לדעת לפני ההזמנה',
  description:
    'כ-10% מהאוכלוסייה הם שמאליים. מה שונה בתפילין לשמאלי, מה חובה לציין בהזמנה, וכיצד מבצעים המרה של תפילין ימניות לשמאליות.',
  alternates: { canonical: `${BASE_URL}/madrich/tefillin-itar` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tefillin-itar`,
    siteName: 'Your Sofer',
    title: 'תפילין לשמאליים | Your Sofer',
    description: 'הסבר על תפילין לאיטר יד ימין – מה שונה ומה חובה לציין.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תפילין לשמאליים (איטר יד ימין)',
  description: 'מה שונה בתפילין לאדם שמאלי ואיך להזמין נכון.',
  url: `${BASE_URL}/madrich/tefillin-itar`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TefillinItarPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="שמאליים"
          title="תפילין לשמאליים"
          subtitle="מה שונה, מה חובה לציין בהזמנה, וכיצד מונעים טעות ברגע האחרון"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כ-10% מהאוכלוסייה הם שמאליים ("איטרים" בלשון ההלכה). כאשר מגיע הזמן לרכוש תפילין לקראת הבר מצווה, מתעוררת שאלה קריטית: האם תפילין של ימני מתאימות גם לשמאלי? התשובה היא לא. אי-ציון שמאלי בשלב ההזמנה עלול לגרום לנזק שאי אפשר לתקן ללא פתיחת התפירות.
          </p>

          <QuoteBlock text='ידכה = היד החלשה. ימני: יד שמאל. שמאלי: יד ימין. ההבדל קובע את כיוון הרצועות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה שונה בתפילין לשמאלי?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            ההבדל בין תפילין לימניים לשמאליים אינו טמון בקלף שבפנים, אלא רק ב"תיתורא" (הבסיס) ובמקום שבו עוברת הרצועה ("המעברתא"). כשמכינים תפילין לשמאלי, מכניסים את הרצועה מהצד הנגדי, ויוצרים את קשר ה-י' כך שיפנה תמיד כלפי הלב בעת ההנחה על זרוע ימין.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'ימני', color: '#1E3A8A', bg: '#f0f4ff', items: ['מניח על יד שמאל', 'היד החלשה = שמאל', 'תפילין סטנדרטיות', 'רצועה מצד ימין'] },
              { title: 'שמאלי (איטר)', color: '#1a5c3a', bg: '#f0fff5', items: ['מניח על יד ימין', 'היד החלשה = ימין', 'חובה לציין בהזמנה', 'רצועה מצד שמאל'] },
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
            שאלות נפוצות
          </h2>
          <FAQItem q='מה הדין באדם אמבידקסטרי (שולט בשתי הידיים)?' a='ההלכה הולכת לפי היד שבה האדם כותב. אם כותב בימין ועושה שאר פעולות בשמאל – דינו כימני. במקרים חריגים יש להתייעץ עם פוסק.' />
          <FAQItem q='האם אפשר להמיר תפילין ימניות לשמאליות?' a='כן. איש מקצוע (סופר או רוצוע מוסמך) יכול לשלוף את הרצועות, להפוך את כיוון ההכנסה, ולקשור את הקשר מחדש.' />
          <FAQItem q='אם לא ציינתי שמאלי בהזמנה – מה עושים?' a='יש לפנות מיד לספק. תפילין שנמסרו לסופר ועדיין לא הושלמו – אפשר לתקן. תפילין גמורות – ניתן להמיר, אך כרוך בפתיחת תפירות.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎓' title='תפילין לבר מצווה' desc='מדריך לבחירת הסט הראשון' href='/madrich/bar-mitzva-tefillin' />
            <RelatedCard emoji='🔄' title='תפילין רש"י ורבנו תם' desc='ההבדל ומי מניח שניים' href='/madrich/rashi-rabenu-tam' />
          </div>

          <CTAStrip
            title='הזמנת תפילין עם התאמה אישית מלאה'
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
