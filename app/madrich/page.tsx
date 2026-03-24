'use client';
import { useRouter } from 'next/navigation';

const C = {
  navy: '#0c1a35',
  gold: '#b8972a',
  bg: '#f3f4f4',
  white: '#fff',
  border: '#e0e0e0',
  muted: '#666',
};

const ARTICLES = [
  {
    emoji: '💸',
    title: 'למה לא לקנות מזוזה זולה',
    desc: 'מה ההבדל האמיתי בין מזוזה ב־150₪ למזוזה ב־400₪ — ולמה זה לא עניין של יופי',
    href: '/madrich/mezuza-zola',
    badge: 'פופולרי',
  },
  {
    emoji: '🎯',
    title: 'איך לבחור מזוזה נכון',
    desc: 'מדריך שלב-אחר-שלב — גם אם אין לך מושג בסת"ם',
    href: '/madrich/bechira',
  },
  {
    emoji: '🏛️',
    title: 'האמת על שוק המזוזות',
    desc: 'למה כל כך קשה לדעת מה באמת קונים — וכיצד המודל שלנו שונה',
    href: '/madrich/shuk',
  },
  {
    emoji: '✍️',
    title: 'מי הסופרים שלנו',
    desc: 'איך אנחנו בוחרים עם מי לעבוד — ומה מייחד כל סופר',
    href: '/madrich/soferim',
  },
  {
    emoji: '🔍',
    title: 'איך אנחנו בודקים מזוזות',
    desc: 'כל מזוזה עוברת בדיקה לפני שמגיעה אליך — הנה התהליך המלא',
    href: '/madrich/bedika',
  },
  {
    emoji: '⭐',
    title: 'מה זה מזוזה מהודרת באמת',
    desc: 'לא כל מזוזה כשרה היא מהודרת — הנה ההבדלים שחשוב להכיר',
    href: '/madrich/mehudar',
  },
  {
    emoji: '❓',
    title: 'שאלות נפוצות',
    desc: 'תשובות ברורות לשאלות הנפוצות ביותר על מזוזות, בדיקות ורכישה',
    href: '/madrich/faq',
  },
];

export default function MadrichPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Navbar */}
      <nav style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: C.gold, fontWeight: 900, fontSize: 20, textDecoration: 'none' }}>✡ Your Sofer</a>
        <a href="/" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← חזרה לחנות</a>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1a3060 100%)`, padding: '60px 24px 52px', textAlign: 'center', color: '#fff' }}>
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
          ״שתקבל מזוזה כשרה — ותדע בדיוק מה אתה קונה״
        </p>
      </div>

      {/* Articles Grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: C.navy, marginBottom: 8, textAlign: 'center' }}>מאמרים ומדריכים</h2>
        <p style={{ textAlign: 'center', color: C.muted, fontSize: 15, marginBottom: 36 }}>
          בחרו נושא שמעניין אתכם — כל מאמר נכתב כדי לעזור לכם לקבל החלטה מושכלת
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
            { icon: '📸', title: 'תמונת הקלף האמיתי', desc: 'רואים בדיוק מה קונים — לא תמונת מלאי' },
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
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 24 }}>צפו בגלריית הקלפים הזמינים — עם תמונה אמיתית של כל מזוזה</p>
        <button
          onClick={() => router.push('/')}
          style={{ background: C.gold, color: C.navy, border: 'none', borderRadius: 8, padding: '14px 32px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}
        >
          לצפייה בכל המזוזות ←
        </button>
      </div>

      <div style={{ background: C.navy, padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
        © 2025 Your Sofer · yoursofer.com
      </div>
    </div>
  );
}
