import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'חבילות בר מצווה מקיפות – איך לבחור את השילוב הנכון?',
  description:
    'תפילין, טלית, נרתיקים, סידור – כל מה שצריך בחבילה אחת לבר מצווה. כיצד בוחרים חבילה מקיפה מישראל ומה חייב להיות בה מבחינה הלכתית.',
  alternates: { canonical: `${BASE_URL}/madrich/chavilot-bar-mitzva` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/chavilot-bar-mitzva`,
    siteName: 'Your Sofer',
    title: 'חבילות בר מצווה מקיפות | Your Sofer',
    description: 'מדריך לבחירת חבילת בר מצווה – תפילין, טלית, נרתיקים ועוד.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'חבילות בר מצווה מקיפות – תפילין, טלית וכל הפרטים',
  description: 'כיצד לבחור חבילת בר מצווה מלאה מישראל ומה הסטנדרטים ההלכתיים שחובה לעמוד בהם.',
  url: `${BASE_URL}/madrich/chavilot-bar-mitzva`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function ChavilotBarMitzvaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="בר מצווה"
          title="חבילות בר מצווה מקיפות"
          subtitle="תפילין, טלית, נרתיקים וסידור – הדרך החכמה לרכוש הכל בסנכרון הלכתי ועיצובי"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            חבילת בר מצווה מקיפה מרכזת את כל הפריטים הדרושים לנער תחת קורת גג אחת ובסנכרון עיצובי והלכתי מלא. במקום לרוץ בין חנות תפילין, חנות תשמישי קדושה ומפעל רקמה – אפשר לקבל סט מושלם הכולל תפילין מהודרות, טלית מצמר רחלים, סידור מפואר ונרתיקים תואמים מעוצבים עם שם הנער.
          </p>

          <QuoteBlock text='רכישת חבילה מובנית מפחיתת עלויות תיווך ומבטיחה שכל החלקים עומדים באותה רמת כשרות והידור.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה חייב להיות בחבילה איכותית
          </h2>

          {[
            { title: 'תפילין בהמה גסה מובחרות', desc: 'אין להתפשר על בהמה דקה בשום אופן. הסט חייב לכלול בתים חזקים ויציבים משור, עם פרשיות שנכתבו על ידי מומחה בסגנון הכתיבה התואם לעדת הנער.' },
            { title: 'טלית צמר איכותית עם קשירת ציצית מוסמכת', desc: 'הטלית צריכה להיות עשויה 100% צמר טהור. הציציות צריכות להיקשר על ידי אדם ירא שמיים המכוון "לשם מצוות ציצית" – לא ייצור מכונה.' },
            { title: 'הגנה קשיחה לתפילין', desc: 'החבילה חייבת לכלול כיסויי פלסטיק קשיחים השומרים על הפינות המרובעות של התפילין מפני מכות במהלך הנסיעות של הנער.' },
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
            רכיבי החבילה האופיינית
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'תפילין', emoji: '📿', items: ['בהמה גסה', 'כתב לפי מנהג משפחה', 'בדיקת מחשב + מגיה', 'מגני פינות קשיחים'] },
              { title: 'טלית', emoji: '🕍', items: ['100% צמר רחלים', 'ציצית עבודת יד', 'חותמת נגד שעטנז', 'מידה מותאמת לגיל'] },
              { title: 'נרתיקים', emoji: '🎁', items: ['קטיפה או עור', 'רקמה עם שם הנער', 'עיצוב תואם', 'מארז מתנה מפואר'] },
            ].map(c => (
              <div key={c.title} style={{ background: '#f8f9ff', border: '1px solid #1E3A8A33', borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 17, color: '#1E3A8A', marginBottom: 14 }}>{c.emoji} {c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: '#1E3A8A' }}>✓</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='כמה זמן מראש כדאי להזמין חבילת בר מצווה?' a='מומלץ להזמין לפחות 2-3 חודשים לפני הבר מצווה או תחילת אימוני ההנחה. כך הסופר כותב בריכוז ולא בלחץ, וזמן משלוח לחו"ל לא יהפוך לגורם לחץ.' />
          <FAQItem q='האם ניתן להתאים אישית צבעים ועיצובים בחבילה?' a='כן. ניתן לבחור פסים קלאסיים או עיצוב מודרני, קטיפה או עור לנרתיקים, ורקמה בעברית או אנגלית.' />
          <FAQItem q='האם חבילה מישראל עוברת מכס בחו"ל?' a='פריטי דת ותשמישי קדושה נהנים לעתים מפטורים מכסוניים במדינות רבות. מומלץ לבדוק עם השלחן ביחס לספציפי למדינתכם.' />
          <FAQItem q='מה הדין בתפילין שהוזמנו לשמאלי?' a='חובה לציין בעת ההזמנה שהנער שמאלי. הכיוון שבו עוברת הרצועה משתנה ואין אפשרות לתקן בדיעבד ללא פתיחת התפירות.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🎓' title='תפילין לבר מצווה' desc='מדריך לבחירת הסט הראשון' href='/madrich/bar-mitzva-tefillin' />
            <RelatedCard emoji='💰' title='מחירי סופרי סת"ם' desc='מה מרכיב מחיר הוגן' href='/madrich/michrei-soferim' />
          </div>

          <CTAStrip
            title='מחפשים חבילת בר מצווה מושלמת?'
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
