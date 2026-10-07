import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { db, getOwnedProject, getVersion, addMessage, getSettings } from '@/lib/logoStudio/projects.server';
import { interpretMessage } from '@/lib/logoStudio/interpret.server';
import { getQuotaView } from '@/lib/logoStudio/quota.server';
import { LIMITS, cleanFreeText } from '@/lib/logoStudio/types';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Chat about the selected version. Never generates and never costs an attempt:
 * it returns either a short question, an answer, or a PROPOSAL (new spec +
 * summary). The customer confirms the proposal → /generate (1 attempt).
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const proj = await getOwnedProject(id, user.uid);
    const body = await readJson(req);
    const message = cleanFreeText(body.message, LIMITS.chatMessage);
    if (!message) throw new HttpError(400, 'empty_message');
    const baseVersionId = typeof body.baseVersionId === 'string' ? body.baseVersionId : proj.currentVersionId;
    if (!baseVersionId) throw new HttpError(400, 'no_version', 'צרו קודם את הלוגו הראשון, ואז אפשר לבקש תיקונים.');
    const base = await getVersion(id, baseVersionId);
    await consumeRate(db(), 'chat', user.uid);

    const histSnap = await getAdminDb().collection(COL.projects).doc(id).collection('messages').orderBy('createdAt', 'desc').limit(6).get();
    const history = histSnap.docs.reverse().map(d => ({ role: d.data().role as string, text: String(d.data().text ?? '').slice(0, 300) }));

    await addMessage(id, { role: 'user', text: message, versionId: base.id });
    const result = await interpretMessage(base.spec, message, history);
    const settings = await getSettings();
    const quota = await getQuotaView(db(), user.uid, settings.freeAttempts);

    let proposal = null;
    let reply = result.reply;
    if (result.type === 'proposal') {
      proposal = { baseVersionId: base.id, spec: result.spec, summary: result.summary, newAiGraphic: result.newAiGraphic };
      reply = `${result.reply}\nהשינויים: ${result.summary.join(' · ')}.\n` +
        (quota.remaining > 0
          ? `יצירת הגרסה החדשה תצרוך ניסיון אחד (נותרו ${quota.remaining}).`
          : 'ניצלת את ניסיונות העיצוב. כדי ליצור את הגרסה הזו יש להזין קוד המשך.');
    }
    const messageId = await addMessage(id, { role: 'assistant', text: reply, versionId: base.id, proposal });
    return NextResponse.json({ type: result.type, reply, proposal, messageId, quota });
  } catch (e) {
    return errorResponse(e, 'chat');
  }
}
