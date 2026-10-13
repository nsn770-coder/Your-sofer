// Project / version / mockup persistence and the generation pipeline.
// All Firestore access is via the Admin SDK from API routes; the client SDK
// has no access to these collections (see firestore.rules).

import crypto from 'node:crypto';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { DbLike } from './db';
import { COL } from './db';
import { HttpError } from './auth.server';
import { DEFAULT_SPEC, validateSpec, describeSpecChanges, needsAiDecoration, needsAiMonogram, decorationKey, monogramKey, type LogoSpec } from './types';
import { resolveSelection, clampPlacement, type RawProduct, type ResolvedSelection, type Placement, type KippahSide, type LogoStudioProductConfig } from './catalog';
import type { StudioKippah } from '@/app/lib/studioKippot';
import { loadStudioKippot, loadStudioKippah } from './studioKippot.server';
import { composeLogo, type RasterLayer } from './compose.server';
import { uploadPrivate, downloadPrivate, signedUrl, type StoredAsset } from './storage.server';
import { generateFrame, generateDivider, generateMonogram } from './aiLayers.server';
import { MissingGlyphError, unsupportedChars } from './textRender.server';
import { productionInfo, type ProductionInfo } from './production';
import { DEFAULT_FREE_ATTEMPTS } from './quota.server';
import type { InlineImage } from './gemini.server';
import { removeLogoBackground, BgRemovalError } from './removeBg.server';

export const db = (): DbLike => getAdminDb() as unknown as DbLike;
const fs = () => getAdminDb();

// ── settings ────────────────────────────────────────────────────────────────
export interface StudioSettings {
  freeAttempts: number;
  minDpi: number;
  defaultMaxPrintWidthMm: number | null;
  defaultCodeAttempts: number;
  contactWhatsapp: string;
}
const DEFAULT_SETTINGS: StudioSettings = { freeAttempts: DEFAULT_FREE_ATTEMPTS, minDpi: 300, defaultMaxPrintWidthMm: null, defaultCodeAttempts: 3, contactWhatsapp: '972587479933' };
let settingsCache: { at: number; v: StudioSettings } | null = null;

export async function getSettings(): Promise<StudioSettings> {
  if (settingsCache && Date.now() - settingsCache.at < 60_000) return settingsCache.v;
  const snap = await fs().doc(COL.settingsDoc).get();
  const d = snap.exists ? snap.data() ?? {} : {};
  const v: StudioSettings = {
    freeAttempts: Number.isInteger(d.freeAttempts) && d.freeAttempts >= 0 && d.freeAttempts <= 20 ? d.freeAttempts : DEFAULT_SETTINGS.freeAttempts,
    minDpi: typeof d.minDpi === 'number' && d.minDpi >= 72 ? d.minDpi : DEFAULT_SETTINGS.minDpi,
    defaultMaxPrintWidthMm: typeof d.defaultMaxPrintWidthMm === 'number' && d.defaultMaxPrintWidthMm > 0 ? d.defaultMaxPrintWidthMm : null,
    defaultCodeAttempts: Number.isInteger(d.defaultCodeAttempts) && d.defaultCodeAttempts > 0 ? d.defaultCodeAttempts : 3,
    contactWhatsapp: typeof d.contactWhatsapp === 'string' && /^\d{9,15}$/.test(d.contactWhatsapp) ? d.contactWhatsapp : DEFAULT_SETTINGS.contactWhatsapp,
  };
  settingsCache = { at: Date.now(), v };
  return v;
}
export function invalidateSettingsCache() { settingsCache = null; }

// ── products ────────────────────────────────────────────────────────────────
// Studio kippot (Firestore studioKippot — managed in the admin dashboard) are
// offered in the studio as virtual products "style:<id>". Their colour and
// fabric are structured fields of the kippah; the studio canvas shows the
// kippah's DESIGN photo for the chosen side (top falls back to the list photo).
export const STYLE_PREFIX = 'style:';
export const isStyleId = (id: string) => id.startsWith(STYLE_PREFIX);
export const PRODUCT_ID_RE = /^(?:[A-Za-z0-9_-]{1,128}|style:[a-z0-9-]{1,40})$/;

