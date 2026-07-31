export type CrmStatus = 'חדש' | 'בטיפול' | 'ממתין ללקוח' | 'הצעת מחיר' | 'עסקה נסגרה' | 'לא רלוונטי';
export type CrmSource = 'whatsapp' | 'אתר' | 'טלפון' | 'אחר';

export interface CrmNote {
  text: string;
  ts: number;
}

export interface CrmLead {
  phone: string;
  name?: string | null;
  source: CrmSource;
  status: CrmStatus;
  saleStage?: string | null;
  notes?: CrmNote[];
  followUpAt?: number | null;
  assignedTo?: string | null;
  createdAt?: unknown;
  lastContactAt?: unknown;
}

export const CRM_STATUSES: CrmStatus[] = [
  'חדש', 'בטיפול', 'ממתין ללקוח', 'הצעת מחיר', 'עסקה נסגרה', 'לא רלוונטי',
];

export const CRM_SOURCES: CrmSource[] = ['whatsapp', 'אתר', 'טלפון', 'אחר'];

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

export const CRM_SOURCE_COLORS: Record<CrmSource, string> = {
  whatsapp: '#1baf7a',
  'אתר': '#2a78d6',
  'טלפון': '#eb6834',
  'אחר': '#4a3aa7',
};

// Normalizes a phone number for cross-format matching (WhatsApp E.164-ish digits
// vs. local Israeli formats entered at checkout) by comparing the last 9 digits.
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.slice(-9);
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
  };
}

export async function closeLeadForOrder(
  db: FirestoreLike,
  phone: string | null | undefined,
  orderNumber: string,
): Promise<void> {
  const norm = normalizePhone(phone);
  if (!norm) return;
  try {
    const snap = await db.collection('crmLeads').get();
    const match = snap.docs.find((d) => normalizePhone((d.data().phone as string | undefined) ?? d.id) === norm);
    if (!match) return;

    const existingNotes = (match.data().notes as CrmNote[] | undefined) ?? [];
    await match.ref.set(
      {
        status: 'עסקה נסגרה' as CrmStatus,
        lastContactAt: new Date(),
        notes: [...existingNotes, { text: `נוצרה הזמנה חדשה: #${orderNumber}`, ts: Date.now() }],
      },
      { merge: true },
    );
  } catch (err) {
    console.error('[crm] closeLeadForOrder error:', err);
  }
}
