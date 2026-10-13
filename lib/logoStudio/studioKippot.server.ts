// Server-side access to the studio kippot (Firestore studioKippot/{id}).
// Single source of truth for the kippot on /event-kippot, /kippot-order and the
// Logo Studio ("style:<id>" virtual products). Admin SDK only — writes go
// through /api/admin/studio-kippot (requireAdmin).

import { getAdminDb } from '@/lib/firebaseAdmin';
import {
  STUDIO_KIPPOT_COLLECTION, STUDIO_KIPPAH_ID_RE, LEGACY_STUDIO_KIPPOT,
  normalizeStudioKippah, sortStudioKippot, type StudioKippah,
} from '@/app/lib/studioKippot';
import type { LogoStudioProductConfig } from './catalog';

const fs = () => getAdminDb();

/**
 * Fallback used ONLY while the collection is still empty (before
 * scripts/migrateStudioKippot.mjs ran): the legacy code list merged with the
 * legacy settings docs, exactly like the migration does.
 */
async function legacyStudioKippot(): Promise<StudioKippah[]> {
  const [mapSnap, cfgSnap] = await Promise.all([
    fs().doc('settings/eventKippotStyles').get().catch(() => null),
    fs().doc('settings/logoStudioStyles').get().catch(() => null),
  ]);
  const map = (mapSnap?.exists ? mapSnap.data() ?? {} : {}) as Record<string, { productId?: string; sku?: string; name?: string }>;
  const cfgs = (cfgSnap?.exists ? cfgSnap.data() ?? {} : {}) as Record<string, LogoStudioProductConfig>;
  return LEGACY_STUDIO_KIPPOT.map(k => {
    const m = map[k.id];
    const c = cfgs[k.id] ?? {};
    return {
      ...k,
      productId: m?.productId ?? k.productId,
      sku: m?.sku ?? k.sku,
      productName: m?.name ?? k.productName,
      bottomDesignImage: c.bottomImage || null,
      studio: {
        ...(c.printArea ? { printArea: c.printArea } : {}),
        ...(c.bottomPrintArea ? { bottomPrintArea: c.bottomPrintArea } : {}),
        ...(c.maxPrintWidthMm != null ? { maxPrintWidthMm: c.maxPrintWidthMm } : {}),
        ...(c.bottomMaxPrintWidthMm != null ? { bottomMaxPrintWidthMm: c.bottomMaxPrintWidthMm } : {}),
        ...(c.finishes?.length ? { finishes: c.finishes } : {}),
      },
      active: c.disabled === true ? false : k.active,
    };
  });
}

/** All studio kippot, sorted. Inactive ones only when includeInactive. */
export async function loadStudioKippot(opts: { includeInactive?: boolean } = {}): Promise<StudioKippah[]> {
  const snap = await fs().collection(STUDIO_KIPPOT_COLLECTION).get();
  const list = snap.empty ? await legacyStudioKippot() : snap.docs.map(d => normalizeStudioKippah(d.id, d.data()));
  return sortStudioKippot(opts.includeInactive ? list : list.filter(k => k.active));
}

/** One kippah (active or not — existing projects must keep working). */
export async function loadStudioKippah(id: string): Promise<StudioKippah | null> {
  if (!STUDIO_KIPPAH_ID_RE.test(id)) return null;
  const snap = await fs().collection(STUDIO_KIPPOT_COLLECTION).doc(id).get();
  if (snap.exists) return normalizeStudioKippah(snap.id, snap.data());
  // not migrated yet → legacy list (only if the collection is still empty)
  const any = await fs().collection(STUDIO_KIPPOT_COLLECTION).limit(1).get();
  if (!any.empty) return null;
  return (await legacyStudioKippot()).find(k => k.id === id) ?? null;
}
