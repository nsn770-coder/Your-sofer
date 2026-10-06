// Glue between an order document and lib/metaCapi.ts — sends the Purchase
// once per order and records the result on the order (metaCapi field), so a
// repeated IPN / backfill run never reports the same sale twice.

import type { Firestore } from 'firebase-admin/firestore';
import { sendPurchaseToMeta, type CapiResult } from './metaCapi';
import type { ClosedLeadInfo } from './crm';

interface OrderLike {
  orderNumber: string;
  total: number;
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
  city?: string | null;
  uid?: string | null;
  items?: Array<{ id?: string; productId?: string; quantity?: number; price?: number }>;
  attribution?: { fbp?: string | null; fbc?: string | null; fbclid?: string | null } | null;
  metaClient?: { clientIp?: string | null; userAgent?: string | null } | null;
  metaCapi?: { sentAt?: unknown } | null;
}

export async function reportOrderToMeta(
  db: Firestore,
  orderId: string,
  order: OrderLike,
  lead: ClosedLeadInfo | null,
  opts?: { onlyMessaging?: boolean; eventTimeMs?: number },
): Promise<CapiResult> {
  try {
    if (order.metaCapi?.sentAt) return { sent: false, error: 'already sent' };
    // Manual (off-site) orders are only reported when the buyer is a proven
    // Click-to-WhatsApp ad lead — never as a generic website purchase.
    if (opts?.onlyMessaging && !lead?.ctwaClid) return { sent: false, error: 'no ctwa_clid' };

    const result = await sendPurchaseToMeta(
      {
        orderNumber: order.orderNumber,
        total: order.total,
        email: order.email,
        phone: order.phone,
        customerName: order.customerName,
        city: order.city,
        uid: order.uid,
        items: order.items,
        fbp: order.attribution?.fbp ?? null,
        fbc: order.attribution?.fbc ?? null,
        fbclid: order.attribution?.fbclid ?? null,
        clientIp: order.metaClient?.clientIp ?? null,
        userAgent: order.metaClient?.userAgent ?? null,
        eventTimeMs: opts?.eventTimeMs,
      },
      lead,
    );
    if (result.sent) {
      await db.collection('orders').doc(orderId).set(
        { metaCapi: { sentAt: new Date(), channel: result.channel, leadId: lead?.leadId ?? null } },
        { merge: true },
      );
    }
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[meta-capi] reportOrderToMeta failed (non-fatal):', msg);
    return { sent: false, error: msg };
  }
}
