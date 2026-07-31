import { getAdminDb } from '@/lib/firebaseAdmin';
import { searchAiKnowledge, type SearchResult } from '@/lib/aiProductSearch';

// Present only when the customer tapped a Click-to-WhatsApp ad (Facebook/Instagram).
export interface WaReferral {
  source_type?: string;
  source_id?: string;
  source_url?: string;
  headline?: string;
  ctwa_clid?: string;
}

// ── CRM lead hook ──────────────────────────────────────────────────────────────
// Every inbound WhatsApp message upserts a crmLeads doc (keyed by phone) so
// /admin/crm has a lead for every conversation, without overwriting fields an
// admin has since edited (status, name once known, etc).

async function upsertCrmLead(
  db: ReturnType<typeof getAdminDb>,
  phone: string,
  name: string | null,
  referral: WaReferral | null,
): Promise<void> {
  const leadRef = db.collection('crmLeads').doc(phone);
  try {
    const snap = await leadRef.get();
    if (!snap.exists) {
      const fromAd = !!referral;
      await leadRef.set({
        phone,
        name: name ?? null,
        source: fromAd ? 'facebook' : 'whatsapp',
        sourceDetail: fromAd ? [referral!.headline, referral!.source_id].filter(Boolean).join(' — ') || null : null,
        status: 'חדש',
        saleStage: null,
        notes: fromAd ? [{ text: `הגיע ממודעת פייסבוק: ${referral!.headline ?? 'ללא כותרת'}`, ts: Date.now() }] : [],
        followUpAt: null,
        assignedTo: null,
        createdAt: new Date(),
        lastContactAt: new Date(),
      });
    } else {
      const updates: Record<string, unknown> = { lastContactAt: new Date() };
      if (name && !snap.data()?.name) updates.name = name;
      await leadRef.set(updates, { merge: true });
    }
  } catch (err) {
    console.error('[whatsapp handler] upsertCrmLead error:', err);
  }
}

// ── Judaica-specific intent detection ─────────────────────────────────────────

const EVENT_PATTERNS: { pattern: RegExp; event: string }[] = [
  { pattern: /בר.?מצווה|bar.?mitzvah|בן.?מצווה/i, event: 'בר מצווה' },
  { pattern: /בת.?מצווה|bat.?mitzvah/i, event: 'בת מצווה' },
  { pattern: /חתונה|כלה|חתן|אירוסין|wedding|bride|groom/i, event: 'חתונה' },
  { pattern: /הפרשת.?חלה|challah.?set|ערכת.?חלה/i, event: 'הפרשת חלה' },
  { pattern: /בית.?חדש|דירה.?חדשה|new.?home|קניית.?דירה|הכנסת.?מזוזה/i, event: 'בית חדש' },
  { pattern: /שמחה|אירוע|מסיבה|יום.?הולדת|birthday/i, event: 'שמחה' },
];

// 20+ quantity, or explicit bulk/quote keywords
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
  role: 'user' | 'assistant' | 'admin';
  content: string;
  ts: number;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  senderId: string,
  messageText: string,
  contactName: string | null = null,
  referral: WaReferral | null = null,
): Promise<string | null> {
  console.error(`[whatsapp handler] START from=${senderId} text="${messageText.slice(0, 60)}"`);

  const db = getAdminDb();
  const convRef = db.collection('whatsappConversations').doc(senderId);

  await upsertCrmLead(db, senderId, contactName, referral);

  // 1. Load conversation history + mute state
  let history: ConvMessage[] = [];
  let botMuted = false;
  let botMutedUntil: number | null = null;
  try {
    const snap = await convRef.get();
    if (snap.exists) {
      const data = snap.data();
      history = (data?.messages as ConvMessage[] | undefined) ?? [];
      botMuted = data?.botMuted === true;
      botMutedUntil = typeof data?.botMutedUntil === 'number' ? data.botMutedUntil : null;
    }
    console.error(`[whatsapp handler] history loaded: ${history.length} messages`);
  } catch (err) {
    console.error('[whatsapp handler] load history error:', err);
    await logEvent(db, 'load_history_error', senderId, String(err));
  }

  // An admin can silence the bot permanently (botMuted) or temporarily after
  // sending a manual reply (botMutedUntil) — in either case, just log the
  // customer's message and let the admin answer from /admin/whatsapp.
  const isMuted = botMuted || (botMutedUntil !== null && Date.now() < botMutedUntil);
  if (isMuted) {
    console.error(`[whatsapp handler] bot muted for from=${senderId}, skipping auto-reply`);
    const updated: ConvMessage[] = [
      ...history,
      { role: 'user' as const, content: messageText, ts: Date.now() },
    ].slice(-30);

    await convRef
      .set({ messages: updated, phone: senderId, updatedAt: new Date(), ...(referral ? { referral } : {}) }, { merge: true })
      .catch((err) => {
        console.error('[whatsapp handler] save muted history error:', err);
        return logEvent(db, 'save_history_error', senderId, String(err));
      });

    return null;
  }

  // 2. Detect intent from recent context + current message
  const recentText = history
    .slice(-4)
    .map((m) => m.content)
    .concat(messageText)
    .join(' ');

  const event = detectEvent(recentText);
  const isLargeOrder = detectLargeOrder(recentText);
  console.error(`[whatsapp handler] intent: event=${event ?? 'none'} largeOrder=${isLargeOrder}`);

  // 3. Search product knowledge index
  console.error('[whatsapp handler] searching aiProductKnowledge...');
  const products = await searchAiKnowledge(messageText, { limit: 3 }).catch((err) => {
    console.error('[whatsapp handler] product search error:', err);
    return [] as SearchResult[];
  });
  console.error(`[whatsapp handler] products found: ${products.length} — ${products.map(p => p.name).join(', ')}`);

  // 4. Build Claude messages (last 12 from history + current user message)
  const claudeMessages = history
    .slice(-12)
    .map((m) => ({ role: (m.role === 'admin' ? 'assistant' : m.role) as 'user' | 'assistant', content: m.content }))
    .concat({ role: 'user' as const, content: messageText });

  const systemPrompt = buildSystemPrompt(products, event, isLargeOrder);

  // 5. Call Claude Haiku
  console.error('[whatsapp handler] calling Claude...');
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
    console.error(`[whatsapp handler] Claude replied, length=${reply.length} chars`);
  } catch (err) {
    console.error('[whatsapp handler] Claude error:', err);
    await logEvent(db, 'claude_error', senderId, String(err));
  }

  // 6. Persist updated conversation (keep last 30 messages = 15 rounds)
  const updated: ConvMessage[] = [
    ...history,
    { role: 'user' as const, content: messageText, ts: Date.now() },
    { role: 'assistant' as const, content: reply, ts: Date.now() },
  ].slice(-30);

  await convRef
    .set({ messages: updated, phone: senderId, updatedAt: new Date(), ...(referral ? { referral } : {}) }, { merge: true })
    .then(() => console.error('[whatsapp handler] conversation saved'))
    .catch((err) => {
      console.error('[whatsapp handler] save history error:', err);
      return logEvent(db, 'save_history_error', senderId, String(err));
    });

  console.error(`[whatsapp handler] DONE for from=${senderId}`);
  return reply;
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
