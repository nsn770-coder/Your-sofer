import type { Firestore } from 'firebase-admin/firestore';
import type { Order } from './types';

// Main-catalog products track stock as `inStock` (numeric); partner products
// (app/api/partner/products/route.ts) track it as `stock`. Field name differs
// by source, so it can't be read uniformly.
export async function validateOrderStock(
  order: Order,
  db: Firestore,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const items = order.items || [];

  for (const item of items) {
    const lookupId = item.productId || item.id;
    if (!lookupId) continue; // synthetic line with no backing product doc (e.g. gift/bundle line)

    let stock: number;
    let name: string | undefined;
    try {
      if (item.partnerId) {
        const snap = await db.collection('partners').doc(item.partnerId)
          .collection('products').doc(lookupId).get();
        if (!snap.exists) {
          errors.push(`Product ${lookupId} (partner: ${item.partnerId}) not found`);
          continue;
        }
        stock = snap.data()?.stock ?? 0;
        name = snap.data()?.name;
      } else {
        const snap = await db.collection('products').doc(lookupId).get();
        if (!snap.exists) {
          errors.push(`Product ${lookupId} not found`);
          continue;
        }
        stock = snap.data()?.inStock ?? 0;
        name = snap.data()?.name;
      }
    } catch {
      errors.push(`Error checking stock for item ${lookupId}`);
      continue;
    }

    if (stock < item.quantity) {
      errors.push(`${name ?? lookupId}: only ${stock} in stock, ordered ${item.quantity}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
