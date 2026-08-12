// Phase 9: Payout Request Handler
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const MIN_PAYOUT_AMOUNT = 200; // ₪200 minimum

/**
 * POST /api/partner/payouts/request
 * Request withdrawal to bank account
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || !userSnap.data()?.partnerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;
    const { amount, bankAccountId, notes } = await req.json();

    // Validate amount
    if (!amount || amount < MIN_PAYOUT_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum payout amount is ₪${MIN_PAYOUT_AMOUNT}` },
        { status: 400 }
      );
    }

    // Validate bank account ID
    if (!bankAccountId || !bankAccountId.trim()) {
      return NextResponse.json(
        { error: 'Bank account ID is required' },
        { status: 400 }
      );
    }

    // Verify account belongs to partner
    const accountSnap = await adminDb
      .collection('partners')
      .doc(partnerId)
      .collection('bank_accounts')
      .doc(bankAccountId)
      .get();

    if (!accountSnap.exists) {
      return NextResponse.json(
        { error: 'Invalid bank account' },
        { status: 400 }
      );
    }

    // Get current balance from orders (commission owed)
    const ordersSnap = await adminDb
      .collection('orders')
      .where('partnerId', '==', partnerId)
      .where('status', '==', 'completed')
      .get();

    let totalCommission = 0;
    for (const doc of ordersSnap.docs) {
      totalCommission += doc.data().partnerCommission || 0;
    }

    // Get previous payouts to calculate available balance
    const payoutsSnap = await adminDb
      .collection('partners_payouts')
      .where('partnerId', '==', partnerId)
      .where('status', 'in', ['completed', 'pending'])
      .get();

    let totalPaidOut = 0;
    for (const doc of payoutsSnap.docs) {
      if (doc.data().status === 'completed') {
        totalPaidOut += doc.data().amount || 0;
      }
    }

    const availableBalance = totalCommission - totalPaidOut;

    if (availableBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₪${availableBalance}` },
        { status: 400 }
      );
    }

    // Check for duplicate pending requests (prevent spam)
    const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 5));
    const pendingSnap = await adminDb
      .collection('partners_payouts')
      .where('partnerId', '==', partnerId)
      .where('status', '==', 'pending')
      .where('createdAt', '>=', fiveMinutesAgo)
      .get();

    if (!pendingSnap.empty) {
      return NextResponse.json(
        { error: 'You already have a pending payout request. Please wait.' },
        { status: 429 }
      );
    }

    // Create payout request
    const payoutData = {
      partnerId,
      amount,
      bankAccountId,
      notes: notes || '',
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: decodedToken.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    const payoutRef = await adminDb.collection('partners_payouts').add(payoutData);

    return NextResponse.json({
      success: true,
      payoutId: payoutRef.id,
      status: 'pending',
      availableBalance,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[payouts/request] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/partner/payouts/request?partnerId=xyz
 * Get payout history (for partner's own data)
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const adminAuth = getAdminAuth();

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const userSnap = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userSnap.exists || !userSnap.data()?.partnerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const partnerId = userSnap.data()?.partnerId;

    const payoutsSnap = await adminDb
      .collection('partners_payouts')
      .where('partnerId', '==', partnerId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const payouts = payoutsSnap.docs.map((doc) => ({
      id: doc.id,
      amount: doc.data().amount,
      status: doc.data().status,
      createdAt: doc.data().createdAt,
      completedAt: doc.data().completedAt || null,
      transactionId: doc.data().transactionId || null,
      rejectionReason: doc.data().rejectionReason || null,
    }));

    return NextResponse.json({ success: true, payouts });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[payouts/request] GET error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
