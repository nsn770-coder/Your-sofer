import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken';

type Action = 'unsubscribe' | 'resubscribe';

async function applyAction(email: string, action: Action) {
  const db = getAdminDb();
  const snap = await db.collection('leads').where('email', '==', email).get();
  if (snap.empty) return 'not_found';

  const isOptOut = action === 'unsubscribe';
  const batch = db.batch();
  snap.forEach(d =>
    batch.update(d.ref, {
      optOut: isOptOut,
      optOutDate: isOptOut ? new Date() : null,
    })
  );
  await batch.commit();
  return isOptOut ? 'unsubscribed' : 'resubscribed';
}

// GET /api/unsubscribe?token=...&action=unsubscribe|resubscribe
// Used by the /unsubscribe page and by List-Unsubscribe link clicks.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const action: Action =
    req.nextUrl.searchParams.get('action') === 'resubscribe' ? 'resubscribe' : 'unsubscribe';

  const email = verifyUnsubscribeToken(token);
  if (!email) return NextResponse.json({ status: 'invalid_token' }, { status: 400 });

  // For unsubscribe: check if already opted out before writing
  if (action === 'unsubscribe') {
    const db = getAdminDb();
    const snap = await db.collection('leads').where('email', '==', email).limit(1).get();
    if (!snap.empty && snap.docs[0].data().optOut === true) {
      return NextResponse.json({ status: 'already_unsubscribed' });
    }
  }

  const status = await applyAction(email, action);
  return NextResponse.json({ status });
}

// POST /api/unsubscribe?token=...
// RFC 8058 one-click List-Unsubscribe — called automatically by Gmail / Outlook.
// Body contains: List-Unsubscribe=One-Click (application/x-www-form-urlencoded)
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const email = verifyUnsubscribeToken(token);
  if (!email) return new NextResponse(null, { status: 400 });

  await applyAction(email, 'unsubscribe');
  return new NextResponse(null, { status: 200 });
}
