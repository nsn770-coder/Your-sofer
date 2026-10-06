// Canonical E.164 phone normalizer (Phase 1 foundation) — re-exported here so
// existing importers of this module can reach it as `normalizePhoneE164`
// without a new import path. Deliberately NOT replacing the `normalizePhone`
// export below: that function's last-9-digits-suffix behavior is what every
// existing call site (closeLeadForOrder in this file, admin/crm/page.tsx)
// already relies on for matching, and changing its output shape mid-phase
// would change live CRM/order-matching behavior — out of scope here. New
// code should prefer `normalizePhoneE164`.
export { normalizePhone as normalizePhoneE164 } from './phone';

export type CrmStatus = 'חדש' | 'בטיפול' | 'ממתין ללקוח' | 'הצעת מחיר' | 'עסקה נסגרה' | 'לא רלוונטי';
// 'google' and 'facebook' are auto-detected from ad referrals / UTM attribution.
// Existing stored leads with the older 4-value set remain valid — this is purely additive.
export type CrmSource = 'whatsapp' | 'אתר' | 'google' | 'facebook' | 'טלפון' | 'אחר';

export interface CrmNote {
  text: string;
  ts: number;
}

// AI lead scoring — set by handler.ts's scoreConversation() after every bot
// reply, analyzing the whole WhatsApp conversation. Never overwrites status.
export type AiTemp = 'חם' | 'פושר' | 'קר' | 'לא מעוניין';

export interface CrmLead {
  phone: string;
  name?: string | null;
  source: CrmSource;
  sourceDetail?: string | null;
  status: CrmStatus;
  saleStage?: string | null;
  notes?: CrmNote[];
  followUpAt?: number | null;
  assignedTo?: string | null;
  createdAt?: unknown;
  lastContactAt?: unknown;
  aiTemp?: AiTemp | null;
  aiIntent?: string | null;
  needsHuman?: boolean;
  aiUpdatedAt?: unknown;
}

export const CRM_STATUSES: CrmStatus[] = [
  'חדש', 'בטיפול', 'ממתין ללקוח', 'הצעת מחיר', 'עסקה נסגרה', 'לא רלוונטי',
];

export const CRM_SOURCES: CrmSource[] = ['whatsapp', 'אתר', 'google', 'facebook', 'טלפון', 'אחר'];

// Validated categorical palette (dataviz skill, all-pairs CVD-safe) — direct labels
// are shown alongside these on every chart since a few pairs sit in the CVD-warn band.
export const CRM_STATUS_COLORS: Record<CrmStatus, string> = {
  'חדש': '#2a78d6',
  'בטיפול': '#eda100',
  'ממתין ללקוח': '#4a3aa7',
  'הצעת מחיר': '#1baf7a',
  'עסקה נסגרה': '#008300',
  'לא רלוונטי': '#e34948',
};

// Re-validated all-pairs for the 6-source set (node scripts/validate_palette.js — ALL CHECKS PASS).
export const CRM_SOURCE_COLORS: Record<CrmSource, string> = {
  whatsapp: '#1baf7a',
  'אתר': '#2a78d6',
  google: '#e34948',
  facebook: '#4a3aa7',
  'טלפון': '#eda100',
  'אחר': '#008300',
};

export const AI_TEMPS: AiTemp[] = ['חם', 'פושר', 'קר', 'לא מעוניין'];

// Explicit temperature/urgency scale (not a categorical identity palette) —
// red/orange/gray/black per spec, matching the universal hot→cold convention.
export const AI_TEMP_COLORS: Record<AiTemp, string> = {
  'חם': '#dc2626',
  'פושר': '#f97316',
  'קר': '#6b7280',
  'לא מעוניין': '#111827',
};

// Normalizes a phone number for cross-format matching (WhatsApp E.164-ish digits
// vs. local Israeli formats entered at checkout) by comparing the last 9 digits.
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.slice(-9);
}

// ── UTM / click-id attribution (captured client-side, first-touch, see
// lib/attribution.ts) — attached to an order at checkout and used here to
// classify which paid channel actually drove the sale.

export interface OrderAttribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  // Meta browser ids (_fbp / _fbc cookies) — read at checkout, used by
  // lib/metaCapi.ts to match the server Purchase to the ad click.
  fbp?: string | null;
  fbc?: string | null;
}

export function sourceFromAttribution(
  attribution: OrderAttribution | null | undefined,
): { source: CrmSource; sourceDetail: string | null } {
  const utmSource = (attribution?.utm_source ?? '').toLowerCase();
  if (attribution?.gclid || utmSource === 'google') {
    return { source: 'google', sourceDetail: attribution?.utm_campaign ?? null };
  }
  if (attribution?.fbclid || attribution?.fbc || ['facebook', 'fb', 'ig'].includes(utmSource)) {
    return { source: 'facebook', sourceDetail: attribution?.utm_campaign ?? null };
  }
  return { source: 'אתר', sourceDetail: attribution?.utm_campaign ?? null };
}

// ── Checkout hook: auto-close a lead when its phone number places an order ────
// Scans crmLeads and matches by normalized phone rather than doc ID, since doc
// IDs vary by how the lead was created (WhatsApp senderId, seed-script phone,
// manual entry). A full collection read is fine at this collection's size —
// switch to a `where('phoneNormalized', ...)` query if it grows into the
// thousands.

