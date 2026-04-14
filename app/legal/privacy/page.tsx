'use client';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>מדיניות פרטיות</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="1. אילו מידע אנו אוספים?">
            אנו אוספים מידע שאתה מספק ישירות בעת הרשמה, ביצוע הזמנה או יצירת קשר: שם, כתובת אימייל, טלפון, כתובת למשלוח ופרטי תשלום (מוצפנים). בנוסף נאסף מידע טכני כגון כתובת IP, סוג דפדפן וזמני גלישה לצורכי שיפור השירות.
          </Section>

          <Section title="2. כיצד אנו משתמשים במידע?">
            המידע משמש לעיבוד הזמנות ומשלוחן, לתקשורת אתך בנוגע להזמנות, לשיפור חוויית הגלישה, ולמשלוח עדכונים ומבצעים (בהסכמתך בלבד). איננו מוכרים או משכירים מידע אישי לצדדים שלישיים.
          </Section>

          <Section title="3. שיתוף מידע">
            נשתף מידע עם ספקי שירות חיוניים (שליחות, סליקת אשראי) בלבד, ואך ורק לצורך מתן השירות. כל הספקים מחויבים בחוזית לשמירת פרטיות.
          </Section>

          <Section title="4. אבטחת מידע">
            האתר פועל תחת פרוטוקול HTTPS. פרטי כרטיסי אשראי אינם נשמרים על שרתינו — הם מוצפנים ומטופלים ישירות על-ידי ספק הסליקה. מאגר המידע רשום בהתאם לחוק הגנת הפרטיות (תשמ"א–1981).
          </Section>

          <Section title="5. עוגיות (Cookies)">
            האתר משתמש בעוגיות לצורך שמירת הגדרות, ניתוח תנועה (Google Analytics) ושיפור הניווט. תוכל להגדיר את הדפדפן לחסום עוגיות, אך חלק מפונקציות האתר עשויות שלא לפעול כראוי.
          </Section>

          <Section title="6. זכויות הנושא">
            בהתאם לחוק הגנת הפרטיות, יש לך זכות לעיין במידע הנשמר עלייך, לתקנו ובתנאים מסוימים למחקו. לפנייה: nsn770@gmail.com
          </Section>

          <Section title="7. יצירת קשר">
            לשאלות הנוגעות לפרטיות: nsn770@gmail.com | 055-272-2228
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0c1a35', marginBottom: 8, borderRight: '3px solid #b8972a', paddingRight: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0 }}>{children}</p>
    </div>
  );
}
