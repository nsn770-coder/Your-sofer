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
}

export function sourceFromAttribution(
  attribution: OrderAttribution | null | undefined,
): { source: CrmSource; sourceDetail: string | null } {
  const utmSource = (attribution?.utm_source ?? '').toLowerCase();
  if (attribution?.gclid || utmSource === 'google') {
    return { source: 'google', sourceDetail: attribution?.utm_campaign ?? null };
  }
  if (attribution?.fbclid || ['facebook', 'fb', 'ig'].includes(utmSource)) {
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

interface FirestoreLike {
  collection(path: string): {
    get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown>; ref: { set(data: Record<string, unknown>, opts: { merge: boolean }): Promise<unknown> } }> }>;
    doc(id: string): { set(data: Record<string, unknown>, opts?: { merge: boolean }): Promise<unknown> };
    add(data: Record<string, unknown>): Promise<{ id: string }>;
  };
}

export async function closeLeadForOrder(
  db: FirestoreLike,
  phone: string | null | undefined,
  orderNumber: string,
  attribution?: OrderAttribution | null,
): Promise<void> {
  const norm = normalizePhone(phone);
  if (!norm) return;
  try {
    const snap = await db.collection('crmLeads').get();
    const match = snap.docs.find((d) => normalizePhone((d.data().phone as string | undefined) ?? d.id) === norm);

    const derived = sourceFromAttribution(attribution);
    const now = new Date();

    if (!match) {
      // Lead doesn't exist — create it as a new order customer
      // Use normalized phone as doc ID (like manual entry or seed-script style)
      const newLeadData: Record<string, unknown> = {
        phone: phone,
        name: null,
        source: derived.source,
        sourceDetail: derived.sourceDetail,
        status: 'עסקה נסגרה' as CrmStatus,
        notes: [{ text: `נוצרה הזמנה חדשה: #${orderNumber}`, ts: Date.now() }],
        createdAt: now,
        lastContactAt: now,
      };
      await db.collection('crmLeads').doc(norm).set(newLeadData);
      return;
    }

    // Lead exists — update it
    const existingNotes = (match.data().notes as CrmNote[] | undefined) ?? [];
    const patch: Record<string, unknown> = {
      status: 'עסקה נסגרה' as CrmStatus,
      lastContactAt: now,
      notes: [...existingNotes, { text: `נוצרה הזמנה חדשה: #${orderNumber}`, ts: Date.now() }],
    };

    // Only overwrite source when attribution reveals a paid channel (google/facebook) —
    // never downgrade an already-known source (e.g. whatsapp) to the generic "אתר"
    // fallback just because this particular order carried no UTM/click-id.
    if (derived.source === 'google' || derived.source === 'facebook') {
      patch.source = derived.source;
      patch.sourceDetail = derived.sourceDetail;
    }

    await match.ref.set(patch, { merge: true });
  } catch (err) {
    console.error('[crm] closeLeadForOrder error:', err);
  }
}
