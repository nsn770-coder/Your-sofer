import type { Metadata } from 'next';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, FAQItem } from '../InfoComponents';

const BASE_URL = 'https://your-sofer.com';

export const metadata: Metadata = {
  title: 'מזוזה לחדר ילדים – אסתטיקה, הגנה וקדושה',
  description:
    'כיצד בוחרים מזוזה לחדר ילדים? חומרים עמידים, עיצוב מתאים, הלכות מיוחדות לחדרי שינה ומה הגובה הנכון לקביעה.',
  alternates: { canonical: `${BASE_URL}/madrich/mezuza-yeladim` },
  openGraph: {
    type: 'article',
    locale: 'he_IL',
    url: `${BASE_URL}/madrich/mezuza-yeladim`,
    siteName: 'Your Sofer',
    title: 'מזוזה לחדר ילדים | Your Sofer',
    description: 'מדריך לבחירת מזוזה לחדר ילדים – חומרים, עיצוב והלכות.',
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'מזוזה לחדר ילדים – אסתטיקה, הגנה וקדושה',
  description: 'כיצד לבחור מזוזה מתאימה לחדר ילדים – חומרים עמידים, עיצוב ודרישות הלכתיות.',
  url: `${BASE_URL}/madrich/mezuza-yeladim`,
  publisher: { '@type': 'Organization', name: 'Your Sofer', url: BASE_URL },
  inLanguage: 'he',
};

export default function MezuzaYeladimPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ArticleLayout>
        <PageHero
          badge="חדר ילדים"
          title="מזוזה לחדר ילדים"
          subtitle="כשרות ועיצוב ביחד – כיצד בוחרים מזוזה שתשרוד טריקות דלת ותחנך לאהבת מצוות"
        />

        <div style={{ padding: '40px 0' }}>

          <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
            חדר הילדים הוא המקום השמח והחי ביותר בבית. קביעת מזוזה בפתחו היא לא רק חובה הלכתית, אלא גם חינוך לאהבת מצוות מגיל צעיר. בחדרי ילדים, בית המזוזה חשוף יותר למכות פיזיות – כדורים, צעצועים וטריקת דלתות. לכן הקלף חייב להיות מוגן כראוי.
          </p>

          <QuoteBlock text='מזוזה כשרה ומהודרת בחדר הילדים – בעטיפה שמשמחת את הילד ומחנכת אותו לנשק ולהעריך.' />

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            בחירת חומר בית המזוזה לחדר ילדים
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, margin: '20px 0 32px' }}>
            {[
              { title: 'מומלץ', color: '#1a5c3a', bg: '#f0fff5', items: ['אקריליק – קשיח ולא שביר', 'עץ – חם ויפה', 'סיליקון קשיח – עמיד בנפילה', 'מתכת אלומיניום קלה'] },
              { title: 'להימנע', color: '#b91c1c', bg: '#fef2f2', items: ['זכוכית – מסוכנת לילדים', 'קרמיקה – מתנפצת', 'עיצובים עם פינות חדות', 'בית ללא אטימה הרמטית'] },
            ].map(c => (
              <div key={c.title} style={{ background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '20px' }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: c.color, marginBottom: 14 }}>{c.title}</div>
                {c.items.map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 14, color: '#333' }}>
                    <span style={{ color: c.color }}>{c.title === 'מומלץ' ? '✓' : '✗'}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1E3A8A', margin: '36px 0 16px' }}>
            דרישות הלכתיות מיוחדות לחדרי ילדים
          </h2>

          {[
            { title: 'כשרות מלאה ללא פשרות', desc: 'המזוזה בחדר ילדים צריכה להיות כשרה ומוקפדת בדיוק כמו המזוזה בדלת הראשית. אין הנחות הלכתיות בגלל גיל הילד.' },
            { title: 'כיסוי כפול בחדר שינה', desc: 'כשילדים ישנים ללא כיסוי, נהוג על פי ההלכה לכסות את המזוזה בכיסוי כפול ("כלי בתוך כלי") או להשתמש בבית מזוזה אטום שאינו שקוף לחלוטין.' },
            { title: 'אטימה מלאה', desc: 'בחדרי ילדים שנמצאים בקרבת חלון פתוח, יש לוודא שבית המזוזה אטום היטב מפני לחות שמגיעה מגשם או טל.' },
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
          <FAQItem q='באיזה גובה לקבוע את המזוזה בחדר ילדים?' a='המזוזה תמיד חייבת להיות בתחילת השליש העליון של הדלת. אסור להנמיך אותה גם אם הילד לא מגיע. ילדים יכולים לנשק באמצעות שרפרף בטוח.' />
          <FAQItem q='מהו החומר המומלץ לבית מזוזה בחדר ילדים?' a='חומרים כמו אקריליק, עץ או סיליקון קשיח עדיפים על זכוכית שבירה או קרמיקה, מטעמי בטיחות.' />
          <FAQItem q='האם אפשר להשתמש בבית מזוזה צבעוני?' a='כן, מבחינה הלכתית הצבע החיצוני אינו משפיע. ניתן למצוא היום בתי מזוזה צבעוניים ומשעשעים שמשתלבים נפלא עם עיצוב חדר הילדים.' />

          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A', margin: '40px 0 16px' }}>קריאה נוספת</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <RelatedCard emoji='🏠' title='סוגי בתי מזוזה' desc='חומרים, עיצוב ודרישות הלכתיות' href='/madrich/batei-mezuza' />
            <RelatedCard emoji='📿' title='קביעת מזוזה' desc='מדריך שלב אחר שלב' href='/madrich/kviyas-mezuza' />
          </div>

          <CTAStrip
            title='קלפים מהודרים בבתי מזוזה בטיחותיים'
            buttons={[
              { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
              { label: 'מדריך הבחירה', href: '/madrich/bechira', variant: 'secondary' },
            ]}
          />
        </div>
      </ArticleLayout>
    </>
  );
}
