import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { handleIncomingMessage } from './handler';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MetaTextMessage {
  id: string;
  from: string;
  type: 'text';
  text: { body: string };
  timestamp: string;
}

interface MetaWebhookPayload {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      field: string;
      value: {
        messages?: Array<MetaTextMessage & { type: string }>;
        statuses?: unknown[];
        metadata?: { phone_number_id: string; display_phone_number: string };
      };
    }>;
  }>;
}

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

// ── POST — Incoming message handler ──────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always return 200 to Meta — any non-200 triggers infinite retries
  let body: MetaWebhookPayload;
  try {
    body = (await req.json()) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({});
  }

  // Extract the first text message (skip status updates, media, reactions)
  const changes = body.entry?.[0]?.changes ?? [];
  let from = '';
  let text = '';
  let messageId = '';

  for (const change of changes) {
    if (change.field !== 'messages') continue;
    const msgs = change.value?.messages ?? [];
    const textMsg = msgs.find((m) => m.type === 'text') as MetaTextMessage | undefined;
    if (textMsg) {
      from = textMsg.from;
      text = textMsg.text?.body?.trim() ?? '';
      messageId = textMsg.id;
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
    handleIncomingMessage(from, text)
      .then((reply) => {
        if (reply) {
          return sendWhatsAppMessage(from, reply);
        }
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
