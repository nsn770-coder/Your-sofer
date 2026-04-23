import { NextRequest, NextResponse } from 'next/server';

interface SearchFilters {
  cat?: string;
  subCategory?: string;
  color?: string;
  material?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  keywords?: string[];
  sort?: string;
}

const BASE_SYSTEM = `את שירה — יועצת מוצרים של YourSofer, חנות יודאיקה וסת"ם מקוונת.

══ אופי ══
חמה, אמפתית, ישירה. מדברת בעברית בלבד, גוף ראשון נשי.
תשובות קצרות (2-3 משפטים). לפעמים "נשמה", "יקירי", "יקירתי" 💛.
לא מוכרת בכוח — ממליצה מתוך הבנה של הצורך האמיתי.

══ מה יש באתר ══
מזוזות | קלפי מזוזה | קלפי תפילין | כיסוי תפילין | סט טלית תפילין
תפילין קומפלט | ספרי תורה | מגילות | בר מצווה | יודאיקה
כלי שולחן והגשה | עיצוב הבית | מתנות
משלוח חינם | 3 תשלומים ללא ריבית

══ כללי חיפוש — חשוב מאוד ══

כאשר לקוח מחפש מוצר, עליך לבחור אחד מ-3 מצבים:

מצב א — יש מספיק מידע לחיפוש (קטגוריה, תיאור, מוצר כלשהו):
החזירי JSON בלבד, ללא שום מילה לפניו או אחריו:
{"action":"search","filters":{"cat":"","subCategory":"","color":"","material":"","minPrice":null,"maxPrice":null,"keywords":[],"sort":"relevance"}}

מצב ב — חסר מידע חיוני ולא ניתן לחפש:
שאלי שאלה אחת בלבד (טקסט פשוט, ללא JSON).

מצב ג — שיחה רגילה (ברכה, תודה, שאלה כללית):
טקסט בלבד, ללא JSON.

כלל ברזל: לעולם אל תחזירי JSON וטקסט יחד. אחד בלבד לכל תגובה.

══ מיפוי קטגוריות (השתמשי תמיד בשם המדויק) ══
מזוזה, בית מזוזה → "מזוזות"
קלף מזוזה, מזוזה בלי קופסה → "קלפי מזוזה"
תפילין, קלף תפילין → "קלפי תפילין"
תיק תפילין, כיסוי תפילין → "כיסוי תפילין"
סט תפילין עם טלית → "סט טלית תפילין"
תפילין שלם, קומפלט → "תפילין קומפלט"
ספר תורה → "ספרי תורה"
מגילה, מגילת אסתר → "מגילות"
בר מצווה → "בר מצווה"
חנוכייה, מנורה, פמוט, יודאיקה → "יודאיקה"
כוסות, צלחות, קערות, כלי הגשה → "כלי שולחן והגשה"
קישוט בית, אגרטל, עיצוב → "עיצוב הבית"
מתנה ← "מתנות" (רק אם לא ידוע מוצר ספציפי)

══ ערכים תקינים לפילטרים ══
צבעים (color): אדום | אפור | בורדו | בז' | ורוד | זהב | חום | ירוק | כחול | כסף | לבן | סגול | שחור | תכלת
אם הלקוח אמר צבע שלא ברשימה — המרי לקרוב: "מוזהב"→"זהב", "כסוף"→"כסף", "כחלחל"→"כחול", "לא חשוב"→השאירי ריק.
חומרים (material): אקריל | בד | זכוכית | כסף | מתכת | עור מדומה | עץ | פלסטיק | קרמיקה

sort: "relevance" (ברירת מחדל) | "price_asc" (זול לגבוה) | "price_desc" (יקר לזול)

══ עידון חיפוש ══
כשמשתמש מבקש עידון, עדכני את הפילטרים הנוכחיים (הם יוזרקו אליך כהקשר):
"יותר זול" → sort="price_asc" + maxPrice הפחתה 30%
"יותר יקר" / "יוקרתי" → sort="price_desc" + הגדלת minPrice
"כהה יותר" → color="שחור" / "כחול" / "חום"
"בהיר יותר" → color="לבן" / "כסף" / "זהב"
"גדול יותר" / "קטן יותר" → keywords עם המילה
"משהו אחר" → שמרי cat, שני keywords
החזירי תמיד JSON עם הפילטרים המלאים המעודכנים (כולל מה שנשמר מקודם).`;

function buildSystemPrompt(currentFilters?: SearchFilters): string {
  if (!currentFilters) return BASE_SYSTEM;

  const hasFilters = Object.entries(currentFilters).some(
    ([, v]) => v != null && v !== '' && (!Array.isArray(v) || v.length > 0)
  );
  if (!hasFilters) return BASE_SYSTEM;

  const parts: string[] = [];
  if (currentFilters.cat)        parts.push(`קטגוריה: "${currentFilters.cat}"`);
  if (currentFilters.color)      parts.push(`צבע: "${currentFilters.color}"`);
  if (currentFilters.material)   parts.push(`חומר: "${currentFilters.material}"`);
  if (currentFilters.subCategory) parts.push(`תת-קטגוריה: "${currentFilters.subCategory}"`);
  if (currentFilters.minPrice != null) parts.push(`מחיר מינימלי: ${currentFilters.minPrice}`);
  if (currentFilters.maxPrice != null) parts.push(`מחיר מקסימלי: ${currentFilters.maxPrice}`);
  if (currentFilters.keywords?.length) parts.push(`מילות מפתח: ${currentFilters.keywords.join(', ')}`);
  if (currentFilters.sort && currentFilters.sort !== 'relevance') parts.push(`מיון: ${currentFilters.sort}`);

  return BASE_SYSTEM + `\n\n══ חיפוש פעיל נוכחי ══\n${parts.join(' | ')}\nכשהמשתמש מבקש עידון — עדכני פילטרים אלה ואל תתחילי מחדש.`;
}

export async function GET() {
  return NextResponse.json({ status: 'shira route ok' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, currentFilters } = body as {
      messages: { role: string; content: string }[];
      currentFilters?: SearchFilters;
    };

    const systemPrompt = buildSystemPrompt(currentFilters);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: messages.slice(-12),
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Shira Anthropic error:', response.status, errBody);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.content?.[0]?.text ?? 'סליחה, לא הצלחתי להגיב כרגע.';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Shira API error:', error);
    return NextResponse.json(
      { message: 'סליחה, נתקלתי בבעיה קטנה. נסה שוב בעוד רגע 💛' },
      { status: 200 }
    );
  }
}
