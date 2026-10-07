import { NextRequest, NextResponse } from 'next/server';
import { requireUser, errorResponse, readJson, HttpError } from '@/lib/logoStudio/auth.server';
import { consumeRate } from '@/lib/logoStudio/rateLimit.server';
import { createProject, db, sanitizeVariants, serializeProject, getOwnedProject } from '@/lib/logoStudio/projects.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Create a design project (requires sign-in). No attempt is consumed. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    await consumeRate(db(), 'create', user.uid);
    const productId = typeof body.productId === 'string' ? body.productId : '';
    if (!productId) throw new HttpError(400, 'product_required', 'נא לבחור כיפה.');
    const id = await createProject(user.uid, user.email, productId, sanitizeVariants(body.selectedVariants), body.draftSpec);
    const proj = await getOwnedProject(id, user.uid);
    return NextResponse.json({ project: await serializeProject(id, proj) });
  } catch (e) {
    return errorResponse(e, 'projects:create');
  }
}
