'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FAQS = [
  {
    q: 'האם המוצרים באתר כשרים?',
    a: 'כן. כל מוצרי הסת"מ באתר בודקו ואושרו על-ידי סופרים מוסמכים. כל מוצר מלווה בתעודת כשרות ממגיה מוסמך.',
  },
  {
    q: 'מה ההבדל בין רמות הכשרות?',
    a: 'מהדרין — רמת הכשרות הגבוהה ביותר, מיועד למהדרין במצוות.\nמהודר — רמה גבוהה מעל הרגיל, מתאים לאלו המעוניינים בהידור מיוחד.\nרגיל — כשר לכתחילה לפי כל הדעות, מתאים לשימוש יומיומי.',
  },
  {
    q: 'כמה זמן לוקח לקבל את ההזמנה?',
    a: 'משלוח רגיל בארץ: 3–7 ימי עסקים. משלוח מהיר: 1–3 ימי עסקים. ניתן גם לאסוף עצמאית בדימונה בתיאום מוקדם.',
  },
  {
    q: 'האם ניתן להחזיר מוצר?',
    a: 'מוצרים שלא נפתחה אריזתם ניתן להחזיר תוך 14 יום. מוצרי סת"מ שנפתחו ו/או שנעשה בהם שימוש אינם ניתנים להחזרה מטעמי כשרות וקדושה.',
  },
  {
    q: 'יש לכם חנות פיזית?',
    a: 'אין חנות פיזית פתוחה לקהל הרחב, אך ניתן לתאם פגישה אישית בדימונה. צרו קשר בטלפון 055-272-2228 או באימייל nsn770@gmail.com.',
  },
  {
    q: 'האם ניתן לבקש כתיבה מותאמת אישית?',
    a: 'כן. ניתן ליצור קשר ישיר עם הסופרים דרך פרופיל הסופר באתר ולהזמין כתיבה מיוחדת בהתאם לדרישות ספציפיות.',
  },
  {
    q: 'האם אתם משלחים לחו"ל?',
    a: 'כן, אנו משלחים לכל העולם. עלות וזמן המשלוח מחושבים לפי היעד בעת הרכישה. ייתכנו מכסים מקומיים שחלים על הקונה.',
  },
  {
    q: 'כיצד ניתן לשלם?',
    a: 'ניתן לשלם בכרטיס אשראי (ויזה, מאסטרקארד, אמריקן אקספרס). התשלום מאובטח ומוצפן. פרטי הכרטיס אינם נשמרים על שרתינו.',
  },
  {
    q: 'מה עושים אם הגיע מוצר פגום?',
    a: 'צרו קשר תוך 48 שעות עם תמונות של המוצר. נשלח מוצר חלופי ללא עלות ונסדר את האיסוף.',
  },
  {
    q: 'כיצד יוצרים קשר?',
    a: 'טלפון: 055-272-2228\nאימייל: nsn770@gmail.com\nימים א׳–ה׳, 9:00–18:00',
  },
];

export default function FaqPage() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>שאלות נפוצות</h1>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>כל מה שרצית לדעת על Your Sofer</p>

          <div style={{ display: 'grid', gap: 10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ border: '1px solid #e8e8e8', borderRadius: 10, overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{ width: '100%', background: open === i ? '#f8f4ec' : '#fff', border: 'none', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'right', gap: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0c1a35' }}>{faq.q}</span>
                  <span style={{ fontSize: 18, color: '#b8972a', flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </button>
                {open === i && (
                  <div style={{ padding: '0 18px 16px', background: '#f8f4ec' }}>
                    <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 32, padding: '18px 20px', background: '#f0f4ff', border: '1px solid #c8d4f0', borderRadius: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', margin: '0 0 6px' }}>לא מצאת תשובה?</p>
            <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
              טלפון: 055-272-2228 | אימייל: nsn770@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
