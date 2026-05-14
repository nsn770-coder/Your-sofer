import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('products')
      .where('cat', '==', 'קלפי מזוזה')
      .get();

    const withKlaf: string[] = [];
    const fixed: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.sofer && data.sofer.includes('קורנפלד')) {
        withKlaf.push(doc.id + ': sofer=[' + data.sofer + '] hasKlaf=' + data.hasKlafSelection);
        await doc.ref.update({ hasKlafSelection: true });
        fixed.push(doc.id + ': ' + data.name);
      }
    }

    return NextResponse.json({
      scanned: snap.size,
      foundKornfeld: withKlaf,
      fixed: fixed.length,
      fixedProducts: fixed,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
