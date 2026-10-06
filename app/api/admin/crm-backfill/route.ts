import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';
import { normalizePhone, type ClosedLeadInfo, type CrmSource } from '@/lib/crm';
import { reportOrderToMeta } from '@/lib/orderMetaCapi';
import { isPaidOrder, getOrderDate, getOrderTotal } from '@/app/lib/orderStatus';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/crm-backfill
//
// One-click repair for the CRM + Meta loop (button in /admin/crm):
//   1. Leads with no name ("—") get the buyer's name/email from their orders.
//   2. Leads whose WhatsApp conversation holds a Click-to-WhatsApp ad click
//      get ctwaClid/adId copied onto the lead doc.
//   3. Paid orders from the last 7 days (Meta's limit for event_time) that
//      were never reported are sent to Meta Conversions API — as a
//      business_messaging Purchase when the buyer came from a CTWA ad,
//      otherwise as a website Purchase. Idempotent via order.metaCapi.sentAt.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const META_WINDOW_MS = 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000; // 7 days minus 1h safety

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'חסר טוקן הרשאה' }, { status: 401 });
    const decoded = await verifyAdminToken(idToken);
    if (!decoded) return NextResponse.json({ error: 'נדרשת הרשאת אדמין' }, { status: 403 });

    const db = getAdminDb();
    const [leadsSnap, ordersSnap, convSnap] = await Promise.all([
      db.collection('crmLeads').get(),
      db.collection('orders').get(),
      db.collection('whatsappConversations').get(),
    ]);

    // ctwa_clid per normalized phone, from stored conversations
    const ctwaByPhone = new Map<string, { ctwa: string; adId: string | null; headline: string | null }>();
    convSnap.docs.forEach((d) => {
      const data = d.data();
      const ref = data.referral as { ctwa_clid?: string; source_id?: string; headline?: string } | undefined;
      if (!ref?.ctwa_clid) return;
      const key = normalizePhone((data.phone as string | undefined) ?? d.id);
      if (key) ctwaByPhone.set(key, { ctwa: ref.ctwa_clid, adId: ref.source_id ?? null, headline: ref.headline ?? null });
    });

    // Orders indexed by phone / email (newest first)
    const orders = ordersSnap.docs
      .map((d) => ({ id: d.id, data: d.data() as Record<string, any> }))
      .sort((a, b) => (getOrderDate(b.data)?.getTime() ?? 0) - (getOrderDate(a.data)?.getTime() ?? 0));
    const orderByPhone = new Map<string, Record<string, any>>();
    for (const o of orders) {
      const k = normalizePhone(o.data.phone);
      if (k && !orderByPhone.has(k)) orderByPhone.set(k, o.data);
    }

    // ── 1+2: repair leads ──────────────────────────────────────────────────
    let namesFilled = 0;
    let ctwaLinked = 0;
    const leadByPhone = new Map<string, { id: string; data: Record<string, any> }>();
    const leadByEmail = new Map<string, { id: string; data: Record<string, any> }>();
    const writes: Promise<unknown>[] = [];
    for (const d of leadsSnap.docs) {
      const data = d.data() as Record<string, any>;
      const key = normalizePhone(data.phone ?? d.id);
      const patch: Record<string, unknown> = {};
      const o = key ? orderByPhone.get(key) : undefined;
      if (o) {
        if (!String(data.name ?? '').trim() && String(o.customerName ?? '').trim()) {
          patch.name = String(o.customerName).trim();
          namesFilled++;
        }
        if (!data.email && o.email) patch.email = String(o.email).trim().toLowerCase();
      }
      const c = key ? ctwaByPhone.get(key) : undefined;
      if (c && !data.ctwaClid) {
        patch.ctwaClid = c.ctwa;
        patch.adId = c.adId;
        patch.adHeadline = c.headline;
        ctwaLinked++;
      }
      if (Object.keys(patch).length) writes.push(d.ref.set(patch, { merge: true }));
      const merged = { ...data, ...patch };
      if (key) leadByPhone.set(key, { id: d.id, data: merged });
      const em = String(merged.email ?? '').toLowerCase();
      if (em) leadByEmail.set(em, { id: d.id, data: merged });
    }
    await Promise.all(writes);

    // ── 3: report recent paid orders to Meta ──────────────────────────────
    const now = Date.now();
    let sentWebsite = 0;
    let sentMessaging = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const o of orders) {
      const od = o.data;
      if (od.metaCapi?.sentAt) continue;
      if (!isPaidOrder(od)) continue;
      const when = getOrderDate(od);
      if (!when || now - when.getTime() > META_WINDOW_MS) continue;

      const key = normalizePhone(od.phone);
      const lead = (key && leadByPhone.get(key)) || leadByEmail.get(String(od.email ?? '').toLowerCase()) || null;
      const ctwa = (lead?.data.ctwaClid as string | undefined) ?? (key ? ctwaByPhone.get(key)?.ctwa : undefined) ?? null;
      const info: ClosedLeadInfo | null = lead
        ? { leadId: lead.id, source: (lead.data.source as CrmSource) ?? null, ctwaClid: ctwa }
        : null;

      const res = await reportOrderToMeta(
        db, o.id,
        {
          orderNumber: od.orderNumber,
          total: getOrderTotal(od),
          email: od.email, phone: od.phone, customerName: od.customerName, city: od.city, uid: od.uid,
          items: od.items, attribution: od.attribution, metaClient: od.metaClient, metaCapi: od.metaCapi,
        },
        info,
        { onlyMessaging: od.source === 'manual', eventTimeMs: when.getTime() },
      );
      if (res.sent) {
        if (res.channel === 'business_messaging') sentMessaging++; else sentWebsite++;
      } else {
        skipped++;
        if (res.error && !['no ctwa_clid', 'already sent'].includes(res.error) && errors.length < 5) {
          errors.push(`${od.orderNumber}: ${res.error}`);
        }
      }
    }

    return NextResponse.json({ ok: true, namesFilled, ctwaLinked, sentMessaging, sentWebsite, skipped, errors });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('[crm-backfill] unhandled:', err.message, err.stack);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
