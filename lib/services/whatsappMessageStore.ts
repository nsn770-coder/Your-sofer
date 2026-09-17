// Phase 1 message storage foundation.
//
// Writes to whatsappConversations/{conversationId}/messages/{messageId} —
// ADDITIVE ONLY. The existing whatsappConversations/{phone}.messages[] array
// remains the sole authoritative store for every current read path (the
// admin chat viewer, the follow-up cron, scoreConversation's Claude context).
// Nothing in this file replaces or reads from that array; callers keep
// writing to it exactly as before, alongside a new call into this service.
//
// Doc ID strategy:
//   - Inbound messages and coexistence echoes: doc ID = wamid (known at
//     receipt time). A second identical webhook delivery for the same wamid
//     is naturally a no-op (see the `already exists` early-return below).
//   - Outbound messages we initiate: doc ID = a Firestore auto-ID, created
//     up front in `pending` status before Meta has assigned a wamid. Once
//     the send call returns a wamid (Phase 1 Step 3), it's attached as a
//     FIELD on the same doc (never used to rename it), and a pointer doc is
//     written to `whatsappProcessed/{wamid}` so a later status webhook —
//     which only ever carries a wamid, never our internal doc ID — can find
//     its way back to the right message. whatsappProcessed already exists
//     for inbound-dedup; this reuses it rather than adding a new collection.

export type MessageDirection = 'inbound' | 'outbound';
export type MessageSenderType = 'CUSTOMER' | 'BOT' | 'AGENT' | 'SYSTEM';
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'interactive' | 'system';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsappMessageMedia {
  url?: string;
  mimeType?: string;
  caption?: string;
}

// ── Minimal Firestore surface this module needs ─────────────────────────────
// Structural subset of firebase-admin's Firestore API (same FirestoreLike
// pattern already used in lib/crm.ts) so production code can pass the real
// Admin SDK instance while tests pass a lightweight in-memory fake — no
// mocking library required.

export interface DocSnapshotLike {
  exists: boolean;
  id: string;
  data(): Record<string, unknown> | undefined;
}
export interface DocRefLike {
  id: string;
  get(): Promise<DocSnapshotLike>;
  set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<unknown>;
  update(data: Record<string, unknown>): Promise<unknown>;
  collection(path: string): CollectionRefLike;
}
export interface CollectionRefLike {
  doc(id?: string): DocRefLike;
}
export interface MessageStoreFirestoreLike {
  collection(path: string): CollectionRefLike;
}

const CONVERSATIONS = 'whatsappConversations';
const MESSAGES = 'messages';
const PROCESSED = 'whatsappProcessed';

function messagesCollection(db: MessageStoreFirestoreLike, conversationId: string): CollectionRefLike {
  return db.collection(CONVERSATIONS).doc(conversationId).collection(MESSAGES);
}

// ── Inbound ──────────────────────────────────────────────────────────────────

export interface RecordInboundMessageInput {
  conversationId: string;
  wamid: string;
  senderType?: MessageSenderType; // defaults to CUSTOMER
  type?: MessageType;
  text?: string | null;
  media?: WhatsappMessageMedia | null;
  replyToMessageId?: string | null;
  metaTimestamp?: number | null;
}

/**
 * Records an inbound customer message. Doc ID = wamid, so a duplicate Meta
 * webhook delivery for the same message is a safe no-op rather than a
 * duplicate write — mirrors the existing whatsappProcessed dedup check one
 * layer down, at the storage layer itself.
 */
export async function recordInboundMessage(
  db: MessageStoreFirestoreLike,
  input: RecordInboundMessageInput,
): Promise<{ created: boolean; messageId: string }> {
  const msgRef = messagesCollection(db, input.conversationId).doc(input.wamid);
  const existing = await msgRef.get();
  if (existing.exists) {
    return { created: false, messageId: input.wamid };
  }

  await msgRef.set({
    id: input.wamid,
    wamid: input.wamid,
    conversationId: input.conversationId,
    direction: 'inbound' as MessageDirection,
    senderType: input.senderType ?? 'CUSTOMER',
    senderAgentId: null,
    type: input.type ?? 'text',
    text: input.text ?? null,
    media: input.media ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    // Inbound messages have no delivery/read lifecycle of their own (Meta
    // only sends status webhooks for messages WE sent) — status stays null.
    status: null,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date(),
    metaTimestamp: input.metaTimestamp ?? null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
  });

  return { created: true, messageId: input.wamid };
}

