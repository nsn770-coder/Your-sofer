/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore document data / Gemini JSON are untyped at this boundary and validated field by field */
// Attempt quota — enforced on the server with atomic Firestore transactions.
//
// Definition of an attempt (as specified):
//   • a new logo or a revision that creates a new logo version → 1 attempt
//   • one AI mockup per logo version is included (0 attempts)
//   • an additional AI mockup for the same version → 1 attempt (client warns first)
//   • viewing / downloading / selecting a version / chat without generation → 0
//   • composite (non-AI) mockups, position/size changes → 0
//   • a failed request → refunded
//
// Flow per chargeable operation:
//   reserveAttempt()  — in one transaction: idempotency check on (uid, opId),
//                       single-flight lock per customer, balance check, and a
//                       reservation that already lowers the visible balance.
//   …provider call…
//   commitAttempt()   — reservation → used (+ ledger)      on success
//   releaseAttempt()  — reservation removed (= refund)     on failure
// Stale reservations (crashed function) expire after RESERVATION_TTL_MS and are
// dropped by the next transaction, so a crash can never eat an attempt.

import type { DbLike, TxLike } from './db';
import { COL } from './db';
import { HttpError } from './auth.server';

export const DEFAULT_FREE_ATTEMPTS = 3;
export const RESERVATION_TTL_MS = 4 * 60_000;

export type OpKind = 'generate' | 'ai_mockup';
export interface Reservation { at: number; kind: OpKind; amount: 0 | 1; projectId: string }

export interface QuotaDoc {
  freeGranted: number;
  bonusGranted: number;
  used: number;
  reservations: Record<string, Reservation>;
  createdAt: number;
  updatedAt: number;
}

export interface QuotaView {
  freeGranted: number;
  bonusGranted: number;
  used: number;
  pending: number;
  remaining: number;
}

export function activeReservations(q: Pick<QuotaDoc, 'reservations'>, now: number): Record<string, Reservation> {
  const out: Record<string, Reservation> = {};
  for (const [k, r] of Object.entries(q.reservations || {})) if (now - r.at < RESERVATION_TTL_MS) out[k] = r;
  return out;
}

export function quotaView(q: QuotaDoc | null, now: number, freeDefault = DEFAULT_FREE_ATTEMPTS): QuotaView {
  const d = q ?? { freeGranted: freeDefault, bonusGranted: 0, used: 0, reservations: {}, createdAt: now, updatedAt: now };
  const pending = Object.values(activeReservations(d, now)).reduce((s, r) => s + r.amount, 0);
  const remaining = Math.max(0, d.freeGranted + d.bonusGranted - d.used - pending);
  return { freeGranted: d.freeGranted, bonusGranted: d.bonusGranted, used: d.used, pending, remaining };
}

export const userRef = (db: DbLike, uid: string) => db.doc(`${COL.users}/${uid}`);
export const opRef = (db: DbLike, uid: string, opId: string) => db.doc(`${COL.ops}/${uid}__${opId}`);

export async function readQuota(tx: TxLike, db: DbLike, uid: string, now: number, freeDefault: number): Promise<QuotaDoc> {
  const snap = await tx.get(userRef(db, uid));
  if (snap.exists) {
    const d = snap.data()!;
    return {
      freeGranted: typeof d.freeGranted === 'number' ? d.freeGranted : freeDefault,
      bonusGranted: d.bonusGranted ?? 0,
      used: d.used ?? 0,
      reservations: d.reservations ?? {},
      createdAt: d.createdAt ?? now,
      updatedAt: d.updatedAt ?? now,
    };
  }
  return { freeGranted: freeDefault, bonusGranted: 0, used: 0, reservations: {}, createdAt: now, updatedAt: now };
}

export const QUOTA_EXHAUSTED_MESSAGE = 'ניצלת את 3 ניסיונות העיצוב בחינם. להמשך יצירה, הזן קוד שקיבלת מאיתנו.';

export type ReserveResult =
  | { status: 'reserved'; view: QuotaView }
  | { status: 'duplicate'; op: Record<string, any> };

