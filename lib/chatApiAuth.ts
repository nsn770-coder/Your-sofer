import { NextRequest, NextResponse } from 'next/server';

// Shared bearer-token auth for the read-only /api/chat/* integration used by the
// external WhatsApp/website chat assistant. One rotatable key (CHAT_API_KEY) gates
// every route under app/api/chat/** — including the owner-only analytics endpoints,
// since only the assistant's own backend (never a customer's browser) calls this API.
export function requireChatApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.CHAT_API_KEY;

  if (!expected) {
    console.error('[chat-api] CHAT_API_KEY is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
