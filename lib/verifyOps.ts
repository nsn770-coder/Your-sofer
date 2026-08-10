import { getAdminAuth, getAdminDb } from './firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies an ID token and checks admin OR ops status.
 * Mirrors verifyAdminToken, plus a fallback for the separate ops team
 * (opsUsers collection, matched by email — see app/contexts/OpsAuthContext.tsx).
 * Returns the decoded token if allowed, null otherwise.
 */
export async function verifyOpsOrAdminToken(idToken: string): Promise<DecodedIdToken | null> {
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  const db = getAdminDb();

  const adminDoc = await db.collection('admins').doc(decoded.uid).get();
  if (adminDoc.exists) return decoded;

  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (userDoc.exists && userDoc.data()?.role === 'admin') return decoded;

  if (decoded.email) {
    const opsSnap = await db.collection('opsUsers').where('email', '==', decoded.email).limit(1).get();
    if (!opsSnap.empty && opsSnap.docs[0].data()?.active) return decoded;
  }

  return null;
}
