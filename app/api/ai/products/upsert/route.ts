import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { buildAiKnowledgeDoc } from '@/lib/aiProductSearch';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { productId, ...productData } = body;

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const db = getAdminDb();

    // If only productId provided, fetch full product from Firestore
    let data: Record<string, unknown> = productData;
    if (Object.keys(productData).length === 0) {
      const snap = await db.collection('products').doc(productId).get();
      if (!snap.exists) {
        return NextResponse.json({ error: 'product not found' }, { status: 404 });
      }
      data = snap.data() as Record<string, unknown>;
    }

    const knowledgeDoc = buildAiKnowledgeDoc(productId, data);
    await db.collection('aiProductKnowledge').doc(productId).set(knowledgeDoc);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/ai/products/upsert]', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