/** Real catalog product mapped to a studio kippah (stock / profitability), if any. */
export async function styleInventoryProductId(styleId: string): Promise<string | null> {
  return (await loadStudioKippah(styleId).catch(() => null))?.productId ?? null;
}

export function styleProduct(k: StudioKippah): RawProduct {
  const material = k.material === 'satin' ? 'סאטן' : 'פשתן';
  const cfg: LogoStudioProductConfig = {
    ...k.studio,
    // רקמה זמינה בצד העליון בכל כיפה שיש לה צד עליון (כמו "רקמה" בעמוד כיפות לאירועים)
    finishes: k.sides.top ? ['print', 'embroidery'] : ['print'],
    topImage: k.topDesignImage,
    bottomImage: k.bottomDesignImage,
  };
  return {
    id: `${STYLE_PREFIX}${k.id}`,
    name: `כיפה ${material} — ${k.label}`,
    imgUrl: k.listImage,
    filterAttributes: { 'חומר': material, 'צבע': k.label },
    customDesign: true,
    isEventKippot: true,
    embroideredKippah: k.embroidered,
    hidden: !k.active,
    logoStudio: cfg,
  };
}

/** Active studio kippot as studio products. */
export async function listStyleProducts(): Promise<RawProduct[]> {
  return (await loadStudioKippot()).map(styleProduct);
}

export async function loadProduct(productId: string): Promise<RawProduct> {
  if (!PRODUCT_ID_RE.test(productId)) throw new HttpError(400, 'invalid_product');
  if (isStyleId(productId)) {
    const k = await loadStudioKippah(productId.slice(STYLE_PREFIX.length));
    if (!k) throw new HttpError(404, 'product_not_found', 'דגם הכיפה לא נמצא.');
    return styleProduct(k);
  }
  const snap = await fs().collection('products').doc(productId).get();
  if (!snap.exists) throw new HttpError(404, 'product_not_found', 'המוצר לא נמצא.');
  return { id: snap.id, ...(snap.data() as Omit<RawProduct, 'id'>) };
}

export async function resolveForProject(productId: string, variants: Record<string, string>, side: KippahSide = 'top'): Promise<{ product: RawProduct; sel: ResolvedSelection }> {
  const product = await loadProduct(productId);
  const sel = resolveSelection(product, variants, side);
  const settings = await getSettings();
  if (!sel.maxPrintWidthMm && settings.defaultMaxPrintWidthMm) sel.maxPrintWidthMm = settings.defaultMaxPrintWidthMm;
  return { product, sel };
}

export function sanitizeVariants(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 8)) {
    if (typeof val === 'string' && k.length <= 40 && val.length <= 80) out[k] = val;
  }
  return out;
}

// ── projects ────────────────────────────────────────────────────────────────
export interface ProjectDoc {
  uid: string;
  email: string | null;
  createdAt: number;
  updatedAt: number;
  productId: string;
  selectedVariants: Record<string, string>;
  finish: 'print' | 'embroidery';
  /** Which side of the kippah this design is for (default top). */
  side?: KippahSide;
  draftSpec: LogoSpec;
  currentVersionId: string | null;
  versionCount: number;
  approval: { approvalId: string; versionId: string; mockupId: string; at: number } | null;
}

export async function getOwnedProject(projectId: string, uid: string): Promise<ProjectDoc> {
  if (!/^[A-Za-z0-9]{8,40}$/.test(projectId)) throw new HttpError(404, 'not_found');
  const snap = await fs().collection(COL.projects).doc(projectId).get();
  // same 404 for "missing" and "not yours" — no existence oracle
  if (!snap.exists || snap.data()!.uid !== uid) throw new HttpError(404, 'not_found', 'הפרויקט לא נמצא.');
  return snap.data() as ProjectDoc;
}

