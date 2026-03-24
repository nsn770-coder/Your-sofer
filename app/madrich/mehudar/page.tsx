'use client';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard } from '../InfoComponents';

export default function MehudarPage() {
  return (
    <ArticleLayout>
      <PageHero
        badge="מדריך איכות"
        title="מה זה מזוזה מהודרת באמת?"
        subtitle="לא כל מזוזה כשרה היא מהודרת — הנה ההבדלים שחשוב להכיר"
      />

      <div style={{ padding: '40px 0' }}>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          "כשר" ו"מהודר" — שתי מילים שנשמעות דומות, אבל מתארות דברים שונים מאוד. הבנת ההבדל יכולה לשנות את ההחלטה שלכם.
        </p>

        <QuoteBlock text="כשר פירושו עמידה בדרישות. מהודר פירושו שמישהו שם לב גם כשלא היה חייב." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          מה הופך מזוזה לכשרה?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מזוזה כשרה היא כזו שעמדה בכל דרישות ההלכה: האותיות תקינות, הסדר נכון, הכוונה הייתה כראוי. זה הבסיס. בלי זה — אין מזוזה.
        </p>

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          מה מוסיף ה"הידור"?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מזוזה מהודרת עומדת בבסיס — ועוד הרבה מעבר לזה. הסופר בחר לכתוב בצורה יפה ומדוקדקת גם כשלא היה חייב. הוא הקדיש זמן לכל אות, לכל שורה, לכל הצטרפות.
        </p>

        {/* Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '28px 0 36px' }}>
          {[
            {
              title: 'כשר',
              color: '#0e6ba8',
              bg: '#e8f4fd',
              items: [
                'עומדת בדרישות ההלכה',
                'אותיות תקינות',
                'כוונה כראוי',
                'כל אות מזוהה',
                'מקיים מצווה',
              ],
            },
            {
              title: 'מהודר',
              color: '#1a5c3a',
              bg: '#f0fff5',
              items: [
                'כל דרישות "כשר" +',
                'כתיבה יפה ומדוקדקת',
                'עקביות בצורת האותיות',
                'שורות ישרות ומאוזנות',
                'עובי עט אחיד',
                'סופר שלקח זמן',
              ],
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

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          מה בדיוק בודקים במזוזה מהודרת?
        </h2>

        {[
          { title: 'צורת האותיות', desc: 'כל אות בסת"ם יש לה צורה מדויקת. מהודרת = כל אות קרובה לצורה האידיאלית.' },
          { title: 'רווחים ומרחקים', desc: 'הרווחים בין מילים ובין אותיות — עקביים ומאוזנים.' },
          { title: 'ישרות השורות', desc: 'השורות מרוּוחות ומישרות על פני הקלף.' },
          { title: 'עובי הכתיבה', desc: 'העט נמשך באחידות — ללא לחצים לא אחידים או דהייה.' },
          { title: 'תגים ועיטורים', desc: 'האותיות שדורשות תגים — יש להן תגים יפים ומדויקים.' },
        ].map(item => (
          <div key={item.title} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
            <span style={{ color: '#b8972a', fontSize: 20, flexShrink: 0 }}>✦</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0c1a35', marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          </div>
        ))}

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 16px' }}>
          האם אני צריך מהודרת?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          ההלכה מעדיפה הידור במצוות. אבל גם מזוזה כשרה (שאינה מהודרת) ממלאת את המצווה. הבחירה תלויה בתקציב, ברצון, ובמשמעות האישית שנותנים למזווה.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
          מה שחשוב: לדעת מה אתם קונים. לא לשלם על "מהודר" ולקבל "כשר בלבד".
        </p>

        <QuoteBlock text="לא חשוב מה תבחרו — חשוב שתדעו בדיוק מה אתם מקבלים." />

        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="💸" title="למה לא לקנות מזוזה זולה" desc="הקשר בין מחיר ואיכות" href="/madrich/mezuza-zola" />
          <RelatedCard emoji="🔍" title="איך אנחנו בודקים" desc="תהליך הבדיקה שלנו" href="/madrich/bedika" />
        </div>

        <CTAStrip
          title="רוצים לראות מזוזות מהודרות?"
          buttons={[
            { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
            { label: 'רוצים להבין מה מתאים לכם?', href: '/madrich/faq', variant: 'secondary' },
          ]}
        />
      </div>
    </ArticleLayout>
  );
}
