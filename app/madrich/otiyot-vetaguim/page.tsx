import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'סודות האותיות והתגים בסת"ם – כתר האותיות ועומק הלכתי',
  description:
    'מה זה תגים? למה יש לאותיות מסוימות כתרים? חוקי כתיבת האותיות בסת"ם, שעטנ"ז ג"ץ, קוצו של יוד, ומה פוסל מזוזה.',
  alternates: { canonical: `${BASE_URL}/madrich/otiyot-vetaguim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/otiyot-vetaguim`,
    siteName: 'Your Sofer',
    title: 'סודות האותיות והתגים בסת"ם | Your Sofer',
    description: 'מה זה תגים, למה הם חשובים, ואיזה אותיות מקבלות כתרים.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'סודות האותיות והתגים בסת"ם',
  description: 'הסבר על תגים, כתרים, חוקי כתיבת האותיות בסת"ם – מה הם ולמה הם חשובים.',
  url: `${BASE_URL}/madrich/otiyot-vetaguim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function OtiyotVetaguimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge='סודות הכתיבה'
          title='האותיות והתגים בסת"ם'
          subtitle='כתרים, שינויי צורה, ולמה כל פרט קטן יכול להפוך אות לפסולה'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כאשר מסתכלים על קלף מזוזה מקרוב, ניתן לראות שרוב האותיות מוכרות – אבל חלקן מקושטות בקווים קטנים בראשן. אלו הם ה"תגים" – אחד ממאפייני הסת"ם שרוב האנשים אינם מודעים אליו. בעולם הסת"ם, לכל קוץ, לכל תג ולכל מרווח יש משמעות הלכתית קריטית שיכולה לחרוץ את גורל הקלף לכשר או פסול.
          </p>

          <QuoteBlock text='חז"ל אמרו: "תגין שעל גבי האותיות" הם מסורת למשה מסיני – עתיקים ומדויקים.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה זה תגים?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            תגים (מארמית: "כתרים") הם קווים קטנים שנמשכים כלפי מעלה מראש האות. הם אינם חלק מצורת האות הבסיסית, אלא הידור נוסף שמסורתו עוד ממשה רבנו. ההלכה קובעת כי שבע אותיות ספציפיות חייבות לקבל שלושה תגים כל אחת. אותיות אחרות מקבלות תג אחד בהתאם למנהג.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            יש שתי מסורות עיקריות לתגים: תגי "שעטנ"ז ג"ץ" ותגי "אותיות יש ביאה". בנוסח האר"י יש מערכת תגים שונה מעט. כל תג חייב להיות מופרד ונוגע בדיוק בראש האות הנכונה – תג שמנותק לחלוטין או נוגע באות שלידה פוסל.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            אותיות שעטנ"ז ג"ץ
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            שבע האותיות שי"ן, עי"ן, טי"ת, נו"ן, זיי"ן, גימ"ל, צדי"ק – מקבלות שלושה תגים כל אחת. אלו התגים החשובים ביותר. מחסורם אינו פוסל את הכתיבה בדיעבד, אך מהווה חסרון בהידור. סופר מקצועי לא יוציא קלף ללא תגים תקינים.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, margin: '20px 0 32px' }}>
            {['ש', 'ע', 'ט', 'נ', 'ז', 'ג', 'צ'].map(letter => (
              <div key={letter} style={{
                background: '#fdf8ee',
                border: '2px solid #C5A028',
                borderRadius: 10,
                padding: '20px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#1E3A8A', lineHeight: 1 }}>{letter}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>3 תגים</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            חוקי כתיבת האותיות – מרווחים וצורה
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מלאכת הסופר נמדדת במספר חוקים גרפיים נוקשים שאינם נראים לעין הרגילה:
          </p>

          {[
            { title: 'מרווח בין אות לאות', desc: 'המרחק בין האותיות בתוך מילה חייב להיות אחיד: לא קרוב מדי (שלא ייגעו ויפסלו) ולא רחוק מדי (שלא תיראה המילה מחולקת). המרווח בין מילה למילה – כמלוא אות קטנה (האות יו"ד).' },
            { title: 'גג וירך', desc: 'לכל אות יש "גג" (הקו האופקי העליון) ו"ירך" (הקו האנכי היורד). הסופר חייב לשמור על יחס נכון ביניהם. אם הגג של האות רי"ש קצר מדי – היא עלולה להיראות כוא"ו, וזהו פסול חמור.' },
            { title: 'קוצו של יוד', desc: 'האות יו"ד היא הקטנה באותיות, אך מכילה קוץ קטן בצד שמאל למטה ולמעלה. ההלכה מקפידה מאוד על קיומם, ומכאן הביטוע "להקפיד על קוצו של יוד".' },
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
            למה צורת האות משנה?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            לכל אות עברית בסת"ם יש צורה מדויקת שנקבעה בהלכה. שינוי בצורת האות – גם אם קטן – יכול לפסול אותה. הבדיקה המקובלת היא "שאלת תינוק" – ילד שאינו חכם במיוחד ואינו טיפש, שאינו מכיר את הטקסט, נשאל כיצד הוא קורא את האות. אם הוא טועה – האות פסולה.
          </p>

          {[
            { pair: 'ד/ר', desc: 'הדל"ת יש לה גג מרובע עם פינה; הרי"ש עגולה. אם הדל"ת נראית כרי"ש – פסולה.' },
            { pair: 'ב/כ', desc: 'הבי"ת שטוחה למטה; הכ"ף עגולה. אם הבי"ת נסגרת מלמטה – עלולה להיפסל.' },
            { pair: 'ה/ח', desc: 'הה"א יש לה רגל נפרדת משמאל; החי"ת מחוברת. חיבור לא נכון פוסל.' },
            { pair: 'ו/י', desc: 'הוא"ו ארוכה יותר מהיו"ד. שתי אותיות שנבדלות בגודל – אם זהות, שתיהן פסולות.' },
          ].map(item => (
            <div key={item.pair} style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '16px', background: '#fff', borderRadius: 8, border: '1px solid #e0e0e0' }}>
              <div style={{ background: '#1E3A8A', color: '#C5A028', fontWeight: 900, fontSize: 18, minWidth: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.pair}</div>
              <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>{item.desc}</div>
            </div>
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה בודק המגיה?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            המגיה (בודק הסת"ם) עובר על כל אות בהגדלה, בודק שכל צורת אות תקינה, שהתגים במקומם ושאין אות שנגעה באות אחרת (נגיעה פוסלת). מערכת בדיקת מחשב מכוילת לזהות אפילו שברים מזעריים בתגים ונגיעות בין אותיות. בדיקה מקצועית לוקחת מספר שעות לכל קלף.
          </p>

          <QuoteBlock text='הסופר כותב את הקדושה – המגיה שומר עליה.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='מה קורה אם תג של האות ש׳ נוגע בתג של האות שלידה?' a='נגיעה בין תגים או בין אותיות פוסלת את המזוזה מיד. במקרים מסוימים, אם הנגיעה לא שינתה את צורת האות הבסיסית, מגיה מוסמך יכול להפריד בעדינות באמצעות גירוד – אך רק אם אין עיוות של "חק תוכות".' />
          <FAQItem q='האם מזוזה ללא תגים פסולה?' a='לא, מזוזה ללא תגים (בשעטנ"ז ג"ץ) אינה פסולה, אך חסרה הידור. לדעת רוב הפוסקים, מצב האותיות עצמן הוא הקובע לכשרות.' />
          <FAQItem q='מי יכול לבדוק את התגים?' a='סופר סת"ם מוסמך יכול לבדוק את התגים. אם אינכם בטוחים, שלחו את המזוזה לבדיקה.' />
          <FAQItem q='האם ניתן לראות את התגים בתמונה?' a='כן. בתמונות ברזולוציה גבוהה של הקלפים, ניתן לראות בבירור את התגים על האותיות.' />
          <FAQItem q='מה ההבדל בין תגים לכתב?' a='הכתב הוא צורת האות עצמה (משפיעה על הכשרות); התגים הם הוספות קטנות מעל האות (משפיעות על ההידור).' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='⭐' title='מה זה מזוזה מהודרת' desc='ההבדל בין כשר למהודר' href='/madrich/mehudar' />
            <RelatedCard emoji='🔍' title='תהליך הבדיקה' desc='איך נבדקת כל מזוזה' href='/madrich/bedika' />
          </div>

          <CTAStrip
            title='רוצים לראות קלפים עם תגים יפים?'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'עוד על הסת"ם', href: '/madrich', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