export async function createProject(uid: string, email: string | null, productId: string, variants: Record<string, string>, draft: unknown, side: KippahSide = 'top'): Promise<string> {
  await loadProduct(productId); // must exist
  const { spec } = validateSpec({ ...DEFAULT_SPEC, ...(draft && typeof draft === 'object' ? draft : {}) });
  const id = crypto.randomBytes(10).toString('hex');
  const now = Date.now();
  const doc: ProjectDoc = {
    uid, email, createdAt: now, updatedAt: now, productId, selectedVariants: variants, finish: 'print', side,
    draftSpec: spec, currentVersionId: null, versionCount: 0, approval: null,
  };
  await fs().collection(COL.projects).doc(id).set(doc);
  return id;
}

export interface VersionDoc {
  n: number;
  parentVersionId: string | null;
  spec: LogoSpec;
  logo: StoredAsset & { rasterScale: number };
  layers: string[];
  ai: {
    frame?: StoredAsset & { key: string; model: string };
    divider?: StoredAsset & { key: string; model: string };
    monogram?: StoredAsset & { key: string; model: string; verified: boolean };
  };
  summary: string[];
  warnings: string[];
  source: 'initial' | 'revision' | 'edit' | 'upload';
  /** Only for source "upload": the customer's own file and whether its background was removed. */
  upload?: { assetId: string; original: StoredAsset; bgRemoved: boolean };
  opId: string;
  createdAt: number;
  includedAiMockupUsed: boolean;
}

export interface MockupDoc {
  versionId: string;
  kind: 'composite' | 'ai';
  placement: Placement;
  finish: 'print' | 'embroidery';
  asset: StoredAsset;
  box: { x: number; y: number; w: number; h: number };
  productId: string;
  selectionKey: string;
  imageUrl: string;
  charged: boolean;
  createdAt: number;
  side?: KippahSide;
}

/** Identifies product + variant + side; a mockup made for another key is stale. */
export function selectionKey(productId: string, variants: Record<string, string>, side: KippahSide = 'top'): string {
  const base = `${productId}|${Object.keys(variants).sort().map(k => `${k}=${variants[k]}`).join('|')}`;
  return side === 'bottom' ? `${base}|side=bottom` : base; // top keeps the original format
}

async function loadInspiration(uid: string, assetId: string | null): Promise<InlineImage | null> {
  if (!assetId) return null;
  const snap = await fs().collection(COL.assets).doc(assetId).get();
  if (!snap.exists || snap.data()!.uid !== uid) return null;
  const a = snap.data() as StoredAsset;
  const buf = await downloadPrivate(a);
  return { mimeType: 'image/png', data: buf.toString('base64') };
}

async function layerFromAsset(a: StoredAsset): Promise<RasterLayer> {
  const png = await downloadPrivate(a);
  return { png, width: a.width, height: a.height };
}

/**
 * Builds a new logo version from `spec`. Reuses AI layers from `parent` when
 * their inputs are unchanged (no new AI call), so revisions keep everything
 * the customer didn't ask to change.
 */
