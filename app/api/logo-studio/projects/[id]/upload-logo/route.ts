import { NextRequest, NextResponse } from 'next/server';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { db, getOwnedProject, buildUploadedVersion, serializeProject, addMessage } from '@/lib/logoStudio/projects.server';
import { storageConfigured } from '@/lib/logoStudio/storage.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * "I already have a logo": turns a file uploaded via /api/logo-studio/upload
 * (kind=logo) into a version of the project — optionally with the background
 * removed. Free: no AI and no design attempt. From here the customer continues
 * to the mockup / approval exactly like an AI-designed logo.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    await getOwnedProject(id, user.uid);
    if (!storageConfigured()) throw new HttpError(503, 'storage_not_configured', 'שמירת הקבצים אינה מוגדרת כרגע.');
    const body = await readJson(req);
    const assetId = typeof body.assetId === 'string' ? body.assetId : '';
    const removeBg = body.removeBg === true;
    await consumeRate(db(), 'logoVersion', user.uid);
    const { id: versionId, version } = await buildUploadedVersion({ projectId: id, uid: user.uid, assetId, removeBg });
    await addMessage(id, {
      role: 'assistant',
      text: `גרסה ${version.n}: ${version.summary.join(' · ')}${version.warnings.length ? `\n${version.warnings.join('\n')}` : ''}`,
      versionId,
    });
    const proj = await getOwnedProject(id, user.uid);
    return NextResponse.json({ versionId, warnings: version.warnings, project: await serializeProject(id, proj) });
  } catch (e) {
    return errorResponse(e, 'upload-logo');
  }
}
