import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';

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

    await sendWhatsAppMessage(phone, message);

    const db = getAdminDb();
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
