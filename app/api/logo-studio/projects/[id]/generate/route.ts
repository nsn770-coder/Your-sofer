import { NextRequest, NextResponse } from 'next/server';
import { requireUser, errorResponse, readJson, readOpId, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { reserveAttempt, commitAttempt, releaseAttempt } from '@/lib/logoStudio/quota.server';
import { db, getOwnedProject, getVersion, buildVersion, serializeProject, getSettings, addMessage } from '@/lib/logoStudio/projects.server';
import { validateSpec } from '@/lib/logoStudio/types';
import { storageConfigured } from '@/lib/logoStudio/storage.server';
import { AiUnavailableError, AiResponseError } from '@/lib/logoStudio/gemini.server';
import { KeyingError } from '@/lib/logoStudio/compose.server';
import { DeadlineError } from '@/lib/logoStudio/aiLayers.server';
import { unsupportedChars } from '@/lib/logoStudio/textRender.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Create a NEW logo version (initial, chat revision or manual edit).
 * Costs exactly one attempt — reserved before the provider is called and
 * refunded automatically on any failure. Idempotent per opId.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const started = Date.now();
  let reserved: { uid: string; opId: string } | null = null;
  const settingsP = getSettings();
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const body = await readJson(req);
    const opId = readOpId(body.opId);
    await getOwnedProject(id, user.uid);
    const settings = await settingsP;

    const { spec, errors } = validateSpec(body.spec);
    if (errors.length) throw new HttpError(400, 'invalid_spec', errors[0]);
    const bad = [...new Set([spec.primaryText, spec.secondaryText, spec.date].flatMap(t => (t ? unsupportedChars(t, spec.fontId) : [])))];
    if (bad.length) throw new HttpError(400, 'unsupported_chars', `הגופן שנבחר אינו תומך בתווים: ${bad.join(' ')}`);
    if (!storageConfigured()) throw new HttpError(503, 'storage_not_configured', 'שמירת הקבצים אינה מוגדרת כרגע. לא נוצל ניסיון.');

    const parent = typeof body.baseVersionId === 'string' && body.baseVersionId ? await getVersion(id, body.baseVersionId) : null;
    const source = body.source === 'revision' ? 'revision' : body.source === 'edit' ? 'edit' : parent ? 'edit' : 'initial';

    await consumeRate(db(), 'generate', user.uid);
    const r = await reserveAttempt(db(), { uid: user.uid, opId, kind: 'generate', projectId: id, charge: true, freeDefault: settings.freeAttempts });
    if (r.status === 'duplicate') {
      // repeated request (double click / retry with the same opId)
      if (r.op.status === 'succeeded') {
        const proj = await getOwnedProject(id, user.uid);
        return NextResponse.json({ versionId: r.op.result?.versionId ?? null, duplicate: true, project: await serializeProject(id, proj) });
      }
      if (r.op.status === 'reserved') throw new HttpError(409, 'in_progress', 'היצירה כבר בתהליך…');
      throw new HttpError(409, 'op_finished', 'הבקשה הקודמת הסתיימה. נסו שוב.');
    }
    reserved = { uid: user.uid, opId };

    const { id: versionId, version } = await buildVersion({
      projectId: id, uid: user.uid, spec, parent, opId, source, deadline: started + 55_000,
    });
    const quota = await commitAttempt(db(), { uid: user.uid, opId, result: { versionId }, freeDefault: settings.freeAttempts });
    reserved = null;
    await addMessage(id, {
      role: 'assistant',
      text: `נוצרה גרסה ${version.n}: ${version.summary.join(' · ')}${version.warnings.length ? `\n${version.warnings.join('\n')}` : ''}`,
      versionId,
    });
    const proj = await getOwnedProject(id, user.uid);
    return NextResponse.json({ versionId, quota, project: await serializeProject(id, proj) });
  } catch (e) {
    let quota = null;
    if (reserved) {
      try { quota = await releaseAttempt(db(), { ...reserved, error: e instanceof Error ? e.message : 'error', freeDefault: (await settingsP).freeAttempts }); }
      catch (re) { console.error('[logo-studio/generate] release failed', re); }
    }
    if (e instanceof AiUnavailableError) {
      return NextResponse.json({ error: 'ai_unavailable', message: 'שירות העיצוב אינו זמין כרגע. הניסיון לא נוצל — נסו שוב מאוחר יותר.', quota }, { status: 503 });
    }
    if (e instanceof AiResponseError || e instanceof KeyingError || e instanceof DeadlineError) {
      return NextResponse.json({ error: 'generation_failed', message: 'לא הצלחנו ליצור את העיטור הפעם. הניסיון לא נוצל — אפשר לנסות שוב.', quota }, { status: 502 });
    }
    if (e instanceof HttpError && quota) {
      return NextResponse.json({ error: e.code, message: e.messageHe ?? null, quota }, { status: e.status });
    }
    if (!(e instanceof HttpError) && reserved) {
      console.error('[logo-studio/generate]', e);
      return NextResponse.json({ error: 'generation_failed', message: 'היצירה נכשלה. הניסיון לא נוצל — אפשר לנסות שוב.', quota }, { status: 500 });
    }
    return errorResponse(e, 'generate');
  }
}
