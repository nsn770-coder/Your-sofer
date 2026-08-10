import type { Firestore } from 'firebase-admin/firestore';
import type { Order, OrderItem, ShipmentRecord, WarehouseAddress, CustomerAddress, FulfillmentPlan } from './types';

const MAIN_WAREHOUSE: WarehouseAddress = {
  city: 'דימונה',
  street: 'פרופסור עדה יונת',
  number: '19',
  zipCode: '80100',
  phone: process.env.MAIN_WAREHOUSE_PHONE || '08-6550000',
  recipientName: 'Your Sofer',
};

function getItemSource(item: OrderItem): 'main' | `partner_${string}` {
  return item.partnerId ? (`partner_${item.partnerId}` as const) : 'main';
}

function buildDestinationAddress(order: Order): CustomerAddress {
  return {
    city: order.city || '',
    street: order.street || '',
    number: order.houseNumber || '',
    apartment: order.apartment || undefined,
    zipCode: order.zipCode || undefined,
    phone: order.phone || '',
    recipientName: order.customerName || '',
  };
}

// מחשבת תוכנית משלוחים: קבוצה אחת (= משלוח אחד) לכל מקור פריטים (מחסן ראשי /
// מחסן שותף), לפי partnerId שנשמר על כל פריט בהזמנה.
export async function calculateFulfillmentPlan(
  order: Order,
  db: Firestore,
): Promise<FulfillmentPlan> {
  const items = order.items || [];
  const groupedBySource = new Map<string, OrderItem[]>();
  for (const item of items) {
    const source = getItemSource(item);
    if (!groupedBySource.has(source)) groupedBySource.set(source, []);
    groupedBySource.get(source)!.push(item);
  }

  const destinationAddress = buildDestinationAddress(order);
  const now = new Date().toISOString();
  const shipments: ShipmentRecord[] = [];

  for (const [source, sourceItems] of groupedBySource) {
    let pickupAddress: WarehouseAddress;

    if (source === 'main') {
      pickupAddress = MAIN_WAREHOUSE;
    } else {
      const partnerId = source.replace('partner_', '');
      const partnerSnap = await db.collection('partners').doc(partnerId).get();
      const warehouse = partnerSnap.data()?.warehouse as WarehouseAddress | undefined;
      if (!partnerSnap.exists || !warehouse) {
        throw new Error(`Partner ${partnerId} warehouse not configured`);
      }
      pickupAddress = warehouse;
    }

    shipments.push({
      id: crypto.randomUUID(),
      orderId: order.id,
      source: source as ShipmentRecord['source'],
      itemIds: sourceItems.map((item, idx) => item.id ?? String(idx)),
      pickupAddress,
      destinationAddress,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    status: 'pending',
    shipmentCount: shipments.length,
    shipments,
  };
}
