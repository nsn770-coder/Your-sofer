'use client';
import { useRouter } from 'next/navigation';

// הצהרת נגישות תקנית — לפי תקנות שוויון זכויות לאנשים עם מוגבלות
// (התאמות נגישות לשירות), התשע"ג-2013, ות"י 5568 ברמת AA.
const LAST_UPDATED = 'יולי 2026';

export default function AccessibilityPage() {
  const router = useRouter();
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ background: 'var(--ys-dark-surface)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} aria-label="חזרה לעמוד הקודם" style={{ background: 'none', border: 'none', color: 'var(--ys-accent)', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
      </div>
      <main style={{ maxWidth: 820, margin: '32px auto', padding: '0 16px 48px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--ys-text)', marginBottom: 6 }}>הצהרת נגישות</h1>
          <p style={{ fontSize: 13, color: '#767676', marginBottom: 28 }}>עדכון אחרון: {LAST_UPDATED}</p>

          <Section title="מחויבות לנגישות">
            Your Sofer רואה חשיבות עליונה במתן שירות שוויוני, מכבד ונגיש לכלל הלקוחות,
            לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר והשירותים המקוונים בו בהתאם
            לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998, לתקנות שוויון זכויות
            לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולתקן הישראלי
            ת"י 5568 ברמת AA (המבוסס על הנחיות WCAG 2.0).
          </Section>

          <Section title="התאמות הנגישות באתר">
            {`• תפריט נגישות זמין בכל עמודי האתר (הכפתור הכחול בצד המסך), הכולל: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, עצירת אנימציות ופונט קריא
• קישור "דילוג לתוכן הראשי" למשתמשי מקלדת בראש כל עמוד
• ניווט מלא באמצעות מקלדת, כולל תפריטים, סל הקניות ותהליך התשלום
• סימון מוקד (פוקוס) נראה לעין בניווט מקלדת
• האתר מוגדר בשפה העברית ובכיוון מימין לשמאל עבור טכנולוגיות מסייעות
• טקסט חלופי (alt) לתמונות מוצרים
• תוויות ברורות לשדות טפסים והודעות שגיאה מוסברות
• תמיכה בהגדלת תצוגה עד 200% ללא אובדן תוכן
• מבנה כותרות סמנטי ותמיכה בקוראי מסך (NVDA ואחרים)
• כיבוד העדפת מערכת ההפעלה לצמצום תנועה (prefers-reduced-motion)`}
          </Section>

          <Section title="רכיבים שעשויים שלא להיות נגישים במלואם">
            {`אנו פועלים לשיפור מתמיד, ועם זאת ייתכנו רכיבים שטרם הונגשו במלואם:
• רכיבי צד שלישי המוטמעים באתר (צ'אט שירות, רכיב הסליקה של ספק התשלומים) — הנגשתם תלויה גם בספקים החיצוניים
• חלק מתמונות המוצרים הישנות עשויות לכלול תיאור חלקי
נתקלתם ברכיב שאינו נגיש? נשמח שתדווחו לנו ונטפל בהקדם, ובמידת הצורך נספק את המידע או השירות בדרך חלופית נגישה.`}
          </Section>

          <Section title="פנייה בנושא נגישות (רכז הנגישות)">
            {`לכל שאלה, תקלה או בקשה בנושא נגישות ניתן לפנות אל:
שם: נסים — רכז הנגישות של Your Sofer
טלפון: 058-4877-770
וואטסאפ: 058-747-9933
דוא"ל: shop@your-sofer.com
אנו מתחייבים לטפל בכל פנייה בהקדם האפשרי, ולכל היותר בתוך 5 ימי עסקים. אם לא ניתן לתקן את התקלה מיידית — נציע דרך חלופית נגישה לקבלת המידע או להשלמת הרכישה (לרבות ביצוע הזמנה בטלפון או בוואטסאפ).`}
          </Section>

          <Section title="אופן מתן השירות">
            השירות של Your Sofer ניתן באופן מקוון בלבד (אתר אינטרנט), עם משלוחים עד
            הבית בכל הארץ. אין נקודת קבלת קהל פיזית, ולכן לא נדרשים הסדרי נגישות פיזיים.
          </Section>

          <Section title="דפדפנים וטכנולוגיות שנבדקו">
            האתר תוכנן לעבוד עם הדפדפנים הנפוצים (Chrome, Safari, Edge, Firefox)
            במחשב ובנייד, ונבדק עם קורא המסך NVDA ועם ניווט מקלדת מלא.
          </Section>

          <Section title="תאריך עדכון ההצהרה">
            הצהרה זו עודכנה לאחרונה ב{LAST_UPDATED}. אנו בוחנים ומעדכנים את נגישות
            האתר באופן שוטף, בפרט לאחר שינויים מהותיים באתר.
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ys-text)', marginBottom: 8, borderRight: '3px solid var(--ys-accent)', paddingRight: 10 }}>{title}</h2>
      <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-line' }}>{children}</p>
    </section>
  );
}
