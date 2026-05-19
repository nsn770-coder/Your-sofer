import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'משמעות "שמע ישראל" במזוזה ובתפילין',
  description:
    'מדוע דווקא פרשיות "שמע" ו"והיה" נמצאות במזוזה? מה זה "אותיות רבתי" בקלף, ומהי המשמעות הרוחנית של הע' הגדולה בשמע והד' הגדולה באחד.',
  alternates: { canonical: `${BASE_URL}/madrich/shema-israel` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/shema-israel`,
    siteName: 'Your Sofer',
    title: 'שמע ישראל במזוזה ובתפילין | Your Sofer',
    description: 'הסבר על הטקסט הקדוש שבמזוזה – פרשיות, אותיות רבתי ומשמעות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'משמעות "שמע ישראל" במזוזה ובתפילין',
  description: 'הסבר על הטקסט שבמזוזה ובתפילין – פרשיות "שמע", אותיות רבתי ומשמעותם.',
  url: `${BASE_URL}/madrich/shema-israel`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function ShemaIsraelPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="עומק רוחני"
          title='שמע ישראל במזוזה ובתפילין'
          subtitle='הטקסט שמחבר יהודים מכל רחבי העולם – המשמעות ואותיות הסוד'
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            מתחת לכל ההקפדות ההלכתיות מסתתר הטקסט החזק והעוצמתי ביותר במסורת היהודית: "שְׁמַע יִשְׂרָאֵל ה' אֱלֹהֵינוּ ה' אֶחָד". מדוע דווקא פרשיות אלו נבחרו להישמר בתוך בתי התפילין שעל ראשנו, ובכניסה לבתים שבהם אנו גרים?
          </p>

          <QuoteBlock text='המזוזה היא תעודת הזהות של הבית היהודי – ה"שמע" שבפנים מזכיר לדיירים מי הם ומה שורשיהם.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            הפרשיות שבמזוזה ובתפילין
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'מזוזה', color: '#1E3A8A', bg: '#f0f4ff', items: ['פרשת שמע (דברים ו:ד-ט)', 'פרשת והיה אם שמוע (דברים יא:יג-כא)', 'הצהרת אחדות הבורא', 'קבלת עול מצוות'] },
              { title: 'תפילין', color: '#1a5c3a', bg: '#f0fff5', items: ['קדש (שמות יג:א-י)', 'והיה כי יביאך (שמות יג:יא-טז)', 'שמע (דברים ו:ד-ט)', 'והיה אם שמוע (דברים יא:יג-כא)'] },
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
            אותיות רבתי – הסוד שבאות הגדולה
          </h2>

          {[
            { title: 'הע׳ הגדולה ב"שמע"', desc: 'האות ע׳ במילה "שמע" גדולה פי כמה משאר האותיות. יחד עם האות ד׳ הגדולה ב"אחד" הן יוצרות את המילה "עד" – כל יהודי הקורא את שמע הופך לעד המעיד על אחדות הבורא.' },
            { title: 'הד׳ הגדולה ב"אחד"', desc: 'הסופר מקפיד על תג מיוחד באות ד׳ כדי שלא תיראה כאות ר׳. אם ייכתב "אחר" במקום "אחד" – מדובר בפסול מהחמורים ביותר, ועל הסופר להתרכז ברעדה בכתיבת מילים אלו.' },
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
          <FAQItem q='למה כותבים בסוף המזוזה מאחור את המילה "שד"י"?' a='השם שד"י מייצג גם "שומר דלתות ישראל". גלגול הקלף נעשה כך שהמילה תישאר מבחוץ, ומספקת את סגולת השמירה על יושבי הבית.' />
          <FAQItem q='האם מותר לפתוח ולראות את הקלף עם הטקסט?' a='מותר ומומלץ לראות ולהתרשם מהאותיות, מתוך יראת כבוד וללא מגע ישיר בידיים מזיעות על הדיו.' />
          <FAQItem q='מה ההבדל בין "שמע" במזוזה לבין "שמע" בתפילין?' a='הטקסט זהה. אך בתפילין ישנן שתי פרשיות נוספות מספר שמות, ויש מחלוקת על סדר הפרשיות (רש"י ורבנו תם).' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🔤' title='אותיות ותגים' desc='סודות הכתב האשורי' href='/madrich/otiyot-vetaguim' />
            <RelatedCard emoji='📖' title='הבדלים בין נוסחים' desc='כתב בית יוסף, האר"י וספרד' href='/madrich/nosachim' />
          </div>

          <CTAStrip
            title='הכניסו לביתכם את קדושת "שמע ישראל"'
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
