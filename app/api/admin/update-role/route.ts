import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

// Never statically render — Admin SDK must only run at request time
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['customer', 'sofer', 'shaliach', 'admin'];

export async function POST(req: NextRequest) {
  try {
    const adminDb   = getAdminDb();
    const adminAuth = getAdminAuth();

    // Verify Firebase ID token from Authorization header
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    // Validate body
    const { userId, role } = await req.json();
    if (!userId || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    await adminDb.collection('users').doc(userId).update({ role });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[update-role]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
