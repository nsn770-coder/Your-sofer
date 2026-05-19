import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'סופר ברוח טובה – כיצד תנאי עבודה הוגנים משפרים את כשרות הסת"ם',
  description:
    'כיצד לחץ כלכלי על הסופר פוגע בכשרות? מדוע סופר שמתפרנס בכבוד כותב לאט יותר ומדויק יותר, ומה פירוש "כתיבה ביישוב הדעת".',
  alternates: { canonical: `${BASE_URL}/madrich/sofer-ruach` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/sofer-ruach`,
    siteName: 'Your Sofer',
    title: 'סופר ברוח טובה | Your Sofer',
    description: 'הקשר בין כלכלה הוגנת לרמת הכשרות בסת"ם.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'סופר ברוח טובה – כיצד תנאי עבודה הוגנים משפרים את הכשרות',
  description: 'ההשפעה של כלכלה הוגנת לסופר על איכות ודיוק הכתיבה ההלכתית.',
  url: `${BASE_URL}/madrich/sofer-ruach`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function SoferRuachPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="שיוויון ואיכות"
          title="סופר ברוח טובה"
          subtitle="כיצד תנאי עבודה הוגנים לסופר מייצרים סת"ם מהודר יותר"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            שוק הסת"ם סבל במשך עשרות שנים מבעיה מבנית חמורה: הסופר, שהוא אמן רוחני, נאלץ להיות גם איש שיווק, גובה כספים וסוחר. כתוצאה מכך, סופרים רבים חוו לחץ כלכלי מתמיד שהשפיע ישירות על כתיבתם.
          </p>

          <QuoteBlock text='כלכלה הוגנת יוצרת הלכה הוגנת. סופר שיודע שפרנסתו מובטחת כותב לאט, ברוגע ובריכוז שיא.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            ההשפעה של לחץ כלכלי על הכשרות
          </h2>

          {[
            { title: 'כתיבה מהירה = טעויות', desc: 'סופר שנאלץ לכתוב 4 מזוזות ביום בגלל מחיר נמוך שהמתווך שילם לו – כותב מהר, מתעייף, ומועד לטעויות של חיבור אותיות ושגיאות כסדרן.' },
            { title: 'ריכוז לשמה', desc: 'ההלכה דורשת שהסופר יהיה ב"יישוב הדעת" ולא טרוד. סופר מותש שטרוד בכלכלת הבית אינו יכול להתרכז ב"לשמה" בכל שם של השם.' },
            { title: 'איכות חומרי גלם', desc: 'כשסופר מרוויח הוגן, הוא יכול להרשות לעצמו לעבוד עם קלף עבודת יד איכותי, דיו מבושל היטב, ואחוז דחייה גבוה יותר של קלפים שאינם מושלמים.' },
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
          <FAQItem q='כיצד ביטול פערי תיווך משפיע על הלקוח?' a='ביטול פערי תיווך מאפשר ללקוח לרכוש מזוזה ברמת הידור פרימיום במחיר שפוי והוגן. הלקוח מקבל יותר הידור, הסופר מרוויח יותר – כולם מנצחים.' />
          <FAQItem q='האם אפשר לפנות לסופר ישירות אחרי הקנייה?' a='בפלטפורמות שמחברות ישירות לסופר – כן. קשר ישיר מאפשר שאלות, בקשות מיוחדות, ולמידה על אמן הקדושה שכתב עבורכם.' />
          <FAQItem q='כיצד ניתן להתבונן על הסופר בפעולה?' a='סופרים רבים מרשים צפייה בתהליך הכתיבה. צפייה בסופר עובד היא אחת החוויות הרוחניות העמוקות שאפשר לחוות.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='סופר ירא שמיים' desc='למה הממד הרוחני קריטי' href='/madrich/yirat-shamayim' />
            <RelatedCard emoji='🔬' title='תהליך הכתיבה' desc='מאחורי הקלעים אצל הסופר' href='/madrich/tehlich-ktiva' />
          </div>

          <CTAStrip
            title='תמכו בסופרים – קבלו סת"ם ברמה גבוהה יותר'
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
