/**
 * /api/cron/whatsapp-followup
 *
 * שולח פולואפ אוטומטי אחד (מקסימום) לשיחות וואטסאפ שנתקעו 3–6 שעות אחרי
 * ההודעה האחרונה של הלקוח, בתוך חלון 24 השעות של Meta. רץ כל שעה (vercel.json).
 * דורש: CRON_SECRET בסביבה.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_WAIT_MS = 3 * 60 * 60 * 1000;
const MAX_WAIT_MS = 6 * 60 * 60 * 1000;
const SAFETY_CUTOFF_MS = 20 * 60 * 60 * 1000; // margin from Meta's 24h session window

interface ConvMessage {
  role: 'user' | 'assistant' | 'admin';
  content: string;
  ts: number;
  followup?: boolean;
}

const FOLLOWUP_SYSTEM = `אתה כותב הודעת פולואפ קצרה בוואטסאפ מטעם Your Sofer, חנות יודאיקה ישראלית.
הלקוח פנה קודם ולא ענה כמה שעות. כתוב הודעה אחת קצרה (1–3 משפטים), חמה, ידידותית ולא דוחפת,
שמזכירה בעדינות את מה שהלקוח חיפש (אם ידוע) ומציעה עזרה בהשלמת הזמנה, מענה לשאלות, או חיבור לנציג.

דוגמה לטון: "היי 😊 ראיתי שהתעניינת ב-40 כיפות לבר מצווה עם הדפסה — אשמח לעזור להשלים הזמנה או לענות על שאלות. רוצה שנציג יחזור אליך?"

אל תמציא פרטים שלא מופיעים בשיחה או בתקציר. החזר רק את טקסט ההודעה עצמה — בלי גרשיים, בלי הסברים, בלי markdown.`;

async function generateFollowup(messages: ConvMessage[], aiIntent?: string): Promise<string> {
  const transcript = messages
    .slice(-16)
    .map((m) => `${m.role === 'user' ? 'לקוח' : 'נציג/בוט'}: ${m.content}`)
    .join('\n');

  const userPrompt =
    `הנה תמליל השיחה עד כה:\n\n${transcript}\n\n` +
    (aiIntent ? `מה שידוע שהלקוח מחפש: ${aiIntent}\n\n` : '') +
    `כתוב עכשיו הודעת פולואפ אחת קצרה כמתואר.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: FOLLOWUP_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude followup ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text?.trim();
  if (!text) throw new Error('Claude returned empty followup text');
  return text;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').trim(),
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      }),
    });
  }
  const db = getFirestore();

  // ── Global kill switch ──────────────────────────────────────────────────────
  try {
    const configSnap = await db.collection('siteConfig').doc('whatsapp').get();
    if (configSnap.exists && configSnap.data()?.followupEnabled === false) {
      return NextResponse.json({ skipped: 'followupEnabled=false', sent: 0, checked: 0 });
    }
  } catch (err) {
    console.error('[cron/whatsapp-followup] config check failed (non-fatal, proceeding):', err);
  }

  const now = Date.now();
  let checked = 0;
  let sent = 0;
  const errors: string[] = [];

  const convosSnap = await db.collection('whatsappConversations').get();

  for (const convoDoc of convosSnap.docs) {
    checked++;
    try {
      const data = convoDoc.data();
      const phone: string = data.phone ?? convoDoc.id;
      const messages = (data.messages ?? []) as ConvMessage[];
      if (messages.length === 0) continue;

      // Max one auto-followup ever, per conversation
      if (data.followUpSentAt) continue;

      // Bot muted (permanently, or a temporary post-manual-reply mute)
      const botMuted = data.botMuted === true || (typeof data.botMutedUntil === 'number' && now < data.botMutedUntil);
      if (botMuted) continue;

      // If an admin already replied, a human is already engaged — don't auto-followup
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'admin') continue;

      // Timing window is measured from the customer's last message
      let lastUserMsg: ConvMessage | undefined;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { lastUserMsg = messages[i]; break; }
      }
      if (!lastUserMsg) continue;

      const elapsed = now - lastUserMsg.ts;
      if (elapsed < MIN_WAIT_MS || elapsed > MAX_WAIT_MS) continue;
      if (elapsed >= SAFETY_CUTOFF_MS) continue; // redundant given the 6h cap, kept as an explicit margin

      const leadSnap = await db.collection('crmLeads').doc(convoDoc.id).get();
      if (!leadSnap.exists) continue;
      const lead = leadSnap.data()!;

      if (lead.status === 'עסקה נסגרה') continue;
      if (lead.aiTemp !== 'חם' && lead.aiTemp !== 'פושר') continue; // excludes קר, לא מעוניין, and unscored leads

      const followupText = await generateFollowup(messages, lead.aiIntent as string | undefined);
      await sendWhatsAppMessage(phone, followupText);

      const updatedMessages: ConvMessage[] = [
        ...messages,
        { role: 'assistant' as const, content: followupText, ts: Date.now(), followup: true },
      ].slice(-30);

      await convoDoc.ref.set(
        { messages: updatedMessages, updatedAt: new Date(), followUpSentAt: Date.now() },
        { merge: true },
      );

      const existingNotes = (lead.notes as { text: string; ts: number }[] | undefined) ?? [];
      await db.collection('crmLeads').doc(convoDoc.id).set(
        {
          notes: [...existingNotes, { text: 'נשלח פולואפ אוטומטי', ts: Date.now() }],
          lastContactAt: new Date(),
        },
        { merge: true },
      );

      sent++;
      console.log(`[cron/whatsapp-followup] sent to ${phone}`);
    } catch (err) {
      errors.push(`${convoDoc.id}: ${String(err)}`);
      console.error(`[cron/whatsapp-followup] error for ${convoDoc.id}:`, err);
    }
  }

  return NextResponse.json({ checked, sent, errors, ranAt: new Date().toISOString() });
}
