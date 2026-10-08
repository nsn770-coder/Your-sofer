import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { getOwnedProject, serializeProject, sanitizeVariants, loadProduct, getVersion } from '@/lib/logoStudio/projects.server';
import { validateSpec } from '@/lib/logoStudio/types';
import { COL } from '@/lib/logoStudio/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const proj = await getOwnedProject(id, user.uid);
    return NextResponse.json({ project: await serializeProject(id, proj) });
  } catch (e) {
    return errorResponse(e, 'project:get');
  }
}

/**
 * Free updates (no attempt): draft fields, kippah / variant, finish, and
 * selecting an existing version as the current one ("go back to version 2").
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const proj = await getOwnedProject(id, user.uid);
    const body = await readJson(req);
    const update: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.draftSpec !== undefined) {
      update.draftSpec = validateSpec(body.draftSpec).spec;
    }
    if (typeof body.productId === 'string' && body.productId !== proj.productId) {
      await loadProduct(body.productId);
      update.productId = body.productId;
      update.selectedVariants = sanitizeVariants(body.selectedVariants);
    } else if (body.selectedVariants !== undefined) {
      update.selectedVariants = sanitizeVariants(body.selectedVariants);
    }
    if (body.finish === 'print' || body.finish === 'embroidery') update.finish = body.finish;
    if (body.side === 'top' || body.side === 'bottom') update.side = body.side;
    if (typeof body.currentVersionId === 'string') {
      const v = await getVersion(id, body.currentVersionId); // 404 if not in this project
      update.currentVersionId = v.id;
      update.draftSpec = v.spec;
    }
    if (Object.keys(update).length === 1) throw new HttpError(400, 'nothing_to_update');
    await getAdminDb().collection(COL.projects).doc(id).update(update);
    const fresh = await getOwnedProject(id, user.uid);
    return NextResponse.json({ project: await serializeProject(id, fresh) });
  } catch (e) {
    return errorResponse(e, 'project:patch');
  }
}
