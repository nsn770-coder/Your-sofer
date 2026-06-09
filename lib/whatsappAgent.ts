import { getAdminDb } from '@/lib/firebaseAdmin';
import { searchAiKnowledge, type SearchResult } from '@/lib/aiProductSearch';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';

// ── Judaica-specific intent detection ─────────────────────────────────────────

const EVENT_PATTERNS: { pattern: RegExp; event: string }[] = [
  { pattern: /בר.?מצווה|bar.?mitzvah|בן.?מצווה/i, event: 'בר מצווה' },
  { pattern: /בת.?מצווה|bat.?mitzvah/i, event: 'בת מצווה' },
  { pattern: /חתונה|כלה|חתן|אירוסין|wedding|bride|groom/i, event: 'חתונה' },
  { pattern: /הפרשת.?חלה|challah.?set|ערכת.?חלה/i, event: 'הפרשת חלה' },
  { pattern: /בית.?חדש|דירה.?חדשה|new.?home|קניית.?דירה|הכנסת.?מזוזה/i, event: 'בית חדש' },
  { pattern: /שמחה|אירוע|מסיבה|יום.?הולדת|birthday/i, event: 'שמחה' },
];

// 20+ quantity, explicit bulk/quote keywords
const LARGE_ORDER_PATTERN =
  /\b([2-9]\d|\d{3,})\s*(יחידות|כיפות|מזוזות|טליות|פמוטים|כיסויים|זוגות)?|כמות.?גדולה|סיטונאי|הצעת.?מחיר|bulk|wholesale/i;

function detectEvent(text: string): string | null {
  for (const { pattern, event } of EVENT_PATTERNS) {
    if (pattern.test(text)) return event;
  }
  return null;
}

function detectLargeOrder(text: string): boolean {
  return LARGE_ORDER_PATTERN.test(text);
}

// ── System prompt ─────────────────────────────────────────────────────────────

const BASE_SYSTEM = `אתה נציג מכירות AI של Your Sofer — חנות יודאיקה ישראלית מובילה.
אתה עונה בוואטסאפ ללקוחות אמיתיים. טון: חם, יהודי, שירותי, מקצועי, מניע לפעולה אבל לא לוחץ. עברית טבעית.

תחומי המוצרים: כיפות לאירועים (בר מצווה/חתונה/שבת חתן), הדפסה אישית על כיפות, כיסויי טלית ותפילין, הפרשת חלה, מתנות יהודיות, פמוטים, מזוזות, תפילין, מתנות לבית היהודי.

איך לענות:
- הבן מה הלקוח מחפש. אם חסר מידע — שאל שאלה אחת קצרה בלבד.
- הצע עד 3 מוצרים רלוונטיים עם קישור לכל אחד.
- הצע מוצרים משלימים בטבעיות (כיפות → הדפסה + טלית; הפרשת חלה → כיסוי חלה + פמוטים).
- זהה אירועים וכמויות גדולות; בכמות גדולה או בקשת הצעת מחיר — הצע לחבר לנציג אנושי.
- 2–4 משפטים. ברור וישיר.
- כתוב בעברית פשוטה מתאימה לוואטסאפ. אפשר *כוכביות* להדגשה, בלי markdown מורכב.

חוקי בטיחות (קבועים — לעולם לא להפר):
• הצג רק מוצרים מהרשימה למטה. אל תמציא מוצרים שאינם ברשימה.
• אל תמציא מחירים — רק המחירים הרשומים.
• אל תבטיח זמן משלוח ללא נתון מפורש.`;

function buildSystemPrompt(
  products: SearchResult[],
  event: string | null,
  isLargeOrder: boolean,
): string {
  let prompt = BASE_SYSTEM;

  if (products.length > 0) {
    prompt += '\n\n── מוצרים זמינים ──\n';
    prompt += products
      .map(
        (p) =>
          `• *${p.name}* — ₪${p.price}${p.salePrice ? ` (מבצע: ₪${p.salePrice})` : ''}\n` +
          `  ${p.productUrl}` +
          (p.description ? `\n  ${p.description}` : ''),
      )
      .join('\n');
  } else {
    prompt +=
      '\n\n(אין מוצרים ספציפיים תואמים כרגע — ענה בכלליות וכוון לאתר yoursofer.com)';
  }

  if (event) {
    prompt +=
      `\n\n── אירוע שזוהה: ${event} ──\n` +
      `התאם את התשובה לאירוע. הצע מוצרים מתאימים ומשלימים.`;
  }

  if (isLargeOrder) {
    prompt +=
      '\n\n── הזמנה בכמות גדולה ──\n' +
      'הלקוח מעוניין בכמות גדולה. אמור שישמח לחבר לנציג אנושי לקבלת מחיר מיוחד. אל תנסה לתמחר לבד.';
  }

  return prompt;
}

// ── Conversation types ────────────────────────────────────────────────────────

interface ConvMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  from: string,
  text: string,
): Promise<void> {
  const db = getAdminDb();
  const convRef = db.collection('whatsappConversations').doc(from);

  // Load conversation history
  let history: ConvMessage[] = [];
  try {
    const snap = await convRef.get();
    if (snap.exists) {
      history = (snap.data()?.messages as ConvMessage[] | undefined) ?? [];
    }
  } catch (err) {
    await logEvent(db, 'load_history_error', from, String(err));
  }

  // Build context string for intent detection (last 4 messages + current)
  const recentText = history
    .slice(-4)
    .map((m) => m.content)
    .concat(text)
    .join(' ');

  const event = detectEvent(recentText);
  const isLargeOrder = detectLargeOrder(recentText);

  // Search product knowledge index
  const products = await searchAiKnowledge(text, { limit: 3 }).catch(() => [] as SearchResult[]);

  // Build Claude message history (last 12, ensure starts with user role)
  const claudeMessages = history
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }))
    .concat({ role: 'user' as const, content: text });

  // Call Claude Haiku
  const systemPrompt = buildSystemPrompt(products, event, isLargeOrder);
  let reply = 'שלום! אשמח לעזור. רגע אחד 🙏';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: claudeMessages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as { content?: { text?: string }[] };
    reply = data.content?.[0]?.text ?? reply;
  } catch (err) {
    await logEvent(db, 'claude_error', from, String(err));
  }

  // Send reply via Meta
  await sendWhatsAppMessage(from, reply);

  // Persist updated conversation (keep last 30 messages = 15 rounds)
  const updated: ConvMessage[] = [
    ...history,
    { role: 'user' as const, content: text, ts: Date.now() },
    { role: 'assistant' as const, content: reply, ts: Date.now() },
  ].slice(-30);

  await convRef
    .set({ messages: updated, phone: from, updatedAt: new Date() }, { merge: true })
    .catch((err) => logEvent(db, 'save_history_error', from, String(err)));
}

// ── Firestore logger ──────────────────────────────────────────────────────────

async function logEvent(
  db: ReturnType<typeof getAdminDb>,
  type: string,
  from: string,
  error: string,
): Promise<void> {
  try {
    await db.collection('whatsappLogs').add({ type, from, error, timestamp: new Date() });
  } catch {
    // nothing left to do
  }
}
