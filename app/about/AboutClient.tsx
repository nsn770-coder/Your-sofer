'use client';
import { useRouter } from 'next/navigation';

const VALUES = [
  {
    title: 'מעבר למוצר',
    desc: 'אנשים לא קונים רק מוצר. הם קונים רגע. הם קונים את המזוזה לבית החדש. את הכיפה לבר המצווה. את המתנה לחתונה. את הגביע לקידוש הראשון. את הפריט שילווה את שולחן השבת המשפחתי במשך שנים. מאחורי כל רכישה יש סיפור, זיכרון, מסורת ורגע משמעותי. לכן המטרה שלנו אינה רק למכור מוצרים, אלא לאפשר לכל אדם להתחבר ליהדות שלו דרך הדברים שהוא בוחר להכניס לביתו ולחייו.',
  },
  {
    title: 'השורשים שלנו בעולם הסת"מ',
    desc: 'החזון המקורי של Your Sofer התחיל דווקא מעולם הסת"מ. הרצון היה להנגיש מזוזות, תפילין וכתבי קודש כשרים, איכותיים ואמינים יותר לכל אדם. רצינו ליצור מקום שבו אפשר לרכוש מוצרים בעלי משמעות רוחנית עמוקה מתוך ביטחון מלא באיכותם ובאמינותם. גם כיום עולם הסת"מ ממשיך להיות חלק מרכזי מהזהות שלנו ומהערכים שעליהם נבנה המותג — אמינות, אחריות, מסורת וכבוד לקדושה.',
  },
  {
    title: 'יהדות שנוגעת בחיים',
    desc: 'עבורנו יהדות אינה נמצאת רק בבית הכנסת. היא נמצאת בבית, סביב שולחן השבת, בחדר הילדים, באירועים המשפחתיים וברגעים המשמעותיים ביותר של החיים. לכן אנו בוחרים בקפידה את המוצרים שאנו מציעים, מתוך רצון לשלב בין מסורת, אסתטיקה, איכות ושימושיות. המטרה היא לאפשר לכל משפחה לבנות בית יהודי חם, מכובד ומלא משמעות.',
  },
];

const STATS = [
  // מסונכרן עם מסר ה-"מעל 5,000" בדף הבית ובמטא-דאטה. אין להשאיר כאן מספר נמוך יותר.
  { value: '+5,000 מוצרים', label: 'תכשיטים, כיפות, יודאיקה ותשמישי קדושה' },
  { value: '+20 סופרים', label: 'מוסמכים ומאומתים' },
  { value: 'מגיה מוסמך', label: 'על כל מוצר לפני משלוח' },
];

const VISION_ITEMS = [
  'כיפות לאירועים',
  'הדפסות אישיות',
  'מזוזות ותפילין',
  'מתנות יהודיות',
  'כיסויי טלית ותפילין',
  'מוצרי שבת וחג',
  'יודאיקה לבית',
  'מוצרים לבר מצווה, חתונה ושאר אירועי החיים',
];

