// Continuation codes — grant extra design attempts.
//
// Storage: the code itself is NEVER stored. The document id is
//   HMAC-SHA256(LOGO_STUDIO_CODE_SECRET, normalised code)
// so neither the database nor logs reveal usable codes; lookup is still O(1).
// Only a short hint (first 2 chars + length) is stored for the admin list.
// Validation happens only on the server, inside one transaction:
//   exists · not disabled · not expired · allowed for this customer ·
//   not already redeemed by this customer · redemptions < max
// → creates codes/{hash}/redemptions/{uid} (prevents a second redemption),
//   increments redemptionCount and adds attempts to the customer's balance.
// Redemption ADDS to the existing balance; history is never reset.

import crypto from 'node:crypto';
import type { DbLike } from './db';
import { COL } from './db';
import { HttpError } from './auth.server';
import { readQuota, quotaView, userRef, DEFAULT_FREE_ATTEMPTS, type QuotaView } from './quota.server';

export const CODE_DEFAULTS = { attempts: 3, maxRedemptions: 1 } as const;
export const CODE_LIMITS = { minLen: 4, maxLen: 32, maxAttempts: 50, maxRedemptions: 10_000 } as const;

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

export function normalizeCode(raw: string): string {
  return raw.normalize('NFKC').toUpperCase().replace(/[\s\-_]/g, '');
}

export function isValidCodeFormat(norm: string): boolean {
  return norm.length >= CODE_LIMITS.minLen && norm.length <= CODE_LIMITS.maxLen && /^[A-Z0-9א-ת]+$/.test(norm);
}

export function randomCode(groups = 2, groupLen = 5): string {
  const bytes = crypto.randomBytes(groups * groupLen);
  const chars = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]);
  const out: string[] = [];
  for (let g = 0; g < groups; g++) out.push(chars.slice(g * groupLen, (g + 1) * groupLen).join(''));
  return out.join('-');
}

let warnedFallback = false;
function codeSecret(): string {
  const s = process.env.LOGO_STUDIO_CODE_SECRET;
  if (s && s.length >= 16) return s;
  // Fallback: derive from the Firebase private key (server-only secret) so the
  // feature works before the env var is added. Rotating that key would
  // invalidate existing codes — set LOGO_STUDIO_CODE_SECRET to avoid this.
  const fk = process.env.FIREBASE_PRIVATE_KEY;
  if (!fk) throw new Error('LOGO_STUDIO_CODE_SECRET is not configured');
  if (!warnedFallback) { console.warn('[logo-studio] LOGO_STUDIO_CODE_SECRET missing — using derived secret'); warnedFallback = true; }
  return crypto.createHash('sha256').update(`logo-studio-codes:${fk}`).digest('hex');
}

export function hashCode(norm: string, secret = codeSecret()): string {
  return crypto.createHmac('sha256', secret).update(norm).digest('hex');
}

export function codeHint(norm: string): string {
  return `${norm.slice(0, 2)}…(${norm.length})`;
}

export interface CodeDoc {
  hint: string;
  attempts: number;
  maxRedemptions: number;
  redemptionCount: number;
  totalAttemptsGranted: number;
  allowedEmails: string[];   // empty = any customer
  expiresAt: number | null;  // ms
  disabled: boolean;
  note: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
}

export type RedeemFailure = 'not_found' | 'disabled' | 'expired' | 'exhausted' | 'not_allowed' | 'already_redeemed';

const FAILURE_MESSAGES: Record<RedeemFailure, string> = {
  not_found: 'הקוד שהוזן אינו תקין.',
  disabled: 'הקוד אינו פעיל.',
  expired: 'תוקף הקוד הסתיים.',
  exhausted: 'הקוד כבר נוצל.',
  not_allowed: 'הקוד אינו מיועד לחשבון זה.',
  already_redeemed: 'כבר מימשת את הקוד הזה.',
};

export class RedeemError extends HttpError {
  constructor(public readonly reason: RedeemFailure) {
    super(400, `code_${reason}`, FAILURE_MESSAGES[reason]);
  }
}