export async function buildVersion(p: {
  projectId: string; uid: string; spec: LogoSpec; parent: (VersionDoc & { id: string }) | null; opId: string; source: VersionDoc['source']; deadline: number;
}): Promise<{ id: string; version: VersionDoc }> {
  const { spec, parent } = p;
  const bad = [...new Set([spec.primaryText, spec.secondaryText, spec.date].flatMap(t => (t ? unsupportedChars(t, spec.fontId) : [])))];
  if (bad.length) throw new HttpError(400, 'unsupported_chars', `הגופן שנבחר אינו תומך בתווים: ${bad.join(' ')}. נסו גופן אחר או הסירו את התווים.`);

  const inspiration = await loadInspiration(p.uid, spec.inspirationAssetId);
  const folder = `logo-studio/${p.uid}/${p.projectId}`;
  const ai: VersionDoc['ai'] = {};
  const warnings: string[] = [];
  const layers: { frame?: RasterLayer; divider?: RasterLayer; monogram?: RasterLayer } = {};

  const decoKind = needsAiDecoration(spec);
  const dKey = decorationKey(spec);
  if (decoKind && dKey) {
    const reuse = decoKind === 'frame' ? parent?.ai.frame : parent?.ai.divider;
    if (reuse && reuse.key === dKey) {
      // colour may have changed → re-key the stored layer to the new colour
      const prev = await layerFromAsset(reuse);
      layers[decoKind] = await recolor(prev, spec.color);
      ai[decoKind] = reuse;
    } else {
      const r = decoKind === 'frame' ? await generateFrame(spec, inspiration, p.deadline) : await generateDivider(spec, inspiration, p.deadline);
      const asset = await uploadPrivate(r.layer.png, `${folder}/layers`, 'png');
      ai[decoKind] = { ...asset, key: dKey, model: r.model };
      layers[decoKind] = r.layer;
    }
  }

  const mKey = monogramKey(spec);
  if (needsAiMonogram(spec) && mKey) {
    const reuse = parent?.ai.monogram;
    if (reuse && reuse.key === mKey) {
      layers.monogram = await recolor(await layerFromAsset(reuse), spec.color);
      ai.monogram = reuse;
    } else {
      const r = await generateMonogram(spec, inspiration, p.deadline);
      if (r) {
        const asset = await uploadPrivate(r.layer.png, `${folder}/layers`, 'png');
        ai.monogram = { ...asset, key: mKey, model: r.model, verified: r.verified !== false };
        layers.monogram = r.layer;
        if (r.verified === false) warnings.push('לא הצלחנו לבדוק אוטומטית את אותיות המונוגרמה — בדקו שכל האותיות נכונות לפני האישור.');
      } else {
        warnings.push('המונוגרמה האמנותית לא עברה את בדיקת האותיות, ולכן הוצגה מונוגרמה בגופן שבחרתם. אפשר לבקש בשיחה לנסות שוב.');
      }
    }
  }

  let composed;
  try {
    composed = await composeLogo({ spec, frame: layers.frame ?? null, divider: layers.divider ?? null, monogram: layers.monogram ?? null, outputLongSide: 3000 });
  } catch (e) {
    if (e instanceof MissingGlyphError) throw new HttpError(400, 'unsupported_chars', `הגופן ${e.fontLabel} אינו תומך בתווים: ${e.chars.join(' ')}`);
    throw e;
  }
  const logoAsset = await uploadPrivate(composed.png, folder, 'png');

  const ref = fs().collection(COL.projects).doc(p.projectId);
  const versionId = crypto.randomBytes(8).toString('hex');
  const version = await fs().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const proj = snap.data() as ProjectDoc;
    const v: VersionDoc = {
      n: (proj.versionCount ?? 0) + 1,
      parentVersionId: parent?.id ?? null,
      spec,
      logo: { ...logoAsset, rasterScale: composed.rasterScale },
      layers: composed.layers,
      ai,
      summary: describeSpecChanges(parent?.spec ?? null, spec),
      warnings,
      source: p.source,
      opId: p.opId,
      createdAt: Date.now(),
      includedAiMockupUsed: false,
    };
    tx.set(ref.collection('versions').doc(versionId), v);
    tx.update(ref, { versionCount: v.n, currentVersionId: versionId, draftSpec: spec, updatedAt: Date.now() });
    return v;
  });
  return { id: versionId, version };
}

/**
 * Version from a logo the customer UPLOADED (no AI, no attempt). The original
 * file stays untouched; with removeBg=true a transparent copy is made from it.
 * Toggling the background always starts from the original upload.
 */
