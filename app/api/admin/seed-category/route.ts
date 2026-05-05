import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';

async function runSeed(params: URLSearchParams, body?: Record<string, any>) {
  const secret = params.get('secret');
  if (secret !== (process.env.OPS_SEED_SECRET || 'seed-ops-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const name     = body?.name    ?? params.get('name')    ?? 'בר מצווה';
    const sub      = body?.sub     ?? params.get('sub')     ?? 'סטים לבר מצווה';
    const imgUrl   = body?.imgUrl  ?? params.get('imgUrl')  ?? '';
    const order    = body?.order   ?? Number(params.get('order') ?? 8);

    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    // Use name as doc ID (matches REQUIRED_CATS slug convention)
    const slug = name as string;
    const docRef = doc(db, 'categories', slug);
    const existing = await getDoc(docRef);

    if (existing.exists()) {
      return NextResponse.json({ success: true, alreadyExists: true, id: slug });
    }

    // Also check old-schema docs created with addDoc (name field)
    const col = collection(db, 'categories');
    const oldSnap = await getDocs(query(col, where('name', '==', name)));
    if (!oldSnap.empty) {
      return NextResponse.json({ success: true, alreadyExists: true, id: oldSnap.docs[0].id });
    }

    await setDoc(docRef, {
      slug,
      displayName: name,
      imageUrl: imgUrl || '',
      priority: order,
    });

    return NextResponse.json({ success: true, id: slug });
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
