import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תפילין רש"י ורבנו תם – ההבדל ומתי מתחילים להניח',
  description:
    'מה ההבדל בין תפילין רש"י לרבנו תם? מי מניח שני זוגות, מתי מתחילים, ואיך מזהים איזה זוג הוא איזה. הסבר הלכתי פשוט וברור.',
  alternates: { canonical: `${BASE_URL}/madrich/rashi-rabenu-tam` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/rashi-rabenu-tam`,
    siteName: 'Your Sofer',
    title: 'תפילין רש"י ורבנו תם | Your Sofer',
    description: 'ההבדל בין תפילין רש"י לרבנו תם – הסבר הלכתי ומעשי.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תפילין רש"י ורבנו תם – מה ההבדל?',
  description: 'הסבר על ההבדל בין תפילין רש"י לתפילין רבנו תם ומתי מניחים שני זוגות.',
  url: `${BASE_URL}/madrich/rashi-rabenu-tam`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function RashiRabenuTamPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="עיון הלכתי"
          title='תפילין רש"י ורבנו תם'
          subtitle='ההבדל בסדר הפרשיות, מי מניח שני זוגות, ואיך לא להתבלבל ביניהם'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            בתוך כל תפילין מסתתרות ארבע פרשיות מן התורה. המחלוקת המפורסמת ביותר בהלכה היא בין רש"י לבין נכדו רבנו תם לגבי סדר הכנסת הפרשיות לתוך בתי התפילין. כדי לצאת ידי חובת כל הדעות, גברים רבים מחזיקים שני זוגות.
          </p>

          <QuoteBlock text='תפילין של רש"י – חובת כל יהודי. תפילין רבנו תם – חומרת חסידים ומדקדקים.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה ההבדל בפועל?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'תפילין רש"י',
                color: '#1E3A8A',
                bg: '#f0f4ff',
                items: ['סדר הפרשיות כפי שהן בתורה', 'קדש – והיה כי יביאך – שמע – והיה אם שמוע', 'חובה על כל יהודי', 'מברכים עליהן בכל בוקר'],
              },
              {
                title: 'תפילין רבנו תם',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['שתי פרשיות אחרונות מוחלפות', 'קדש – והיה כי יביאך – והיה אם שמוע – שמע', 'מיועד לגברים נשואים ומחמירים', 'מניחים ללא ברכה לאחר התפילה'],
              },
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
            כיצד להבדיל בין שני הזוגות
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            חשוב מאוד לרכוש בתי תפילין המסומנים מבחוץ כדי להבדיל בין רש"י לרבנו תם ולמנוע טעות. הסימון נעשה בדרך כלל בחריטה עדינה על גוף הבית, ומונע תקרית של הנחת הזוג הלא נכון בבוקר.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='האם מותר להניח רש"י ורבנו תם יחד בו-זמנית?' a='מקובלים וחסידים מניחים את שניהם יחד (בתפילין קטנות במיוחד), אך הרוב מניח רש"י, חולץ בסוף התפילה, ומניח רבנו תם לכמה דקות.' />
          <FAQItem q='האם מחיר תפילין רבנו תם שונה מרש"י?' a='המחיר זהה לחלוטין – אותה כמות עבודה, אותו עור ואותן פרשיות, רק בסדר הכנסה שונה לקלף ולבתים.' />
          <FAQItem q='מאיזה גיל מניחים רבנו תם?' a='ההנחה המקובלת היא לאחר החתונה, אצל חסידים ומחמירים. גבר רווק יכול לקחת על עצמו מנהג זה בהחלטה אישית.' />
          <FAQItem q='האם אפשר להזמין סט תואם של שני הזוגות מאותו סופר?' a='כן. הדבר מומלץ כדי ששני הזוגות יהיו בכתב זהה ובאותה רמת הידור, מה שמאפשר אחידות הלכתית ואסתטית.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎓' title='תפילין לבר מצווה' desc='מדריך לבחירת הסט הראשון' href='/madrich/bar-mitzva-tefillin' />
            <RelatedCard emoji='📖' title='הבדלים בין נוסחים' desc='כתב בית יוסף, האר"י וספרד' href='/madrich/nosachim' />
          </div>

          <CTAStrip
            title='מחפשים סט תואם רש"י ורבנו תם?'
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
