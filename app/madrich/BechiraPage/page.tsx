'use client';
import { ArticleLayout, PageHero, QuoteBlock, CTAStrip, RelatedCard, Step } from '../InfoComponents';

export default function BechiraPage() {
  return (
    <ArticleLayout>
      <PageHero
        badge="מדריך מעשי"
        title="איך לבחור מזוזה נכונה"
        subtitle="גם אם אין לך מושג בסת״ם — המדריך הזה יעזור לך לקבל החלטה טובה"
      />

      <div style={{ padding: '40px 0' }}>

        <p style={{ fontSize: 17, lineHeight: 1.8, color: '#333', marginBottom: 24 }}>
          הבשורה הטובה: אתם לא צריכים להיות מומחים בסת"ם כדי לבחור מזוזה טובה. אתם צריכים שקיפות ומקור שאפשר לסמוך עליו.
        </p>

        <QuoteBlock text="לא קונים מזוזה בעיניים עצומות. שאלו שאלות. בקשו לראות. ודאו שאתם יודעים בדיוק מה אתם מקבלים." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '36px 0 20px' }}>
          6 שלבים לבחירה נכונה
        </h2>

        <Step num={1} title="אל תבחרו רק לפי מחיר" desc="מחיר נמוך מאוד הוא לרוב סימן שמישהו חסך — בזמן, בדיוק, או בבדיקה. מחיר הוגן הוא חלק ממזוזה טובה." />
        <Step num={2} title="שאלו מי הסופר" desc='האם הסופר ידוע? האם יש מידע מי כתב את הקלף? ב-Your Sofer, כל מזוזה מקושרת לסופר שכתב אותה.' />
        <Step num={3} title="בקשו לראות את הקלף עצמו" desc="לא תמונת דוגמה — הקלף הספציפי שאתם קונים. ב-Your Sofer, כל קלף מצולם ומוצג בגלריה לפני מכירה." />
        <Step num={4} title="הבינו איך בודקים" desc="האם המזוזה נבדקה? על ידי מי? בדיקה ידנית מוסמכת + בדיקת מחשב הן הסטנדרט המקצועי." />
        <Step num={5} title="הכירו את רמות האיכות" desc='יש הבדל בין "כשר" ל"מהודר". כשר פירושו עמידה בדרישות המינימליות. מהודר פירושו כתיבה בסטנדרט גבוה יותר עם קפידה מיוחדת.' />
        <Step num={6} title="קנו ממקום שאפשר לסמוך עליו" desc="שקיפות, גלוי לב, ומוכנות לענות על שאלות — אלה הסימנים הטובים ביותר לספק אמין." />

        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>
          שאלות שכדאי לשאול לפני הקנייה
        </h2>

        <div style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: 10, padding: '24px', marginBottom: 28 }}>
          {[
            'מי הסופר שכתב את המזוזה?',
            'האם ניתן לראות תמונה של הקלף הספציפי?',
            'מי בדק את המזוזה ואיך?',
            'מה הנוסח — אשכנז, ספרד, חב"ד?',
            'מה גודל הקלף?',
            'מה עושים אם מתגלה בעיה?',
          ].map(q => (
            <div key={q} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
              <span style={{ color: '#b8972a', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 15, color: '#333' }}>{q}</span>
            </div>
          ))}
        </div>

        <QuoteBlock text="אתם לא צריכים להבין בכל הפרטים הטכניים. אתם צריכים מקור שמוכן לענות על כל שאלה — ואם הוא לא רוצה לענות, זה כבר אומר משהו." />

        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: '40px 0 16px' }}>קריאה נוספת</h3>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <RelatedCard emoji="💸" title="למה לא לקנות מזוזה זולה" desc="מה ההבדל האמיתי בין מחירים" href="/madrich/mezuza-zola" />
          <RelatedCard emoji="⭐" title="מה זה מהודר באמת" desc="ההבדל בין כשר למהודר" href="/madrich/mehudar" />
          <RelatedCard emoji="❓" title="שאלות נפוצות" desc="תשובות לשאלות הנפוצות" href="/madrich/faq" />
        </div>

        <CTAStrip
          title="רוצים עזרה בבחירה?"
          buttons={[
            { label: 'לגלריית הקלפים ←', href: '/', variant: 'primary' },
            { label: 'דבר עם הסופר', href: '/', variant: 'secondary' },
          ]}
        />
      </div>
    </ArticleLayout>
  );
}
