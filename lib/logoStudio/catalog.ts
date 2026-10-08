// Kippah catalog normalisation for Logo Studio (shared: pure functions).
//
// Rule: structured catalog data first. Fabric/colour come from the selected
// variant options or product.filterAttributes. Only when the catalog has no
// structured value do we fall back to the product NAME — and the result is
// flagged (source: 'name') and shown to the customer as such.
// The mockup image must belong to the selected variant: a variant image mapped
// in admin (product.logoStudio.variantImages) or — only when the product has no
// visual variant option at all — the product's own main image. We never fall
// back silently to another product's image.

export interface LogoStudioProductConfig {
  /** `${optionName}=${value}` (or several joined with '|', sorted) → image URL. */
  variantImages?: Record<string, string>;
  /** Print area on the product photo, relative 0..1. */
  printArea?: { cx: number; cy: number; minW: number; maxW: number; defaultW: number; maxShift: number };
  /** Physical width (mm) of the print when the logo is at printArea.maxW. */
  maxPrintWidthMm?: number | null;
  finishes?: ('print' | 'embroidery')[];
  disabled?: boolean;
  // ── bottom (inner) side of the kippah — separate photo, area and size ──
  /** Bottom-side photo per visual variant (same keys as variantImages). */
  bottomVariantImages?: Record<string, string>;
  /** Bottom-side photo for a product WITHOUT colour/fabric variants. */
  bottomImage?: string | null;
  bottomPrintArea?: { cx: number; cy: number; minW: number; maxW: number; defaultW: number; maxShift: number };
  bottomMaxPrintWidthMm?: number | null;
}

export type KippahSide = 'top' | 'bottom';
export const SIDE_LABELS: Record<KippahSide, string> = { top: 'צד עליון', bottom: 'צד תחתון (פנים הכיפה)' };

export interface RawProduct {
  id: string;
  name?: string;
  cat?: string;
  price?: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  variantOptions?: { name: string; values: string[] }[];
  filterAttributes?: Record<string, string>;
  customDesign?: boolean;
  isEventKippot?: boolean;
  hidden?: boolean;
  active?: boolean;
  outOfStock?: boolean;
  logoStudio?: LogoStudioProductConfig;
}

export type Sourced = { value: string; source: 'variant' | 'catalog' | 'name' } | null;

export interface ResolvedSelection {
  side: KippahSide;
  /** Which sides have a usable photo for the current selection. */
  sidesAvailable: Record<KippahSide, boolean>;
  productId: string;
  productName: string;
  selectedVariants: Record<string, string>;
  material: Sourced;
  materialKind: 'satin' | 'linen' | 'other' | null;
  color: Sourced;
  image: { url: string; source: 'variant' | 'product' } | null;
  imageStatus: 'ok' | 'choose_variant' | 'missing_variant_image' | 'no_image' | 'no_bottom_image';
  missingOptions: string[];
  finishes: ('print' | 'embroidery')[];
  printArea: NonNullable<LogoStudioProductConfig['printArea']>;
  maxPrintWidthMm: number | null;
}

export const DEFAULT_PRINT_AREA = { cx: 0.5, cy: 0.5, minW: 0.18, maxW: 0.46, defaultW: 0.34, maxShift: 0.12 };

const MATERIAL_OPT = /בד|חומר|סוג|material|fabric/i;
const COLOR_OPT = /צבע|גוון|color|colour/i;

export function isVisualOption(name: string): boolean {
  return MATERIAL_OPT.test(name) || COLOR_OPT.test(name);
}

export function variantImageKey(sel: Record<string, string>, optionNames: string[]): string {
  return optionNames.filter(n => sel[n]).sort().map(n => `${n}=${sel[n]}`).join('|');
}

export function materialKindOf(text: string | null | undefined): 'satin' | 'linen' | 'other' | null {
  if (!text) return null;
  if (/סאטן|סטאן|סטן|satin/i.test(text)) return 'satin';
  if (/פשתן|linen/i.test(text)) return 'linen';
  return 'other';
}

const NAME_COLORS = ['לבן', 'שחור', 'בז\'', 'בז', 'תכלת', 'כחול', 'אפור', 'שמנת', 'ורוד', 'סגול', 'ירוק', 'חום', 'בורדו', 'זהב', 'כסף', 'קרם'];

