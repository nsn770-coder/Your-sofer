// Firestore-backed fixed-window rate limiter (works across serverless
// instances, unlike the in-memory app/lib/rate-limit.ts). Keyed by uid.

import type { DbLike } from './db';
import { COL } from './db';
import { HttpError } from './auth.server';

export const RATE_LIMITS = {
  generate:  { max: 8,  windowMs: 10 * 60_000 },
  chat:      { max: 20, windowMs: 10 * 60_000 },
  mockup:    { max: 30, windowMs: 10 * 60_000 },
  aiMockup:  { max: 6,  windowMs: 10 * 60_000 },
  upload:    { max: 10, windowMs: 10 * 60_000 },
  redeem:    { max: 5,  windowMs: 15 * 60_000 },
  redeemFail:{ max: 10, windowMs: 24 * 60 * 60_000 },
  create:    { max: 20, windowMs: 60 * 60_000 },
} as const;
export type RateKind = keyof typeof RATE_LIMITS;

/** Consumes one unit; throws 429 when the window is full. */
export async function consumeRate(db: DbLike, kind: RateKind, uid: string, now = Date.now()): Promise<void> {
  const { max, windowMs } = RATE_LIMITS[kind];
  const ref = db.doc(`${COL.rate}/${kind}__${uid}`);
  const ok = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data()! : null;
    if (!d || now - (d.windowStart as number) >= windowMs) {
      tx.set(ref, { count: 1, windowStart: now, kind, uid });
      return true;
    }
    if ((d.count as number) >= max) return false;
    tx.update(ref, { count: (d.count as number) + 1 });
    return true;
  });
  if (!ok) throw new HttpError(429, 'rate_limited', 'בוצעו יותר מדי בקשות בזמן קצר. נסו שוב בעוד כמה דקות.');
}

/** Read-only check (used for the failed-code lockout before doing work). */
export async function isRateBlocked(db: DbLike, kind: RateKind, uid: string, now = Date.now()): Promise<boolean> {
  const { max, windowMs } = RATE_LIMITS[kind];
  const ref = db.doc(`${COL.rate}/${kind}__${uid}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data()! : null;
    return !!d && now - (d.windowStart as number) < windowMs && (d.count as number) >= max;
  });
}
