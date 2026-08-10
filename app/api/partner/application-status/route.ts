import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

/**
 * GET /api/partner/application-status?applicationId=...
 *
 * Public, PII-free status lookup for the partner-signup payment page.
 * The application itself is not readable client-side while anonymous
 * (Firestore rules require a matching signed-in user), and this flow is
 * intentionally login-free — the applicationId is an unguessable
 * capability token, same pattern as guest orders elsewhere in this app.
 * This lets the page detect an invalid/expired/already-paid link before
 * the user fills in card details.
 */
export async function GET(req: NextRequest) {
  try {
    const applicationId = req.nextUrl.searchParams.get('applicationId');
    if (!applicationId) {
      return NextResponse.json({ status: 'not_found' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const snap = await adminDb.collection('partners_applications').doc(applicationId).get();

    if (!snap.exists) {
      return NextResponse.json({ status: 'not_found' }, { status: 200 });
    }

    const status = snap.data()?.status || 'pending';
    return NextResponse.json({ status }, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[partner/application-status] error:', err.message);
    return NextResponse.json({ status: 'not_found' }, { status: 500 });
  }
}
