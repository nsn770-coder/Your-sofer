import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';

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
    const col = collection(db, 'opsUsers');
    const added: string[] = [];
    const skipped: string[] = [];

    for (const user of OPS_USERS) {
      const existing = await getDocs(query(col, where('email', '==', user.email)));
      if (!existing.empty) {
        skipped.push(user.email);
        continue;
      }
      await addDoc(col, {
        ...user,
        uid: '',
        createdAt: new Date(),
        lastLogin: null,
      });
      added.push(user.email);
    }

    return NextResponse.json({ success: true, added, skipped });
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
