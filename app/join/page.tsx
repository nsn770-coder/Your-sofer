'use client';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: '#0c1a35', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>› הצטרף לפלטפורמה</div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1a3a2a 100%)', padding: '50px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 14, color: '#b8972a', fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>YOUR SOFER PLATFORM</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
            הצטרף למשפחת<br /><span style={{ color: '#b8972a' }}>Your Sofer</span>
          </h1>
          <p style={{ color: '#a8c8b4', fontSize: 16, maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            פלטפורמה ייחודית המחברת בין סופרי סת"מ מוסמכים לבין קהל לקוחות רחב — עם כלים מתקדמים לניהול ומכירה
          </p>
        </div>
      </div>

      {/* שתי אפשרויות */}
      <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* סופר */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #eee' }}>
          <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #2d5a3d)', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✍️</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>הצטרף כסופר</h2>
            <p style={{ color: '#a8c8b4', fontSize: 14, lineHeight: 1.6 }}>
              הצג את עבודתך, קבל הזמנות ישירות ונהל את העסק שלך בקלות
            </p>
          </div>
          <div style={{ padding: '28px' }}>
            <div style={{ marginBottom: 20 }}>
              {[
                'פרופיל אישי עם תמונות ותיאור',
                'קבל הזמנות ישירות מלקוחות',
                'ניהול מוצרים ומלאי',
                'דשבורד מכירות ונתונים',
                'פיקוח הלכתי ותעודת כשרות',
                'תמיכה מקצועית מהצוות',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: '#333' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1a3a2a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✓</div>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#1a3a2a' }}>עמלה: 0% בחודשים הראשונים</div>
              <div style={{ color: '#888' }}>לאחר מכן — עמלה נמוכה על כל מכירה בלבד</div>
            </div>

            <button onClick={() => router.push('/soferim/apply')}
              style={{ width: '100%', background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              הגש מועמדות כסופר ←
            </button>
          </div>
        </div>

        {/* שליח */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #eee' }}>
          <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a3a6a)', padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🟦</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>הצטרף כשליח חבד</h2>
            <p style={{ color: '#a8c0d8', fontSize: 14, lineHeight: 1.6 }}>
              שלח את קהילתך לקנות סת"מ מאומת וקבל עמלה על כל הזמנה
            </p>
          </div>
          <div style={{ padding: '28px' }}>
            <div style={{ marginBottom: 20 }}>
              {[
                'לינק אישי עם ברנדינג של בית החבד שלך',
                'באנר מותאם אישית על האתר',
                'עמלה על כל הזמנה דרך הלינק שלך',
                'דשבורד מכירות ועמלות',
                'תמיכה ייעודית לשליחים',
                'הצגה בדף שליחי חבד',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 14, color: '#333' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0c1a35', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>✓</div>
                  {item}
                </div>
              ))}
            </div>

            <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#0c1a35' }}>עמלה: 5%-15% על כל הזמנה</div>
              <div style={{ color: '#888' }}>בהתאם לנפח המכירות של הקהילה שלך</div>
            </div>

            <button onClick={() => {
              const subject = encodeURIComponent('בקשת הצטרפות כשליח — Your Sofer');
              const body = encodeURIComponent('שלום,\n\nאני מעוניין להצטרף לפלטפורמה כשליח חבד.\n\nשם: \nמיקום: \nטלפון: \n\nתודה');
              window.open(`mailto:info@yoursofer.com?subject=${subject}&body=${body}`);
            }}
              style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              שלח בקשת הצטרפות ←
            </button>
          </div>
        </div>
      </div>

      {/* למה לבחור בנו */}
      <div style={{ background: '#fff', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '40px 20px', margin: '0 0 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32, color: '#0f1111' }}>למה לבחור ב-Your Sofer?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: '🛡️', title: 'פיקוח הלכתי', desc: 'כל מוצר עובר בדיקת מחשב ופיקוח רבני מוסמך' },
              { icon: '📈', title: 'קהל לקוחות גדול', desc: 'גישה לאלפי לקוחות פוטנציאליים ברחבי הארץ' },
              { icon: '💰', title: 'הכנסה נוספת', desc: 'עמלות אטרקטיביות ותשלום מהיר ואמין' },
              { icon: '🔧', title: 'כלים מתקדמים', desc: 'דשבורד ניהול, נתונים ודוחות בלחיצה אחת' },
              { icon: '🤝', title: 'תמיכה מלאה', desc: 'צוות מקצועי זמין לעזור בכל שאלה' },
              { icon: '🌟', title: 'מוניטין ואמון', desc: 'פלטפורמה מובילה בתחום סת"מ בישראל' },
            ].map(item => (
              <div key={item.title} style={{ textAlign: 'center', padding: '20px 16px', background: '#f8f9fa', borderRadius: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#0f1111' }}>{item.title}</div>
                <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '0 20px 50px' }}>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>יש שאלות? אנחנו כאן לעזור</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/')}
            style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ← חזרה לחנות
          </button>
          <a href="mailto:info@yoursofer.com"
            style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            📧 צור קשר
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: '#0f1111', color: '#fff', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#b8972a', marginBottom: 4 }}>✡ Your Sofer</div>
        <div style={{ fontSize: 12, color: '#666' }}>© 2025 Your Sofer — כל הזכויות שמורות</div>
      </footer>
    </div>
  );
}
