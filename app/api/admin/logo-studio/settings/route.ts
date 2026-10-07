import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireAdmin, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { getSettings, invalidateSettingsCache } from '@/lib/logoStudio/projects.server';
import { COL } from '@/lib/logoStudio/db';
import { storageConfigured } from '@/lib/logoStudio/storage.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    invalidateSettingsCache();
    return NextResponse.json({
      settings: await getSettings(),
      env: {
        gemini: !!process.env.GEMINI_API_KEY,
        cloudinarySigned: storageConfigured(),
        codeSecret: !!(process.env.LOGO_STUDIO_CODE_SECRET && process.env.LOGO_STUDIO_CODE_SECRET.length >= 16),
      },
    });
  } catch (e) {
    return errorResponse(e, 'admin:settings:get');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const b = await readJson(req);
    const out: Record<string, unknown> = { updatedAt: Date.now(), updatedBy: admin.uid };
    if (b.freeAttempts !== undefined) {
      const n = Math.floor(Number(b.freeAttempts));
      if (!(n >= 0 && n <= 20)) throw new HttpError(400, 'invalid_free', 'מספר הניסיונות החינמיים חייב להיות 0–20.');
      out.freeAttempts = n;
    }
    if (b.minDpi !== undefined) {
      const n = Math.floor(Number(b.minDpi));
      if (!(n >= 72 && n <= 1200)) throw new HttpError(400, 'invalid_dpi');
      out.minDpi = n;
    }
    if (b.defaultMaxPrintWidthMm !== undefined) {
      const n = b.defaultMaxPrintWidthMm === null || b.defaultMaxPrintWidthMm === '' ? null : Number(b.defaultMaxPrintWidthMm);
      if (n !== null && !(n > 5 && n < 500)) throw new HttpError(400, 'invalid_width');
      out.defaultMaxPrintWidthMm = n;
    }
    if (b.defaultCodeAttempts !== undefined) {
      const n = Math.floor(Number(b.defaultCodeAttempts));
      if (!(n >= 1 && n <= 50)) throw new HttpError(400, 'invalid_code_attempts');
      out.defaultCodeAttempts = n;
    }
    if (typeof b.contactWhatsapp === 'string') {
      if (!/^\d{9,15}$/.test(b.contactWhatsapp)) throw new HttpError(400, 'invalid_phone');
      out.contactWhatsapp = b.contactWhatsapp;
    }
    await getAdminDb().doc(COL.settingsDoc).set(out, { merge: true });
    invalidateSettingsCache();
    return NextResponse.json({ settings: await getSettings() });
  } catch (e) {
    return errorResponse(e, 'admin:settings:put');
  }
}
