import { NextRequest, NextResponse } from 'next/server';
import {
  doc, getDoc, setDoc, updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

const STAM_CATS = [
  'קלפי מזוזה', 'מזוזות', 'בתי מזוזה',
  'קלפי תפילין', 'תפילין קומפלט',
  'מגילות', 'ספרי תורה',
];

function isStamProduct(p: { name?: string; category?: string }) {
  const haystack = `${p.name ?? ''} ${p.category ?? ''}`;
  return STAM_CATS.some(c => haystack.includes(c));
}

function itemType(category: string): string {
  if (category.includes('מזוזה')) return 'מזוזה';
  if (category.includes('תפילין')) return 'תפילין';
  if (category.includes('מגיל')) return 'מגילה';
  if (category.includes('תורה')) return 'ספר תורה';
  return category;
}

function itemPrefix(category: string): string {
  if (category.includes('מזוזה')) return 'MZ';
  if (category.includes('תפילין')) return 'TF';
  if (category.includes('מגיל')) return 'MG';
  if (category.includes('תורה')) return 'ST';
  return 'YS';
}

function randStr(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Item serial numbers use digits only: MZ-847293, TF-512984
function randDigits(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
}

function datestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    const orderSnap = await getDoc(doc(db, 'internalOrders', orderId));
    if (!orderSnap.exists()) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const order = orderSnap.data() as any;

    // Return existing cert without regenerating
    if (order.certId) {
      return NextResponse.json({ certId: order.certId, existing: true });
    }

    // Resolve sofer name from soferim collection
    let soferName = 'צוות הסופרים';
    if (order.stamStream?.soferId) {
      try {
        const soferSnap = await getDoc(doc(db, 'soferim', order.stamStream.soferId));
        if (soferSnap.exists()) soferName = soferSnap.data().name ?? soferName;
      } catch (_) {}
    }

    // Filter + expand STaM products into per-unit items
    const stamProducts = (order.products ?? []).filter(isStamProduct);
    const source = stamProducts.length ? stamProducts : order.products ?? [];

    const items: {
      serialNumber: string;
      productName: string;
      type: string;
      category: string;
      qualityLevel: string;
      soferName: string;
    }[] = [];

    for (const p of source) {
      // Try to enrich with product-level quality from the products collection
      let qualityLevel = p.level ?? p.qualityLevel ?? '';
      if (!qualityLevel && p.id) {
        try {
          const pSnap = await getDoc(doc(db, 'products', p.id));
          if (pSnap.exists()) qualityLevel = pSnap.data().level ?? '';
        } catch (_) {}
      }
      if (!qualityLevel) qualityLevel = 'כשר לכתחילה';

      // Fetch klaf image and mark as sold
      let klafImageUrl: string | undefined;
      const klafId = p.selectedKlafId ?? p.klafId;
      if (klafId) {
        try {
          const klafSnap = await getDoc(doc(db, 'klafim', klafId));
          if (klafSnap.exists()) {
            klafImageUrl = klafSnap.data().imageUrl ?? undefined;
            await updateDoc(doc(db, 'klafim', klafId), {
              status: 'sold',
              soldAt: serverTimestamp(),
            });
          }
        } catch (_) {}
      }

      const qty = Math.max(1, p.quantity ?? 1);
      const prefix = itemPrefix(p.category ?? '');
      for (let i = 0; i < qty; i++) {
        const item: {
          serialNumber: string;
          productName: string;
          type: string;
          category: string;
          qualityLevel: string;
          soferName: string;
          klafImageUrl?: string;
        } = {
          serialNumber: `${prefix}-${randDigits(6)}`,
          productName: p.name ?? '',
          type: itemType(p.category ?? p.name ?? ''),
          category: p.category ?? '',
          qualityLevel,
          soferName,
        };
        if (klafImageUrl) item.klafImageUrl = klafImageUrl;
        items.push(item);
      }
    }

    const certId = `YS-${datestamp()}-${randStr(8)}`;

    // Persist to Firestore
    await setDoc(doc(db, 'certificates', certId), {
      certId,
      orderId,
      externalOrderId: order.orderId ?? orderId,
      customerName: order.customerName ?? '',
      customerEmail: order.customerEmail ?? '',
      issuedAt: serverTimestamp(),
      items,
      magiaName: 'הרב בנימין גליס',   // matches RabbinicalSupervision, CategoryClient, ProductClient
      valid: true,
    });

    // Back-link on the order
    await updateDoc(doc(db, 'internalOrders', orderId), {
      certId,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ certId, success: true });
  } catch (err: any) {
    console.error('Certificate generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
