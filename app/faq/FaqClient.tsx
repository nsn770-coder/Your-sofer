'use client';
import { useState } from 'react';

const FAQS = [
  {
    q: 'מה זה מזוזה כשרה?',
    a: 'מזוזה כשרה היא קלף עור בהמה שנכתב ביד על ידי סופר מוסמך, עם כוונה לשם מצוות מזוזה. הכתיבה חייבת להיות תקינה לפי ההלכה — כל אות מדויקת, ללא שגיאות, ועל קלף מוכשר כראוי.',
  },
  {
    q: 'מה ההבדל בין רמות הכשרות?',
    a: 'ישנן מספר רמות: כשר — עומד בדרישות ההלכה הבסיסיות. מהודר — כתיבה ברמה גבוהה יותר, בדיקה קפדנית יותר. מהודר מאוד / גלאי — הרמה הגבוהה ביותר, מומלץ במיוחד לדלת הכניסה.',
  },
  {
    q: 'איך אני יודע שהסופר מוסמך?',
    a: 'כל סופר ב-YourSofer עבר תהליך אימות. אתה יכול לראות את תעודת ההסמכה שלו בפרופיל. בנוסף, כל מוצר עובר בדיקת מגיה מוסמך לפני משלוח.',
  },
  {
    q: 'מה זה בדיקת מגיה?',
    a: 'מגיה הוא מומחה לבדיקת ספרי תורה, תפילין ומזוזות. הוא בודק כל אות בקלף תחת הגדלה, מוודא שאין שגיאות ושהכתיבה תקינה לפי ההלכה. אצלנו כל מוצר עובר בדיקה כזו לפני שיוצא.',
  },
  {
    q: 'כמה זמן משלוח?',
    a: 'בדרך כלל 3-7 ימי עסקים. מוצרים שיש במלאי יוצאים תוך יום-יומיים. מוצרים שנכתבים לפי הזמנה עשויים לקחת יותר זמן — יצוין בדף המוצר.',
  },
  {
    q: 'האם אפשר לבחור סופר ספציפי?',
    a: 'כן. בדפי קלפי מזוזה ותפילין תוכל לראות את שם הסופר ולינק לפרופיל שלו. אם אתה רוצה סופר ספציפי, צור איתנו קשר ונחבר ביניכם.',
  },
  {
    q: 'מה קורה אם המזוזה נפסלת?',
    a: 'מזוזות ותפילין צריכים בדיקה תקופתית. אם מוצר שקנית אצלנו נמצא פסול בבדיקה תוך שנה מהרכישה — צור קשר ונטפל בזה.',
  },
  {
    q: 'האם אפשר להחזיר מוצר?',
    a: 'מוצרים שלא נפתחו ניתן להחזיר תוך 14 יום. קלפים שנכתבו לפי הזמנה אישית אינם ניתנים להחזרה. לפרטים נוספים ראה מדיניות החזרות.',
  },
  {
    q: 'האם יש ייעוץ לפני הרכישה?',
    a: 'כן. אפשר לפנות אלינו בוואטסאפ וניתן ייעוץ אישי — איזה רמת כשרות מתאימה, איזה גודל קלף, ואיזה סופר מתאים לצרכים שלך.',
  },
  {
    q: 'מה ההבדל בין YourSofer לחנות רגילה?',
    a: 'בחנות רגילה אתה קונה מוצר אנונימי. אצלנו אתה יודע מי כתב, מי בדק, ואפשר לדבר ישירות עם הסופר. בנוסף — אנחנו חוסכים את רווח המתווך, אז אותו תקציב קונה רמה גבוהה יותר.',
  },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid #E0D8CC' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'right', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0C1A35', flex: 1, textAlign: 'right' }}>{q}</span>
        <span style={{ color: '#C5A028', fontSize: 16, fontWeight: 700, marginRight: 12, flexShrink: 0 }}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      <div style={{
        maxHeight: open ? 400 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.28s ease',
      }}>
        <div style={{ fontSize: 14, color: '#444', lineHeight: 1.8, padding: '12px 16px', background: '#F8F5F0' }}>
          {a}
        </div>
      </div>
    </div>
  );
}

export default function FaqClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F5F2EC', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 900, margin: '0 0 10px' }}>שאלות ותשובות</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          כל מה שרצית לדעת לפני שקונים סת״מ
        </p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px 60px' }}>
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, overflow: 'hidden' }}>
          {FAQS.map((faq, i) => (
            <FaqItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: 'center', background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '28px 24px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0c1a35', marginBottom: 8 }}>לא מצאת תשובה?</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>צור איתנו קשר בוואטסאפ ונענה תוך דקות</div>
          <a
            href="https://wa.me/972XXXXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            שלח הודעה בוואטסאפ ←
          </a>
        </div>
      </div>
    </div>
  );
}
