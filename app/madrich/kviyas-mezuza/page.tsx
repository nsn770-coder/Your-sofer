import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'קביעת מזוזה – מדריך שלב אחר שלב, ברכות ומנהגים',
  description:
    'איך קובעים מזוזה נכון? מה הצד הנכון, הגובה הנכון, הזווית – אשכנזים וספרדים. נוסח הברכה המלא ושאלות נפוצות על חנוכת הבית.',
  alternates: { canonical: `${BASE_URL}/madrich/kviyas-mezuza` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/kviyas-mezuza`,
    siteName: 'Your Sofer',
    title: 'קביעת מזוזה שלב אחר שלב | Your Sofer',
    description: 'מדריך מעשי לקביעת מזוזה – גובה, צד, ברכה ומנהגי עדות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'קביעת מזוזה – מדריך שלב אחר שלב, ברכות ומנהגים',
  description: 'מדריך מעשי לקביעת מזוזה: גובה, צד ימין, ברכה ומנהגי אשכנז וספרד.',
  url: `${BASE_URL}/madrich/kviyas-mezuza`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function KviyasMezuzaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="הדרכה מעשית"
          title="קביעת מזוזה"
          subtitle="מדריך שלב אחר שלב – גובה, צד, ברכה ומנהגי כל העדות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            הקלפים המהודרים כבר הגיעו, בתי המזוזה המעוצבים נבחרו בקפידה – והגיע הרגע הגדול של קביעת המזוזות. ברגע האמת צצות שאלות מעשיות: באיזה גובה בדיוק מתקינים? באיזה צד של הדלת? מה מברכים ומתי? טעות קטנה במיקום המזוזה עלולה להפוך את המצווה ללא תקינה.
          </p>

          <QuoteBlock text='שלושה כללים פשוטים: ימין, שליש עליון, ואלכסון לאשכנזים – ישר לספרדים.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שלושת כללי היסוד
          </h2>

          {[
            { num: 1, title: 'הצד הנכון', desc: 'המזוזה נקבעת תמיד בצד ימין של הנכנס לתוך החדר או הבית.' },
            { num: 2, title: 'הגובה הנכון', desc: 'המזוזה צריכה להיות מקובעת בתחילת השליש העליון של גובה הפתח – בערך בגובה הכתפיים של אדם ממוצע.' },
            { num: 3, title: 'הזווית', desc: 'אשכנזים קובעים באלכסון – ראש המזוזה פונה פנימה כלפי הבית. ספרדים ועדות המזרח קובעים ישר, בצורה אנכית.' },
          ].map(item => (
            <Step key={item.num} num={item.num} title={item.title} desc={item.desc} />
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שלבי הקביעה בפועל
          </h2>

          {[
            { title: 'גלגול ועטיפת הקלף', desc: 'מגלגלים את הקלף מסופו לתחילתו (משמאל לימין), כך שהמילה "שמע" תהיה פנימית. עוטפים את הקלף המגולגל בניילון נצמד ומכניסים לבית המזוזה.' },
            { title: 'זיהוי המיקום', desc: 'מודדים את גובה משקוף הדלת ומחלקים לשלושה חלקים שווים. המזוזה עומדת בתחילת החלק העליון. ודאו שאתם עומדים מצד ימין של הנכנס.' },
            { title: 'הברכה', desc: 'לפני קיבוע המזוזה הראשונה מברכים: "בָּרוּךְ אַתָּה ה׳ אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ לִקְבּוֹעַ מְזוּזָה." מיד לאחר הברכה אסור לדבר ויש לגשת ישר לקיבוע.' },
            { title: 'הקיבוע ורצף החדרים', desc: 'מצמידים את בית המזוזה למשקוף בברגים או דבק דו-צדדי חזק. ממשיכים לקבוע את שאר מזוזות הבית ברצף ללא הפסקה – הברכה הראשונה פוטרת את כולן.' },
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
          <FAQItem q='האם מברכים על קביעת מזוזה בחדר שירותים?' a='חס ושלום. חדרים אלו פטורים לחלוטין ממזוזה ואסור להתקין בהם מזוזה מפאת קדושת הקלף.' />
          <FAQItem q='האם מותר להדביק בית מזוזה עם דבק דו-צדדי?' a='כן, בתנאי שמדובר בדבק חזק ועמיד שמבטיח שבית המזוזה לא ייפול – המזוזה חייבת להיות "קבועה".' />
          <FAQItem q='מה עושים כשעוברים דירה שכורה?' a='שוכר דירה חייב לקבוע מזוזה בברכה בדיוק כמו בעל בית. אם השוכר הבא הוא יהודי, אסור להוריד את המזוזות.' />
          <FAQItem q='האם אישה יכולה לקבוע מזוזה ולברך?' a='בהחלט. אישה מחויבת במצוות מזוזה ממש כמו גבר ויכולה לברך ולקבוע בעצמה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🏠' title='בתי מזוזה' desc='איך לבחור את הבית הנכון' href='/madrich/batei-mezuza' />
            <RelatedCard emoji='📏' title='גודל המזוזה' desc='10, 12, 15 ס"מ – מה ההבדל?' href='/madrich/godel-mezuza' />
          </div>

          <CTAStrip
            title='מחפשים קלפים מהודרים לחנוכת הבית?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'שאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
