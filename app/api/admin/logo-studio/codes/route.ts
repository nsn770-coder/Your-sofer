import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { createCode, type CodeDoc } from '@/lib/logoStudio/codes.server';
import { db } from '@/lib/logoStudio/projects.server';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List codes (hints only — the codes themselves are not stored). */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await getAdminDb().collection(COL.codes).orderBy('createdAt', 'desc').limit(300).get();
    const now = Date.now();
    const codes = snap.docs.map(d => {
      const c = d.data() as CodeDoc;
      const status = c.disabled ? 'disabled' : c.expiresAt && now >= c.expiresAt ? 'expired' : c.redemptionCount >= c.maxRedemptions ? 'used_up' : 'active';
      return { id: d.id, ...c, status };
    });
    return NextResponse.json({ codes });
  } catch (e) {
    return errorResponse(e, 'admin:codes:list');
  }
}

/** Create a code. The plaintext is returned ONCE in this response. */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await readJson(req);
    const expires = typeof body.expiresAt === 'string' && body.expiresAt ? Date.parse(body.expiresAt) : typeof body.expiresAt === 'number' ? body.expiresAt : null;
    if (expires !== null && !Number.isFinite(expires)) throw new HttpError(400, 'invalid_expiry', 'תאריך תפוגה לא תקין.');
    const r = await createCode(db(), {
      code: typeof body.code === 'string' ? body.code : undefined,
      attempts: Number(body.attempts ?? 3),
      maxRedemptions: Number(body.maxRedemptions ?? 1),
      allowedEmails: Array.isArray(body.allowedEmails) ? body.allowedEmails.map(String) : typeof body.allowedEmails === 'string' ? body.allowedEmails.split(/[\s,;]+/) : [],
      expiresAt: expires,
      note: typeof body.note === 'string' ? body.note : '',
    }, admin.uid);
    return NextResponse.json({ id: r.id, code: r.code, doc: r.doc });
  } catch (e) {
    return errorResponse(e, 'admin:codes:create');
  }
}

/** Update: disable/enable, change limits, expiry, allowed customers, note. */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await readJson(req);
    const id = typeof body.id === 'string' && /^[a-f0-9]{64}$/.test(body.id) ? body.id : null;
    if (!id) throw new HttpError(400, 'invalid_id');
    const ref = getAdminDb().collection(COL.codes).doc(id);
    const update: Record<string, unknown> = { updatedAt: Date.now() };
    if (typeof body.disabled === 'boolean') update.disabled = body.disabled;
    if (body.maxRedemptions !== undefined) {
      const n = Math.floor(Number(body.maxRedemptions));
      if (!(n >= 1 && n <= 10_000)) throw new HttpError(400, 'invalid_max');
      update.maxRedemptions = n;
    }
    if (body.attempts !== undefined) {
      const n = Math.floor(Number(body.attempts));
      if (!(n >= 1 && n <= 50)) throw new HttpError(400, 'invalid_attempts');
      update.attempts = n;
    }
    if (body.expiresAt !== undefined) {
      const v = body.expiresAt === null || body.expiresAt === '' ? null : Date.parse(String(body.expiresAt));
      if (v !== null && !Number.isFinite(v)) throw new HttpError(400, 'invalid_expiry');
      update.expiresAt = v;
    }
    if (body.allowedEmails !== undefined) {
      const list = (Array.isArray(body.allowedEmails) ? body.allowedEmails : String(body.allowedEmails).split(/[\s,;]+/))
        .map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
      update.allowedEmails = [...new Set(list)].slice(0, 200);
    }
    if (typeof body.note === 'string') update.note = body.note.slice(0, 200);
    await getAdminDb().runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists) throw new HttpError(404, 'not_found');
      tx.update(ref, update);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, 'admin:codes:patch');
  }
}