export async function buildUploadedVersion(p: {
  projectId: string; uid: string; assetId: string; removeBg: boolean;
}): Promise<{ id: string; version: VersionDoc }> {
  if (!/^[a-f0-9]{20}$/.test(p.assetId)) throw new HttpError(400, 'invalid_asset', 'הקובץ לא נמצא. העלו את הלוגו מחדש.');
  const snap = await fs().collection(COL.assets).doc(p.assetId).get();
  const meta = snap.data();
  if (!snap.exists || meta?.uid !== p.uid || meta?.kind !== 'logo_upload') throw new HttpError(404, 'asset_not_found', 'הקובץ לא נמצא. העלו את הלוגו מחדש.');
  const original: StoredAsset = { publicId: meta.publicId, version: meta.version, format: meta.format, width: meta.width, height: meta.height, bytes: meta.bytes };

  const warnings: string[] = [];
  let logoAsset: StoredAsset = original;
  let bgRemoved = false;
  if (p.removeBg) {
    const buf = await downloadPrivate(original);
    let r;
    try { r = await removeLogoBackground(buf); }
    catch (e) {
      if (e instanceof BgRemovalError) throw new HttpError(422, 'bg_removal_failed', 'לא הצלחנו להסיר את הרקע מהקובץ הזה. אפשר להמשיך עם הקובץ המקורי או להעלות קובץ PNG עם רקע שקוף.');
      throw e;
    }
    if (r.alreadyTransparent) warnings.push('לקובץ כבר היה רקע שקוף — רק נחתכו השוליים הריקים.');
    else if (r.busyBackground) warnings.push('הרקע בקובץ אינו בצבע אחיד, ולכן ייתכן שההסרה חלקית. בדקו את התוצאה על הרקע הכהה, או העלו קובץ PNG שקוף.');
    else if (r.removedRatio < 0.03) warnings.push('כמעט לא נמצא רקע להסרה בקובץ הזה.');
    logoAsset = await uploadPrivate(r.png, `logo-studio/${p.uid}/${p.projectId}`, 'png');
    bgRemoved = true;
  }

  const ref = fs().collection(COL.projects).doc(p.projectId);
  const versionId = crypto.randomBytes(8).toString('hex');
  const version = await fs().runTransaction(async tx => {
    const ps = await tx.get(ref);
    const proj = ps.data() as ProjectDoc;
    const v: VersionDoc = {
      n: (proj.versionCount ?? 0) + 1,
      parentVersionId: null,
      spec: proj.draftSpec,
      logo: { ...logoAsset, rasterScale: 1 },
      layers: ['upload'],
      ai: {},
      summary: [bgRemoved ? 'לוגו שהעליתם · הרקע הוסר' : 'לוגו שהעליתם · קובץ מקורי'],
      warnings,
      source: 'upload',
      upload: { assetId: p.assetId, original, bgRemoved },
      opId: `upload-${versionId}`,
      createdAt: Date.now(),
      includedAiMockupUsed: false,
    };
    tx.set(ref.collection('versions').doc(versionId), v);
    tx.update(ref, { versionCount: v.n, currentVersionId: versionId, updatedAt: Date.now() });
    return v;
  });
  return { id: versionId, version };
}

