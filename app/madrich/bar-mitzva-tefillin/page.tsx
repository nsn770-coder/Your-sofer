import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תפילין לבר מצווה – המדריך המלא להורים',
  description:
    'איך בוחרים תפילין לבר מצווה? ההבדל בין עור בהמה גסה לדקה, רמות איכות, מתי לקנות, ומה חשוב לבדוק לפני הרכישה.',
  alternates: { canonical: `${BASE_URL}/madrich/bar-mitzva-tefillin` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/bar-mitzva-tefillin`,
    siteName: 'Your Sofer',
    title: 'תפילין לבר מצווה – המדריך המלא להורים | Your Sofer',
    description: 'כל מה שהורים צריכים לדעת לפני שקונים תפילין לבר מצווה.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תפילין לבר מצווה – המדריך המלא להורים',
  description: 'איך בוחרים תפילין לבר מצווה – רמות איכות, חומרים, נוסחים, ומה חשוב לבדוק.',
  url: `${BASE_URL}/madrich/bar-mitzva-tefillin`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BarMitzvaTefillinPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="מדריך הורים"
          title="תפילין לבר מצווה"
          subtitle="המדריך המלא להורים – מה לקנות, מתי, ומה חשוב לבדוק"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            רכישת תפילין לבר מצווה היא אחת ההחלטות הגדולות שהורים עושים לקראת הבר מצווה. תפילין טובות ילוו את הבן לעשרות שנים – בצבא, באוניברסיטה, מתחת לחופה וביום-יום. לכן כדאי להבין את האפשרויות לפני שמחליטים.
          </p>

          <QuoteBlock text="תפילין טובות לבר מצווה הן לא בזבוז – הן השקעה שמלווה את הבן לכל החיים." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            מתי לקנות תפילין?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            מומלץ לרכוש לפחות חודש-חודשיים לפני הבר מצווה. הסיבות: הילד צריך ללמוד כיצד להניח, לרב יש זמן לבדוק אם צריך כיוונים, ויש זמן לטפל בכל עיכוב אפשרי.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            חסידי חב"ד נוהגים להתחיל להניח תפילין כבר חצי שנה לפני הבר מצווה – לכן יש צורך בתפילין עוד מוקדם יותר.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            עור בהמה גסה מול עור בהמה דקה
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            אחד ההבדלים החשובים ביותר שרוב ההורים אינם מודעים אליו הוא חומר הבתים – הקופסאות שמכילות את הפרשיות.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'בהמה גסה (מומלץ)',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: [
                  'עשוי מחתיכת עור שור עבה אחת',
                  'מיוצר בלחיצה של טונות',
                  'עמיד לחות, זיעה ושינויי טמפרטורה',
                  'שומר על צורה מרובעת לאורך שנים',
                  'הסטנדרט המומלץ על ידי הפוסקים',
                ],
              },
              {
                title: 'בהמה דקה (נמנעים)',
                color: '#9c2a2a',
                bg: '#fff5f5',
                items: [
                  'עור דק שמודבק ומכופף',
                  'רגיש ללחות ולשינויי טמפרטורה',
                  'הפינות נשחקות מהר',
                  'תפילין מרובעות = תנאי כשרות',
                  'עלול לגרום לפסול תוך שנים',
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

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            רמות האיכות – מה ההבדל?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'כשר',
                color: '#0e6ba8',
                bg: '#e8f4fd',
                items: ['עומד בדרישות ההלכה', 'מחיר נגיש', 'מתאים לתקציב מוגבל', 'מצווה מקוימת לחלוטין'],
              },
              {
                title: 'מהודר',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['כתיבה ברמה גבוהה', 'הידורים מעבר לדין', 'מומלץ לרוב', 'ילווה שנים ארוכות'],
              },
              {
                title: 'מהודר מאוד',
                color: '#7c3a00',
                bg: '#fff8f0',
                items: ['הרמה הגבוהה ביותר', 'בדיקות מרובות', 'למהדרים', 'השקעה לדורות'],
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
            מה כלול ברכישת תפילין?
          </h2>

          <Step num={1} title="הפרשיות" desc="ארבע פרשיות כתובות על קלף בכתב יד – הן לב התפילין ומשפיעות הכי הרבה על המחיר. כדאי לבקש צילום או אישור רשמי של איכות הכתב." />
          <Step num={2} title="הבתים" desc="הקופסאות שמכילות את הפרשיות. הסטנדרט המומלץ: בהמה גסה (עור שור). ובתפילין של ראש – יש לוודא שהתאים פרודים לחלוטין לפי הדרישה ההלכתית." />
          <Step num={3} title="הרצועות" desc="רצועות עור שחורות. יש לוודא שהן כשרות (צבועות בצד הנכון) ועשויות מעור עליון מושחר משני הצדדים." />
          <Step num={4} title="אביזרי הגנה" desc="כיסויים קשיחים לבתים ונרתיק טרמי לנסיעות. חשובים במיוחד לנערים שיתגייסו לצבא – חום קיצוני עלול לעוות את ריבוע הבתים." />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            אשכנזי או ספרדי?
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            הנוסח נקבע לפי מסורת המשפחה – לא לפי העדפה אישית. אם האב מניח אשכנזי, הבן יניח אשכנזי. אם ספרדי – ספרדי. בחסידי חב"ד: כתב האר"י. יש לציין את הנוסח המבוקש בעת ההזמנה.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בנוסף, יש הבדל בין תפילין "רש"י" לתפילין "ר"ת" (רבינו תם). רוב האנשים מניחים רש"י; יש שמניחים גם ר"ת – שאלה הלכתית שכדאי לברר עם הרב.
          </p>

          <QuoteBlock text='תפילין הן מצווה יומיומית לכל החיים – שווה להשקיע בהן כראוי.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='מה כוללת חבילת תפילין איכותית לבר מצווה?' a='חבילה מהודרת כוללת: בתי תפילין מבהמה גסה, פרשיות כשרות ומהודרות, רצועות עור עליון מושחרות משני הצדדים, כיסויים קשיחים מגנים, ונרתיק נשיאה מכובד.' />
          <FAQItem q='כמה עולות תפילין לבר מצווה?' a='המחיר נע בין כמה מאות שקלים לכמה אלפים, תלוי ברמת ההידור. תפילין כשרות בסיסיות מתחילות מ-800-1,200 ש"ח; מהודרות מ-2,000 ש"ח ומעלה.' />
          <FAQItem q='האם נער ימני ושמאלי מניחים את אותן התפילין?' a='לא. נער ימני מניח תפילין על יד שמאל, ונער שמאלי (איטר) מניח על יד ימין. הכיוון שאליו פונה הרצועה משתנה בהתאם, ויש לציין זאת במפורש בעת ההזמנה.' />
          <FAQItem q='האם צריך לבדוק תפילין ישנות?' a='כן. מומלץ לבדוק תפילין אצל סופר מוסמך כל כמה שנים, ובוודאי לאחר נזק מים, חום קיצוני או נפילה. תפילין שעמדו בארון שנים עלולות לסבול מדיו סדוק.' />
          <FAQItem q='האם אפשר לתת תפילין ירושה?' a='כן, תפילין ישנות כשרות הן מתנה יקרת ערך. חשוב לבדוק אותן אצל סופר מוסמך לפני השימוש – פעמים רבות נמצאות בהן בעיות כשרות שלא ניכרות לעין.' />
          <FAQItem q='מה ההבדל בין "גסות" ל"דקות" בתפילין?' a='"גסות" מתייחס לגודל הבתים – גדולות יותר. "דקות" קטנות יותר. ברוב המסורות משתמשים בגסות.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='📜' title='נוסחי הסת"ם' desc='אשכנזי, ספרדי, האר"י – מה ההבדל?' href='/madrich/nosachim' />
            <RelatedCard emoji='🖐️' title='קלף עבודת יד מול מכונה' desc='למה זה משנה?' href='/madrich/klaf-ivduat-yad' />
          </div>

          <CTAStrip
            title="מחפשים תפילין לבר מצווה?"
            buttons={[
              { label: 'לצפייה בתפילין ←', href: '/category/תפילין', variant: 'primary' },
              { label: 'לשאלות נוספות', href: '/madrich/ultimate-faq', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
