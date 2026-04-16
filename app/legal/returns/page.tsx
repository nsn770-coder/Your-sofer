'use client';
import { useRouter } from 'next/navigation';

export default function ReturnsPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>מדיניות החזרים</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="ביטול עסקה — הכלל הכללי">
            בהתאם לחוק הגנת הצרכן (תשנ"ח–1997) ותקנות הגנת הצרכן (ביטול עסקה), ניתן לבטל עסקה תוך 14 יום מיום קבלת המוצר או מיום קבלת מסמך הגילוי (המאוחר ביניהם).
          </Section>

          <Section title="מוצרי סת״מ — חריג חשוב">
            מוצרי סת"מ (ספר תורה, תפילין, מזוזות, מגילות) שנפתחה אריזתם המקורית ו/או שנעשה בהם שימוש כלשהו אינם ניתנים להחזרה או לביטול עסקה. הדבר נובע הן מטעמי קדושת הפריט והן מסיבות כשרות — לאחר שימוש לא ניתן לאמת את מצב המוצר.
          </Section>

          <Section title="מוצרים שניתן להחזיר">
            מוצרים שלא נפתחה אריזתם ולא נעשה בהם שימוש ניתן להחזיר תוך 14 יום. עלות המשלוח החוזר חלה על הלקוח.
            {' '}ההחזר הכספי יבוצע לאמצעי התשלום שבו בוצעה העסקה, תוך עד 14 ימי עסקים ממועד קבלת המוצר ובדיקתו.
          </Section>

          <Section title="מוצר פגום או טעות בהזמנה">
            אם התקבל מוצר פגום, שגוי או שניזוק במהלך המשלוח, יש ליצור קשר תוך 48 שעות מקבלת החבילה.
            {' '}במקרה כזה העסק ידאג להחלפת המוצר או להחזר כספי מלא, כולל עלויות משלוח, בהתאם למקרה.
          </Section>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0c1a35', marginBottom: 8, borderRight: '3px solid #b8972a', paddingRight: 10 }}>
              איך מבטלים עסקה?
            </h2>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: '0 0 10px' }}>
              לביטול עסקה ניתן לפנות באחת מהדרכים הבאות:
            </p>
            <ul style={{ fontSize: 14, color: '#444', lineHeight: 2, margin: '0 0 14px', paddingRight: 20, listStyle: 'disc' }}>
              <li>אימייל: <a href="mailto:shop@your-sofer.com" style={{ color: '#0c1a35', fontWeight: 700 }}>shop@your-sofer.com</a></li>
              <li>טלפון: <a href="tel:0552722228" style={{ color: '#0c1a35', fontWeight: 700 }}>055-272-2228</a></li>
              <li>ימים ושעות פעילות: א׳–ה׳ בין 09:00–18:00</li>
            </ul>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: '0 0 8px', fontWeight: 700 }}>יש לציין:</p>
            <ul style={{ fontSize: 14, color: '#444', lineHeight: 2, margin: 0, paddingRight: 20, listStyle: 'disc' }}>
              <li>מספר הזמנה</li>
              <li>שם מלא</li>
              <li>מספר טלפון</li>
              <li>שם המוצר</li>
              <li>סיבת הביטול</li>
            </ul>
          </div>

          <Section title="כתובת להחזרת מוצרים">
            פרופ׳ עדה יונת 19/2, דימונה.
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
