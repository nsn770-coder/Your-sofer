'use client';
import { useRouter } from 'next/navigation';

export default function AccessibilityPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>הצהרת נגישות</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="מחויבות לנגישות">
            Your Sofer מחויבת לאפשר לאנשים עם מוגבלות לגלוש ולרכוש באתר בצורה שוויונית. אנו שואפים לעמוד בדרישות תקן ישראלי 5568 (המבוסס על WCAG 2.1 ברמת AA).
          </Section>

          <Section title="מה כולל האתר?">
            {`• טקסט חלופי (alt) לתמונות
• ניווט מלא באמצעות מקלדת
• ניגודיות צבעים מספקת בין טקסט לרקע
• כותרות מובנות לסדר קריאה נכון
• תמיכה בקוראי מסך מובילים`}
          </Section>

          <Section title="מה עדיין בעבודה?">
            אנו מודעים לכך שחלק מהרכיבים עשויים שלא להיות נגישים במלואם. אנו עובדים על שיפור מתמיד ומקצים משאבים לצורך כך.
          </Section>

          <Section title="פנייה בנושא נגישות">
            נתקלתם בבעיית נגישות? נשמח לדעת ולתקן. פנו אלינו:
            {'\n'}אימייל: nsn770@gmail.com
            {'\n'}טלפון: 055-272-2228
            {'\n'}אנו נשתדל להגיב תוך 5 ימי עסקים.
          </Section>

          <Section title="תאריך הצהרה זו">
            הצהרה זו עודכנה לאחרונה באפריל 2025.
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
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{children}</p>
    </div>
  );
}
