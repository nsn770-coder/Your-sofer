import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { handleIncomingMessage, scoreConversation } from './handler';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';
import {
  recordEchoedOutboundMessage,
  recordOutboundMessagePending,
  markOutboundMessageSent,
  markOutboundMessageFailed,
  applyInboundStatusEvent,
} from '@/lib/services/whatsappMessageStore';

// How long the bot stays quiet after the owner answers by hand. Matches
// AUTO_MUTE_MS in /api/whatsapp/admin-reply so both routes behave the same.
const AUTO_MUTE_MS = 60 * 60 * 1000; // 1 hour

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetaReferral {
  source_type?: string;
  source_id?: string;
  source_url?: string;
  headline?: string;
  ctwa_clid?: string;
}

interface MetaTextMessage {
  id: string;
  from: string;
  type: 'text';
  text: { body: string };
  timestamp: string;
  referral?: MetaReferral;
}

// Coexistence: a message the owner typed in the WhatsApp Business app on the
// phone is echoed back to us. `to` is the customer, `from` is our own number.
interface MetaMessageEcho {
  id: string;
  from?: string;
  to?: string;
  type: string;
  text?: { body: string };
  timestamp?: string;
}

interface ConvMessage {
  role: 'user' | 'assistant' | 'admin';
  content: string;
  ts: number;
}

// A delivery-status update for a message WE sent — arrives as its own
// change alongside (never combined with) `messages`/`message_echoes`.
interface MetaMessageStatus {
  id: string; // wamid
  status: string; // 'sent' | 'delivered' | 'read' | 'failed', per Meta
  timestamp?: string;
  errors?: Array<{ code?: number | string; title?: string; message?: string }>;
}

interface MetaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      field: string;
      value: {
        messages?: Array<MetaTextMessage & { type: string }>;
        message_echoes?: MetaMessageEcho[];
        statuses?: MetaMessageStatus[];
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
        metadata?: { phone_number_id: string; display_phone_number: string };
      };
    }>;
  }>;
}

const KNOWN_STATUS_EVENTS = new Set(['sent', 'delivered', 'read', 'failed']);

// ── GET — Meta webhook verification ──────────────────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// ── Coexistence — owner replied from the phone ───────────────────────────────

// Records the owner's manual reply in the conversation and mutes the bot, so
// the customer never gets two answers to the same question.
async function handleMessageEchoes(echoes: MetaMessageEcho[]): Promise<void> {
  const db = getAdminDb();

  for (const echo of echoes) {
    const phone = echo.to;
    if (!phone) continue;

    const content = echo.type === 'text' ? (echo.text?.body ?? '') : `[${echo.type}]`;

    try {
      const convRef = db.collection('whatsappConversations').doc(phone);
      const snap = await convRef.get();
      const history = (snap.exists ? (snap.data()?.messages as ConvMessage[] | undefined) : []) ?? [];

      const updated: ConvMessage[] = [
        ...history,
        { role: 'admin' as const, content, ts: Date.now() },
      ].slice(-30);

      await convRef.set(
        {
          messages: updated,
          phone,
          updatedAt: new Date(),
          botMutedUntil: Date.now() + AUTO_MUTE_MS,
        },
        { merge: true },
      );

      console.error(`[whatsapp webhook] echo from business app to=${phone}, bot muted 1h`);
    } catch (err) {
      console.error('[whatsapp webhook] echo handling error:', err);
      await db
        .collection('whatsappLogs')
        .add({ type: 'echo_error', to: phone, error: String(err), timestamp: new Date() })
        .catch(() => {});
    }

    // Phase 1 message-storage foundation: dual-write into the new
    // whatsappConversations/{id}/messages subcollection, kept intentionally
    // separate from the try/catch above so a failure here is never
    // misattributed to (or able to break) the existing echo-handling flow.
    recordEchoedOutboundMessage(db, {
      conversationId: phone,
      wamid: echo.id,
      text: content,
      metaTimestamp: echo.timestamp ? Number(echo.timestamp) : null,
    }).catch((err) => {
      console.error('[whatsapp webhook] recordEchoedOutboundMessage error (non-fatal):', err);
    });
  }
}

// ── Status webhooks (Phase 1 Step 4) ─────────────────────────────────────────
// Meta's webhook retries are not idempotent by themselves for status events —
// applyInboundStatusEvent's monotonic rank check is what makes a duplicate or
// out-of-order delivery a safe no-op. This function must never throw: an
// unresolvable wamid or a malformed status entry is logged and skipped, never
// allowed to fail the webhook request.
async function handleStatusEvents(statuses: MetaMessageStatus[]): Promise<void> {
  const db = getAdminDb();

  for (const s of statuses) {
    if (!s?.id || !KNOWN_STATUS_EVENTS.has(s.status)) continue;

    const firstError = s.errors?.[0];
    // Never log the full error object verbatim — only the plain fields Meta
    // documents (code/title/message), never headers/tokens.
    const errorCode = firstError?.code != null ? String(firstError.code) : null;
    const errorMessage = firstError?.message ?? firstError?.title ?? null;

    try {
      const result = await applyInboundStatusEvent(
        db,
        s.id,
        s.status as 'sent' | 'delivered' | 'read' | 'failed',
        { errorCode, errorMessage },
      );
      console.error(`[whatsapp webhook] status wamid=${s.id} status=${s.status} applied=${result.applied} reason=${result.reason}`);
    } catch (err) {
      console.error('[whatsapp webhook] applyInboundStatusEvent error (non-fatal):', err);
      await db.collection('whatsappLogs').add({
        type: 'status_webhook_error',
        wamid: s.id,
        status: s.status,
        error: String(err),
        timestamp: new Date(),
      }).catch(() => {});
    }
  }
}

