import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { handleIncomingMessage } from '@/lib/whatsappAgent';

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
  // Always return 200 — Meta will retry indefinitely on non-200 responses
  let body: MetaWebhookPayload;
  try {
    body = (await req.json()) as MetaWebhookPayload;
  } catch {
    return NextResponse.json({});
  }

  // Extract the first text message (ignore status updates and non-text types)
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
    return NextResponse.json({});
  }

  // Anti-duplicate check — Meta retries on any non-200, so we must be idempotent
  const db = getAdminDb();
  try {
    const ref = db.collection('whatsappProcessed').doc(messageId);
    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({});
    }
    await ref.set({ from, processedAt: new Date() });
  } catch (err) {
    // Firestore failed — log and continue; risk of double reply is acceptable
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
      // nothing left to do
    }
  }

  // Fire AI processing without awaiting — return 200 to Meta immediately.
  // Vercel serverless functions stay alive until all pending promises resolve
  // (up to the configured timeout), so this will complete even after response is sent.
  void handleIncomingMessage(from, text).catch((err) => {
    console.error('[whatsapp] handleIncomingMessage unhandled error:', err);
    db.collection('whatsappLogs').add({
      type: 'handler_error',
      from,
      messageId,
      error: String(err),
      timestamp: new Date(),
    }).catch(() => {});
  });

  return NextResponse.json({});
}
