import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/lib/firebase-admin';

const OPS_USERS = [
  { email: 'nsn770@gmail.com', name: 'נסים', role: 'owner', active: true },
  { email: 'bnsymwlydn2@gmail.com', name: 'עידן', role: 'ops_manager', active: true },
  { email: 'tosef21me@gmail.com', name: 'יוסף חיים', role: 'fulfillment', active: true },
];

async function runSeed(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  return runSeed(req);
}

export async function POST(req: NextRequest) {
  return runSeed(req);
}
