import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { algoliasearch } from 'algoliasearch';

export const dynamic = 'force-dynamic';

const algoliaClient = (() => {
  const appId = process.env.ALGOLIA_APP_ID ?? '';
  const key   = process.env.ALGOLIA_ADMIN_KEY ?? '';
  return appId && key ? algoliasearch(appId, key) : null;
})();

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyAdminToken(idToken))) {
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
