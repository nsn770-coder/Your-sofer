// ── Phase 14C: email notification senders ────────────────────────────────────
// Uses Resend's REST API directly via fetch, matching the pattern already used
// in app/api/send-order-email and app/api/ops/notify-team (no SDK import).
// Every function here is non-fatal by design — a failed send is logged, never thrown.

import { renderPartnerNewOrderTemplate, renderCustomerShipmentTemplate, type EmailOrderItem } from '@/app/lib/email-templates';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = 'Your Sofer <noreply@your-sofer.com>';

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY not set — skipping send to', to);
    return;
  }
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] Resend error (${res.status}) sending to ${to}:`, body);
  }
}

export async function sendPartnerNewOrderEmail(
  partner: { email: string; storeName?: string },
  order: { id: string; orderNumber: string; customerName: string; address?: string },
  items: EmailOrderItem[],
): Promise<void> {
  if (!partner.email) {
    console.warn(`[email] Partner missing email — skipping new-order notification for order ${order.orderNumber}`);
    return;
  }
  try {
    const html = renderPartnerNewOrderTemplate({
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerName: order.customerName,
      deliveryAddress: order.address || '',
      items,
    });
    await sendViaResend(partner.email, `הזמנה חדשה בחנות שלך: #${order.orderNumber}`, html);
    console.log(`[email] Partner new-order sent to ${partner.email} for order ${order.orderNumber}`);
  } catch (err) {
    console.error('[email] Failed to send partner new-order notification:', err);
  }
}

export async function sendCustomerShipmentEmail(
  order: { orderNumber: string; customerName: string; email: string },
  shipment: { publicId?: string | null; trackingLink?: string | null },
): Promise<void> {
  if (!shipment.trackingLink || !shipment.publicId) {
    console.warn(`[email] No tracking link/publicId for order ${order.orderNumber} — skipping customer shipment email`);
    return;
  }
  if (!order.email) {
    console.warn(`[email] Order ${order.orderNumber} missing customer email — skipping shipment notification`);
    return;
  }
  try {
    const html = renderCustomerShipmentTemplate({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      trackingLink: shipment.trackingLink,
      publicId: shipment.publicId,
    });
    await sendViaResend(order.email, `ההזמנה שלך בדרך! 🚚 ${order.orderNumber}`, html);
    console.log(`[email] Customer shipment tracking sent to ${order.email} for order ${order.orderNumber}`);
  } catch (err) {
    console.error('[email] Failed to send customer shipment notification:', err);
  }
}
