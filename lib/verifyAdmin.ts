import { getAdminAuth, getAdminDb } from './firebaseAdmin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies an ID token and checks admin status.
 * Mirrors the AuthContext isAdmin logic:
 *   - Primary:  admins/{uid} document exists
 *   - Fallback: users/{uid}.role === 'admin'
 * Returns the decoded token if admin, null otherwise.
 */
export async function verifyAdminToken(idToken: string): Promise<DecodedIdToken | null> {
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  const db = getAdminDb();

  const adminDoc = await db.collection('admins').doc(decoded.uid).get();
  if (adminDoc.exists) return decoded;

  const userDoc = await db.collection('users').doc(decoded.uid).get();
  if (userDoc.exists && userDoc.data()?.role === 'admin') return decoded;

  return null;
}
