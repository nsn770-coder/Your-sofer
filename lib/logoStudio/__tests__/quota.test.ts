import { describe, it, expect } from 'vitest';
import { FakeDb } from './fakeDb';
import { reserveAttempt, commitAttempt, releaseAttempt, getQuotaView, RESERVATION_TTL_MS, QUOTA_EXHAUSTED_MESSAGE } from '../quota.server';
import { HttpError } from '../auth.server';

const U = 'user1';
const P = 'proj1';

async function oneGeneration(db: FakeDb, opId: string, ok = true, now = Date.now()) {
  const r = await reserveAttempt(db, { uid: U, opId, kind: 'generate', projectId: P, charge: true, now });
  if (r.status !== 'reserved') return r;
  if (ok) return commitAttempt(db, { uid: U, opId, result: { versionId: opId }, now });
  return releaseAttempt(db, { uid: U, opId, error: 'provider', now });
}

describe('attempt quota', () => {
  it('allows exactly 3 free generations, then blocks with the required message', async () => {
    const db = new FakeDb();
    for (let i = 1; i <= 3; i++) await oneGeneration(db, `op-000${i}`);
    expect((await getQuotaView(db, U)).remaining).toBe(0);
    await expect(oneGeneration(db, 'op-0004')).rejects.toMatchObject({ status: 402, code: 'quota_exhausted', messageHe: QUOTA_EXHAUSTED_MESSAGE });
    expect(QUOTA_EXHAUSTED_MESSAGE).toBe('ניצלת את 3 ניסיונות העיצוב בחינם. להמשך יצירה, הזן קוד שקיבלת מאיתנו.');
    expect((await getQuotaView(db, U)).used).toBe(3);
  });

  it('refunds a failed provider call', async () => {
    const db = new FakeDb();
    await oneGeneration(db, 'op-fail-1', false);
    await oneGeneration(db, 'op-fail-2', false);
    const q = await getQuotaView(db, U);
    expect(q.used).toBe(0);
    expect(q.remaining).toBe(3);
    expect(db.store.get(`logoStudioOps/${U}__op-fail-1`)?.status).toBe('failed');
  });

  it('reservation lowers the visible balance immediately', async () => {
    const db = new FakeDb();
    await reserveAttempt(db, { uid: U, opId: 'op-pend-1', kind: 'generate', projectId: P, charge: true });
    const q = await getQuotaView(db, U);
    expect(q.pending).toBe(1);
    expect(q.remaining).toBe(2);
  });

  it('is idempotent for the same opId (double click / retry)', async () => {
    const db = new FakeDb();
    await oneGeneration(db, 'op-same-1');
    const again = await reserveAttempt(db, { uid: U, opId: 'op-same-1', kind: 'generate', projectId: P, charge: true });
    expect(again.status).toBe('duplicate');
    expect((await getQuotaView(db, U)).used).toBe(1);
    // committing twice charges once
    await commitAttempt(db, { uid: U, opId: 'op-same-1', result: {} });
    expect((await getQuotaView(db, U)).used).toBe(1);
  });

  it('blocks parallel generations from several windows (single flight)', async () => {
    const db = new FakeDb();
    const results = await Promise.allSettled(
      ['w1', 'w2', 'w3', 'w4', 'w5'].map(w => reserveAttempt(db, { uid: U, opId: `op-par-${w}`, kind: 'generate', projectId: P, charge: true })),
    );
    const ok = results.filter(r => r.status === 'fulfilled');
    const busy = results.filter(r => r.status === 'rejected' && (r.reason as HttpError).code === 'busy');
    expect(ok).toHaveLength(1);
    expect(busy).toHaveLength(4);
  });

  it('cannot overspend under concurrency even when requests run one after another quickly', async () => {
    const db = new FakeDb();
    const runs = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => oneGeneration(db, `op-race-${i}`)));
    const q = await getQuotaView(db, U);
    expect(q.used).toBeLessThanOrEqual(3);
    expect(q.remaining).toBeGreaterThanOrEqual(0);
    expect(runs.some(r => r.status === 'rejected')).toBe(true);
  });

  it('expires a stale reservation (crashed function) without charging', async () => {
    const db = new FakeDb();
    const t0 = 1_000_000;
    await reserveAttempt(db, { uid: U, opId: 'op-crash-1', kind: 'generate', projectId: P, charge: true, now: t0 });
    // later request is not blocked once the TTL passed, and the crashed one was not charged
    const t1 = t0 + RESERVATION_TTL_MS + 1;
    await oneGeneration(db, 'op-after-1', true, t1);
    const q = await getQuotaView(db, U, 3, t1);
    expect(q.used).toBe(1);
    expect(q.remaining).toBe(2);
  });

  it('included AI mockup (charge=false) consumes nothing', async () => {
    const db = new FakeDb();
    await reserveAttempt(db, { uid: U, opId: 'op-mock-1', kind: 'ai_mockup', projectId: P, charge: false });
    await commitAttempt(db, { uid: U, opId: 'op-mock-1', result: { mockupId: 'm' } });
    expect((await getQuotaView(db, U)).remaining).toBe(3);
  });

  it('respects a custom free-attempt default from settings', async () => {
    const db = new FakeDb();
    expect((await getQuotaView(db, U, 5)).remaining).toBe(5);
  });
});
