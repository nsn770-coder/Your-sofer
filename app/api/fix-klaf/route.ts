import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const db = await getAdminDb();
    const snap = await db.collection('products')
      .where('cat', '==', 'קלפי מזוזה')
      .get();

    const soferNames: string[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.sofer) {
        soferNames.push(data.sofer + ' | hasKlaf=' + data.hasKlafSelection);
      }
    }

    return NextResponse.json({
      scanned: snap.size,
      soferNames: [...new Set(soferNames)],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