// ── Coexistence echo (owner replied from the WhatsApp Business App) ────────

export interface RecordEchoedOutboundMessageInput {
  conversationId: string;
  wamid: string;
  type?: MessageType;
  text?: string | null;
  metaTimestamp?: number | null;
}

/**
 * Records a message the owner sent from the official WhatsApp Business App
 * (echoed back to us by Meta). Already sent by the time we hear about it, so
 * it's stored directly in `sent` status — no pending phase.
 */
export async function recordEchoedOutboundMessage(
  db: MessageStoreFirestoreLike,
  input: RecordEchoedOutboundMessageInput,
): Promise<{ created: boolean; messageId: string }> {
  const msgRef = messagesCollection(db, input.conversationId).doc(input.wamid);
  const existing = await msgRef.get();
  if (existing.exists) {
    return { created: false, messageId: input.wamid };
  }

  await msgRef.set({
    id: input.wamid,
    wamid: input.wamid,
    conversationId: input.conversationId,
    direction: 'outbound' as MessageDirection,
    senderType: 'AGENT' as MessageSenderType,
    senderAgentId: null,
    type: input.type ?? 'text',
    text: input.text ?? null,
    media: null,
    replyToMessageId: null,
    status: 'sent' as MessageStatus,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date(),
    metaTimestamp: input.metaTimestamp ?? null,
    sentAt: new Date(),
    deliveredAt: null,
    readAt: null,
    failedAt: null,
  });

  // Register the pointer too, so a later delivered/read status event for
  // this echoed message can still resolve back to it (Step 4).
  await db.collection(PROCESSED).doc(input.wamid).set(
    { direction: 'outbound', conversationId: input.conversationId, messageId: input.wamid, registeredAt: new Date() },
    { merge: true },
  );

  return { created: true, messageId: input.wamid };
}

// ── Outbound (bot / agent / system sends we initiate) ───────────────────────

export interface RecordOutboundMessagePendingInput {
  conversationId: string;
  senderType: MessageSenderType; // BOT | AGENT | SYSTEM
  senderAgentId?: string | null;
  type?: MessageType;
  text?: string | null;
  media?: WhatsappMessageMedia | null;
  replyToMessageId?: string | null;
}

/**
 * Creates the message doc BEFORE the actual WhatsApp send call, in `pending`
 * status, with an auto-generated ID (no wamid exists yet). Call
 * markOutboundMessageSent/Failed once the send call resolves.
 */
export async function recordOutboundMessagePending(
  db: MessageStoreFirestoreLike,
  input: RecordOutboundMessagePendingInput,
): Promise<{ messageId: string }> {
  const msgRef = messagesCollection(db, input.conversationId).doc();

  await msgRef.set({
    id: msgRef.id,
    wamid: null,
    conversationId: input.conversationId,
    direction: 'outbound' as MessageDirection,
    senderType: input.senderType,
    senderAgentId: input.senderAgentId ?? null,
    type: input.type ?? 'text',
    text: input.text ?? null,
    media: input.media ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    status: 'pending' as MessageStatus,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date(),
    metaTimestamp: null,
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
  });

  return { messageId: msgRef.id };
}

/**
 * Transitions a pending outbound message to `sent` once Meta/360dialog
 * confirms the send and returns a wamid, and registers the wamid -> message
 * pointer so a later status webhook can find it.
 */
export async function markOutboundMessageSent(
  db: MessageStoreFirestoreLike,
  conversationId: string,
  messageId: string,
  wamid: string,
): Promise<void> {
  const msgRef = messagesCollection(db, conversationId).doc(messageId);
  await msgRef.update({ wamid, status: 'sent' as MessageStatus, sentAt: new Date() });

  await db.collection(PROCESSED).doc(wamid).set(
    { direction: 'outbound', conversationId, messageId, registeredAt: new Date() },
    { merge: true },
  );
}

