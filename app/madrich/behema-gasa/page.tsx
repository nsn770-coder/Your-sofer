import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'עור בהמה גסה מול בהמה דקה בתפילין – למה לא להתפשר?',
  description:
    'מה ההבדל בין תפילין מבהמה גסה לבהמה דקה? מדוע בהמה גסה שומרת על ריבוע לאורך עשרות שנים, ואיך מזהים מבחוץ איזה סוג מונח בידיים.',
  alternates: { canonical: `${BASE_URL}/madrich/behema-gasa` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/behema-gasa`,
    siteName: 'Your Sofer',
    title: 'בהמה גסה לעומת בהמה דקה בתפילין | Your Sofer',
    description: 'מדריך להבנת ההבדל בין סוגי עור התפילין וחשיבות הבחירה הנכונה.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'עור בהמה גסה מול בהמה דקה בתפילין',
  description: 'ההבדל בין תפילין מבהמה גסה לבהמה דקה – עמידות, כשרות וטווח ארוך.',
  url: `${BASE_URL}/madrich/behema-gasa`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function BehemaGasaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="חומרי גלם"
          title="בהמה גסה לעומת בהמה דקה"
          subtitle="למה לא להתפשר בבחירת עור התפילין – השקעה לכל החיים"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            כשרוכשים תפילין, מוצגות לרוב שתי אפשרויות לבתי התפילין: בהמה דקה ובהמה גסה. פער המחירים ביניהן יכול להגיע לאלפי שקלים. אולם בטווח הארוך, החיסכון מתברר כהוצאה כפולה ועוגמת נפש של חוסר כשרות.
          </p>

          <QuoteBlock text='ה"ריבוע" של התפילין הוא נתון הלכתי קריטי – תפילין שפינותיהן התעגלו פסולות.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            ההבדל בין שני הסוגים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              {
                title: 'בהמה דקה (כבש/עיזים)',
                color: '#b91c1c',
                bg: '#fef2f2',
                items: ['עור עדין ודק', 'כמה חתיכות מודבקות', 'פינות מתעגלות מהר', 'רגיש לזיעה ולחות', 'אורך חיים קצר יחסית'],
              },
              {
                title: 'בהמה גסה (שור/פרה)',
                color: '#1a5c3a',
                bg: '#f0fff5',
                items: ['עור עבה מקשה אחת', 'לחץ של עשרות טונות בייצור', 'קשה כמו פלסטיק דחוס', 'עמיד עשרות שנים', 'שומר ריבוע מושלם'],
              },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>•</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 16, lineHeight: 1.8, color: '#444', marginBottom: 16 }}>
            בתפילין דקות משתמשים לעיתים בדבק כדי להחזיק את המבנה המרובע ("תפילין פשוטות"), והדבק מאבד מיעילותו בחום. לעומת זאת, תפילין בהמה גסה מבוססות על עיצוב של חומר טבעי עבה מקשה אחת – מה שהופך אותן למהודרות יותר לכל הדעות ועמידות כמעט לחלוטין בפני פגעי הזמן.
          </p>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='איך מבדילים מבחוץ בין בהמה דקה לגסה?' a='תפילין גסות מרגישות כבדות וקשיחות הרבה יותר (כמו פלסטיק דחוס). בתפילין דקות העור בבסיס נראה מקופל ומודבק ויש להן תחושה חלולה וקלה.' />
          <FAQItem q='כמה שנים מחזיקות תפילין מבהמה גסה?' a='עם שמירה נכונה – עשרות שנים ואף לכל החיים. גברים רבים מורידים בירושה לילדיהם תפילין מבהמה גסה שנשארו בריבוע מושלם אחרי 30-40 שנה.' />
          <FAQItem q='האם תפילין מבהמה דקה הן פסולות?' a='לא בהכרח פסולות מלכתחילה, אך הפינות מתעגלות בצורה ניכרת לאחר מספר שנות שימוש אינטנסיבי, מה שמוביל בסופו של דבר לפסלות.' />
          <FAQItem q='מה המחיר הממוצע לתפילין בהמה גסה?' a='תפילין בהמה גסה מהודרות עולות בין 1,500 ל-4,000 ש"ח ומעלה תלוי ברמת הידור הקלף ואיכות הבתים. זו השקעה לחיים ולא להחלפה.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🔧' title='תיקון תפילין' desc='מתי שווה לשפץ ומתי לקנות חדש' href='/madrich/tikun-tefillin' />
            <RelatedCard emoji='🎓' title='תפילין לבר מצווה' desc='מדריך לבחירת הסט הראשון' href='/madrich/bar-mitzva-tefillin' />
          </div>

          <CTAStrip
            title='תפילין מבהמה גסה – השקעה לכל החיים'
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
