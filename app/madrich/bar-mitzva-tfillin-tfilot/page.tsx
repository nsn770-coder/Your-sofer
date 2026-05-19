import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'שליחת חבילות בר מצווה מישראל לחו"ל – מתנה ותרומה',
  description:
    'כיצד יהודי התפוצות יכולים להזמין חבילת בר מצווה מישראל ולשלוח ישירות לנמען? מה כולל הסט, אפשרויות חסות לילדים נזקקים, ותשלום בינלאומי.',
  alternates: { canonical: `${BASE_URL}/madrich/bar-mitzva-tfillin-tfilot` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/bar-mitzva-tfillin-tfilot`,
    siteName: 'Your Sofer',
    title: 'חבילות בר מצווה מישראל לחו"ל | Your Sofer',
    description: 'מדריך לשליחת חבילות בר מצווה בינלאומיות – מתנות, תרומות וחסות לנזקקים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'שליחת חבילות בר מצווה מישראל לחו"ל – מתנה ותרומה',
  description: 'כיצד יהודי חו"ל שולחים חבילת בר מצווה מישראל – הזמנה מרחוק, חסות לנזקקים ומשלוח בינלאומי.',
  url: `${BASE_URL}/madrich/bar-mitzva-tfillin-tfilot`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BarMitzvaChulPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="בר מצווה בינלאומי"
          title="חבילת בר מצווה מישראל לחו"ל"
          subtitle="חסות, מתנה ושליחה ישירה – גשר בין יהודי העולם לארץ ישראל"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הקשר בין יהודי התפוצות לארץ ישראל מתחזק במיוחד ברגע של בר מצווה. סבים מניו יורק, דודים מפריז, וחברי קהילה מלונדון – כולם רוצים לתת מתנה עמוקת משמעות. עד לאחרונה, שליחת חבילת תפילין מישראל לחו"ל, או ספונסורינג של סט לנער נזקק בישראל, היו כרוכים בהמון תיאומים, סיכונים ופחד מרמאות. כיום, פלטפורמות דיגיטליות מתמחות בדיוק בפתרון זה.
          </p>

          <QuoteBlock text='מתנת תפילין מהודרת מישראל – עם שם הנער רקום על הנרתיק – היא מתנת בר מצווה שתישמר לכל החיים.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה כוללת חבילת בר מצווה שלמה
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'מתנה לנכד או אחיין',
                color: '#1E3A8A',
                bg: '#f0f4ff',
                items: ['תפילין מהודרות (בהמה גסה)', 'טלית צמר רחלים', 'נרתיק עם שם רקום אישית', 'אריזת מתנה חגיגית', 'תעודת כשרות ומספר סידורי'],
              },
              {
                title: 'חסות לנזקק בישראל',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['בחירת רמת כשרות הסט', 'תיאום עם ארגון סוציאלי מוסמך', 'תעודת תרומה דיגיטלית', 'עדכון ותמונות לתורם', 'זיכוי לעילוי נשמה אפשרי'],
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
            הערך ההלכתי של תרומת תפילין
          </h2>

          {[
            { title: 'זכות לעילוי נשמה', desc: 'כאשר אדם תורם תפילין לנער שאין בידו לרכוש, כל בוקר שבו הנער מניח את התפילין – הזכות נזקפת לתורם ולנשמות שציין בתרומתו. מצוות "זה נהנה וזה לא חסר" מתממשת כאן בעוצמה מיוחדת.' },
            { title: 'מצווה מן המובחר בתרומה', desc: 'ההלכה קובעת ש"מצווה מן המובחר" מקבלת משנה תוקף כשהיא מוענקת בחסד לאחר. פלטפורמות סת"ם מובילות מוודאות שתפילין של תרומה יהיו ברמת כשרות לכתחילה מוקפדת, לא איכות מוזלת.' },
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
          <FAQItem q='האם ניתן לחסות סט לנער נזקק שאינו מוכר לי?' a='כן. פלטפורמות סת"ם מתמחות משתפות פעולה עם ארגונים סוציאליים מוסמכים בישראל. ניתן לרכוש סט כתרומה ולקבל תעודת תרומה דיגיטלית מכובדת.' />
          <FAQItem q='האם ניתן לשלם באשראי אמריקאי ולהשתמש באתר באנגלית?' a='כן. פלטפורמות מובילות מציעות ממשק מלא באנגלית ותשלום בינלאומי מאובטח (SSL/PayPal) ללקוחות מחו"ל.' />
          <FAQItem q='כמה זמן לוקח המשלוח מישראל לארה"ב?' a='שליחות בינלאומיות מישראל לארה"ב לוקחות בדרך כלל 5-10 ימי עסקים. ניתן לבחור שליחות מהירה (EMS) לאירוע ספציפי.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎓' title='חבילות בר מצווה' desc='כל מה שצריך בסט אחד' href='/madrich/chavilot-bar-mitzva' />
            <RelatedCard emoji='🌍' title='הזמנה לחו"ל' desc='משלוח בינלאומי של סת"ם' href='/madrich/mishloach-lachul' />
          </div>

          <CTAStrip
            title='מתנת בר מצווה מישראל – לכל קצוות תפוצות ישראל'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'ליצירת קשר', href: '/contact', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