export async function redeemCode(
  db: DbLike,
  p: { uid: string; email: string | null; emailVerified: boolean; rawCode: string; now?: number; freeDefault?: number; secret?: string },
): Promise<{ granted: number; quota: QuotaView }> {
  const now = p.now ?? Date.now();
  const freeDefault = p.freeDefault ?? DEFAULT_FREE_ATTEMPTS;
  const norm = normalizeCode(p.rawCode);
  if (!isValidCodeFormat(norm)) throw new RedeemError('not_found');
  const id = hashCode(norm, p.secret);
  const codeRef = db.doc(`${COL.codes}/${id}`);
  const redRef = db.doc(`${COL.codes}/${id}/redemptions/${p.uid}`);

  return db.runTransaction(async tx => {
    const [cSnap, rSnap] = [await tx.get(codeRef), await tx.get(redRef)];
    const q = await readQuota(tx, db, p.uid, now, freeDefault);
    if (!cSnap.exists) throw new RedeemError('not_found');
    const c = cSnap.data() as CodeDoc;
    if (c.disabled) throw new RedeemError('disabled');
    if (c.expiresAt && now >= c.expiresAt) throw new RedeemError('expired');
    if (rSnap.exists) throw new RedeemError('already_redeemed');
    if (c.allowedEmails?.length) {
      const email = p.emailVerified ? p.email : null;
      if (!email || !c.allowedEmails.includes(email)) throw new RedeemError('not_allowed');
    }
    if (c.redemptionCount >= c.maxRedemptions) throw new RedeemError('exhausted');

    const granted = Math.max(1, Math.min(CODE_LIMITS.maxAttempts, Math.floor(c.attempts)));
    tx.create(redRef, { uid: p.uid, email: p.email, attempts: granted, at: now });
    tx.update(codeRef, {
      redemptionCount: c.redemptionCount + 1,
      totalAttemptsGranted: (c.totalAttemptsGranted ?? 0) + granted,
      updatedAt: now,
    });
    const next = { ...q, bonusGranted: q.bonusGranted + granted, updatedAt: now };
    tx.set(userRef(db, p.uid), next);
    tx.create(db.doc(`${COL.users}/${p.uid}/ledger/code_${id.slice(0, 16)}`), { type: 'code', amount: granted, codeId: id, hint: c.hint, at: now });
    return { granted, quota: quotaView(next, now, freeDefault) };
  });
}

export interface CreateCodeInput {
  code?: string;              // custom text; omitted → random
  attempts?: number;
  maxRedemptions?: number;
  allowedEmails?: string[];
  expiresAt?: number | null;
  note?: string;
}

export async function createCode(db: DbLike, input: CreateCodeInput, adminUid: string, now = Date.now(), secret?: string): Promise<{ id: string; code: string; doc: CodeDoc }> {
  const code = input.code?.trim() ? input.code.trim() : randomCode();
  const norm = normalizeCode(code);
  if (!isValidCodeFormat(norm)) throw new HttpError(400, 'invalid_code_format', `הקוד חייב להכיל ${CODE_LIMITS.minLen}–${CODE_LIMITS.maxLen} אותיות או ספרות.`);
  const attempts = Math.floor(Number(input.attempts ?? CODE_DEFAULTS.attempts));
  const maxRedemptions = Math.floor(Number(input.maxRedemptions ?? CODE_DEFAULTS.maxRedemptions));
  if (!(attempts >= 1 && attempts <= CODE_LIMITS.maxAttempts)) throw new HttpError(400, 'invalid_attempts', `מספר הניסיונות חייב להיות בין 1 ל-${CODE_LIMITS.maxAttempts}.`);
  if (!(maxRedemptions >= 1 && maxRedemptions <= CODE_LIMITS.maxRedemptions)) throw new HttpError(400, 'invalid_max', 'מספר המימושים אינו תקין.');
  const allowedEmails = [...new Set((input.allowedEmails ?? []).map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))].slice(0, 200);
  const expiresAt = input.expiresAt && Number.isFinite(input.expiresAt) ? Number(input.expiresAt) : null;
  if (expiresAt && expiresAt <= now) throw new HttpError(400, 'invalid_expiry', 'תאריך התפוגה כבר עבר.');

  const id = hashCode(norm, secret);
  const doc: CodeDoc = {
    hint: codeHint(norm), attempts, maxRedemptions, redemptionCount: 0, totalAttemptsGranted: 0,
    allowedEmails, expiresAt, disabled: false, note: String(input.note ?? '').slice(0, 200),
    createdAt: now, createdBy: adminUid, updatedAt: now,
  };
  await db.runTransaction(async tx => {
    const ref = db.doc(`${COL.codes}/${id}`);
    const snap = await tx.get(ref);
    if (snap.exists) throw new HttpError(409, 'code_exists', 'קוד זהה כבר קיים.');
    tx.create(ref, doc as unknown as Record<string, unknown>);
  });
  return { id, code, doc };
}
