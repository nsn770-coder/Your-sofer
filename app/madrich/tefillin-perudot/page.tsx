import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תפילין פרודות לעומת רובות – ההידור הגדול בתפילין',
  description:
    'מה זה תפילין "פרודות" ולמה זה הסטנדרט היוקרתי ביותר? ההבדל בין חדרים מופרדים לחדרים דבוקים, ואיך מוודאים שהתפילין שרכשתם הן אכן פרודות.',
  alternates: { canonical: `${BASE_URL}/madrich/tefillin-perudot` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tefillin-perudot`,
    siteName: 'Your Sofer',
    title: 'תפילין פרודות | Your Sofer',
    description: 'מדריך להבנת ההידור של תפילין "פרודות" לעומת "רובות".',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תפילין פרודות לעומת רובות',
  description: 'הסבר על הידור "פרודות" בתפילין של ראש ומדוע זה הסטנדרט המבוקש ביותר.',
  url: `${BASE_URL}/madrich/tefillin-perudot`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TefillinPerudotPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="הידור עילאי"
          title="תפילין פרודות"
          subtitle="ארבעת החדרים של תפילין של ראש – מהו ההידור של הפרדה מוחלטת?"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            בתפילין של ראש (הקופסה שמונחת על הראש), ישנם ארבעה חדרים פנימיים. ההלכה דורשת שההפרדה בין החדרים תהיה מוחלטת וניכרת לעין. אך בייצור מודרני נוצר לעיתים מצב שבו החדרים נדבקים זה לזה בתחתית. כאן נכנס לזירה מושג ההידור הגבוה ביותר: "תפילין פרודות".
          </p>

          <QuoteBlock text='תפילין פרודות: היצרן מוודא שכל חדר נפרד לחלוטין מרעהו – הפרדה אמיתית של 100%.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            פרודות לעומת רובות – ההבדל
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'רובות (סטנדרט)',
                color: '#6b7280',
                bg: '#f9fafb',
                items: ['כשרות לכל הדעות', 'חדרים עשויים להיות דבוקים', 'מחיר נמוך יותר', 'מקובל אצל רוב הציבור'],
              },
              {
                title: 'פרודות (הידור)',
                color: '#1E3A8A',
                bg: '#f0f4ff',
                items: ['הידור לכתחילה מושלם', 'חוט מועבר בין כל חדר לחדר', 'ניתן לראות אור בין החריצים', 'מבוקש אצל מדקדקים'],
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
            דעת הרמב"ם והשולחן ערוך היא שארבעת בתי התפילין של ראש צריכים להיות ארבעה בתים נפרדים לחלוטין. ייצור "פרודות" הוא תהליך עדין ויקר יותר המצריך מיומנות רבה, אך פותר את הספק ההלכתי ומעניק לכתחילה מושלם.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך מוודאים שהתפילין שרכשתי הן "פרודות"?' a='בתפילין פרודות אמיתיות, אם מחזיקים אותן מול האור בצורה ישרה, ניתן לעיתים לראות פס אור דקיק עובר בין החריצים.' />
          <FAQItem q='האם תפילין שאינן פרודות הן פסולות?' a='לא. הן כשרות לפי רוב הפוסקים. "פרודות" נחשב להידור גבוה (חומרה לכתחילה), סטנדרט מבוקש בקרב מדקדקים.' />
          <FAQItem q='מה ההשפעה של פרודות על מחיר התפילין?' a='תפילין פרודות יקרות יותר ב-20-40% מרובות ברמת הכשרות הזהה, בשל עלות ייצור גבוהה יותר ושכבת בקרת איכות נוספת.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🐂' title='בהמה גסה' desc='למה לא להתפשר על סוג העור' href='/madrich/behema-gasa' />
            <RelatedCard emoji='⭐' title='מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
          </div>

          <CTAStrip
            title='תפילין פרודות ברמת הידור עילאית'
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
