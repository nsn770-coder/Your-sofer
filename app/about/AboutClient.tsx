'use client';
import { useRouter } from 'next/navigation';

const VALUES = [
  {
    title: 'כשרות אמיתית',
    desc: 'יש אנשים שלא יודעים מה הם קונים. אנחנו דואגים שכל מוצר יעבור בדיקת מגיה מוסמך לפני שמגיע אליך.',
  },
  {
    title: 'שקיפות מלאה',
    desc: 'אתה יודע מי כתב את הקלף שלך, מאיפה הוא, כמה שנות ניסיון יש לו. אין אצלנו מוצרים אנונימיים.',
  },
  {
    title: 'מחיר הוגן',
    desc: 'בלי מתווכים מיותרים. הכסף שלך מגיע לסופר, והסופר יכול להשקיע אותו בכתיבה טובה יותר.',
  },
];

const STATS = [
  { value: '+4,400 מוצרים', label: 'קלפים, בתי מזוזה, תפילין ועוד' },
  { value: '+20 סופרים', label: 'מוסמכים ומאומתים' },
  { value: 'מגיה מוסמך', label: 'על כל מוצר לפני משלוח' },
];

export default function AboutClient() {
  const router = useRouter();

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F5F2EC', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 900, margin: '0 0 10px' }}>הסיפור שלנו</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          למה הקמנו את YourSofer ומה מנחה אותנו
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px 60px' }}>

        {/* Section 1 */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: '#1E3A8A', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>למה נוסד YourSofer</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            הייתי סופר סת״ם. ראיתי מקרוב איך הסוחר באמצע לוקח 50% מהמחיר — וכל זה על חשבון הלקוח. ההפרש הזה לא הולך לסופר ולא משפר את הכשרות. הוא פשוט נעלם בדרך. הקמתי את YourSofer כדי לשנות את זה: לחבר בין לקוחות לסופרים ישירות, בשקיפות מלאה, כך שבאותו תקציב — תוכל לקנות משהו הרבה יותר מהודר.
          </p>
        </div>

        {/* Section 2 — Values */}
        <h2 style={{ color: '#1E3A8A', fontSize: 20, fontWeight: 800, margin: '0 0 18px' }}>מה שחשוב לנו</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1E3A8A', marginBottom: 10 }}>{v.title}</div>
              <div style={{ fontSize: 13.5, color: '#555', lineHeight: 1.75 }}>{v.desc}</div>
            </div>
          ))}
        </div>

        {/* Section 3 — Stats */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', borderRadius: 14, padding: '32px 24px', marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {STATS.map(s => (
              <div key={s.value} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#C5A028', marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4 — Contact */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: '#1E3A8A', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>פרטי התקשרות</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15, color: '#444' }}>
            <div><strong>שם העסק:</strong> Your Sofer — חנות אונליין לרכישת מוצרי סת״מ ויודאיקה, המופעלת על ידי <strong>סודות התורה ע״ר</strong></div>
            <div>
              <strong>טלפון ראשי: </strong>
              <a href="tel:0584877770" style={{ color: '#1E3A8A', fontWeight: 700, textDecoration: 'none' }}>058-4877-770</a>
            </div>
            <div>
              <strong>וואטסאפ שירות לקוחות: </strong>
              <a href="https://wa.me/972552722228" style={{ color: '#1E3A8A', fontWeight: 700, textDecoration: 'none' }}>055-272-2228</a>
            </div>
            <div>
              <strong>מייל: </strong>
              <a href="mailto:support@your-sofer.com" style={{ color: '#1E3A8A', fontWeight: 700, textDecoration: 'none' }}>support@your-sofer.com</a>
            </div>
            <div><strong>כתובת:</strong> רחוב האורן 18, דימונה, ישראל (בית חב״ד לנוער דימונה)</div>
            <div><strong>שעות פעילות:</strong> א׳–ה׳, 09:00–18:00</div>
          </div>
        </div>

        {/* Section 5 — CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', padding: '14px 32px', fontSize: 16, fontWeight: 800, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}
          >
            לחנות המלאה ←
          </button>
        </div>

      </div>
    </div>
  );
}
