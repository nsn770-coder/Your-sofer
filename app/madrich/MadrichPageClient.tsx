'use client';
import { useRouter } from 'next/navigation';

const C = {
  navy: '#1E3A8A',
  gold: '#C5A028',
  bg: '#f3f4f4',
  white: '#fff',
  border: '#e0e0e0',
  muted: '#666',
};

const ARTICLES = [
  {
    emoji: '💸',
    title: 'למה לא לקנות מזוזה זולה',
    desc: 'מה ההבדל האמיתי בין מזוזה ב־150₪ למזוזה ב־400₪ - ולמה זה לא עניין של יופי',
    href: '/madrich/mezuza-zola',
    badge: 'פופולרי',
  },
  {
    emoji: '🎯',
    title: 'איך לבחור מזוזה נכון',
    desc: 'מדריך שלב-אחר-שלב - גם אם אין לך מושג בסת"ם',
    href: '/madrich/bechira',
  },
  {
    emoji: '🏛️',
    title: 'האמת על שוק המזוזות',
    desc: 'למה כל כך קשה לדעת מה באמת קונים - וכיצד המודל שלנו שונה',
    href: '/madrich/shuk',
  },
  {
    emoji: '✍️',
    title: 'מי הסופרים שלנו',
    desc: 'איך אנחנו בוחרים עם מי לעבוד - ומה מייחד כל סופר',
    href: '/madrich/soferim',
  },
  {
    emoji: '🔍',
    title: 'איך אנחנו בודקים מזוזות',
    desc: 'כל מזוזה עוברת בדיקה לפני שמגיעה אליך - הנה התהליך המלא',
    href: '/madrich/bedika',
  },
  {
    emoji: '⭐',
    title: 'מה זה מזוזה מהודרת באמת',
    desc: 'לא כל מזוזה כשרה היא מהודרת - הנה ההבדלים שחשוב להכיר',
    href: '/madrich/mehudar',
  },
  {
    emoji: '❓',
    title: 'שאלות נפוצות',
    desc: 'תשובות ברורות לשאלות הנפוצות ביותר על מזוזות, בדיקות ורכישה',
    href: '/madrich/faq',
  },
  {
    emoji: '📜',
    title: 'ההבדלים בין נוסחי הסת"ם',
    desc: 'אשכנזי, ספרדי והאר"י – מה ההבדל ואיזה נוסח מתאים לך',
    href: '/madrich/nosachim',
  },
  {
    emoji: '📿',
    title: 'תפילין לבר מצווה',
    desc: 'המדריך המלא להורים – מה לקנות, מתי, ומה חשוב לבדוק',
    href: '/madrich/bar-mitzva-tefillin',
  },
  {
    emoji: '📖',
    title: 'ספר תורה – כל מה שצריך לדעת',
    desc: 'לפני שמזמינים – תהליך, עלות, ובחירת הסופר הנכון',
    href: '/madrich/sefer-torah',
  },
  {
    emoji: '🔬',
    title: 'סודות האותיות והתגים',
    desc: 'כתרים, שינויי צורה, ולמה כל פרט קטן יכול להפוך אות לפסולה',
    href: '/madrich/otiyot-vetaguim',
  },
  {
    emoji: '🖐️',
    title: 'קלף עבודת יד מול קלף מכונה',
    desc: 'למה הבחירה בחומר הגלם משפיעה על הכשרות ואורך החיים',
    href: '/madrich/klaf-ivduat-yad',
  },
  {
    emoji: '💬',
    title: 'שאלות ותשובות מקיף',
    desc: 'כל מה שרצית לדעת על סת"ם במקום אחד',
    href: '/madrich/ultimate-faq',
    badge: 'חדש',
  },
  {
    emoji: '🎁',
    title: 'מתנת חנוכת בית',
    desc: 'איך לבחור מזוזה כמתנה לחנוכת בית – כשרות, עיצוב ותקציב',
    href: '/madrich/matana-chanuka-bayit',
  },
  {
    emoji: '💰',
    title: 'מחירי סופרים',
    desc: 'מה קובע את מחיר הסת"ם ואיפה הכסף הולך באמת',
    href: '/madrich/michrei-soferim',
  },
  {
    emoji: '🙏',
    title: 'סופר ירא שמיים',
    desc: 'מדוע הממד הרוחני של הסופר קריטי לכשרות הסת"ם',
    href: '/madrich/yirat-shamayim',
  },
  {
    emoji: '🔍',
    title: 'בדיקת מזוזות',
    desc: 'מתי לבדוק, כמה עולה, ואיך בדיקת מחשב מגלה פסולים שעין אינה רואה',
    href: '/madrich/bdika-mezuzot',
  },
  {
    emoji: '🛒',
    title: 'קניית סת"ם אונליין',
    desc: 'יתרונות ומלכודות של רכישת מזוזה ותפילין באינטרנט',
    href: '/madrich/knia-online',
  },
  {
    emoji: '🏠',
    title: 'בתי מזוזה',
    desc: 'מה ההבדל בין בית מזוזה לנוי לבית מזוזה שמגן על הקלף',
    href: '/madrich/batei-mezuza',
  },
  {
    emoji: '📿',
    title: 'קביעת מזוזה',
    desc: 'מדריך שלב אחר שלב – איפה לקבוע, איך לקבוע, ומה הברכה',
    href: '/madrich/kviyas-mezuza',
  },
  {
    emoji: '🎓',
    title: 'חבילות בר מצווה',
    desc: 'כל מה שצריך לדעת לפני שקונים סט תפילין לבר מצווה',
    href: '/madrich/chavilot-bar-mitzva',
  },
  {
    emoji: '✈️',
    title: 'תפילין בנסיעות',
    desc: 'כיצד לשמור על תפילין בטיסות, מלונות ומזג אוויר קיצוני',
    href: '/madrich/tefillin-nesia',
  },
  {
    emoji: '🧸',
    title: 'מזוזה לחדר ילדים',
    desc: 'האם חדר ילדים חייב מזוזה ואיזה בית מזוזה מתאים',
    href: '/madrich/mezuza-yeladim',
  },
  {
    emoji: '📖',
    title: 'תפילין רש"י ורבנו תם',
    desc: 'ההבדל בין שתי השיטות ומי צריך להניח את שתיהן',
    href: '/madrich/rashi-rabenu-tam',
  },
  {
    emoji: '⚠️',
    title: 'זיופי סת"ם',
    desc: 'איך מזהים מזוזה מודפסת, תפילין מזויפות, ומה הסימנים',
    href: '/madrich/ziyufei-stam',
  },
  {
    emoji: '🎁',
    title: 'סט חתן',
    desc: 'טלית, תפילין ונרתיקים – המתנה המושלמת לחתן',
    href: '/madrich/set-chatan',
  },
  {
    emoji: '📋',
    title: 'כסדרן',
    desc: 'מהי הכשרות של "כסדרן" ולמה היא קריטית לתפילין',
    href: '/madrich/kesidran',
  },
  {
    emoji: '🌍',
    title: 'הזמנת סת"ם לחו"ל',
    desc: 'כיצד לשלוח מזוזה ותפילין בינלאומית בבטחה',
    href: '/madrich/mishloach-lachul',
  },
  {
    emoji: '🤚',
    title: 'תפילין לאיטר',
    desc: 'תפילין לשמאליים – איך קובעים ומה ההבדל',
    href: '/madrich/tefillin-itar',
  },
  {
    emoji: '🏢',
    title: 'מזוזה בעסק',
    desc: 'האם משרד וחנות חייבים מזוזה, ומתי מברכים',
    href: '/madrich/mezuza-asak',
  },
  {
    emoji: '🔬',
    title: 'תהליך הכתיבה',
    desc: 'מאחורי הקלעים: מהקלף הגולמי עד ארוז לשליחה',
    href: '/madrich/tehlich-ktiva',
  },
  {
    emoji: '📏',
    title: 'גודל המזוזה',
    desc: '10, 12, 15 ס"מ – מה ההבדל ומה מומלץ לאיזו דלת',
    href: '/madrich/godel-mezuza',
  },
  {
    emoji: '📐',
    title: 'קלף משורטט',
    desc: 'מהי שרטוט הקלף ולמה היא הכרחית לפי ההלכה',
    href: '/madrich/klaf-meshurtat',
  },
  {
    emoji: '🐄',
    title: 'בהמה גסה',
    desc: 'למה עור פרה הוא הסטנדרט המהודר לקלף סת"ם',
    href: '/madrich/behema-gasa',
  },
  {
    emoji: '📦',
    title: 'תפילין פרודות',
    desc: 'מה זה תפילין פרודות ומה עושים כשהקלף נפרד',
    href: '/madrich/tefillin-perudot',
  },
  {
    emoji: '🔧',
    title: 'תיקון תפילין',
    desc: 'מתי תפילין צריכות תיקון ומי מוסמך לתקן',
    href: '/madrich/tikun-tefillin',
  },
  {
    emoji: '🏷️',
    title: 'תיוג סת"ם',
    desc: 'כיצד מספר סידורי ומערכת תיוג מבטיחים מעקב מלא',
    href: '/madrich/tiyug-stam',
  },
  {
    emoji: '🖋️',
    title: 'דיו סת"ם',
    desc: 'ההבדלים בין סוגי הדיו ולמה האיכות קריטית לכשרות',
    href: '/madrich/dio-stam',
  },
  {
    emoji: '✒️',
    title: 'קולמוס',
    desc: 'כלי הכתיבה של הסופר – קנה, עט, ותנאים לכשרות',
    href: '/madrich/kulmus',
  },
  {
    emoji: '🙌',
    title: 'ברכות קביעת מזוזה',
    desc: 'מתי מברכים, מתי לא, ומה קורה אם הפסקתם באמצע',
    href: '/madrich/brachot-mezuza',
  },
  {
    emoji: '📜',
    title: 'שמע ישראל במזוזה',
    desc: 'הפרשיות שבמזוזה ובתפילין, אותיות רבתי ומשמעותן',
    href: '/madrich/shema-israel',
  },
  {
    emoji: '⚖️',
    title: 'סופר ברוח טובה',
    desc: 'כיצד תנאי עבודה הוגנים לסופר משפיעים על כשרות הסת"ם',
    href: '/madrich/sofer-ruach',
  },
  {
    emoji: '🧣',
    title: 'טלית ותפילין',
    desc: 'כיצד לבחור טלית צמר רחלים ביחד עם הזמנת תפילין',
    href: '/madrich/tallit-tefillin',
  },
  {
    emoji: '🏗️',
    title: 'מזוזות לפרויקטי בנייה',
    desc: 'הזמנה מרוכזת של עשרות מזוזות לבניינים ומוסדות',
    href: '/madrich/proyect-binyan',
  },
  {
    emoji: '🌐',
    title: 'חבילות בר מצווה לחו"ל',
    desc: 'שליחת סט בר מצווה מישראל לחו"ל – מתנות, תרומות וחסות',
    href: '/madrich/bar-mitzva-tfillin-tfilot',
  },
  {
    emoji: '✨',
    title: 'הסטנדרט הדיגיטלי החדש',
    desc: 'שקיפות מלאה, תיעוד שרשרת אספקה ואחריות כשרות לכל החיים',
    href: '/madrich/lamah-your-sofer',
    badge: 'מומלץ',
  },
];

