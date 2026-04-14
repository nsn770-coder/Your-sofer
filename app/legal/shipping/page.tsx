'use client';
import { useRouter } from 'next/navigation';

export default function ShippingPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>מדיניות משלוחים</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="זמני עיבוד הזמנה">
            הזמנות המתקבלות עד 12:00 בימים א׳–ה׳ מטופלות באותו יום. הזמנות שהתקבלו אחרי שעה זו, בשישי, שבת או חגים — יטופלו ביום העסקים הבא.
          </Section>

          <Section title="אפשרויות משלוח">
            {`• משלוח רגיל (דואר ישראל): 3–7 ימי עסקים — ₪25
• משלוח מהיר (שליח עד הבית): 1–3 ימי עסקים — ₪45
• איסוף עצמי בדימונה: ללא עלות, בתיאום מוקדם`}
          </Section>

          <Section title="משלוח חינם">
            הזמנות מעל ₪350 זכאיות למשלוח רגיל חינם אוטומטית.
          </Section>

          <Section title="משלוח לחו״ל">
            אנו משלחים לכל העולם. עלות וזמן המשלוח מחושבים בהתאם ליעד בשלב הקופה. זמן האספקה הטיפוסי לחו"ל: 7–21 ימי עסקים. ייתכנו עמלות מכס וייבוא שחלות על הלקוח.
          </Section>

          <Section title="מעקב הזמנה">
            לאחר משלוח ההזמנה ישלח אליך אימייל עם מספר מעקב. ניתן לעקוב אחר החבילה באתר דואר ישראל או אתר השליח הרלוונטי.
          </Section>

          <Section title="חבילה שאבדה או ניזוקה">
            חבילה שלא הגיעה תוך 14 ימי עסקים (ישראל) — צרו קשר ונטפל מול חברת השליחות. חבילה שהגיעה פגועה — צלמו ושלחו תמונות ל-nsn770@gmail.com תוך 48 שעות.
          </Section>

          <Section title="יצירת קשר">
            טלפון: 055-272-2228 | אימייל: nsn770@gmail.com
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
