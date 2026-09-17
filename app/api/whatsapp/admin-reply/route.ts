import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';
import {
  recordOutboundMessagePending,
  markOutboundMessageSent,
  markOutboundMessageFailed,
} from '@/lib/services/whatsappMessageStore';

export const dynamic = 'force-dynamic';

const AUTO_MUTE_MS = 60 * 60 * 1000; // 1 hour

interface ConvMessage {
  role: 'user' | 'assistant' | 'admin';
  content: string;
  ts: number;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { phone, message } = await req.json();
    if (!phone || typeof phone !== 'string' || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getAdminDb();

    // Phase 1 message-storage foundation: create the outbound message record
    // in `pending` status before sending, then capture the wamid the send
    // call returns (or mark the message failed) — never allowed to affect
    // the existing send/array-append behavior below.
    const pending = await recordOutboundMessagePending(db, {
      conversationId: phone,
      senderType: 'AGENT',
      text: message,
    }).catch((err) => {
      console.error('[admin-reply] recordOutboundMessagePending error (non-fatal):', err);
      return null;
    });

    const sendResult = await sendWhatsAppMessage(phone, message);

    if (pending) {
      const markStatus = sendResult.ok && sendResult.wamid
        ? markOutboundMessageSent(db, phone, pending.messageId, sendResult.wamid)
        : markOutboundMessageFailed(db, phone, pending.messageId, null, sendResult.error ?? 'send failed, no wamid returned');
      await markStatus.catch((err) => {
        console.error('[admin-reply] mark outbound message status error (non-fatal):', err);
      });
    }

    const convRef = db.collection('whatsappConversations').doc(phone);
    const snap = await convRef.get();
    const history = (snap.exists ? (snap.data()?.messages as ConvMessage[] | undefined) : []) ?? [];

    const updated: ConvMessage[] = [
      ...history,
      { role: 'admin' as const, content: message, ts: Date.now() },
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin-reply]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