interface FirestoreDocRefLike {
  set(data: Record<string, unknown>, opts?: { merge: boolean }): Promise<unknown>;
  get?(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
}

interface FirestoreLike {
  collection(path: string): {
    get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown>; ref: { set(data: Record<string, unknown>, opts: { merge: boolean }): Promise<unknown> } }> }>;
    doc(id: string): FirestoreDocRefLike;
    add(data: Record<string, unknown>): Promise<{ id: string }>;
  };
}

/** Buyer details from the order — fills the lead's name/email instead of "—". */
export interface OrderCustomer {
  name?: string | null;
  email?: string | null;
  total?: number | null;
}

/** What the order flow needs back to report the sale to Meta. */
export interface ClosedLeadInfo {
  leadId: string;
  source: CrmSource | null;
  ctwaClid: string | null;
}

function cleanName(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  return n ? n : null;
}

// Falls back to whatsappConversations/{id}.referral.ctwa_clid — the webhook has
// stored the raw referral there since day one, so leads created before the
// lead doc itself kept ctwaClid can still be credited to their ad.
async function resolveCtwaClid(
  db: FirestoreLike,
  leadId: string,
  leadData: Record<string, unknown>,
): Promise<string | null> {
  const direct = leadData.ctwaClid as string | undefined;
  if (direct) return direct;
  try {
    const convRef = db.collection('whatsappConversations').doc(leadId);
    if (!convRef.get) return null;
    const conv = await convRef.get();
    const ref = conv.exists ? (conv.data()?.referral as { ctwa_clid?: string } | undefined) : undefined;
    return ref?.ctwa_clid ?? null;
  } catch {
    return null;
  }
}

export async function closeLeadForOrder(
  db: FirestoreLike,
  phone: string | null | undefined,
  orderNumber: string,
  attribution?: OrderAttribution | null,
  customer?: OrderCustomer | null,
): Promise<ClosedLeadInfo | null> {
  const norm = normalizePhone(phone);
  const email = (customer?.email ?? '').trim().toLowerCase() || null;
  const name = cleanName(customer?.name);
  if (!norm && !email) return null;
  try {
    const snap = await db.collection('crmLeads').get();
    // Phone first (the WhatsApp identity); email as a fallback for buyers who
    // typed a different phone at checkout than the one they chatted from.
    const match =
      (norm && snap.docs.find((d) => normalizePhone((d.data().phone as string | undefined) ?? d.id) === norm)) ||
      (email && snap.docs.find((d) => ((d.data().email as string | undefined) ?? '').toLowerCase() === email)) ||
      undefined;

    const derived = sourceFromAttribution(attribution);
    const now = new Date();
    const orderTotal = Number(customer?.total) || 0;
    const note = { text: `נוצרה הזמנה חדשה: #${orderNumber}${orderTotal ? ` (₪${Math.round(orderTotal)})` : ''}`, ts: Date.now() };

    if (!match) {
      if (!norm) return null;
      // Lead doesn't exist — create it as a new order customer
      // Use normalized phone as doc ID (like manual entry or seed-script style)
      const newLeadData: Record<string, unknown> = {
        phone: phone,
        name,
        email,
        source: derived.source,
        sourceDetail: derived.sourceDetail,
        status: 'עסקה נסגרה' as CrmStatus,
        notes: [note],
        ordersCount: 1,
        totalSpent: orderTotal,
        lastOrderNumber: orderNumber,
        purchasedAt: now,
        createdAt: now,
        lastContactAt: now,
      };
      await db.collection('crmLeads').doc(norm).set(newLeadData);
      return { leadId: norm, source: derived.source, ctwaClid: null };
    }

    // Lead exists — update it
    const data = match.data();
    const existingNotes = (data.notes as CrmNote[] | undefined) ?? [];
    const patch: Record<string, unknown> = {
      status: 'עסקה נסגרה' as CrmStatus,
      lastContactAt: now,
      notes: [...existingNotes, note],
      ordersCount: (Number(data.ordersCount) || 0) + 1,
      totalSpent: (Number(data.totalSpent) || 0) + orderTotal,
      lastOrderNumber: orderNumber,
      purchasedAt: now,
    };
    if (name && !cleanName(data.name as string | null | undefined)) patch.name = name;
    if (email && !data.email) patch.email = email;

    // Only overwrite source when attribution reveals a paid channel (google/facebook) —
    // never downgrade an already-known source (e.g. whatsapp) to the generic "אתר"
    // fallback just because this particular order carried no UTM/click-id.
    // A lead that came from a Facebook ad keeps 'facebook' (that's who sold it).
    if ((derived.source === 'google' || derived.source === 'facebook') && data.source !== 'facebook') {
      patch.source = derived.source;
      patch.sourceDetail = derived.sourceDetail;
    }

    await match.ref.set(patch, { merge: true });
    const ctwaClid = await resolveCtwaClid(db, match.id, data);
    return { leadId: match.id, source: (patch.source as CrmSource | undefined) ?? (data.source as CrmSource) ?? null, ctwaClid };
  } catch (err) {
    console.error('[crm] closeLeadForOrder error:', err);
    return null;
  }
}