// ── POST — Incoming message handler ──────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always return 200 to Meta — any non-200 triggers infinite retries
  let body: MetaWebhookPayload;
  try {
    body = (await req.json()) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({});
  }

  const changes = body.entry?.[0]?.changes ?? [];

  // Coexistence echoes come on their own field. Handle them and stop — an echo
  // is our own outgoing message, never something to answer.
  const echoes = changes
    .filter((c) => c.field === 'smb_message_echoes')
    .flatMap((c) => c.value?.message_echoes ?? []);

  if (echoes.length > 0) {
    waitUntil(handleMessageEchoes(echoes));
    return NextResponse.json({});
  }

  // Status updates (sent/delivered/read/failed) for messages we sent. In
  // practice Meta never combines these with `messages` in the same payload,
  // but handling them here (rather than an early return) means that even if
  // it did, the message-extraction loop below still runs normally afterward.
  const statuses = changes.flatMap((c) => c.value?.statuses ?? []);
  if (statuses.length > 0) {
    waitUntil(handleStatusEvents(statuses));
  }

  // Extract the first text message (skip status updates, media, reactions)
  let from = '';
  let text = '';
  let messageId = '';
  let contactName: string | null = null;
  let referral: MetaReferral | null = null;

  for (const change of changes) {
    if (change.field !== 'messages') continue;
    const msgs = change.value?.messages ?? [];
    const textMsg = msgs.find((m) => m.type === 'text') as MetaTextMessage | undefined;
    if (textMsg) {
      from = textMsg.from;
      text = textMsg.text?.body?.trim() ?? '';
      messageId = textMsg.id;
      contactName = change.value?.contacts?.find((c) => c.wa_id === textMsg.from)?.profile?.name ?? null;
      // Present when the customer tapped a Click-to-WhatsApp ad (Facebook/Instagram)
      referral = textMsg.referral ?? null;
      break;
    }
  }

  if (!from || !text || !messageId) {
    // Status update or non-text message — acknowledge and skip
    return NextResponse.json({});
  }

  console.error(`[whatsapp webhook] received from=${from} msgId=${messageId} text="${text.slice(0, 60)}"`);

  // Anti-duplicate check — Meta retries on non-200, so same message can arrive multiple times
  const db = getAdminDb();
  try {
    const ref = db.collection('whatsappProcessed').doc(messageId);
    const existing = await ref.get();
    if (existing.exists) {
      console.error(`[whatsapp webhook] duplicate msgId=${messageId}, skipping`);
      return NextResponse.json({});
    }
    await ref.set({ from, processedAt: new Date() });
  } catch (err) {
    // Firestore check failed — log and continue rather than dropping the message
    console.error('[whatsapp webhook] idempotency check error:', err);
    try {
      await db.collection('whatsappLogs').add({
        type: 'idempotency_error',
        from,
        messageId,
        error: String(err),
        timestamp: new Date(),
      });
    } catch {
      // nothing
    }
  }

  // waitUntil keeps the Vercel function alive after the response is sent,
  // so Claude + Meta send complete even though we return 200 immediately.
  waitUntil(
    handleIncomingMessage(from, text, messageId, contactName, referral)
      .then(async (reply) => {
        // Send the customer-facing reply first — scoring is a background
        // enrichment step and must never delay message delivery.
        if (reply) {
          // Phase 1 message-storage foundation: create the outbound message
          // record in `pending` status before sending, then capture the
          // wamid the send call returns (or mark the message failed) —
          // never allowed to affect the existing send/array-append flow.
          const pending = await recordOutboundMessagePending(db, {
            conversationId: from,
            senderType: 'BOT',
            text: reply,
          }).catch((err) => {
            console.error('[whatsapp webhook] recordOutboundMessagePending error (non-fatal):', err);
            return null;
          });

          const sendResult = await sendWhatsAppMessage(from, reply);

          if (pending) {
            const markStatus = sendResult.ok && sendResult.wamid
              ? markOutboundMessageSent(db, from, pending.messageId, sendResult.wamid)
              : markOutboundMessageFailed(db, from, pending.messageId, null, sendResult.error ?? 'send failed, no wamid returned');
            await markStatus.catch((err) => {
              console.error('[whatsapp webhook] mark outbound message status error (non-fatal):', err);
            });
          }
        }
        await scoreConversation(from).catch((err) => {
          console.error('[whatsapp webhook] scoreConversation failed (non-fatal):', err);
        });
      })
      .catch((err) => {
        console.error('[whatsapp webhook] handleIncomingMessage unhandled error:', err);
        db.collection('whatsappLogs').add({
          type: 'handler_error',
          from,
          messageId,
          error: String(err),
          timestamp: new Date(),
        }).catch(() => {});
      }),
  );

  console.error(`[whatsapp webhook] ack sent, processing in background for from=${from}`);
  return NextResponse.json({});
}
