// Phase 9: Admin Payout Approval & Processing
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/admin/payouts/approve
 * Approve and process payout request
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decodedToken = await verifyAdminToken(idToken);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminDb = getAdminDb();

    const { payoutId, action, transactionId, notes } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const payoutRef = adminDb.collection('partners_payouts').doc(payoutId);
    const payoutSnap = await payoutRef.get();

    if (!payoutSnap.exists) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    const payout = payoutSnap.data()!;

    if (payout.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot change status of ${payout.status} payout` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      approvedBy: decodedToken.uid,
    };

    if (action === 'approve') {
      if (!transactionId || !transactionId.trim()) {
        return NextResponse.json(
          { error: 'Transaction ID required for approval' },
          { status: 400 }
        );
      }

      updates.status = 'completed';
      updates.completedAt = FieldValue.serverTimestamp();
      updates.transactionId = transactionId;
    } else if (action === 'reject') {
      updates.status = 'rejected';
      updates.rejectionReason = notes || 'No reason provided';
      updates.rejectedAt = FieldValue.serverTimestamp();
    }

    await payoutRef.update(updates);

    // Log to audit trail
    await adminDb.collection('audit_log').add({
      action: `payout_${action}`,
      payoutId,
      partnerId: payout.partnerId,
      amount: payout.amount,
      adminId: decodedToken.uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, status: updates.status });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[admin/payouts/approve] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/payouts?status=pending&limit=50&offset=0
 * List pending/approved payouts for admin review
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decodedToken = await verifyAdminToken(idToken);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminDb = getAdminDb();

    const status = req.nextUrl.searchParams.get('status') || 'pending';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 500);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const payoutsSnap = await adminDb
      .collection('partners_payouts')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .offset(offset)
      .get();

    const payouts = payoutsSnap.docs.map((doc) => ({
      id: doc.id,
      partnerId: doc.data().partnerId,
      amount: doc.data().amount,
      status: doc.data().status,
      createdAt: doc.data().createdAt,
      bankAccountId: doc.data().bankAccountId,
    }));

    return NextResponse.json({
      success: true,
      payouts: payouts.slice(0, limit),
      hasMore: payouts.length > limit,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[admin/payouts] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