export default function AboutClient() {
  const router = useRouter();

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F5F2EC', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 34, fontWeight: 900, margin: '0 0 10px' }}>אודותינו</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          Your Sofer — הרבה יותר מחנות יהדות
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px 60px' }}>

        {/* Section 1 — Origin */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Your Sofer נולד מתוך שליחות</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            במהלך פעילות חב"ד לנוער בדימונה, לצד עבודה יומיומית עם משפחות, בני נוער וקהילות, פגשנו שוב ושוב אנשים שחיפשו מוצרי יהדות איכותיים — ולא תמיד ידעו היכן למצוא אותם. מצד אחד היו חנויות קטנות עם מבחר מוגבל. מצד שני היו אתרים גדולים, שבהם קשה לדעת מי עומד מאחורי המוצר, מה רמת האיכות שלו והאם אפשר באמת לסמוך עליו. מתוך הצורך הזה נולד הרעיון להקים מקום אחד שיחבר בין איכות, אמינות, מגוון רחב וערכים יהודיים. כך נולד Your Sofer.
          </p>
        </div>

        {/* Section 2 — Vision */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>החזון שלנו</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: '0 0 16px' }}>
            אנחנו מאמינים שלכל אדם מגיעה גישה פשוטה ונוחה לעולם היהדות. החזון שלנו הוא ליצור מקום אחד שמרכז עולם שלם של מוצרים יהודיים — מעין "אמזון לעולם היהודי". מקום שבו אפשר למצוא בקלות ובנוחות:
          </p>
          <ul style={{ color: '#444', fontSize: 15, lineHeight: 2, margin: '0 0 0 0', paddingRight: 20 }}>
            {VISION_ITEMS.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: '16px 0 0' }}>
            הכול במקום אחד, בצורה מסודרת, נגישה ונעימה לחוויית קנייה.
          </p>
        </div>

        {/* Section 3 — Values (3 cards) */}
        <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 18px' }}>מה שחשוב לנו</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ys-text)', marginBottom: 10 }}>{v.title}</div>
              <div style={{ fontSize: 13.5, color: '#555', lineHeight: 1.75 }}>{v.desc}</div>
            </div>
          ))}
        </div>

        {/* Section 4 — Stats */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 100%)', borderRadius: 14, padding: '32px 24px', marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
            {STATS.map(s => (
              <div key={s.value} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ys-accent)', marginBottom: 6 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Mission */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>עסק עם מטרה</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            Your Sofer הוקם כעסק, אך הוא נולד מתוך שליחות. הפעילות המסחרית של האתר מסייעת לנו להמשיך ולהרחיב את פעילות חב"ד לנוער בדימונה. באמצעות כל רכישה אנו יכולים להמשיך לקיים שיעורים, פעילויות חינוכיות, ליווי אישי לבני נוער, יוזמות קהילתיות ופרויקטים נוספים למען הדור הצעיר. כך שכל לקוח אינו רק רוכש מוצר — הוא הופך לשותף בעשייה רחבה יותר וביצירת השפעה חיובית על חייהם של אחרים.
          </p>
        </div>

        {/* Section 6 — Why we're here */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>למה אנחנו כאן</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            אנחנו כאן כדי להפוך את עולם היהדות לנגיש יותר. כדי לחבר בין מסורת לאיכות. כדי להעניק מקום שאפשר לסמוך עליו. וכדי לאפשר לכל אדם למצוא את הפריטים שילוו אותו ברגעים החשובים ביותר בחיים.
          </p>
        </div>

        {/* Section 7 — Closing statement */}
        <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #1a1a1a 100%)', borderRadius: 14, padding: '36px 32px', marginBottom: 32, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--ys-accent)', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Your Sofer — הבית היהודי שלכם מתחיל כאן</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
            מתוך אהבה ליהדות, מתוך מחויבות לאיכות ולאמינות, ומתוך אמונה שמוצרים יהודיים אינם רק חפצים — אלא דרך להתחבר למסורת, למשפחה ולערכים שעוברים מדור לדור.
          </p>
        </div>

        {/* Section 8 — Contact */}
        <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '32px', marginBottom: 28 }}>
          <h2 style={{ color: 'var(--ys-text)', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>פרטי התקשרות</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15, color: '#444' }}>
            <div><strong>שם העסק:</strong> Your Sofer — חנות אונליין לרכישת מוצרי סת״מ ויודאיקה, בבעלות ובניהול <strong>בואהרון ניסן נסים</strong> (עוסק מורשה 304803810)</div>
            <div>
              <strong>טלפון ראשי: </strong>
              <a href="tel:0584877770" style={{ color: 'var(--ys-text)', fontWeight: 700, textDecoration: 'none' }}>058-4877-770</a>
            </div>
            <div>
              <strong>וואטסאפ שירות לקוחות: </strong>
              <a href="https://wa.me/972587479933" style={{ color: 'var(--ys-text)', fontWeight: 700, textDecoration: 'none' }}>058-747-9933</a>
            </div>
            <div>
              <strong>מייל: </strong>
              <a href="mailto:support@your-sofer.com" style={{ color: 'var(--ys-text)', fontWeight: 700, textDecoration: 'none' }}>support@your-sofer.com</a>
            </div>
            <div><strong>כתובת:</strong> רחוב האורן 18, דימונה, ישראל (בית חב״ד לנוער דימונה)</div>
            <div><strong>שעות פעילות:</strong> א׳–ה׳, 09:00–18:00</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'var(--ys-accent)', color: 'var(--ys-text)', border: 'none', padding: '14px 32px', fontSize: 16, fontWeight: 800, cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit' }}
          >
            לחנות המלאה ←
          </button>
        </div>

      </div>
    </div>
  );
}
