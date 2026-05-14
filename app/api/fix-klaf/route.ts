import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const snap = await adminDb.collection('products')
      .where('sofer', '==', 'הרב יעקב קורנפלד')
      .get();

    const results: string[] = [];
    for (const doc of snap.docs) {
      await doc.ref.update({ hasKlafSelection: true });
      results.push(doc.id + ': ' + doc.data().name);
    }
    return NextResponse.json({ fixed: results.length, products: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
