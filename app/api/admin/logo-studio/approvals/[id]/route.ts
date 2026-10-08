import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, HttpError } from '@/lib/logoStudio/auth.server';
import { signedUrl, type StoredAsset } from '@/lib/logoStudio/storage.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Approved design snapshot for an order item (admin only). Returns fresh
 * signed URLs: logo PNG (view + download), approved mockup, details and the
 * production data. ?orderUid=… lets the panel flag a mismatch between the
 * order's customer and the approval's owner.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req);
    const { id } = await ctx.params;
    if (!/^[a-f0-9]{20}$/.test(id)) throw new HttpError(400, 'invalid_id');
    const snap = await getAdminDb().collection(COL.approvals).doc(id).get();
    if (!snap.exists) throw new HttpError(404, 'not_found');
    const a = snap.data()!;
    const logo = a.logo as StoredAsset;
    const mockupAsset = a.mockup.asset as StoredAsset;
    const orderUid = req.nextUrl.searchParams.get('orderUid');
    const safeName = `logo-${String(a.projectId).slice(0, 6)}-v${a.versionNumber}`;
    return NextResponse.json({
      approvalId: id,
      createdAt: a.createdAt,
      email: a.email,
      ownerMatchesOrder: orderUid ? orderUid === a.uid : null,
      product: a.product,
      spec: a.spec,
      details: a.details,
      versionNumber: a.versionNumber,
      side: a.side ?? 'top',
      production: a.production,
      placement: a.mockup.placement,
      finish: a.mockup.finish,
      mockupKind: a.mockup.kind,
      logo: { view: signedUrl(logo, { width: 1200 }), download: signedUrl(logo, { attachment: safeName }), width: logo.width, height: logo.height, bytes: logo.bytes },
      mockup: { view: signedUrl(mockupAsset, { width: 1200 }), download: signedUrl(mockupAsset, { attachment: `${safeName}-mockup` }) },
    });
  } catch (e) {
    return errorResponse(e, 'admin:approval');
  }
}
