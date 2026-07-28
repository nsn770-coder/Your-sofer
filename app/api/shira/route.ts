import { NextRequest, NextResponse } from 'next/server';
import {
  searchAiKnowledge,
  type SearchResult,
  EVENT_CATEGORIES,
  CROSS_SELL,
} from '@/lib/aiProductSearch';
import { FAQ_ITEMS, normalizeHebrew, type FAQItem } from '@/data/faq';

// ── FAQ knowledge matching ────────────────────────────────────────────────────
// מאתר את התשובות הקצרות הרלוונטיות ביותר מתוך מקור האמת (data/faq.ts)
// ומזין אותן לפרומפט — כדי שהבוט יענה תשובות קצרות, חד-משמעיות ומעודכנות
// במקום להמציא מחירים, זמני אספקה או מדיניות.

function matchFaqItems(text: string, limit = 5): FAQItem[] {
  const normalized = normalizeHebrew(text);
  if (!normalized) return [];
  const scored = FAQ_ITEMS.map(item => {
    let score = 0;
    for (const kw of item.keywords ?? []) {
      if (normalized.includes(normalizeHebrew(kw))) score += 2;
    }
    // חפיפת מילים עם נוסח השאלה עצמה
    const qWords = normalizeHebrew(item.question).split(' ').filter(w => w.length >= 3);
    for (const w of qWords) {
      if (normalized.includes(w)) score += 1;
    }
    return { item, score };
  });
  return scored
    .filter(s => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item);
}

// ── Intent detection ──────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: { keywords: string[]; cat: string }[] = [
  { keywords: ['מזוזה', 'mezuzah', 'מזוזות', 'קלף מזוזה'], cat: 'קלפי מזוזה' },
  { keywords: ['תפילין', 'tefillin', 'תפלין', 'קומפלט', 'תפילין קומפלט'], cat: 'תפילין קומפלט' },
  { keywords: ['מגילה', 'megillah', 'מגילות', 'מגילת אסתר'], cat: 'מגילות' },
  { keywords: ['ספר תורה', 'sefer torah', 'ספרי תורה'], cat: 'ספרי תורה' },
  { keywords: ['כיפה', 'כיפות', 'kippah', 'kippa', 'yarmulke'], cat: 'כיפות' },
  { keywords: ['טלית', 'טליתות', 'tallit', 'tallis'], cat: 'טליתות' },
  { keywords: ['כיסוי חלה', 'כיסויי חלה', 'challah cover'], cat: 'כיסויי חלה' },
  { keywords: ['פמוט', 'פמוטים', 'נרות שבת', 'candles', 'shabbat candles'], cat: 'פמוטים' },
  { keywords: ['הפרשת חלה', 'ערכת חלה', 'challah set'], cat: 'ערכות הפרשת חלה' },
  { keywords: ['תיק תפילין', 'תיקי תפילין', 'tefillin bag'], cat: 'תיקי תפילין' },
  { keywords: ['סידור', 'סידורים', 'prayer book', 'siddur'], cat: 'סידורים' },
];

const EVENT_KEYWORDS: { pattern: RegExp; event: string }[] = [
  { pattern: /בר.?מצווה|bar.?mitzvah|בן.?מצווה/i, event: 'בר מצווה' },
  { pattern: /חתונה|כלה|חתן|wedding|bride|groom/i, event: 'חתונה' },
  { pattern: /הפרשת.?חלה|challah.?set|ערכת.?חלה/i, event: 'הפרשת חלה' },
  { pattern: /בית.?חדש|דירה.?חדשה|new.?home|mezuzah.*house/i, event: 'בית חדש' },
];

const LARGE_ORDER_PATTERN = /\b([5-9]\d|\d{3,})\b|כמות.?גדולה|סיטונאי|הצעת.?מחיר|bulk/i;

function detectCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { keywords, cat } of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return cat;
  }
  return null;
}

function detectEvent(text: string): string | null {
  for (const { pattern, event } of EVENT_KEYWORDS) {
    if (pattern.test(text)) return event;
  }
  return null;
}

