// Meta Conversions API (server-side) — reports purchases back to Meta so ads
// optimize on real buyers, including buyers whose browser blocked the pixel
// and buyers who came through a Click-to-WhatsApp ad and paid via a link.
//
// Two event shapes, one per order (never both, so a sale is counted once):
//
//  1. business_messaging — the buyer's phone matches a CRM lead that arrived
//     from a Click-to-WhatsApp ad (we hold its ctwa_clid). Meta credits the
//     purchase to that exact ad. Sent to the dataset linked to the WABA.
//
//  2. website — everyone else. Hashed email/phone/name + _fbp/_fbc cookies,
//     IP and user agent; event_id = orderNumber so it de-duplicates with the
//     browser pixel Purchase fired on the thank-you page (same eventID).
//
// Env:
//   META_CAPI_TOKEN          — Events Manager → dataset → Settings →
//                              Conversions API → Generate access token
//   NEXT_PUBLIC_META_PIXEL_ID — website dataset (already set for the pixel)
//   META_WA_DATASET_ID       — dataset linked to the WhatsApp account
//                              (defaults to the pixel dataset)
//   WHATSAPP_BUSINESS_ACCOUNT_ID — already set for the bot
//   META_TEST_EVENT_CODE     — optional, routes events to "Test events" tab

import { createHash } from 'crypto';

const GRAPH_VERSION = 'v21.0';

function sha256(v: string): string {
  return createHash('sha256').update(v).digest('hex');
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

/** Israeli-first phone → digits with country code, no "+" (Meta's required format). */
export function phoneForMeta(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (digits.length === 9) return '972' + digits;
  return digits;
}

function splitName(full: string | null | undefined): { fn?: string; ln?: string } {
  const parts = norm(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  return { fn: parts[0], ln: parts.length > 1 ? parts.slice(1).join(' ') : undefined };
}

export interface CapiOrder {
  orderNumber: string;
  total: number;
  email?: string | null;
  phone?: string | null;
  customerName?: string | null;
  city?: string | null;
  uid?: string | null;
  items?: Array<{ id?: string; productId?: string; quantity?: number; price?: number }>;
  fbp?: string | null;
  fbc?: string | null;
  fbclid?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  eventTimeMs?: number;
}

export interface CapiLeadLink {
  ctwaClid?: string | null;
}

export interface CapiResult {
  sent: boolean;
  channel?: 'business_messaging' | 'website';
  error?: string;
}

async function post(datasetId: string, event: Record<string, unknown>): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) throw new Error('META_CAPI_TOKEN missing');
  const body: Record<string, unknown> = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events?access_token=${encodeURIComponent(token)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Meta CAPI ${res.status}: ${txt.slice(0, 500)}`);
  }
}

function hashedUserData(order: CapiOrder): Record<string, unknown> {
  const ud: Record<string, unknown> = { country: [sha256('il')] };
  const em = norm(order.email);
  if (em && em.includes('@')) ud.em = [sha256(em)];
  const ph = phoneForMeta(order.phone);
  if (ph) ud.ph = [sha256(ph)];
  const { fn, ln } = splitName(order.customerName);
  if (fn) ud.fn = [sha256(fn)];
  if (ln) ud.ln = [sha256(ln)];
  const ct = norm(order.city).replace(/\s+/g, '');
  if (ct) ud.ct = [sha256(ct)];
  const ext = order.uid || ph;
  if (ext) ud.external_id = [sha256(ext)];
  return ud;
}

/**
 * Sends one Purchase event for this order. Never throws — CAPI must never
 * break checkout. Returns which channel was used so the caller can mark the
 * order (metaCapiSentAt) and avoid re-sending.
 */
export async function sendPurchaseToMeta(order: CapiOrder, lead?: CapiLeadLink | null): Promise<CapiResult> {
  try {
    if (!process.env.META_CAPI_TOKEN) return { sent: false, error: 'META_CAPI_TOKEN not set' };
    const eventTime = Math.floor((order.eventTimeMs ?? Date.now()) / 1000);
    const contentIds = (order.items ?? []).map((i) => String(i.productId || i.id || '')).filter(Boolean);
    const customData: Record<string, unknown> = {
      currency: 'ILS',
      value: Math.round(Number(order.total) || 0),
      order_id: order.orderNumber,
      ...(contentIds.length ? { content_ids: contentIds, content_type: 'product' } : {}),
    };

    const ctwa = lead?.ctwaClid;
    const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const waDataset = process.env.META_WA_DATASET_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;

    if (ctwa && waba && waDataset) {
      const ud = hashedUserData(order);
      await post(waDataset, {
        event_name: 'Purchase',
        event_time: eventTime,
        event_id: `${order.orderNumber}-wa`,
        action_source: 'business_messaging',
        messaging_channel: 'whatsapp',
        user_data: { ...ud, whatsapp_business_account_id: waba, ctwa_clid: ctwa },
        custom_data: customData,
      });
      return { sent: true, channel: 'business_messaging' };
    }

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) return { sent: false, error: 'NEXT_PUBLIC_META_PIXEL_ID not set' };
    const ud = hashedUserData(order);
    let fbc = order.fbc || null;
    if (!fbc && order.fbclid) fbc = `fb.1.${Date.now()}.${order.fbclid}`;
    if (fbc) ud.fbc = fbc;
    if (order.fbp) ud.fbp = order.fbp;
    if (order.clientIp) ud.client_ip_address = order.clientIp;
    if (order.userAgent) ud.client_user_agent = order.userAgent;

    await post(pixelId, {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: order.orderNumber, // = browser pixel eventID → de-duplicated
      action_source: 'website',
      event_source_url: 'https://your-sofer.com/thank-you',
      user_data: ud,
      custom_data: customData,
    });
    return { sent: true, channel: 'website' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[meta-capi] send failed (non-fatal):', msg);
    return { sent: false, error: msg };
  }
}

/** Client IP / UA from a Next.js request (Vercel sets x-forwarded-for). */
export function requestClientInfo(headers: Headers): { clientIp: string | null; userAgent: string | null } {
  const xff = headers.get('x-forwarded-for') || '';
  const clientIp = xff.split(',')[0].trim() || headers.get('x-real-ip') || null;
  return { clientIp, userAgent: headers.get('user-agent') };
}
