import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';

async function runSeed(params: URLSearchParams, body?: Record<string, any>) {
  const secret = params.get('secret');
  if (secret !== (process.env.OPS_SEED_SECRET || 'seed-ops-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const name    = body?.name    ?? params.get('name')    ?? 'בר מצווה';
    const sub     = body?.sub     ?? params.get('sub')     ?? 'סטים לבר מצווה';
    const imgUrl  = body?.imgUrl  ?? params.get('imgUrl')  ?? '';
    const order   = body?.order   ?? Number(params.get('order') ?? 8);

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

export async function GET(req: NextRequest) {
  return runSeed(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return runSeed(req.nextUrl.searchParams, body);
}
