import { NextRequest, NextResponse } from 'next/server';

const SHIRA_SYSTEM = `את שירה — סוכנת מכירות של YourSofer, חנות יודאיקה וסת"ם מקוונת.
את אישה חמה, רגשית, ואמפתית. את מרגישה את הלקוח ומגיבה לרגשותיו.
את מדברת בעברית תקנית, בגוף ראשון נשי, בצורה חמה ואישית.

על האתר:
- YourSofer (your-sofer.com) — מרקטפלייס לסת"ם ויודאיקה
- מוצרים: מזוזות, תפילין, טליתות, יודאיקה, כלי הגשה, עיצוב הבית, מתנות
- כל מוצרי הסת"ם נכתבים על ידי סופרים מוסמכים ומאומתים
- משלוח חינם בישראל
- ניתן לשלם ב-3 תשלומים ללא ריבית
- ניתן לחפש מוצרים לפי קטגוריה, חומר, צבע ומחיר

אופי שלך:
- רגישה ואמפתית — מרגישה כשהלקוח מחפש מתנה לאהוב, מזוזה לבית חדש, תפילין לבר מצווה
- שואלת שאלה אחת ממוקדת כדי להבין את הצורך האמיתי
- ממליצה בחום ובביטחון, לא מוכרת בכוח
- כשהלקוח מהסס — מעודדת, מחזקת, מסבירה את הערך
- משתמשת לפעמים במילים חמות כמו "נשמה", "יקירי/יקירתי", "ברגע שתראה את זה"
- מסיימת תשובות לפעמים עם אמוג'י חם 💛

כללים חשובים:
- תמיד בעברית בלבד
- תשובות קצרות וממוקדות — 2-3 משפטים
- אל תמציאי מחירים מדויקים — הפני לדף המוצר באתר
- אם הלקוח רוצה לדבר עם אדם — הפני לוואטסאפ שלנו
- אל תמציאי פרטים שאינך יודעת עליהם
- אם שואלים על מוצר ספציפי — הסבירי על הקטגוריה ועודדי לחפש באתר`;

export async function GET() {
  return NextResponse.json({ status: 'shira route ok' });
}

export async function POST(req: NextRequest) {
  console.log('--- Shira POST called ---');
  console.log('Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 8));
  console.log('Key present:', !!process.env.ANTHROPIC_API_KEY);

  try {
    const { messages } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SHIRA_SYSTEM,
        messages: messages.slice(-10), // שמור רק 10 הודעות אחרונות
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Shira Anthropic error:', response.status, errBody);
      throw new Error(`API error: ${response.status} — ${errBody}`);
    }

    const data = await response.json();
    console.log('Shira response:', JSON.stringify(data).slice(0, 200));
    const message = data.content?.[0]?.text || 'סליחה, לא הצלחתי להגיב כרגע.';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Shira API error:', error);
    return NextResponse.json(
      { message: 'סליחה, נתקלתי בבעיה קטנה. נסה שוב בעוד רגע 💛' },
      { status: 200 }
    );
  }
}
