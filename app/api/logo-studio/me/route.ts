import { NextRequest, NextResponse } from 'next/server';
import { requireUser, errorResponse } from '@/lib/logoStudio/auth.server';
import { getQuotaView } from '@/lib/logoStudio/quota.server';
import { db, getSettings } from '@/lib/logoStudio/projects.server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { COL } from '@/lib/logoStudio/db';
import { storageConfigured } from '@/lib/logoStudio/storage.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Current customer: remaining attempts + recent projects (own only). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const settings = await getSettings();
    const quota = await getQuotaView(db(), user.uid, settings.freeAttempts);
    const snap = await getAdminDb().collection(COL.projects).where('uid', '==', user.uid).limit(50).get();
    const projects = snap.docs
      .map(d => ({ id: d.id, updatedAt: d.data().updatedAt as number, productId: d.data().productId as string, primaryText: (d.data().draftSpec?.primaryText as string) ?? '', versionCount: d.data().versionCount as number, approved: !!d.data().approval }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);
    return NextResponse.json({
      quota,
      projects,
      contactWhatsapp: settings.contactWhatsapp,
      services: { storage: storageConfigured(), ai: !!process.env.GEMINI_API_KEY },
    });
  } catch (e) {
    return errorResponse(e, 'me');
  }
}
