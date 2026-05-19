import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'ספר תורה – כל מה שצריך לדעת לפני שמזמינים',
  description:
    'מדריך מקיף להזמנת ספר תורה: כמה זמן לוקח, מה המחיר, איך בוחרים סופר, ומה ההבדל בין כתיבת ספר תורה חדש לשיפוץ ישן.',
  alternates: { canonical: `${BASE_URL}/madrich/sefer-torah` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/sefer-torah`,
    siteName: 'Your Sofer',
    title: 'ספר תורה – כל מה שצריך לדעת | Your Sofer',
    description: 'מדריך להזמנת ספר תורה – תהליך, עלות, ובחירת סופר.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'ספר תורה – כל מה שצריך לדעת לפני שמזמינים',
  description: 'מדריך מקיף להזמנת ספר תורה חדש או שיפוץ ספר תורה ישן.',
  url: `${BASE_URL}/madrich/sefer-torah`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function SeferTorahPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מדריך ספר תורה"
          title="ספר תורה – כל מה שצריך לדעת"
          subtitle="לפני שמזמינים – תהליך, עלות, ובחירת הסופר הנכון"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כתיבת ספר תורה היא מצווה מהתורה – "כתבו לכם את השירה הזאת". מדובר בפרויקט משמעותי שדורש תכנון מראש, הבנה של התהליך, ובחירה מושכלת של סופר. מדריך זה יסביר את כל מה שצריך לדעת.
          </p>

          <QuoteBlock text="ספר תורה אינו רק ספר – הוא מצווה שמלווה את הקהילה לדורות." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            כמה זמן לוקח לכתוב ספר תורה?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            כתיבת ספר תורה שלם לוקחת בין שנה לשלוש שנים, תלוי בסופר ובהיקף העבודה. ספר תורה כולל 304,805 אותיות – כל אחת נכתבת בידי הסופר עם כוונה מיוחדת. לכן, ספר תורה שנכתב בפחות משנה עשוי להעיד על פשרה באיכות.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מה עולה ספר תורה?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מחיר ספר תורה חדש נע בין 25,000 ל-120,000 ש"ח ומעלה. הפרש המחיר נובע מ:
          </p>
          {[
            { title: 'רמת הכתיבה', desc: 'כתב פשוט מהיר מול כתב מהודר מאוד שלוקח שלוש פעמים יותר זמן.' },
            { title: 'איכות הקלף', desc: 'קלף עבודת יד מול קלף מכונה – הבדל משמעותי במחיר ובאיכות.' },
            { title: 'הסופר', desc: 'סופרים מנוסים עם שם בקהילה גובים יותר – לעיתים בצדק.' },
            { title: 'תיקונים ובדיקות', desc: 'ספר תורה מהודר עובר בדיקות מרובות של מגיה – מה שמעלה את העלות.' },
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
            תהליך הזמנת ספר תורה
          </h2>
          <Step num={1} title="פגישה עם הסופר" desc="הכירו את הסופר – ראו דוגמאות מכתבו, שאלו על ניסיונו, ובדקו שיש לו הסמכה מוכרת." />
          <Step num={2} title="בחירת מפרט" desc="קלף עבודת יד או מכונה? נוסח הכתיבה? רמת ההידור? הגדירו את הדרישות מראש." />
          <Step num={3} title="חוזה ולוח זמנים" desc="חתמו על הסכם ברור שכולל תאריך יעד, מחיר כולל, ואפשרות לביקורות ביניים." />
          <Step num={4} title="מעקב ובדיקות" desc="מומלץ לבקש עדכונים תקופתיים ולשלוח לבדיקת מגיה מוסמך לפחות פעמיים במהלך הכתיבה." />
          <Step num={5} title="הגהה סופית" desc="לפני קבלת הספר, שלחו אותו לבדיקה מקיפה אצל מגיה שאינו הסופר עצמו." />
          <Step num={6} title="חגיגת סיום התורה" desc="המנהג הנפוץ הוא לערוך חגיגה שבה חברי הקהילה כותבים את האותיות האחרונות." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שיפוץ ספר תורה ישן
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            ספר תורה ישן שיצא לגלאי (נמצאו בו טעויות) אינו כשר לקריאה, אך ניתן לשפץ אותו. תהליך השיפוץ כולל בדיקה מקיפה, תיקון האותיות הפגומות, והחלפת קלפים שאינם ניתנים לתיקון. עלות שיפוץ נעה בין 5,000 ל-30,000 ש"ח תלוי במצב הספר.
          </p>

          <QuoteBlock text='ספר תורה ישן ששופץ כראוי כשר ויפה לא פחות מחדש.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='מה זה "הכנסת ספר תורה"?' a='חגיגה ציבורית שבה ספר תורה חדש מובא לבית הכנסת. בדרך כלל נערכת תהלוכה ברחובות עם שמחה ומוזיקה.' />
          <FAQItem q='האם ספר תורה שנרכש מהאינטרנט כשר?' a='תלוי לחלוטין בסופר. חשוב לוודא שהסופר מוסמך, לבקש אישור מגיה, ולוודא שהספר נבדק כראוי לפני קבלתו.' />
          <FAQItem q='מהו ספר תורה "ממוחזב"?' a='ספר תורה שנכתב על ידי מכונות דפוס – פסול לחלוטין. ספר תורה חייב להיכתב בידי אדם, אות אחר אות, בכוונה.' />
          <FAQItem q='האם ניתן לתת ספר תורה במתנה לבית כנסת?' a='כן, ומדובר במצווה גדולה. כדאי לתאם מראש עם הנהלת בית הכנסת ולוודא שהספר מתאים לנוסח המתפללים.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='מי הסופרים' desc='קריטריונים לבחירת סופר מוסמך' href='/madrich/soferim' />
            <RelatedCard emoji='🖐️' title='קלף עבודת יד מול מכונה' desc='ההבדל בחומר הגלם' href='/madrich/klaf-ivduat-yad' />
          </div>

          <CTAStrip
            title="מחפשים סופר לספר תורה?"
            buttons={[
              { label: 'לרשימת הסופרים ←', href: '/soferim', variant: 'primary' },
              { label: 'לצור קשר', href: '/contact', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
