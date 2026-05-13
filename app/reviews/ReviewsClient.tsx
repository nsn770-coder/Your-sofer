'use client';
import { Star, MessageCircle, CheckCircle, Users } from 'lucide-react';

const reviews = [
  { name: "איתי כהן", city: "תל אביב", rating: 5, category: "מזוזה", text: "הזמנתי מזוזות לבית החדש. מה שהכי הרשים אותי זה שקיבלתי צילום של הסופר כותב את הקלף שלי יחד עם תעודת הבדיקה. הרב שמחה דיבר איתי אישית והסביר הכל. שירות ברמה שלא הכרתי." },
  { name: "מרדכי פרידמן", city: "בני ברק", rating: 5, category: "תפילין", text: "בתור אדם חרדי שקנה לא מעט סת״ם בחיי, אני אומר לכם - ההסבר והשקיפות כאן הם פשוט מושלמים. היכולת לדבר ולראות את הסופר נותנת שקט נפשי שפשוט לא קיים בשוק." },
  { name: "יוסף לוי", city: "ירושלים", rating: 5, category: "תפילין", text: "קניתי תפילין לבר מצווה של הבן. הסופר יצר איתי קשר כדי לוודא שאני מבין את ההבדלים בין הרמות. הרגשתי שאני בידיים של מישהו שבאמת אכפת לו מהמצווה ולא רק מהמכירה." },
  { name: "אברהם פרץ", city: "פתח תקווה", rating: 5, category: "ספר תורה", text: "ליוו אותנו צעד אחר צעד בכתיבת ספר תורה לבית הכנסת. המקצוענות והירידה לפרטים של הצוות היא משהו אחר. הכל בשקיפות מלאה ובמאור פנים." },
  { name: "ישראל גולדשטיין", city: "ביתר עילית", rating: 5, category: "מזוזה", text: "חיפשתי מקום עם אמינות מעל הכל. כאן לא רק מוכרים לך, אלא מסבירים לך את ההלכה ואת רמת הכשרות. לראות את הסופר בפעולה זה דבר שנותן ביטחון מלא." },
  { name: "דוד נחמיאס", city: "באר שבע", rating: 5, category: "מזוזה", text: "אחרי שראיתי את הסרטונים והתמונות באתר הבנתי שזה המקום. השקיפות היא הכל בסת״ם, וכאן הם פשוט מובילים בזה. קיבלתי מזוזות מהודרות עם כל האישורים." },
  { name: "קובי אמר", city: "רחובות", rating: 5, category: "תפילין", text: "צוות תותחים. עזרו לי בכל התהליך של בדיקת התפילין הישנות והתאמת חדשות. שירות מהיר, אדיב ומאוד מקצועי. אין ספק שאחזור לכאן." },
  { name: "יעקב שמש", city: "ראשון לציון", rating: 5, category: "תפילין", text: "לא ידעתי מאיפה להתחיל עם התפילין של הילד. ב-Your Sofer הדריכו אותי בסבלנות, הראו לי את הקלף ואת הסופר. זה נותן הרגשה טובה שקונים מוצר כשר ואיכותי בלב שקט." },
  { name: "אסתר מזרחי", city: "מודיעין", rating: 5, category: "מזוזה", text: "הרב שמחה בדק את המזוזות הישנות שלי וגילה שהן פסולות לגמרי. הוא עזר לי לבחור קלפים חדשים ומהודרים. התקשורת איתם רציפה ונעימה, תודה רבה!" },
  { name: "שניאור זלמן", city: "כפר חב״ד", rating: 5, category: "קלף", text: "סוף סוף אתר שבו הסופר הוא לא דמות וירטואלית אלא אדם שאפשר לדבר איתו. השקיפות הזאת היא מהפכה בשוק הסת״ם. איכות הקלף והכתב - רמה גבוהה ביותר." },
  { name: "איתן רפאלי", city: "נתניה", rating: 5, category: "מזוזה", text: "החלפתי את כל המזוזות בבית. המשלוח הגיע מהר, ארוז בצורה מכובדת עם כל תעודות הכשרות והבדיקה. רואים שיש פה יראת שמיים ודגש על איכות." },
  { name: "משה וייס", city: "ירושלים", rating: 5, category: "תפילין", text: "הגעתי דרך המלצה וגיליתי עולם שלם של שקיפות. האפשרות לראות את תהליך הכתיבה ולדעת בדיוק מי הסופר שלך היא משהו שאין לו מחיר. קנייה בראש שקט לגמרי." },
];

const stats = [
  { label: "רכשו אצלנו", value: "+4,448 לקוחות" },
  { label: "דירוג ממוצע", value: "4.8 ★" },
  { label: "ביקורות אמיתיות", value: "+247" },
];

export default function ReviewsClient() {
  return (
    <div dir="rtl" style={{ backgroundColor: '#F5F2EC', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <section style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>מה הלקוחות אומרים</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: '0 0 32px' }}>אלפי לקוחות מרוצים ברחבי הארץ שקונים סת״מ בראש שקט</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#C5A028' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#C5A028', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {r.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0C1A35' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{r.city} • {r.category}</div>
                </div>
              </div>
              <div style={{ color: '#E6A817', fontSize: 15, marginBottom: 8 }}>{'★'.repeat(r.rating)}</div>
              <p style={{ fontSize: 13.5, color: '#333', lineHeight: 1.75, margin: '0 0 12px', fontStyle: 'italic' }}>"{r.text}"</p>
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, fontSize: 11, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✓ רכישה מאומתת
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 800, margin: '0 auto 60px', padding: '0 16px' }}>
        <div style={{ background: '#F0EBE0', borderRadius: 14, padding: '40px 24px', textAlign: 'center', border: '1px solid #E0D8CC' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A35', margin: '0 0 8px' }}>גם לך יש חוויה לשתף?</h2>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px' }}>הביקורת שלך עוזרת לאחרים לקנות סת״ם כשר בביטחון ובשקיפות</p>
          <a href="https://wa.me/972552722228?text=אני%20רוצה%20לכתוב%20ביקורת%20על%20Your%20Sofer" target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', background: '#C5A028', color: '#0C1A35', fontWeight: 700, fontSize: 15, padding: '13px 32px', borderRadius: 8, textDecoration: 'none' }}>
            כתוב ביקורת בוואטסאפ
          </a>
        </div>
      </section>
    </div>
  );
}