async function recolor(layer: RasterLayer, color: string): Promise<RasterLayer> {
  const sharp = (await import('sharp')).default;
  const { hexToRgb } = await import('./color');
  const { data, info } = await sharp(layer.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = hexToRgb(color);
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return { png, width: info.width, height: info.height };
}

export async function getVersion(projectId: string, versionId: string): Promise<VersionDoc & { id: string }> {
  if (!/^[a-f0-9]{16}$/.test(versionId)) throw new HttpError(404, 'version_not_found');
  const snap = await fs().collection(COL.projects).doc(projectId).collection('versions').doc(versionId).get();
  if (!snap.exists) throw new HttpError(404, 'version_not_found', 'הגרסה לא נמצאה.');
  return { id: snap.id, ...(snap.data() as VersionDoc) };
}

// ── serialisation for the owner / admin ─────────────────────────────────────
export function assetUrls(a: Pick<StoredAsset, 'publicId' | 'version' | 'format'>, thumb = 800) {
  return { url: signedUrl(a), thumb: signedUrl(a, { width: thumb }) };
}

export async function serializeProject(projectId: string, proj: ProjectDoc) {
  const ref = fs().collection(COL.projects).doc(projectId);
  const [vs, ms, msgs] = await Promise.all([
    ref.collection('versions').orderBy('n', 'desc').limit(50).get(),
    ref.collection('mockups').orderBy('createdAt', 'desc').limit(60).get(),
    ref.collection('messages').orderBy('createdAt', 'asc').limit(200).get(),
  ]);
  const side: KippahSide = proj.side === 'bottom' ? 'bottom' : 'top';
  const { sel } = await resolveForProject(proj.productId, proj.selectedVariants, side);
  const settings = await getSettings();
  const currentSelKey = selectionKey(proj.productId, proj.selectedVariants, side);
  const inventoryProductId = isStyleId(proj.productId) ? await styleInventoryProductId(proj.productId.slice(STYLE_PREFIX.length)) : proj.productId;
  let inspiration: { assetId: string; thumb: string } | null = null;
  if (proj.draftSpec?.inspirationAssetId) {
    const a = await fs().collection(COL.assets).doc(proj.draftSpec.inspirationAssetId).get();
    if (a.exists && a.data()!.uid === proj.uid) inspiration = { assetId: a.id, thumb: signedUrl(a.data() as StoredAsset, { width: 300 }) };
  }
  return {
    id: projectId,
    productId: proj.productId,
    selectedVariants: proj.selectedVariants,
    finish: proj.finish,
    side,
    inventoryProductId,
    isStyle: isStyleId(proj.productId),
    draftSpec: proj.draftSpec,
    currentVersionId: proj.currentVersionId,
    approval: proj.approval,
    selection: sel,
    minDpi: settings.minDpi,
    inspiration,
    versions: vs.docs.map(d => {
      const v = d.data() as VersionDoc;
      return {
        id: d.id, n: v.n, parentVersionId: v.parentVersionId, spec: v.spec, summary: v.summary, warnings: v.warnings,
        source: v.source, createdAt: v.createdAt, includedAiMockupUsed: v.includedAiMockupUsed,
        logo: { ...assetUrls(v.logo, 900), width: v.logo.width, height: v.logo.height, rasterScale: v.logo.rasterScale },
        aiLayers: Object.keys(v.ai ?? {}),
        upload: v.upload ? { assetId: v.upload.assetId, bgRemoved: v.upload.bgRemoved, originalThumb: signedUrl(v.upload.original, { width: 900 }) } : null,
      };
    }),
    mockups: ms.docs.map(d => {
      const m = d.data() as MockupDoc;
      return {
        id: d.id, versionId: m.versionId, kind: m.kind, placement: m.placement, finish: m.finish,
        createdAt: m.createdAt, charged: m.charged, side: m.side ?? 'top', ...assetUrls(m.asset, 1000),
        stale: m.selectionKey !== currentSelKey,
      };
    }),
    messages: msgs.docs.map(d => {
      const m = d.data();
      return { id: d.id, role: m.role, text: m.text, createdAt: m.createdAt, proposal: m.proposal ?? null, versionId: m.versionId ?? null };
    }),
  };
}

export async function addMessage(projectId: string, msg: Record<string, unknown>): Promise<string> {
  const ref = await fs().collection(COL.projects).doc(projectId).collection('messages').add({ ...msg, createdAt: Date.now() });
  return ref.id;
}

export function computeProduction(v: VersionDoc, placement: Placement, sel: ResolvedSelection, minDpi: number): ProductionInfo {
  return productionInfo({ width: v.logo.width, height: v.logo.height, rasterScale: v.logo.rasterScale }, clampPlacement(placement, sel.printArea), sel.printArea, sel.maxPrintWidthMm, minDpi);
}
