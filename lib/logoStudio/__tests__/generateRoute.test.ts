// Route-level test of /api/logo-studio/projects/[id]/generate with the provider,
// storage and Firestore replaced by in-memory fakes: checks auth, ownership,
// exact attempt accounting, refunds on provider failure and idempotency.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { FakeDb } from './fakeDb';
import { HttpError } from '../auth.server';
import { AiUnavailableError } from '../gemini.server';

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb, fail: false as false | 'ai' | 'crash', calls: 0 }));

vi.mock('@/lib/firebaseAdmin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (!t.startsWith('tok-')) throw new Error('bad token');
      return { uid: t.slice(4), email: `${t.slice(4)}@x.com`, email_verified: true };
    },
  }),
  getAdminDb: () => { throw new Error('not used in this test'); },
}));
vi.mock('@/lib/verifyAdmin', () => ({ verifyAdminToken: async () => null }));
vi.mock('../storage.server', () => ({ storageConfigured: () => true }));
vi.mock('../projects.server', () => ({
  db: () => state.db,
  getSettings: async () => ({ freeAttempts: 3, minDpi: 300, defaultMaxPrintWidthMm: null, defaultCodeAttempts: 3, contactWhatsapp: '972000000000' }),
  getOwnedProject: async (id: string, uid: string) => {
    if (id !== 'proj0000aa' || uid !== 'alice') throw new HttpError(404, 'not_found', 'הפרויקט לא נמצא.');
    return { uid: 'alice' };
  },
  getVersion: async () => null,
  addMessage: async () => 'm1',
  serializeProject: async () => ({ id: 'proj0000aa' }),
  buildVersion: async () => {
    state.calls++;
    if (state.fail === 'ai') throw new AiUnavailableError('service_disabled');
    if (state.fail === 'crash') throw new Error('boom');
    return { id: `v${state.calls}`, version: { n: state.calls, summary: ['x'], warnings: [] } };
  },
}));

const { POST } = await import('@/app/api/logo-studio/projects/[id]/generate/route');
const { getQuotaView } = await import('../quota.server');

function req(token: string | null, body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/logo-studio/projects/proj0000aa/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}
const ctx = (id = 'proj0000aa') => ({ params: Promise.resolve({ id }) });
const spec = { primaryText: 'יוסף חיים', fontId: 'david', style: 'classic' };

describe('generate route', () => {
  beforeEach(() => { state.db = new FakeDb(); state.fail = false; state.calls = 0; });

  it('requires sign-in', async () => {
    const r = await POST(req(null, { opId: 'op-00000001', spec }), ctx());
    expect(r.status).toBe(401);
  });

  it("another customer's project is not accessible", async () => {
    const r = await POST(req('tok-bob', { opId: 'op-00000001', spec }), ctx());
    expect(r.status).toBe(404);
    expect(state.calls).toBe(0);
  });

  it('exactly three generations, then 402 with the required message; nothing generated', async () => {
    for (let i = 1; i <= 3; i++) {
      const r = await POST(req('tok-alice', { opId: `op-0000000${i}`, spec }), ctx());
      expect(r.status).toBe(200);
      expect((await r.json()).quota.remaining).toBe(3 - i);
    }
    const r4 = await POST(req('tok-alice', { opId: 'op-00000004', spec }), ctx());
    expect(r4.status).toBe(402);
    expect((await r4.json()).message).toBe('ניצלת את 3 ניסיונות העיצוב בחינם. להמשך יצירה, הזן קוד שקיבלת מאיתנו.');
    expect(state.calls).toBe(3);
  });

  it('provider failure / crash does not consume an attempt', async () => {
    state.fail = 'ai';
    const r = await POST(req('tok-alice', { opId: 'op-0000000a', spec }), ctx());
    expect(r.status).toBe(503);
    state.fail = 'crash';
    const r2 = await POST(req('tok-alice', { opId: 'op-0000000b', spec }), ctx());
    expect(r2.status).toBe(500);
    expect((await r2.json()).message).toContain('הניסיון לא נוצל');
    expect((await getQuotaView(state.db, 'alice')).remaining).toBe(3);
  });

  it('a repeated request with the same opId is not charged twice', async () => {
    await POST(req('tok-alice', { opId: 'op-dupdup01', spec }), ctx());
    const again = await POST(req('tok-alice', { opId: 'op-dupdup01', spec }), ctx());
    expect(again.status).toBe(200);
    expect((await again.json()).duplicate).toBe(true);
    expect(state.calls).toBe(1);
    expect((await getQuotaView(state.db, 'alice')).used).toBe(1);
  });

  it('invalid input is rejected before any attempt is reserved', async () => {
    const r = await POST(req('tok-alice', { opId: 'op-0000000c', spec: { primaryText: '' } }), ctx());
    expect(r.status).toBe(400);
    expect((await getQuotaView(state.db, 'alice')).remaining).toBe(3);
  });
});
