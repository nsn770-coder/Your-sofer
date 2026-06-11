import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { algoliasearch } from 'algoliasearch';

export const dynamic = 'force-dynamic';

const algoliaClient = (() => {
  const appId = process.env.ALGOLIA_APP_ID ?? '';
  const key   = process.env.ALGOLIA_ADMIN_KEY ?? '';
  return appId && key ? algoliasearch(appId, key) : null;
})();

// Mirrors the AuthContext isAdmin check: admins/{uid} collection (primary) OR users.role == 'admin'
async function isAdmin(uid: string): Promise<boolean> {
  const db = getAdminDb();
  const adminDoc = await db.collection('admins').doc(uid).get();
  if (adminDoc.exists) return true;
  const userDoc = await db.collection('users').doc(uid).get();
  return userDoc.exists && userDoc.data()?.role === 'admin';
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const decoded   = await adminAuth.verifyIdToken(idToken);
    if (!(await isAdmin(decoded.uid))) {
      return NextResponse.json({ error: 'Forbidden — admin required' }, { status: 403 });
    }

    const { productId } = await req.json();
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('products').doc(productId).delete();

    if (algoliaClient) {
      await algoliaClient
        .deleteObject({ indexName: 'products', objectID: productId })
        .catch(err => console.warn('[product-delete] Algolia warn:', err));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[product-delete]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
