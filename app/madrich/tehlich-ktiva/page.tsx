import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem, Step } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'תהליך כתיבת קלף מזוזה ותפילין – מאחורי הקלעים',
  description:
    'מה קורה בחדרו של הסופר? תהליך הכנת הקלף, חידוד הקולמוס, כוונות הכתיבה, ומדוע מזוזה מהודרת לוקחת 3-5 שעות עבודה.',
  alternates: { canonical: `${BASE_URL}/madrich/tehlich-ktiva` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/tehlich-ktiva`,
    siteName: 'Your Sofer',
    title: 'תהליך כתיבת קלף | Your Sofer',
    description: 'מבט מאחורי הקלעים על עבודת הסופר – הכנה, כלים, כוונות וכתיבה.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'תהליך כתיבת קלף מזוזה ותפילין – מאחורי הקלעים',
  description: 'כיצד נכתב קלף מזוזה מתחילתו ועד סופו – השלבים, הכלים והכוונות.',
  url: `${BASE_URL}/madrich/tehlich-ktiva`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function TehlichKtivaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="אמנות הסופר"
          title="תהליך כתיבת קלף"
          subtitle="מאחורי הקלעים – הכנה, כלים, כוונות וכתיבה לשמה"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            קלף המזוזה אינו מוצר שיוצא מפס ייצור – הוא יצירת אמנות רוחנית שנולדת בדומייה בחדרו של סופר ירא שמיים. עולם הסת"ם הוא מופת של עבודת יד מסורתית ששרדה אלפי שנים ללא שינוי.
          </p>

          <QuoteBlock text='כשרוכשים סת"ם, אתם מקבלים לא רק מוצר כשר – אלא חתיכת היסטוריה בעבודת יד.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שלבי הכתיבה
          </h2>

          {[
            { num: 1, title: 'ההכנה', desc: 'הסופר טובל במקווה כדי להיטהר. הוא בוחר קלף עבודת יד ומשרטט עליו שורות עדינות באמצעות מרצע מיוחד כדי שהכתיבה תהיה ישרה לחלוטין.' },
            { num: 2, title: 'הכלים', desc: 'הסופר חותך ומשחיז את הקולמוס שלו (עט עשוי מקנה סוף, במבוק או נוצת עוף) כדי ליצור זווית מדויקת שתפיק קווים עבים ודקים באותה תנועה.' },
            { num: 3, title: 'הכוונה', desc: 'לפני תחילת הכתיבה, הסופר אומר בקול: "הריני כותב לשם קדושת מזוזה". לפני כל שם השם הוא עוצר ומכוון מחדש – כוונה שאין להשמיטה.' },
            { num: 4, title: 'הכתיבה', desc: 'הסופר מסתכל בתיקון הסופרים, קורא כל מילה בפה, ורק אז כותב אותה. הכתיבה מתוך הזיכרון אסורה. הסופר ממתין שהדיו יתייבש לפני המשך הכתיבה.' },
          ].map(item => (
            <Step key={item.num} num={item.num} title={item.title} desc={item.desc} />
          ))}

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            שאלות נפוצות
          </h2>
          <FAQItem q='כמה זמן לוקח לכתוב מזוזה אחת?' a='מזוזה ברמת כשרות בסיסית – כשעתיים. מזוזה ברמת הידור עם תיוג מלא וקלף איכותי – בין 3 ל-5 שעות עבודה רצופות.' />
          <FAQItem q='למה משתמשים בנוצה ולא בעט רגיל?' a='כתיבה בדיו פלסטי פסולה לחלוטין. הדיו חייב להיות מחומרים טבעיים בלבד (פיח, עפצים מן הצומח) והקולמוס מאפשר דיוק קליגרפי הכרחי.' />
          <FAQItem q='מדוע הסופר אינו כותב מתוך זיכרון?' a='ההלכה אוסרת על הסופר לכתוב מהזיכרון. כל מילה חייבת להיות מועתקת מ"תיקון סופרים" כדי למנוע החסרת אותיות.' />
          <FAQItem q='מה קורה אם הסופר שוכח לומר כוונה לפני שם השם?' a='אם לא כיוון לפני כתיבת שם ה\' – המזוזה פסולה לחלוטין ואין דרך לתקן בדיעבד. זו אחת הסיבות לבחירת סופר ירא שמיים בלבד.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='✍️' title='סופר ירא שמיים' desc='למה הממד הרוחני קריטי' href='/madrich/yirat-shamayim' />
            <RelatedCard emoji='🪶' title='הקולמוס' desc='נוצה מול קולמוס מודרני' href='/madrich/kulmus' />
          </div>

          <CTAStrip
            title='קלפים שנכתבו בקדושה ובמיומנות'
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
