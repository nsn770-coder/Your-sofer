import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== (process.env.OPS_SEED_SECRET || 'seed-ops-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, sub = '', imgUrl = '', order = 99 } = await req.json();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const col = collection(db, 'categories');
    const existing = await getDocs(query(col, where('name', '==', name)));

    if (!existing.empty) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    const ref = await addDoc(col, { name, sub, imgUrl, order });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
