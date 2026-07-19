'use client';
import { useRouter } from 'next/navigation';
import PageFaqSection from '@/app/components/faq/PageFaqSection';

export default function ShippingPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#1a1a1a', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#C5A028', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a1a', marginBottom: 6 }}>מדיניות משלוחים</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="זמני עיבוד הזמנה">
            הזמנות המתקבלות עד 12:00 בימים א׳–ה׳ מטופלות באותו יום. הזמנות שהתקבלו אחרי שעה זו, בשישי, שבת או חגים - יטופלו ביום העסקים הבא.
          </Section>

          <Section title="אפשרויות משלוח">
            {`• משלוח עד הבית (שליח): בדרך כלל 7-10 ימי עסקים - ₪35
• משלוח חינם: בהזמנות מעל ₪600 (אחרי הנחות) — המשלוח עד הבית חינם, אוטומטית
• מוצרי הדפסה אישית: עד 10 ימי עסקים
• איסוף עצמי בדימונה: ללא עלות, בתיאום מוקדם

משלוחים יוצאים מאיתנו בימי שני וחמישי.`}
          </Section>

          <Section title="משלוח דחוף">
            בצרכים דחופים מיוחדים ניתן לפנות אלינו בוואטסאפ לפני ביצוע ההזמנה — במקרים מסוימים נוכל לספק תוך כ-4 ימים. אפשרות זו כפופה לזמינות ואינה מהווה התחייבות; זמן האספקה הרגיל הוא 7–10 ימי עסקים.
          </Section>

          <Section title="משלוח לחו״ל">
            אנו משלחים לכל העולם. עלות וזמן המשלוח מחושבים בהתאם ליעד בשלב הקופה. זמן האספקה הטיפוסי לחו"ל: 7–21 ימי עסקים. ייתכנו עמלות מכס וייבוא שחלות על הלקוח.
          </Section>

          <Section title="מעקב הזמנה">
            לאחר משלוח ההזמנה ישלח אליך אימייל עם מספר מעקב. ניתן לעקוב אחר החבילה באתר דואר ישראל או אתר השליח הרלוונטי.
          </Section>

          <Section title="חבילה שאבדה או ניזוקה">
            {`אנו מחויבים לטיפול מהיר ויסודי בכל מקרה של עיכוב או נזק במשלוח. במידה והחבילה לא הגיעה במועד הצפוי, או הגיעה כשהיא פגומה — אנא צרו איתנו קשר באופן מיידי דרך כפתור הוואטסאפ באתר. צוות השירות שלנו זמין בשעות הפעילות (א׳–ה׳ 09:00–18:00) ויטפל בפנייתכם בהקדם.

במקרה של חבילה פגועה, נודה אם תצלמו ותשלחו לנו תמונות של האריזה והמוצר — הדבר יסייע לנו לזרז את הטיפול מול חברת השליחות ולהבטיח פתרון מהיר ושביעות רצונכם המלאה.`}
          </Section>

          <Section title="יצירת קשר">
            טלפון: 058-4877-770 | וואטסאפ: 058-747-9933 | אימייל: support@your-sofer.com
          </Section>
        </div>

        {/* FAQ ממוקד — משלוחים, החזרות ואחריות (מקור: data/faq.ts) */}
        <PageFaqSection pageKey="shipping" title="שאלות נפוצות על משלוחים והחזרות" max={10} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', marginBottom: 8, borderRight: '3px solid #C5A028', paddingRight: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{children}</p>
    </div>
  );
}
