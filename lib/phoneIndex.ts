// phoneIndex foundation (Phase 1) — a reverse lookup from a canonical E.164
// phone number to the customer-identity documents that belong to it
// (crmLeads doc id, whatsappConversations doc id, etc).
//
// This exists to eventually replace the full-collection scan in
// lib/crm.ts's closeLeadForOrder() with an O(1) lookup, and to let historical
// crmLeads documents (which use inconsistent doc-ID schemes — see the Phase 1
// audit notes) stay reachable by phone without renaming any existing
// document.
//
// Scope note: this module is infrastructure only in Phase 1. Nothing reads
// from it yet (closeLeadForOrder's existing scan-based matching is left
// untouched to avoid changing live CRM-matching behavior mid-phase), and
// only whatsappConversations-driven lead upserts write to it so far. Wiring
// it into other write paths (checkout/payment order creation) and into the
// CRM read path is intentionally deferred to a later, separately-reviewed
// step — see the Phase 1 report for details.

// Minimal structural subset of the Firestore API this module needs — lets a
// lightweight fake stand in for `firebase-admin`'s Firestore in tests,
// mirroring the FirestoreLike pattern already used in lib/crm.ts.
export interface PhoneIndexDocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<unknown>;
}
export interface PhoneIndexFirestoreLike {
  collection(path: string): {
    doc(id: string): PhoneIndexDocRef;
  };
}

const COLLECTION = 'phoneIndex';

export interface PhoneIndexEntry {
  leadId?: string | null;
  conversationId?: string | null;
  customerId?: string | null;
}

/**
 * Merges { leadId?, conversationId?, customerId? } into phoneIndex/{phoneE164}.
 * Additive only — never deletes fields that aren't passed in.
 */
export async function upsertPhoneIndexEntry(
  db: PhoneIndexFirestoreLike,
  phoneE164: string,
  entry: PhoneIndexEntry,
): Promise<void> {
  await db.collection(COLLECTION).doc(phoneE164).set(
    { ...entry, updatedAt: new Date() },
    { merge: true },
  );
}

/** Reads phoneIndex/{phoneE164}, or null if no entry exists yet. */
export async function getPhoneIndexEntry(
  db: PhoneIndexFirestoreLike,
  phoneE164: string,
): Promise<Record<string, unknown> | null> {
  const snap = await db.collection(COLLECTION).doc(phoneE164).get();
  return snap.exists ? (snap.data() ?? null) : null;
}