export function resolveSelection(p: RawProduct, requested: Record<string, string> = {}, side: KippahSide = 'top'): ResolvedSelection {
  const opts = (p.variantOptions ?? []).filter(o => o && typeof o.name === 'string' && Array.isArray(o.values));
  // keep only valid selections
  const selected: Record<string, string> = {};
  for (const o of opts) {
    const v = requested[o.name];
    if (typeof v === 'string' && o.values.includes(v)) selected[o.name] = v;
  }
  const fa = p.filterAttributes ?? {};
  const pick = (re: RegExp): Sourced => {
    const opt = opts.find(o => re.test(o.name) && selected[o.name]);
    if (opt) return { value: selected[opt.name], source: 'variant' };
    const key = Object.keys(fa).find(k => re.test(k) && fa[k]);
    if (key) return { value: fa[key], source: 'catalog' };
    return null;
  };

  let material = pick(MATERIAL_OPT);
  if (!material && p.name) {
    const k = materialKindOf(p.name);
    if (k === 'satin') material = { value: 'סאטן', source: 'name' };
    else if (k === 'linen') material = { value: 'פשתן', source: 'name' };
  }
  let color = pick(COLOR_OPT);
  if (!color && p.name) {
    const c = NAME_COLORS.find(c => p.name!.includes(c));
    if (c) color = { value: c, source: 'name' };
  }

  const visualOpts = opts.filter(o => isVisualOption(o.name));
  const missingOptions = visualOpts.filter(o => !selected[o.name]).map(o => o.name);
  const cfg = p.logoStudio ?? {};
  const mainImg = p.imgUrl || p.image_url || null;

  const validArea = (pa: LogoStudioProductConfig['printArea'] | undefined) =>
    !!pa && [pa.cx, pa.cy, pa.minW, pa.maxW, pa.defaultW, pa.maxShift].every(n => typeof n === 'number' && n >= 0 && n <= 1) && pa.minW < pa.maxW;

  /** Photo for one side of the current selection — never another variant's photo. */
  const photoFor = (which: KippahSide): { image: ResolvedSelection['image']; status: ResolvedSelection['imageStatus'] } => {
    const map = which === 'top' ? cfg.variantImages ?? {} : cfg.bottomVariantImages ?? {};
    if (visualOpts.length === 0) {
      const url = which === 'top' ? mainImg : (cfg.bottomImage || null);
      if (url) return { image: { url, source: 'product' }, status: 'ok' };
      return { image: null, status: which === 'top' ? 'no_image' : 'no_bottom_image' };
    }
    if (missingOptions.length) return { image: null, status: 'choose_variant' };
    const names = visualOpts.map(o => o.name);
    const url = map[variantImageKey(selected, names)] || names.map(n => map[`${n}=${selected[n]}`]).find(Boolean);
    if (url) return { image: { url, source: 'variant' }, status: 'ok' };
    return { image: null, status: which === 'top' ? 'missing_variant_image' : 'no_bottom_image' };
  };
  const top = photoFor('top');
  const bottom = photoFor('bottom');
  const current = side === 'bottom' ? bottom : top;
  const image = current.image;
  const imageStatus = current.status;

  const areaCfg = side === 'bottom' ? cfg.bottomPrintArea : cfg.printArea;
  const printArea = validArea(areaCfg) ? areaCfg! : DEFAULT_PRINT_AREA;
  const mmCfg = side === 'bottom' ? (cfg.bottomMaxPrintWidthMm ?? cfg.maxPrintWidthMm) : cfg.maxPrintWidthMm;

  const finishes = (cfg.finishes?.length ? cfg.finishes : ['print']).filter(f => f === 'print' || f === 'embroidery');

  return {
    side,
    sidesAvailable: { top: top.status === 'ok', bottom: bottom.status === 'ok' },
    productId: p.id,
    productName: p.name ?? '',
    selectedVariants: selected,
    material,
    materialKind: materialKindOf(material?.value),
    color,
    image,
    imageStatus,
    missingOptions,
    finishes: finishes.length ? finishes : ['print'],
    printArea,
    maxPrintWidthMm: typeof mmCfg === 'number' && mmCfg > 0 ? mmCfg : null,
  };
}

export interface Placement { x: number; y: number; w: number } // relative to image (centre x/y, width)

export function clampPlacement(pl: Partial<Placement> | null | undefined, area: ResolvedSelection['printArea']): Placement {
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const w = Math.min(area.maxW, Math.max(area.minW, num(pl?.w, area.defaultW)));
  const x = Math.min(area.cx + area.maxShift, Math.max(area.cx - area.maxShift, num(pl?.x, area.cx)));
  const y = Math.min(area.cy + area.maxShift, Math.max(area.cy - area.maxShift, num(pl?.y, area.cy)));
  return { x, y, w };
}

/** Is this a kippah the studio can design for? */
export function isStudioKippah(p: RawProduct): boolean {
  if (p.logoStudio?.disabled) return false;
  if (p.hidden === true || p.active === false) return false;
  return p.customDesign === true || p.isEventKippot === true;
}
