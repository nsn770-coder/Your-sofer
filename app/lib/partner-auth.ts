import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * Shared partner authentication for /api/partner/* routes.
 *
 * Access is granted by the presence of `partnerId` on the users doc rather than
 * by `role === 'partner'`, so a single account can hold several hats at once
 * (sofer + shaliach + partner).
 */
export async function requirePartner(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) } as const;
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
  } catch {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) } as const;
  }

  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
  const partnerId = userSnap.data()?.partnerId as string | undefined;

  if (!userSnap.exists || !partnerId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  return { adminDb, partnerId, uid: decoded.uid } as const;
}

export type PartnerOrderDoc = Record<string, any> & { id: string };

/** Orders belonging to this partner, newest first. */
export async function getPartnerOrders(
  adminDb: FirebaseFirestore.Firestore,
  partnerId: string,
  days?: number
): Promise<PartnerOrderDoc[]> {
  const query = adminDb
    .collection('orders')
    .where('partnerId', '==', partnerId) as FirebaseFirestore.Query;

  const snap = await query.get();
  const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;

  return snap.docs
    .map((doc): PartnerOrderDoc => ({ ...(doc.data() as Record<string, any>), id: doc.id }))
    .filter((o) => {
      if (!cutoff) return true;
      const ms = toMillis(o.createdAt);
      return ms === null ? true : ms >= cutoff;
    })
    .sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0));
}

/** Only the line items that belong to this partner. */
export function partnerItems(order: Record<string, any>, partnerId: string) {
  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const mine = items.filter((it) => it?.partnerId === partnerId);
  // Older orders may predate per-item partnerId tagging — fall back to all items
  // when the order itself is attributed to this partner.
  return mine.length > 0 ? mine : items;
}

export function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const t = new Date(value).getTime();
    return isNaN(t) ? null : t;
  }
  const v = value as { _seconds?: number; seconds?: number };
  const secs = v._seconds ?? v.seconds;
  return typeof secs === 'number' ? secs * 1000 : null;
}
