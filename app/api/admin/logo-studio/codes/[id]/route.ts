import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, HttpError } from '@/lib/logoStudio/auth.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Redemptions of one code: who, when, how many attempts were granted. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    if (!/^[a-f0-9]{64}$/.test(id)) throw new HttpError(400, 'invalid_id');
    const snap = await getAdminDb().collection(COL.codes).doc(id).collection('redemptions').orderBy('at', 'desc').limit(500).get();
    return NextResponse.json({ redemptions: snap.docs.map(d => ({ uid: d.id, ...d.data() })) });
  } catch (e) {
    return errorResponse(e, 'admin:codes:redemptions');
  }
}
