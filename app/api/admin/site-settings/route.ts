import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/lib/firebase-admin';

const DEFAULTS = {
  checkoutEnabled: true,
  checkoutDisabledMessage:
    'הרכישות באתר אינן זמינות כעת. ניתן לעיין במוצרים, והאפשרות להזמנה תחזור בקרוב.',
};

export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('siteSettings').doc('global').get();
    if (!snap.exists) return NextResponse.json(DEFAULTS);
    return NextResponse.json({ ...DEFAULTS, ...snap.data() });
  } catch (e) {
    console.error('[site-settings] GET:', e);
    return NextResponse.json(DEFAULTS);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    const db = getAdminDb();
    const { getAuth } = await import('firebase-admin/auth');
    const { getApps } = await import('firebase-admin/app');
    const app = getApps().find(a => a.name === 'your-sofer-admin');
    if (!app) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const decoded = await getAuth(app).verifyIdToken(idToken);
    const adminSnap = await db.collection('admins').doc(decoded.uid).get();
    if (!adminSnap.exists) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { checkoutEnabled, checkoutDisabledMessage } = await req.json();
    await db.collection('siteSettings').doc('global').set(
      {
        checkoutEnabled: Boolean(checkoutEnabled),
        checkoutDisabledMessage: checkoutDisabledMessage ?? DEFAULTS.checkoutDisabledMessage,
        updatedAt: new Date().toISOString(),
        updatedBy: decoded.email ?? decoded.uid,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[site-settings] POST:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