/** Marks a pending (or otherwise not-yet-successful) outbound message as failed. */
export async function markOutboundMessageFailed(
  db: MessageStoreFirestoreLike,
  conversationId: string,
  messageId: string,
  errorCode: string | null,
  errorMessage: string | null,
): Promise<void> {
  const msgRef = messagesCollection(db, conversationId).doc(messageId);
  await msgRef.update({
    status: 'failed' as MessageStatus,
    failedAt: new Date(),
    errorCode,
    errorMessage,
  });
}

// ── Status webhooks (Phase 1 Step 4) ────────────────────────────────────────
// Meta's status webhooks only ever carry a wamid, never our internal message
// doc ID — so every status event is resolved via the whatsappProcessed
// pointer registered by markOutboundMessageSent/recordEchoedOutboundMessage.

const STATUS_RANK: Record<'sent' | 'delivered' | 'read', number> = {
  sent: 1,
  delivered: 2,
  read: 3,
};

export type InboundStatusEvent = 'sent' | 'delivered' | 'read' | 'failed';

export type ApplyStatusEventReason =
  | 'unknown_wamid'
  | 'malformed_pointer'
  | 'message_not_found'
  | 'not_monotonic'
  | 'stale_failed_after_success'
  | 'failed_recorded'
  | 'updated_to_sent'
  | 'updated_to_delivered'
  | 'updated_to_read';

export interface ApplyStatusEventResult {
  applied: boolean;
  reason: ApplyStatusEventReason;
}

/**
 * Applies a single Meta status webhook event (sent/delivered/read/failed)
 * for the given wamid, enforcing monotonic status ordering:
 * pending < sent < delivered < read. A status event that would move the
 * stored status backward (e.g. a late "delivered" arriving after "read" was
 * already recorded) is recognized and ignored rather than applied — this
 * also makes a duplicate/retried webhook for the same status a safe no-op.
 *
 * Never throws on an unknown/unresolvable wamid — the webhook route must be
 * able to call this for every status event Meta sends without risking the
 * request handler itself.
 */
export async function applyInboundStatusEvent(
  db: MessageStoreFirestoreLike,
  wamid: string,
  status: InboundStatusEvent,
  opts: { errorCode?: string | null; errorMessage?: string | null } = {},
): Promise<ApplyStatusEventResult> {
  const pointerSnap = await db.collection(PROCESSED).doc(wamid).get();
  if (!pointerSnap.exists) {
    return { applied: false, reason: 'unknown_wamid' };
  }

  const pointer = pointerSnap.data() ?? {};
  const conversationId = pointer.conversationId as string | undefined;
  const messageId = pointer.messageId as string | undefined;
  if (!conversationId || !messageId) {
    return { applied: false, reason: 'malformed_pointer' };
  }

  const msgRef = messagesCollection(db, conversationId).doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    return { applied: false, reason: 'message_not_found' };
  }

  const current = msgSnap.data() ?? {};
  const currentStatus = (current.status as string | null) ?? 'pending';

  if (status === 'failed') {
    // A failure notification arriving after the message was already
    // confirmed delivered/read is treated as stale — never regress a
    // successful terminal-ish state back to failed.
    if (currentStatus === 'delivered' || currentStatus === 'read') {
      return { applied: false, reason: 'stale_failed_after_success' };
    }
    await msgRef.update({
      status: 'failed' as MessageStatus,
      failedAt: new Date(),
      errorCode: opts.errorCode ?? null,
      errorMessage: opts.errorMessage ?? null,
    });
    return { applied: true, reason: 'failed_recorded' };
  }

  const newRank = STATUS_RANK[status];
  const currentRank = STATUS_RANK[currentStatus as 'sent' | 'delivered' | 'read'] ?? 0; // pending/failed/unknown => 0
  if (newRank <= currentRank) {
    return { applied: false, reason: 'not_monotonic' };
  }

  const timestampField = status === 'sent' ? 'sentAt' : status === 'delivered' ? 'deliveredAt' : 'readAt';
  await msgRef.update({ status, [timestampField]: new Date() });
  return { applied: true, reason: `updated_to_${status}` as ApplyStatusEventReason };
}
