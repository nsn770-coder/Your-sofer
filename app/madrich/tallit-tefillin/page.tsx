import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קניית טלית יחד עם תפילין – צמר רחלים ומניעת הזעה',
  description:
    'מדוע להוסיף טלית להזמנת התפילין? ההבדל בין טלית צמר לאקרילן, הלכות שעטנז וציצית עבודת יד, ואיך לבחור מידה נכונה.',
  alternates: { canonical: `${BASE_URL}/madrich/tallit-tefillin` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tallit-tefillin`,
    siteName: 'Your Sofer',
    title: 'טלית ותפילין | Your Sofer',
    description: 'מדריך לבחירת טלית צמר מושלמת ביחד עם הזמנת תפילין.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קניית טלית יחד עם תפילין',
  description: 'כיצד לבחור טלית צמר איכותית בעת הזמנת תפילין – חומרים, הלכות ומידות.',
  url: `${BASE_URL}/madrich/tallit-tefillin`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TallitTefillinPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="טלית ותפילין"
          title="קניית טלית עם התפילין"
          subtitle="צמר רחלים נושם לעומת אקרילן מזיע – ואיך לבחור ציצית עבודת יד"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הטלית מתעטפת סביבנו ונוגעת בצוואר ובידיים בכל בוקר תפילה. מעבר לחובת הכשרות המחמירה, הטלית חייבת להיות נוחה ואוורירית, כדי שהתפילה לא תהפוך למאבק מול בד מגרד ומזיע.
          </p>

          <QuoteBlock text='100% צמר רחלים – הטלית המהודרת והמומלצת ביותר לפי כל הדעות. נושמת, נעימה, ומקיימת את המצווה לכתחילה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            צמר רחלים לעומת אקרילן
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'צמר רחלים (100% טבעי)',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['נושם ונעים', 'לא מזיע יתר על המידה', 'מקיים מצווה לפי כל הדעות', 'כיבוס יבש בלבד'],
              },
              {
                title: 'אקרילן (סינטטי)',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['מזיע ומחניק', 'עלול לגרום אלרגיות', 'חלק מהפוסקים חלוקים בחיוב ציצית', 'לא מומלץ לשימוש יומיומי'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>{c.title.includes('רחלים') ? '✓' : '✗'}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            הקפדות הלכתיות בטלית
          </h2>

          {[
            { title: 'חותמת נגד שעטנז', desc: 'חובה לוודא שאין בבד ציצית ערבוב של צמר ופשתן (שעטנז), האסור מהתורה. כל טלית צמר איכותית נושאת חותמת מעבדת שעטנז.' },
            { title: 'ציצית עבודת יד לשמה', desc: 'חוטי הציצית חייבים להיקשר על ידי אדם תוך כוונה "לשם מצוות ציצית". ציצית שנשזרה במכונה – חלק מהפוסקים חולקים על כשרותה.' },
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
          <FAQItem q='איך לבחור מידת טלית נכונה?' a='מידות סטנדרטיות: 50 (לנערים), 60 (לגבר ממוצע), 70 (לגברים גבוהים ורחבים הרוצים להתעטף היטב). מומלץ להתייעץ לפי גובה ומשקל.' />
          <FAQItem q='האם אפשר לכבס טלית צמר במכונה?' a='בשום אופן. צמר מתכווץ בכביסה חמה, וחוטי הציצית עלולים להיפרם. טלית מורידים רק לניקוי יבש אצל מומחה.' />
          <FAQItem q='כמה עולה טלית צמר רחלים איכותית?' a='טלית צמר רחלים טובה עולה בין 300 ל-1,000 ש"ח, תלוי באיכות האריגה, רוחב הפסים ואיכות חוטי הציצית.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎁' title='סט חתן' desc='טלית, תפילין ונרתיקים לחתן' href='/madrich/set-chatan' />
            <RelatedCard emoji='🎓' title='חבילות בר מצווה' desc='כל מה שצריך בסט אחד' href='/madrich/chavilot-bar-mitzva' />
          </div>

          <CTAStrip
            title='טלית מושלמת ביחד עם תפילין מהודרות'
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
