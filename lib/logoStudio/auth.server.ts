// Auth helpers for Logo Studio routes — Firebase ID tokens verified with the
// Admin SDK (same mechanism as lib/verifyAdmin.ts). The stable customer id is
// the Firebase Auth uid; never IP, cookie or localStorage.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebaseAdmin';
import { verifyAdminToken } from '@/lib/verifyAdmin';

export interface AuthedUser { uid: string; email: string | null; emailVerified: boolean }

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly messageHe?: string, public readonly extra?: Record<string, unknown>) {
    super(code);
    this.name = 'HttpError';
  }
}

function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'auth_required', 'נדרשת התחברות כדי לשמור את העיצובים ואת הניסיונות שלך.');
  try {
    const d = await getAdminAuth().verifyIdToken(token);
    return { uid: d.uid, email: d.email?.toLowerCase() ?? null, emailVerified: d.email_verified === true };
  } catch {
    throw new HttpError(401, 'auth_invalid', 'פג תוקף ההתחברות. נא להתחבר מחדש.');
  }
}

export async function requireAdmin(req: NextRequest): Promise<AuthedUser> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, 'auth_required');
  let decoded;
  try { decoded = await verifyAdminToken(token); } catch { throw new HttpError(401, 'auth_invalid'); }
  if (!decoded) throw new HttpError(403, 'forbidden');
  return { uid: decoded.uid, email: decoded.email?.toLowerCase() ?? null, emailVerified: decoded.email_verified === true };
}

/** Uniform JSON error responses; internal details are logged, never returned. */
export function errorResponse(err: unknown, tag: string): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.code, message: err.messageHe ?? null, ...(err.extra ?? {}) }, { status: err.status });
  }
  console.error(`[logo-studio/${tag}]`, err instanceof Error ? `${err.name}: ${err.message}` : err);
  return NextResponse.json({ error: 'server_error', message: 'אירעה שגיאה. נסו שוב בעוד רגע.' }, { status: 500 });
}

export async function readJson(req: NextRequest, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'too_large');
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try {
    const v = JSON.parse(text || '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

/** Client-generated operation id (idempotency key). */
export function readOpId(v: unknown): string {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) throw new HttpError(400, 'invalid_op_id');
  return v;
}
