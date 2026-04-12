import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'your-sofer',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

const OPS_USERS = [
  { email: 'nsn770@gmail.com', name: 'נסים', role: 'owner', active: true },
  { email: 'bnsymwlydn2@gmail.com', name: 'עידן', role: 'ops_manager', active: true },
  { email: 'tosef21me@gmail.com', name: 'יוסף חיים', role: 'fulfillment', active: true },
];

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== (process.env.OPS_SEED_SECRET || 'seed-ops-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminDb = getAdminDb();
    const col = adminDb.collection('opsUsers');
    const snap = await col.get();

    const existingEmails = new Set(snap.docs.map((d) => d.data().email));
    const added: string[] = [];

    for (const user of OPS_USERS) {
      if (!existingEmails.has(user.email)) {
        await col.add({
          ...user,
          uid: '',
          createdAt: new Date(),
          lastLogin: null,
        });
        added.push(user.email);
      }
    }

    return NextResponse.json({ success: true, added, skipped: OPS_USERS.length - added.length });
  } catch (err: any) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
