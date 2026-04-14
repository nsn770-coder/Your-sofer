'use client';
import { useRouter } from 'next/navigation';

export default function TakanonPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>תקנון האתר</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>עדכון אחרון: אפריל 2025</p>

          <Section title="1. כללי">
            ברוכים הבאים לאתר Your Sofer (להלן: "האתר"). האתר מופעל על-ידי Your Sofer ומשמש כפלטפורמה למכירת מוצרי סת"מ ויודאיקה מאומתים. השימוש באתר מהווה הסכמה מלאה לתנאי תקנון זה.
          </Section>

          <Section title="2. הזמנות ורכישות">
            כל הזמנה כפופה לאישור זמינות המוצר ואימות פרטי התשלום. האתר שומר לעצמו את הזכות לבטל הזמנה שנעשתה עקב טעות בתמחור או בתיאור המוצר. לאחר אישור ההזמנה תשלח הודעת אישור לכתובת האימייל שסופקה.
          </Section>

          <Section title="3. מחירים ותשלום">
            כל המחירים באתר כוללים מע"מ (17%) אלא אם צוין אחרת. התשלום מתבצע באמצעות כרטיס אשראי דרך מערכת סליקה מאובטחת. האתר אינו שומר פרטי כרטיס אשראי.
          </Section>

          <Section title="4. אספקה ומשלוחים">
            זמני האספקה המוערכים מפורטים בדף המוצר. האתר אינו אחראי לעיכובים הנובעים מגורמים חיצוניים (שביתות, מזג אוויר, עיכובי שליחות). ניתן לתאם איסוף עצמי בדימונה בתיאום מוקדם.
          </Section>

          <Section title="5. ביטולים והחזרות">
            ניתן לבטל עסקה בהתאם לחוק הגנת הצרכן (תשנ"ח–1997). מוצרי סת"מ שנפתחה אריזתם ו/או שנעשה בהם שימוש אינם ניתנים להחזרה מטעמי קדושה וכשרות. פרטים מלאים בעמוד מדיניות ההחזרים.
          </Section>

          <Section title="6. אחריות למוצרים">
            כל מוצרי הסת"מ באתר כשרים לכתחילה ובודקו על-ידי סופרים מוסמכים. במקרה של פגם המתגלה תוך 30 יום מהאספקה יוחלף המוצר ללא עלות.
          </Section>

          <Section title="7. קניין רוחני">
            כל התכנים באתר — תמונות, טקסטים, לוגו ועיצוב — הם רכוש Your Sofer. אין להעתיק, לשכפל או לעשות שימוש מסחרי בתכנים ללא אישור מפורש בכתב.
          </Section>

          <Section title="8. שינויים בתקנון">
            האתר רשאי לעדכן תקנון זה בכל עת. המשך השימוש באתר לאחר פרסום עדכון מהווה הסכמה לנוסח המעודכן.
          </Section>

          <Section title="9. יצירת קשר">
            לכל שאלה: טלפון 055-272-2228 | אימייל nsn770@gmail.com
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