function detectPriceRange(text: string): { min?: number; max?: number } {
  const budget: Record<string, number> = {
    זול: 200, זולה: 200, 'תקציב נמוך': 200, 'עד 200': 200, 'עד 150': 150,
    'יקר': 500, 'מהודר': 500, 'מהודרת': 500,
  };
  for (const [kw, price] of Object.entries(budget)) {
    if (text.includes(kw)) {
      return kw.startsWith('עד') ? { max: price } : { min: price };
    }
  }
  const upToMatch = text.match(/עד\s+₪?(\d+)/);
  if (upToMatch) return { max: Number(upToMatch[1]) };
  const fromMatch = text.match(/מ\s*₪?(\d+)\s+ומעלה|מעל\s+₪?(\d+)/);
  if (fromMatch) return { min: Number(fromMatch[1] ?? fromMatch[2]) };
  return {};
}

// ── System prompt builder ─────────────────────────────────────────────────────

const BASE_SYSTEM = `You are Shira (שירה), a warm and knowledgeable STaM and Judaica advisor \
for YourSofer.com — Israel's leading STaM and Judaica marketplace.

Your personality:
- Warm, helpful, patient, and slightly personal
- Expert in STaM (Sifrei Torah, Tefillin, Mezuzot, Megillot) and Judaica
- Knowledgeable in halacha relevant to purchasing STaM
- Speaks Hebrew naturally; switches to English only if the customer writes in English
- Never pushy — guides the customer to the right product for them

Your capabilities:
- Help customers choose between kashrut levels (כשר לכתחילה, מהודר, מהודר בתכלית)
- Explain nusach differences (אשכנזי, ספרדי, אדמוה"ז)
- Guide Bar Mitzvah families through tefillin selection
- Recommend products based on budget and purpose
- Suggest complementary products for events

Every STaM product is rabbinically supervised by Rav Binyamin Gelis and written by certified soferim.

Response style: 2–4 sentences, clear and direct. Offer up to 3 products at once. \
If you need to clarify, ask one short question only.`;

