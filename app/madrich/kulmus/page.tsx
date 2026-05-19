import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קולמוס נוצה מול קולמוס פלסטיק – הכלים שבהם נכתבת הקדושה',
  description:
    'מה ההבדל בין נוצת תרנגול הודו, קנה סוף וקולמוס קרמי מודרני? כיצד בחירת הכלי משפיעה על יופי האותיות ומה ההלכה מתירה ואוסרת.',
  alternates: { canonical: `${BASE_URL}/madrich/kulmus` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/kulmus`,
    siteName: 'Your Sofer',
    title: 'קולמוס הסופר | Your Sofer',
    description: 'על הכלים שבהם כותבים סת"ם – נוצה, קנה סוף וקולמוס קרמי.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קולמוס נוצה מול קולמוס פלסטיק',
  description: 'הסבר על סוגי הקולמוס שמשתמשים בהם סופרי סת"ם ומה ההלכה קובעת.',
  url: `${BASE_URL}/madrich/kulmus`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KulmusPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="כלי הסופר"
          title="הקולמוס"
          subtitle="נוצת תרנגול הודו, קנה סוף וקרמיקה מודרנית – איך הכלי משפיע על יופי האות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            בעולם מודרני מלא במדפסות תלת-ממד, אומנות הקליגרפיה בסת"ם דורשת מהאומן להשתמש בכלים הפשוטים ביותר שהטבע סיפק. הדבר המרתק ביותר בחדרו של סופר הסת"ם הוא מגוון הקולמוסים הפזורים על שולחנו.
          </p>

          <QuoteBlock text='חז"ל לא הגבילו את חומר הקולמוס – הלכתית כשר אפילו קולמוס זהב. רק ברזל מוחרג.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            סוגי הקולמוסים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'נוצת תרנגול הודו',
                color: '#1a5c3a',
                bg: '#f0fff5',
                desc: 'הכלי המסורתי הקלאסי. גמיש מאוד, רך על הקלף ונותן לכתב אופי זורם וחי. החיסרון: החוד נשחק מהר ויש להשחיז כל כמה שורות.',
              },
              {
                title: 'קנה סוף / במבוק',
                color: '#0e6ba8',
                bg: '#e8f4fd',
                desc: 'קשה יותר מהנוצה, מעניק שוליים חדים ומדויקים. נפוץ מאוד בקרב סופרי כתב ספרדי.',
              },
              {
                title: 'קולמוס קרמי מודרני',
                color: '#7c3a00',
                bg: '#fff8f0',
                desc: 'אינו נשחק כלל, שומר על רוחב קו אחיד מתחילת הקלף ועד סופו. מאפשר לסופר לייצר מזוזות עקביות ומושלמות ללא עצירות השחזה.',
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: c.color, marginBottom: 10 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            ברזל – החומר האסור
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            המסורת מרחיקה שימוש בברזל או פלדה למגע ישיר עם הקלף, בדומה למזבח שאינו נבנה עם כלי ברזל ("כי חרבך הנפת עליה ותחללה"). כל שאר החומרים – כולל פלסטיק וקרמיקה – כשרים לחלוטין.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך הקולמוס שומר דיו בתוכו?' a='הסופר מחדיר לחריץ הקולמוס סיבים של קפיץ קטן שעוזר לדיו "לשבת" שם מבלי לטפטף. כך יכול לכתוב מספר מילים בכל טבילה בדיו.' />
          <FAQItem q='האם שימוש בקולמוס קרמי פוגע באותנטיות?' a='לא מבחינה הלכתית. הקולמוס הקרמי מאפשר לסופר לשמור על ריכוז רוחני ברצף מבלי לעצור לחדד, ומה שנקבע בקלף הוא הכתב – לא הכלי.' />
          <FAQItem q='האם ניתן לבקש קלף שנכתב דווקא בנוצה?' a='כן. חלק מהסופרים מציינים את הכלי שלהם מתוך שקיפות. אם חשוב לכם מסורת מוחלטת של נוצת תרנגול, ניתן לבקש סופר ספציפי.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🖋️' title='דיו סת"ם' desc='ממה עשוי הדיו הכשר' href='/madrich/dio-stam' />
            <RelatedCard emoji='✍️' title='תהליך הכתיבה' desc='מאחורי הקלעים אצל הסופר' href='/madrich/tehlich-ktiva' />
          </div>

          <CTAStrip
            title='קלפים שנכתבו בקפדנות ובמיומנות'
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
