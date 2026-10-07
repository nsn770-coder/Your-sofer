import { describe, it, expect } from 'vitest';
import { FakeDb } from './fakeDb';
import { createCode, redeemCode, hashCode, normalizeCode, randomCode } from '../codes.server';
import { getQuotaView, reserveAttempt, commitAttempt } from '../quota.server';

const SECRET = 'test-secret-0123456789abcdef';
const A = { uid: 'alice', email: 'alice@example.com', emailVerified: true };
const B = { uid: 'bob', email: 'bob@example.com', emailVerified: true };

async function useAll(db: FakeDb, uid: string, n: number) {
  for (let i = 0; i < n; i++) {
    await reserveAttempt(db, { uid, opId: `${uid}-op-${i}`, kind: 'generate', projectId: 'p', charge: true });
    await commitAttempt(db, { uid, opId: `${uid}-op-${i}`, result: {} });
  }
}

describe('continuation codes', () => {
  it('stores only an HMAC — never the code', async () => {
    const db = new FakeDb();
    const { id, code } = await createCode(db, { code: 'SIMCHA-2027' }, 'admin', Date.now(), SECRET);
    expect(id).toBe(hashCode(normalizeCode(code), SECRET));
    const dump = JSON.stringify([...db.store.entries()]);
    expect(dump).not.toContain('SIMCHA2027');
    expect(dump).not.toContain('SIMCHA-2027');
  });

  it('default code: one redemption, +3 attempts, added to the remaining balance (no reset)', async () => {
    const db = new FakeDb();
    await useAll(db, A.uid, 3);
    expect((await getQuotaView(db, A.uid)).remaining).toBe(0);
    const { code } = await createCode(db, {}, 'admin', Date.now(), SECRET);
    const r = await redeemCode(db, { ...A, rawCode: code.toLowerCase(), secret: SECRET });
    expect(r.granted).toBe(3);
    const q = await getQuotaView(db, A.uid);
    expect(q.remaining).toBe(3);
    expect(q.used).toBe(3); // history kept
  });

  it('rejects a wrong code', async () => {
    const db = new FakeDb();
    await expect(redeemCode(db, { ...A, rawCode: 'NOPE-NOPE', secret: SECRET })).rejects.toMatchObject({ code: 'code_not_found' });
  });

  it('rejects an expired code', async () => {
    const db = new FakeDb();
    const t0 = Date.now();
    const { code } = await createCode(db, { expiresAt: t0 + 1000 }, 'admin', t0, SECRET);
    await expect(redeemCode(db, { ...A, rawCode: code, now: t0 + 2000, secret: SECRET })).rejects.toMatchObject({ code: 'code_expired' });
  });

  it('rejects a disabled code', async () => {
    const db = new FakeDb();
    const { id, code } = await createCode(db, {}, 'admin', Date.now(), SECRET);
    db.store.set(`logoStudioCodes/${id}`, { ...db.store.get(`logoStudioCodes/${id}`)!, disabled: true });
    await expect(redeemCode(db, { ...A, rawCode: code, secret: SECRET })).rejects.toMatchObject({ code: 'code_disabled' });
  });

  it('the same customer cannot redeem the same code twice', async () => {
    const db = new FakeDb();
    const { code } = await createCode(db, { maxRedemptions: 10 }, 'admin', Date.now(), SECRET);
    await redeemCode(db, { ...A, rawCode: code, secret: SECRET });
    await expect(redeemCode(db, { ...A, rawCode: code, secret: SECRET })).rejects.toMatchObject({ code: 'code_already_redeemed' });
    expect((await getQuotaView(db, A.uid)).bonusGranted).toBe(3);
  });

  it('a used-up one-time code cannot be used by another customer', async () => {
    const db = new FakeDb();
    const { code } = await createCode(db, {}, 'admin', Date.now(), SECRET);
    await redeemCode(db, { ...A, rawCode: code, secret: SECRET });
    await expect(redeemCode(db, { ...B, rawCode: code, secret: SECRET })).rejects.toMatchObject({ code: 'code_exhausted' });
  });

  it('a code restricted to a customer rejects others (and unverified emails)', async () => {
    const db = new FakeDb();
    const { code } = await createCode(db, { allowedEmails: ['Alice@Example.com'], maxRedemptions: 5 }, 'admin', Date.now(), SECRET);
    await expect(redeemCode(db, { ...B, rawCode: code, secret: SECRET })).rejects.toMatchObject({ code: 'code_not_allowed' });
    await expect(redeemCode(db, { ...A, emailVerified: false, rawCode: code, secret: SECRET })).rejects.toMatchObject({ code: 'code_not_allowed' });
    await expect(redeemCode(db, { ...A, rawCode: code, secret: SECRET })).resolves.toMatchObject({ granted: 3 });
  });

  it('concurrent redemptions of a one-time code: only one succeeds', async () => {
    const db = new FakeDb();
    const { code } = await createCode(db, { attempts: 4 }, 'admin', Date.now(), SECRET);
    const res = await Promise.allSettled([A, B, { uid: 'carol', email: 'c@x.com', emailVerified: true }].map(u => redeemCode(db, { ...u, rawCode: code, secret: SECRET })));
    expect(res.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('custom attempts and limits are honoured', async () => {
    const db = new FakeDb();
    const { code } = await createCode(db, { attempts: 7, maxRedemptions: 2 }, 'admin', Date.now(), SECRET);
    expect((await redeemCode(db, { ...A, rawCode: code, secret: SECRET })).granted).toBe(7);
    expect((await redeemCode(db, { ...B, rawCode: code, secret: SECRET })).granted).toBe(7);
  });

  it('random codes are well formed and unique', () => {
    const set = new Set(Array.from({ length: 200 }, () => randomCode()));
    expect(set.size).toBe(200);
    for (const c of set) expect(c).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });
});