export async function reserveAttempt(
  db: DbLike,
  p: { uid: string; opId: string; kind: OpKind; projectId: string; charge: boolean; now?: number; freeDefault?: number; meta?: Record<string, unknown> },
): Promise<ReserveResult> {
  const now = p.now ?? Date.now();
  const freeDefault = p.freeDefault ?? DEFAULT_FREE_ATTEMPTS;
  return db.runTransaction(async tx => {
    const oRef = opRef(db, p.uid, p.opId);
    const opSnap = await tx.get(oRef);
    const q = await readQuota(tx, db, p.uid, now, freeDefault);

    if (opSnap.exists) {
      const op = opSnap.data()!;
      const stale = op.status === 'reserved' && now - (op.createdAt as number) >= RESERVATION_TTL_MS;
      if (!stale) return { status: 'duplicate', op } as ReserveResult;
    }

    const active = activeReservations(q, now);
    // single flight per customer: blocks several windows / double clicks with new ids
    if (Object.keys(active).length > 0) {
      throw new HttpError(409, 'busy', 'יצירה אחרת עדיין בתהליך. המתינו לסיומה ונסו שוב.');
    }
    const amount: 0 | 1 = p.charge ? 1 : 0;
    const view = quotaView({ ...q, reservations: active }, now, freeDefault);
    if (amount > 0 && view.remaining < 1) {
      throw new HttpError(402, 'quota_exhausted', QUOTA_EXHAUSTED_MESSAGE, { quota: view });
    }
    const reservations = { ...active, [p.opId]: { at: now, kind: p.kind, amount, projectId: p.projectId } };
    tx.set(userRef(db, p.uid), { ...q, reservations, updatedAt: now });
    tx.set(oRef, {
      uid: p.uid, opId: p.opId, kind: p.kind, projectId: p.projectId, charged: amount === 1,
      status: 'reserved', createdAt: now, updatedAt: now, ...(p.meta ? { meta: p.meta } : {}),
    });
    return { status: 'reserved', view: quotaView({ ...q, reservations }, now, freeDefault) } as ReserveResult;
  });
}

export async function commitAttempt(
  db: DbLike,
  p: { uid: string; opId: string; result: Record<string, unknown>; now?: number; freeDefault?: number },
): Promise<QuotaView> {
  const now = p.now ?? Date.now();
  const freeDefault = p.freeDefault ?? DEFAULT_FREE_ATTEMPTS;
  return db.runTransaction(async tx => {
    const oRef = opRef(db, p.uid, p.opId);
    const opSnap = await tx.get(oRef);
    const q = await readQuota(tx, db, p.uid, now, freeDefault);
    const op = opSnap.exists ? opSnap.data()! : null;
    if (!op || op.status !== 'reserved') return quotaView(q, now, freeDefault); // already finalised
    // Charge from the op record (not the reservation): even if the reservation
    // expired meanwhile, a delivered result is charged exactly once.
    const amount = op.charged ? 1 : 0;
    const reservations = { ...q.reservations };
    delete reservations[p.opId];
    const next = { ...q, used: q.used + amount, reservations, updatedAt: now };
    tx.set(userRef(db, p.uid), next);
    tx.update(oRef, { status: 'succeeded', result: p.result, updatedAt: now });
    if (amount) {
      tx.create(db.doc(`${COL.users}/${p.uid}/ledger/${p.opId}`), { type: 'consume', amount: -1, opId: p.opId, kind: op.kind, projectId: op.projectId, at: now });
    }
    return quotaView(next, now, freeDefault);
  });
}

export async function releaseAttempt(
  db: DbLike,
  p: { uid: string; opId: string; error: string; now?: number; freeDefault?: number },
): Promise<QuotaView> {
  const now = p.now ?? Date.now();
  const freeDefault = p.freeDefault ?? DEFAULT_FREE_ATTEMPTS;
  return db.runTransaction(async tx => {
    const oRef = opRef(db, p.uid, p.opId);
    const opSnap = await tx.get(oRef);
    const q = await readQuota(tx, db, p.uid, now, freeDefault);
    const reservations = { ...q.reservations };
    delete reservations[p.opId];
    const next = { ...q, reservations, updatedAt: now };
    tx.set(userRef(db, p.uid), next);
    if (opSnap.exists && opSnap.data()!.status === 'reserved') {
      tx.update(oRef, { status: 'failed', error: p.error.slice(0, 120), updatedAt: now });
    }
    return quotaView(next, now, freeDefault);
  });
}

export async function getQuotaView(db: DbLike, uid: string, freeDefault = DEFAULT_FREE_ATTEMPTS, now = Date.now()): Promise<QuotaView> {
  return db.runTransaction(async tx => quotaView(await readQuota(tx, db, uid, now, freeDefault), now, freeDefault));
}