function buildSystemPrompt(
  products: SearchResult[],
  event: string | null,
  isLargeOrder: boolean,
  faqMatches: FAQItem[] = [],
): string {
  let prompt = BASE_SYSTEM;

  if (faqMatches.length > 0) {
    prompt += `\n\n── ידע שירות מאומת (FAQ רשמי — מקור אמת) ──
כשהלקוח שואל שאלת שירות (מחירים, משלוח, מועדון, החזרות, סטטוס),
עני אך ורק לפי התשובות הבאות, בקצרה וללא תוספות:
${faqMatches
  .map(f => `• ש: ${f.question}\n  ת: ${f.shortAnswer}${f.cta ? `\n  קישור לפעולה: ${f.cta.label} — ${f.cta.href}` : ''}`)
  .join('\n')}`;
  }

  if (products.length > 0) {
    prompt += `\n\n── מוצרים זמינים כעת ──
${products
  .map(
    (p) =>
      `• ${p.name} — ₪${p.price}${p.salePrice ? ` (מבצע: ₪${p.salePrice})` : ''}\n` +
      `  קישור: ${p.productUrl}\n` +
      `  תמונה: ${p.imageUrl}` +
      (p.description ? `\n  תיאור: ${p.description}` : ''),
  )
  .join('\n')}`;
  }

  prompt += `\n\n── כללי בטיחות (קבועים — לעולם לא להפר) ──
• הציגי רק מוצרים שרשומים ברשימה למעלה. אל תמציאי מוצרים שאינם ברשימה.
• אל תמציאי מחירים — השתמשי אך ורק במחירים הרשומים (במוצרים או ב-FAQ).
• אל תבטיחי זמן משלוח ספציפי אלא אם מצוין במפורש בפרטי המוצר או ב-FAQ.
• אם חסר מידע — שאלי שאלה קצרה אחת ובלבד.
• הציעי עד 3 מוצרים בכל פעם עם קישור ישיר.

── כללי שירות קבועים ──
• מחיר כיפות קטיפה: לעולם אל תנקבי מחיר — הפני להצעת מחיר בוואטסאפ. אל תגידי שקטיפה עולה כמו פשתן או סאטן.
• הזמנה דחופה: אל תתחייבי לזמן אספקה קצר מ-7 ימים — הציעי בדיקה מול הצוות בוואטסאפ.
• סטטוס הזמנה: בקשי קוד הזמנה או הפני לאזור האישי (/account). לעולם אל תמציאי סטטוס.
• זמן אספקה: 7–10 ימים סה"כ מרגע התשלום. לעולם אל תציגי 7–10 ימי ייצור ועוד 7–10 ימי משלוח.
• מועדון: הנחת ההצטרפות היא 5% (קוד קופון), וההחזר הקבוע הוא 10% מסכום המוצרים כיתרה. אל תבלבלי ביניהם ואל תגידי שהנחת ההצטרפות היא 10%.
• תשלומים: כרטיסי אשראי או Bit בלבד, עד 4 תשלומים. אל תציגי Google Pay כאמצעי תשלום.
• מוצר בעיצוב אישי אינו ניתן להחזרה — למעט פגם או אי-התאמה להדמיה שאושרה.
• אחריות סת״ם חלה רק על רכישה ותשלום דרך האתר — לא על רכישה ישירה מסופר מחוץ לאתר.
• אם אינך בטוחה בתשובה — אל תמציאי. הציעי מעבר לנציג אנושי בוואטסאפ: https://wa.me/972587479933
• אם הלקוח מבקש נציג אנושי — תני מיד את קישור הוואטסאפ, בלי שאלות נוספות.`;

  if (event && EVENT_CATEGORIES[event]) {
    const cats = EVENT_CATEGORIES[event].join(', ');
    prompt += `\n\n── זוהה אירוע: ${event} ──
הציעי מוצרים מהקטגוריות: ${cats}. \
אם מצאת מוצר ראשי — הציעי מוצרים משלימים באופן טבעי (לא לחוץ).`;
  }

  if (products.length > 0) {
    const mainCat = products[0].category;
    const crossSell = CROSS_SELL[mainCat];
    if (crossSell?.length) {
      prompt += `\n\n── מוצרים משלימים לכיסוי הצורך ──
לאחר שהציגת את המוצר העיקרי, הצעי בעדינות גם: ${crossSell.join(', ')}.`;
    }
  }

  if (isLargeOrder) {
    prompt += `\n\n── כמות גדולה / הצעת מחיר ──
הלקוח מתעניין בכמות גדולה. אמרי: \
"לכמויות ומחירים מיוחדים — כדאי לדבר ישירות עם הצוות שלנו. \
אשמח לחבר אתכם." ואל תנסי לתמחר בעצמך.`;
  }

  return prompt;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: 'shira route ok' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages: { role: string; content: string }[] };
    const { messages } = body;
    const userMessage = messages[messages.length - 1]?.content ?? '';

    // Build a combined context from the last few messages for better intent detection
    const recentText = messages
      .slice(-4)
      .map((m) => m.content)
      .join(' ');

    const detectedCat = detectCategory(recentText);
    const detectedEvent = detectEvent(recentText);
    const priceRange = detectPriceRange(recentText);
    const isLargeOrder = LARGE_ORDER_PATTERN.test(recentText);
    const faqMatches = matchFaqItems(userMessage);

    // Determine search category: direct category match takes priority, then event-based
    const searchCategory =
      detectedCat ??
      (detectedEvent ? EVENT_CATEGORIES[detectedEvent]?.[0] : undefined);

    const [products] = await Promise.all([
      searchAiKnowledge(userMessage, {
        category: searchCategory ?? undefined,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        limit: 3,
      }),
    ]);

    const systemPrompt = buildSystemPrompt(products, detectedEvent, isLargeOrder, faqMatches);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: messages.slice(-12),
      }),
    });

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      console.error('Shira Anthropic error:', aiRes.status, errBody);
      throw new Error(`API error: ${aiRes.status}`);
    }

    const data = await aiRes.json() as { content?: { text?: string }[] };
    const message = data.content?.[0]?.text ?? 'סליחה, לא הצלחתי להגיב כרגע.';

    return NextResponse.json({
      message,
      ...(products.length > 0 && { products }),
    });
  } catch (err) {
    console.error('Shira API error:', err);
    return NextResponse.json(
      { message: 'סליחה, נתקלתי בבעיה קטנה. נסה שוב בעוד רגע 💛' },
      { status: 200 },
    );
  }
}
