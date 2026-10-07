import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, HttpError } from '@/lib/logoStudio/auth.server';
import { getQuotaView } from '@/lib/logoStudio/quota.server';
import { db, getSettings } from '@/lib/logoStudio/projects.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Look up a customer's attempts: balance, ledger (consumed / codes) and projects. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'invalid_email', 'נא להזין אימייל תקין.');
    let uid: string;
    try { uid = (await getAdminAuth().getUserByEmail(email)).uid; }
    catch { throw new HttpError(404, 'user_not_found', 'לא נמצא משתמש עם אימייל זה.'); }
    const settings = await getSettings();
    const [quota, ledger, projects] = await Promise.all([
      getQuotaView(db(), uid, settings.freeAttempts),
      getAdminDb().collection(COL.users).doc(uid).collection('ledger').orderBy('at', 'desc').limit(100).get(),
      getAdminDb().collection(COL.projects).where('uid', '==', uid).limit(50).get(),
    ]);
    return NextResponse.json({
      uid, email, quota,
      ledger: ledger.docs.map(d => ({ id: d.id, ...d.data() })),
      projects: projects.docs.map(d => ({ id: d.id, productId: d.data().productId, versionCount: d.data().versionCount, approval: d.data().approval ?? null, updatedAt: d.data().updatedAt })),
    });
  } catch (e) {
    return errorResponse(e, 'admin:customers');
  }
}