export default function MadrichPageClient() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: C.gold, fontWeight: 900, fontSize: 20, textDecoration: 'none' }}>✡ Your Sofer</a>
        <a href="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← חזרה לחנות</a>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1E40AF 100%)`, padding: '60px 24px 52px', textAlign: 'center', color: '#fff' }}>
        <div style={{ display: 'inline-block', background: C.gold, color: C.navy, fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 20, marginBottom: 16 }}>
          מידע חשוב לפני קניית מזוזה
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 900, margin: '0 0 16px' }}>מדריך למזוזות</h1>
        <p style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', color: 'rgba(255,255,255,0.8)', maxWidth: 580, margin: '0 auto 28px', lineHeight: 1.6 }}>
          לא קונים מזוזה בעיניים עצומות.<br />
          כאן תמצאו את כל מה שצריך לדעת לפני שבוחרים.
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
        >
          ← צפה במזוזות זמינות
        </button>
      </div>

      {/* Brand Promise */}
      <div style={{ background: '#fdf8ee', borderTop: `3px solid ${C.gold}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: C.navy, margin: 0 }}>
          ״שתקבל מזוזה כשרה - ותדע בדיוק מה אתה קונה״
        </p>
      </div>

      {/* Articles Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 8, textAlign: 'center' }}>מאמרים ומדריכים</h2>
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 15, marginBottom: 36 }}>
          בחרו נושא שמעניין אתכם - כל מאמר נכתב כדי לעזור לכם לקבל החלטה מושכלת
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {ARTICLES.map(a => (
            <div
              key={a.href}
              onClick={() => router.push(a.href)}
              style={{
                background: C.white,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: '28px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.1)';
                (e.currentTarget as HTMLDivElement).style.borderColor = C.gold;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              {a.badge && (
                <span style={{ position: 'absolute', top: 16, left: 16, background: '#e8f4fd', color: '#0e6ba8', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                  {a.badge}
                </span>
              )}
              <div style={{ fontSize: 36, marginBottom: 14 }}>{a.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: C.navy, marginBottom: 10 }}>{a.title}</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{a.desc}</p>
              <span style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>קרא עוד →</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Bar */}
      <div style={{ background: C.navy, padding: '40px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28, textAlign: 'center' }}>
          {[
            { icon: '🔍', title: 'בדיקה לפני מכירה', desc: 'כל מזוזה נבדקת לפני שמועלית לאתר' },
            { icon: '📸', title: 'תמונת הקלף האמיתי', desc: 'רואים בדיוק מה קונים - לא תמונת מלאי' },
            { icon: '✍️', title: 'סופרים מוכרים אישית', desc: 'אנחנו מכירים כל סופר שעובד איתנו' },
            { icon: '💬', title: 'ייעוץ אישי חינם', desc: 'לא בטוחים? דברו עם הסופר לפני הקנייה' },
          ].map(t => (
            <div key={t.title}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.gold, marginBottom: 6 }}>{t.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '48px 24px', textAlign: 'center', background: C.white }}>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 12 }}>מוכנים לבחור?</h3>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>צפו בגלריית הקלפים הזמינים - עם תמונה אמיתית של כל מזוזה</p>
        <button
          onClick={() => router.push('/')}
          style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '14px 32px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
        >
          לצפייה בכל המזוזות ←
        </button>
      </div>

      <div style={{ background: C.navy, padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        © 2025 Your Sofer · your-sofer.com
      </div>
    </div>
  );
}
