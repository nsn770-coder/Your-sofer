import { NextRequest, NextResponse } from 'next/server';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate, isRateBlocked } from '@/lib/logoStudio/rateLimit.server';
import { redeemCode, RedeemError } from '@/lib/logoStudio/codes.server';
import { db, getSettings } from '@/lib/logoStudio/projects.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Redeem a continuation code. Validation is server-only; codes are never logged. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req, 2048);
    const raw = typeof body.code === 'string' ? body.code : '';
    if (!raw.trim()) throw new HttpError(400, 'code_required', 'נא להזין קוד.');
    if (await isRateBlocked(db(), 'redeemFail', user.uid)) {
      throw new HttpError(429, 'rate_limited', 'בוצעו יותר מדי ניסיונות שגויים. נסו שוב מחר או פנו אלינו.');
    }
    await consumeRate(db(), 'redeem', user.uid);
    const settings = await getSettings();
    try {
      const r = await redeemCode(db(), { uid: user.uid, email: user.email, emailVerified: user.emailVerified, rawCode: raw, freeDefault: settings.freeAttempts });
      return NextResponse.json({ granted: r.granted, quota: r.quota, message: `הקוד אומת! נוספו ${r.granted} ניסיונות עיצוב.` });
    } catch (e) {
      if (e instanceof RedeemError) await consumeRate(db(), 'redeemFail', user.uid).catch(() => undefined);
      throw e;
    }
  } catch (e) {
    return errorResponse(e, 'redeem');
  }
}
