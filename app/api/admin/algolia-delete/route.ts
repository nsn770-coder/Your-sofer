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
    const adminDb = getAdminDb();

    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { objectID } = await req.json();
    if (!objectID || typeof objectID !== 'string') {
      return NextResponse.json({ error: 'Missing objectID' }, { status: 400 });
    }

    if (!algoliaClient) {
      return NextResponse.json({ error: 'Algolia not configured' }, { status: 500 });
    }

    await algoliaClient.deleteObject({ indexName: 'products', objectID });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[algolia-delete]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
