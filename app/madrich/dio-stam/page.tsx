import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'דיו סת"ם – ממה עשוי הצבע השחור הקדוש?',
  description:
    'הדיו לסת"ם אינו דיו רגיל. מה זה עפצים, קנקנתום, שרף אילן ופיח? מדוע דיו סינטטי פוסל, וכיצד לדעת שהסופר משתמש בדיו כשר.',
  alternates: { canonical: `${BASE_URL}/madrich/dio-stam` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/dio-stam`,
    siteName: 'Your Sofer',
    title: 'דיו סת"ם | Your Sofer',
    description: 'מה מרכיב את הדיו הכשר לסת"ם ולמה דיו סינטטי פוסל.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'דיו סת"ם – ממה עשוי הצבע השחור הקדוש?',
  description: 'הסבר על הרכב הדיו הכשר לסת"ם – חומרים, כשרות ועמידות.',
  url: `${BASE_URL}/madrich/dio-stam`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function DioStamPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="חומרי גלם"
          title='דיו סת"ם'
          subtitle='ממה עשוי הדיו הכשר, למה כימיקלים סינטטיים פוסלים, ואיך לדעת שהסופר משתמש בחומרים נכונים'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הדיו השחור שעליו מונחת כל קדושת המזוזה, התפילין וספר התורה אינו יכול להירכש בחנות מכשירי כתיבה רגילה. דיו לסת"ם חייב להיות מיוצר בשיטות טבעיות ומסורתיות בלבד. ממה באמת עשוי הדיו הזה?
          </p>

          <QuoteBlock text='ההלכה דורשת שהדיו יהיה שחור משחור – "אפילו זרזיף אדמומיות פוסל".' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            רכיבי הדיו הכשר לסת"ם
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'עפצים', emoji: '🌿', desc: 'גידולים עגולים על עצי אלון. משמשים בסיס חומצי לדיו – "מי עפצים".' },
              { title: 'קנקנתום', emoji: '⚗️', desc: 'מלח מתכתי (גופרת הברזל) שמעניק לדיו את הצבע השחור העמוק.' },
              { title: 'שרף אילן', emoji: '🌳', desc: 'גומי ערביקום. משמש "דבק" שמצמיד את הדיו אל קלף העור.' },
              { title: 'פיח', emoji: '🖤', desc: 'עשן מצוה. מוסיף להבטיח את שחרות הדיו לאורך שנים.' },
            ].map(c => (
              <div key={c.title} style={{ background: '#f8f9ff', border: '1px solid #1E3A8A22', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1E3A8A', marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה פוסל את הדיו
          </h2>

          {[
            { title: 'ערבוב כימיקלים סינטטיים', desc: 'הוספת כימיקלים מסונתזים לתערובת הדיו – פוסלת את הדיו לחלוטין, גם אם התוצאה הגרפית נראית מצוינת.' },
            { title: 'דיו לא מבושל', desc: 'דיו שלא עבר תהליך בישול נכון ייחמצן לאחר חשיפה לשמש ויהפוך לגוון חום – פסול.' },
            { title: 'צבע אחר משחור', desc: 'אפילו גוון אדמדם קל בדיו פוסל את הקלף. כל אות חייבת להיות שחורה-פחם לחלוטין.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <span style={{ color: '#b91c1c', fontSize: 20, flexShrink: 0 }}>✗</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='מה קורה אם אות נכתבה בשחור אבל עם הזמן דהתה לאפור?' a='אם עדיין שחורה באופן ניכר לעין רגילה – כשרה. אם קיבלה גוון חום או אדמדם במובהק – הקלף נפסל.' />
          <FAQItem q='האם אפשר "לצבוע" אות שדהתה?' a='בעיה קשה מאוד. צביעה על גבי אות קיימת במזוזה ותפילין נחשבת לעיתים ל"שלא כסדרן" ומותרת רק בתנאים מאוד ספציפיים.' />
          <FAQItem q='כיצד יודעים שהסופר עובד עם דיו כשר?' a='דיו כשר מגיע עם תעודת כשרות מהבד"ץ. סופר ירא שמיים יכול להראות ולהפנות לתעודה של יצרן הדיו שהוא משתמש בו.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🖐️' title='קלף עבודת יד' desc='למה קלף ידני עדיף' href='/madrich/klaf-ivduat-yad' />
            <RelatedCard emoji='🪶' title='הקולמוס' desc='הכלים שבהם נכתבת הקדושה' href='/madrich/kulmus' />
          </div>

          <CTAStrip
            title='קלפים שנכתבו בדיו כשר ועמיד לאורך שנים'
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
