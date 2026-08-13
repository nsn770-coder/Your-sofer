import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * תיקון retroactive של כל המוצרים שהועלו דרך קבלת ספק כ-draft
 * השינוי status ל-active והסרת hidden כדי שיופיעו בחנות
 *
 * POST /api/admin/fix-draft-inventory
 * Header: Authorization: Bearer <admin-id-token>
 */
export async function POST(req: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // ── auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    if (!(await verifyAdminToken(idToken))) {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    // ── find and fix draft inventory products ──────────────────────────────────
    const snap = await adminDb
      .collection('products')
      .where('status', '==', 'draft')
      .get();

    const updatedIds: string[] = [];

    if (snap.docs.length > 0) {
      const batch = adminDb.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, {
          status: 'active',
          hidden: false,
          active: true,
        });
        updatedIds.push(doc.id);
      }
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      updated: updatedIds.length,
      ids: updatedIds,
      message: `${updatedIds.length} מוצרים עודכנו מ-draft ל-active ויוצגו בחנות`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[fix-draft-inventory]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
