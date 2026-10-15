'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import s from './LogoStudio.module.css';
import { useAuth } from '@/app/contexts/AuthContext';
import { ensureGuestUser, onGuestUid } from '@/lib/logoStudio/guestAuth';
import { useCart, getEventKippahPricePerUnit } from '@/app/contexts/CartContext';
import { logoFontFaceCss } from '@/lib/logoStudio/fonts';
import { DEFAULT_SPEC, type LogoSpec } from '@/lib/logoStudio/types';
import type { ResolvedSelection, KippahSide } from '@/lib/logoStudio/catalog';
import { KIPA_EXTRA_SIDE_PRICE, KIPA_MIN_QTY, KIPA_EMBROIDERY_SURCHARGE } from '@/app/lib/kippot';
import type { CartItem } from '@/app/contexts/CartContext';
import { studioApi, ApiError, type QuotaView, type CatalogProduct, type ApproveResult } from './studioApi';
import { useSideDesign, errText, type LogoMode, type SideDesign, type SideContext } from './useSideDesign';
import KippahStep from './components/KippahStep';
import DetailsStep from './components/DetailsStep';
import DesignStep from './components/DesignStep';
import MockupStep from './components/MockupStep';
import ApproveStep, { ApproveBothStep } from './components/ApproveStep';
import UploadLogoStep from './components/UploadLogoStep';
import { QuotaBadge, CodeRedeem } from './components/QuotaPanel';

type StepId = 'kippah' | 'details' | 'design' | 'mockup' | 'approve';
const STEPS: { id: StepId; label: string }[] = [
  { id: 'kippah', label: 'בחירת כיפה' },
  { id: 'details', label: 'התאמת הלוגו' },
  { id: 'design', label: 'יצירה ותיקונים' },
  { id: 'mockup', label: 'הדמיה על הכיפה' },
  { id: 'approve', label: 'אישור ושמירה' },
];
const SIDES: KippahSide[] = ['top', 'bottom'];
const SIDE_TITLE: Record<KippahSide, string> = { top: 'צד עליון', bottom: 'צד תחתון (פנים הכיפה)' };

/** Local draft — ONLY to protect the customer's choices from refresh/redirect loss. Never used for identity or quota. */
const DRAFT_KEY = 'ls:draft:v2';
interface SideDraft { projectId: string | null; spec: LogoSpec; mode: LogoMode }
interface Draft {
  productId: string | null; selectedVariants: Record<string, string>; step: StepId;
  side: KippahSide; bothSides: boolean; qty: number;
  /** "רקמה — צד עליון" */
  embroidery?: boolean;
  /** both sides: which sides the customer already approved (top first, then bottom) */
  sidesDone?: Partial<Record<KippahSide, boolean>>;
  sides: Partial<Record<KippahSide, SideDraft>>;
}
function readDraft(): Draft | null {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; }
}
function writeDraft(d: Draft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ } }

function parseVariants(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return {};
    return Object.fromEntries(Object.entries(v).filter(([k, val]) => typeof k === 'string' && typeof val === 'string')) as Record<string, string>;
  } catch { return {}; }
}

const cartLineIdFor = (p: { styleId: string | null; inventoryProductId: string | null; productId: string }) =>
  p.styleId ? (p.inventoryProductId ?? `event-logo-${p.styleId}`) : p.productId;

export default function LogoStudioClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  /** anonymous studio session — customers design without signing in */
  const [guestUid, setGuestUid] = useState<string | null>(null);
  useEffect(() => onGuestUid(setGuestUid), []);
  const { items: cartItems, addItem, removeItem } = useCart();

  const [step, setStep] = useState<StepId>('kippah');
  const [productId, setProductId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, string>>({});
  /** the side being designed now (one side, or the current phase of "both sides") */
  const [side, setSide] = useState<KippahSide>('top');
  /** "print both sides": design the top side first, approve it, then the bottom side, then approve both together */
  const [bothSides, setBothSides] = useState(false);
  /** both sides: sides the customer approved ("✓ אישור הצד העליון") */
  const [sidesDone, setSidesDone] = useState<Partial<Record<KippahSide, boolean>>>({});
  /** "רקמה — צד עליון": the logo is embroidered (not printed) on the top side (+₪5 per kippah) */
  const [embroidery, setEmbroidery] = useState(false);
  const [initialQty, setInitialQty] = useState<number>(KIPA_MIN_QTY);
  const [otherSideOffer, setOtherSideOffer] = useState<KippahSide | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaView | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [pendingProject, setPendingProject] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);
  const pendingAfterLogin = useRef<null | (() => void)>(null);

  /** the uid the studio works with: Google account if signed in, otherwise the guest session */
  const sessionUid = user?.uid ?? guestUid;
  const signedIn = !!sessionUid;
  const userRef = useRef(sessionUid);
  useEffect(() => { userRef.current = sessionUid; }, [sessionUid]);
  const exhausted = signedIn && quota !== null && quota.remaining < 1;

  const refreshMe = useCallback(async () => {
    try {
      const me = await studioApi.me();
      setQuota(me.quota); setWhatsapp(me.contactWhatsapp);
    } catch { /* non-fatal */ }
  }, []);

  /** no Google sign-in: open (or reuse) a guest session, then continue the action */
  const requireSignIn = useCallback(async (then?: () => void) => {
    setError(null);
    if (userRef.current) { then?.(); return; }
    pendingAfterLogin.current = then ?? null;
    try { await ensureGuestUser(); }
    catch { setError('לא הצלחנו לפתוח את הסטודיו. רעננו את הדף ונסו שוב.'); pendingAfterLogin.current = null; }
  }, []);

  // open the guest session up front, so the customer never sees a sign-in step
  useEffect(() => {
    if (authLoading || user || guestUid) return;
    ensureGuestUser().catch(() => undefined);
  }, [authLoading, user, guestUid]);

  const qpMode = params.get('mode');
  const ctx: SideContext = {
    productId, variants, signedIn, exhausted,
    isSignedIn: () => !!userRef.current,
    requireSignIn: then => { void requireSignIn(then); },
    setQuota, refreshMe,
    // a fresh AI logo opens the corrections step (both sides: of the side being designed now)
    onGenerated: () => { setStep('design'); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  };
  const initialMode: LogoMode = qpMode === 'upload' ? 'upload' : 'ai';
  const top = useSideDesign('top', ctx, initialMode);
  const bottom = useSideDesign('bottom', ctx, initialMode);
  const designs: Record<KippahSide, SideDesign> = { top, bottom };
  // both sides are shown together only on the final approval; every other step works on ONE side
  const activeSides: KippahSide[] = bothSides && step === 'approve' ? SIDES : [side];
  const active = activeSides.map(sd => designs[sd]);
  const cur = designs[side];
  const anyBusy = active.some(d => !!d.busy) || approving;
  /** a side counts as approved only while its approved design still has a valid mockup */
  const sideReady = (sd: KippahSide) => !!sidesDone[sd] && designs[sd].hasVersion && !!designs[sd].approveMockup;
  const bothReady = SIDES.every(sideReady);

  // ── init from URL / draft ──────────────────────────────────────────────────
  const initRan = useRef(false);
  useEffect(() => {
    if (initRan.current) return; // run once
    initRan.current = true;
    const draft = readDraft();
    // from /kippot-order or /event-kippot: ?style=<id>&qty=<n>&side=top|bottom[&sides=both]
    const qpStyle = params.get('style');
    const qpProduct = params.get('productId') || (qpStyle && /^[a-z0-9-]{1,40}$/.test(qpStyle) ? `style:${qpStyle}` : null);
    const qpProject = params.get('project');
    const qpQty = Number(params.get('qty'));
    const qpSide = params.get('side');
    const qpBoth = params.get('sides') === 'both';
    // from /event-kippot or /kippot-order with "רקמה": &finish=embroidery
    const qpEmbroidery = params.get('finish') === 'embroidery';
    const qpModeValid = qpMode === 'upload' || qpMode === 'ai' ? qpMode : null;
    if (qpProduct) {
      setProductId(qpProduct);
      setVariants(parseVariants(params.get('v')));
      setSide(qpSide === 'bottom' ? 'bottom' : 'top');
      setBothSides(qpBoth);
      if (qpBoth) setSide('top');
      setSidesDone({});
      setEmbroidery(qpEmbroidery && !qpBoth && qpSide !== 'bottom');
      if (Number.isFinite(qpQty) && qpQty >= KIPA_MIN_QTY) setInitialQty(Math.min(5000, Math.round(qpQty)));
      setStep('kippah');
      // keep the texts the customer typed before (not the projects — new kippah / new start)
      for (const sd of SIDES) {
        const d = draft?.sides?.[sd];
        if (d?.spec) designs[sd].hydrate({ spec: d.spec, ...(qpModeValid ? {} : { mode: d.mode }) });
      }
    } else if (draft) {
      setProductId(draft.productId);
      setVariants(draft.selectedVariants ?? {});
      setSide(draft.side === 'bottom' ? 'bottom' : 'top');
      setBothSides(!!draft.bothSides);
      setSidesDone(draft.bothSides ? (draft.sidesDone ?? {}) : {});
      setEmbroidery(!!draft.embroidery && !draft.bothSides && draft.side !== 'bottom');
      if (draft.qty && draft.qty >= KIPA_MIN_QTY) setInitialQty(draft.qty);
      setStep(draft.step ?? 'kippah');
      for (const sd of SIDES) {
        const d = draft.sides?.[sd];
        if (d) designs[sd].hydrate({ projectId: d.projectId, spec: d.spec, ...(qpModeValid ? {} : { mode: d.mode }) });
      }
    }
    if (qpProject && /^[a-f0-9]{8,40}$/.test(qpProject)) setPendingProject(qpProject);
    setInitDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // persist draft
  useEffect(() => {
    if (!initDone) return;
    writeDraft({
      productId, selectedVariants: variants, step, side, bothSides, embroidery, qty: initialQty, sidesDone,
      sides: {
        top: { projectId: top.projectId, spec: top.spec, mode: top.mode },
        bottom: { projectId: bottom.projectId, spec: bottom.spec, mode: bottom.mode },
      },
    });
  }, [initDone, productId, variants, step, side, bothSides, embroidery, initialQty, sidesDone, top.projectId, top.spec, top.mode, bottom.projectId, bottom.spec, bottom.mode]);

  // ?project=<id> (link from "my designs"): open that project on its own side
  useEffect(() => {
    if (!sessionUid || !pendingProject) return;
    const pid = pendingProject;
    setPendingProject(null);
    studioApi.getProject(pid)
      .then(r => {
        const sd = r.project.side === 'bottom' ? 'bottom' : 'top';
        setProductId(r.project.productId);
        setVariants(r.project.selectedVariants);
        setBothSides(false); setSide(sd);
        setEmbroidery(sd === 'top' && r.project.finish === 'embroidery');
        designs[sd].hydrate({ projectId: pid });
        setStep(r.project.currentVersionId ? 'design' : 'details');
      })
      .catch(e => { if (!(e instanceof ApiError && e.status === 404)) setError(errText(e, 'טעינת הפרויקט נכשלה.')); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- designs are stable per render
  }, [sessionUid, pendingProject]);

  // ── catalog item ───────────────────────────────────────────────────────────
  const catalogSide: KippahSide = bothSides ? 'top' : side;
  useEffect(() => {
    if (!productId) { setProduct(null); setSelection(null); return; }
    let cancelled = false;
    setCatalogLoading(true); setCatalogErr(null);
    studioApi.catalogItem(productId, variants, catalogSide)
      .then(r => {
        if (cancelled) return;
        setProduct(r.product); setSelection(r.selection);
        if (!r.studioEnabled) setCatalogErr('שימו לב: הכיפה הזו לא מסומנת לעיצוב אישי. אפשר לבחור כיפה אחרת מהרשימה.');
      })
      .catch(e => { if (!cancelled) setCatalogErr(errText(e, 'טעינת הכיפה נכשלה.')); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [productId, variants, catalogSide]);

  useEffect(() => { if (sessionUid) refreshMe(); else setQuota(null); }, [sessionUid, refreshMe]);

  // run an action queued before sign-in
  useEffect(() => {
    if (sessionUid && pendingAfterLogin.current) {
      const fn = pendingAfterLogin.current;
      pendingAfterLogin.current = null;
      fn();
    }
  }, [sessionUid]);

  // ── selection changes (apply to both sides' projects) ──────────────────────
  async function chooseProduct(id: string) {
    setProductId(id); setVariants({});
    await Promise.all(SIDES.map(sd => designs[sd].patchSelection({ productId: id, selectedVariants: {} })));
  }
  async function changeVariant(name: string, value: string) {
    const next = { ...variants, [name]: value };
    setVariants(next);
    await Promise.all(SIDES.map(sd => designs[sd].patchSelection({ selectedVariants: next })));
  }
  function chooseSide(choice: KippahSide | 'both' | 'embroidery') {
    if (choice === 'embroidery') { setBothSides(false); setSide('top'); setEmbroidery(true); return; }
    setEmbroidery(false);
    if (choice === 'both') { setBothSides(true); setSide('top'); return; }
    setBothSides(false); setSide(choice);
  }
  /** the finish the customer chose on the kippah step — locks the mockup finish */
  const finishFor = (sd: KippahSide): 'print' | 'embroidery' => (embroidery && !bothSides && sd === 'top' ? 'embroidery' : 'print');

  // ── cart ───────────────────────────────────────────────────────────────────
  // One kippah line per product/style; the second side lives on the same line
  // (+₪KIPA_EXTRA_SIDE_PRICE per kippah, like "print-both" on /kippot-order).
  function designOf(a: ApproveResult, d: SideDesign) {
    return {
      approvalId: a.approvalId,
      projectId: d.projectId!,
      versionId: d.currentVersion!.id,
      versionNumber: d.currentVersion!.n,
      side: a.side,
      logoUrl: a.logoUrl,
      mockupUrl: a.mockupUrl,
      finish: a.finish,
      placement: a.placement,
      variantsLabel: Object.values(a.selectedVariants).join(' · '),
      printWidthMm: a.production.printWidthMm,
      printHeightMm: a.production.printHeightMm,
      productionReady: a.production.ready,
    };
  }
  const labelOf = (a: ApproveResult) => (a.uploaded ? 'הלוגו שהעליתם' : (a.spec.primaryText || a.spec.monogramLetters || 'לוגו אישי'));
  function printLine(a: ApproveResult, id: string, quantity: number) {
    return {
      id, name: `${a.finish === 'embroidery' ? 'רקמה' : 'הדפסה'} לכיפות — ${a.side === 'bottom' ? 'צד תחתון' : 'צד עליון'} — ${a.uploaded ? 'הלוגו שהעליתם' : 'לוגו אישי מהסטודיו'} (כלול במחיר)`,
      price: 0, quantity, cat: 'הדפסה', imgUrl: a.logoThumbUrl,
      printCustomization: {
        uploadedImageUrl: a.logoUrl, originalImageUrl: a.logoUrl,
        productType: 'כיפות', side: a.side, bgRemoved: a.bgRemoved ?? true,
        designText: labelOf(a), mockupUrl: a.mockupUrl,
        selectedFontLabel: a.font, printType: a.finish,
        ...(a.styleId ? { kippahStyle: a.styleId } : {}),
      },
    };
  }
  function kippahLine(a: ApproveResult, qty: number, unit: number, primary: ReturnType<typeof designOf>, second?: NonNullable<CartItem['customDesign']>['logoStudioSecond']): CartItem {
    return {
      id: cartLineIdFor(a),
      ...(a.inventoryProductId ? { productId: a.inventoryProductId } : {}),
      name: a.styleId ? `כיפות ${a.productName.replace(/^כיפה (פשתן|סאטן) — /, '')} — ${second ? 'הדפסה משני הצדדים' : a.uploaded ? 'הלוגו שלכם' : 'לוגו אישי מהסטודיו'}` : a.productName,
      price: unit,
      imgUrl: a.mockupThumbUrl,
      quantity: qty,
      cat: 'כיפות',
      embroideredKippah: a.embroidered === true,
      ...(Object.keys(a.selectedVariants).length ? { selectedVariants: a.selectedVariants } : {}),
      // existing order/admin/email pipelines already carry `customDesign`
      customDesign: {
        designId: a.approvalId,
        baseColor: '',
        productImageUrl: a.productImageUrl,
        text: labelOf(a),
        textColor: a.spec.color,
        fontSize: 0,
        fontFamily: a.font,
        position: 'center' as const,
        quantity: qty,
        previewImageUrl: a.mockupThumbUrl,
        createdAt: new Date().toISOString(),
        logoStudio: primary,
        ...(second ? { logoStudioSecond: second } : {}),
      },
    };
  }
  const materialOf = (a: ApproveResult) => (a.materialKind === 'satin' ? 'satin' as const : 'linen' as const);
  // דגם רקום (+₪5 לכיפה). embroideredKippah:false מונע זיהוי "רקמה" בשם כשהדגם אינו רקום
  const embroideredOf = (a: ApproveResult) => ({ embroideredKippah: a.embroidered === true });
  // רקמת הלוגו (במקום הדפסה) — +₪5 לכיפה, כמו "רקמה" בעמוד כיפות לאירועים
  const stitchExtra = (...finishes: (string | undefined)[]) => (finishes.includes('embroidery') ? KIPA_EMBROIDERY_SURCHARGE : 0);

  /** both sides: approve the two designs and add ONE kippah line carrying both */
  async function approveBoth(qty: number) {
    if (anyBusy) return;
    setApproving(true); setError(null);
    try {
      const aTop = await top.approveSnapshot();
      if (!aTop) return;
      const aBottom = await bottom.approveSnapshot();
      if (!aBottom) return;
      const lineId = cartLineIdFor(aTop);
      const unit = getEventKippahPricePerUnit(0, qty, materialOf(aTop), embroideredOf(aTop)) + KIPA_EXTRA_SIDE_PRICE + stitchExtra(aTop.finish, aBottom.finish);
      removeItem(lineId); removeItem(`print-${lineId}`); removeItem(`print-side2-${lineId}`);
      addItem(kippahLine(aTop, qty, unit, designOf(aTop, top), designOf(aBottom, bottom)));
      addItem(printLine(aTop, `print-${lineId}`, qty));
      addItem(printLine(aBottom, `print-side2-${lineId}`, qty));
      window.gtag?.('event', 'add_to_cart', { currency: 'ILS', items: [{ item_id: aTop.inventoryProductId ?? aTop.productId, item_name: aTop.productName, quantity: qty }] });
      router.push('/cart');
    } finally {
      setApproving(false);
    }
  }

  // one side (may join a line that already has the other side)
  const pendingLineId = cur.project ? cartLineIdFor({ styleId: cur.project.isStyle ? cur.project.productId.replace(/^style:/, '') : null, inventoryProductId: cur.project.inventoryProductId, productId: cur.project.productId }) : null;
  const existingLine: CartItem | undefined = pendingLineId ? cartItems.find(i => i.id === pendingLineId && i.customDesign?.logoStudio) : undefined;
  const existingSides: KippahSide[] = existingLine?.customDesign?.logoStudio
    ? [existingLine.customDesign.logoStudio.side ?? 'top', ...(existingLine.customDesign.logoStudioSecond ? [existingLine.customDesign.logoStudioSecond.side ?? 'bottom'] : [])]
    : [];
  const addsSecondSide = !!existingLine && existingSides.length > 0 && !existingSides.includes(side) && existingSides.length < 2;

  async function approveOne(qty: number) {
    if (anyBusy) return;
    setApproving(true); setError(null);
    try {
      const a = await cur.approveSnapshot();
      if (!a) return;
      const lineId = cartLineIdFor(a);
      const design = designOf(a, cur);
      const material = materialOf(a);
      const existing = cartItems.find(i => i.id === lineId && i.customDesign?.logoStudio);
      const exPrimary = existing?.customDesign?.logoStudio;
      const exSecond = existing?.customDesign?.logoStudioSecond;
      const asSecond = !!exPrimary && (exPrimary.side ?? 'top') !== a.side;

      if (existing && asSecond) {
        const quantity = existing.quantity;
        const unit = getEventKippahPricePerUnit(0, quantity, material, embroideredOf(a)) + KIPA_EXTRA_SIDE_PRICE + stitchExtra(a.finish, exPrimary?.finish);
        removeItem(lineId);
        addItem({ ...existing, price: unit, customDesign: { ...existing.customDesign!, logoStudioSecond: design } });
        removeItem(`print-side2-${lineId}`);
        addItem(printLine(a, `print-side2-${lineId}`, quantity));
      } else {
        const keepSecond = exSecond && (exSecond.side ?? 'bottom') !== a.side ? exSecond : undefined;
        const unit = getEventKippahPricePerUnit(0, qty, material, embroideredOf(a)) + (keepSecond ? KIPA_EXTRA_SIDE_PRICE : 0) + stitchExtra(a.finish, keepSecond?.finish);
        removeItem(lineId); removeItem(`print-${lineId}`);
        if (!keepSecond) removeItem(`print-side2-${lineId}`);
        addItem(kippahLine(a, qty, unit, design, keepSecond));
        addItem(printLine(a, `print-${lineId}`, qty));
        if (keepSecond) {
          removeItem(`print-side2-${lineId}`);
          addItem({ ...printLine(a, `print-side2-${lineId}`, qty), imgUrl: undefined, printCustomization: { uploadedImageUrl: keepSecond.logoUrl, originalImageUrl: keepSecond.logoUrl, productType: 'כיפות', side: keepSecond.side ?? 'bottom', bgRemoved: true, mockupUrl: keepSecond.mockupUrl } });
        }
      }
      window.gtag?.('event', 'add_to_cart', { currency: 'ILS', items: [{ item_id: a.inventoryProductId ?? a.productId, item_name: a.productName, quantity: qty }] });

      // offer the other side when it has a photo and is not designed yet
      const other: KippahSide = a.side === 'top' ? 'bottom' : 'top';
      const hasOtherAlready = asSecond || !!(existing && !asSecond && exSecond && (exSecond.side ?? 'bottom') === other);
      if (cur.project?.selection.sidesAvailable[other] && !hasOtherAlready) setOtherSideOffer(other);
      else router.push('/cart');
    } finally {
      setApproving(false);
    }
  }

  // ── navigation ─────────────────────────────────────────────────────────────
  const allHaveVersion = active.every(d => d.hasVersion);
  const allHaveMockup = active.every(d => !!d.approveMockup);
  const stepEnabled: Record<StepId, boolean> = {
    kippah: true,
    details: !!productId,
    design: allHaveVersion,
    mockup: allHaveVersion,
    // both sides: the final approval opens only after the top AND the bottom were each approved
    approve: bothSides ? bothReady : allHaveVersion && allHaveMockup,
  };
  const top0 = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const go = (id: StepId) => { if (stepEnabled[id]) { setStep(id); setError(null); setNotice(null); top0(); } };
  const stepIndex = STEPS.findIndex(x => x.id === step);
  const showRedeem = exhausted && step !== 'kippah' && active.some(d => d.mode === 'ai' && !d.uploadedCurrent);

  // ── both sides: top → bottom → final approval ──────────────────────────────
  /** open a side where the customer left it: corrections if there is a logo, otherwise the details */
  function openSide(sd: KippahSide) {
    const d = designs[sd];
    if (sd === 'bottom' && !d.hasVersion && !(d.spec.primaryText ?? '').trim() && !(d.spec.monogramLetters ?? '').trim()) {
      // start the bottom side with the top side's event, font and color
      d.reset({ ...DEFAULT_SPEC, eventType: top.spec.eventType, fontId: top.spec.fontId, color: top.spec.color });
    }
    setSide(sd); setError(null); setNotice(null);
    setStep(!d.hasVersion ? 'details' : d.currentVersion?.upload ? 'mockup' : 'design');
    top0();
  }
  /** "✓ אישור הצד" on the mockup step of the side being designed */
  function approveSide() {
    const sd = side;
    setSidesDone(prev => ({ ...prev, [sd]: true }));
    const other: KippahSide = sd === 'top' ? 'bottom' : 'top';
    if (sideReady(other)) { setStep('approve'); setError(null); setNotice(null); top0(); return; }
    openSide(other);
    if (sd === 'top') setNotice('✓ הצד העליון אושר. עכשיו מעצבים את הצד התחתון (פנים הכיפה) — אפשר תמיד לחזור לצד העליון לתיקונים.');
  }
  const sideNextLabel = (): string => {
    const other: KippahSide = side === 'top' ? 'bottom' : 'top';
    if (sideReady(other)) return `✓ אישור ${SIDE_TITLE[side]} — לאישור הסופי של שני הצדדים ←`;
    return side === 'top' ? '✓ אישור הצד העליון — המשך לעיצוב הצד התחתון ←' : '✓ אישור הצד התחתון — המשך לצד העליון ←';
  };

  // ── per-side blocks ────────────────────────────────────────────────────────
  function modeTabs(d: SideDesign) {
    return (
      <div className={s.modeTabs} role="tablist" aria-label={`איך יוצרים את הלוגו — ${SIDE_TITLE[d.side]}`}>
        <button type="button" role="tab" aria-selected={d.mode === 'upload'} className={s.modeTab} data-active={d.mode === 'upload'} onClick={() => d.setMode('upload')}>
          <span className={s.modeTabTitle}>⬆️ יש לי לוגו מוכן</span>
          <span className={s.modeTabSub}>העלאת קובץ · הסרת רקע · ללא עלות</span>
        </button>
        <button type="button" role="tab" aria-selected={d.mode === 'ai'} className={s.modeTab} data-active={d.mode === 'ai'} onClick={() => d.setMode('ai')}>
          <span className={s.modeTabTitle}>✨ עיצוב לוגו ב-AI</span>
          <span className={s.modeTabSub}>שמות, תאריך, גופן וצבע · תיקונים בשיחה</span>
        </button>
      </div>
    );
  }

  const generateLabel = (d: SideDesign) => (d.hasVersion ? 'צור גרסה חדשה מהפרטים' : 'צור את הלוגו');
  function generateButton(d: SideDesign) {
    return (
      <>
        {signedIn && quota && !exhausted && <div className={s.costNote}>היצירה תצרוך ניסיון עיצוב אחד (נותרו {quota.remaining}). אם היצירה תיכשל — הניסיון לא ינוצל.</div>}
        {exhausted && <div className={s.costNote}>ניצלת את ניסיונות העיצוב — הזינו קוד למעלה כדי להמשיך.</div>}
        <button type="button" className={s.primary} disabled={!!d.busy || d.specErrors.length > 0 || exhausted || !productId} onClick={() => d.generateFromDraft()}>
          {d.busy === 'generate' ? <><span className={s.spinner} /> יוצרים את הלוגו… (עד דקה)</> : `${generateLabel(d)}${bothSides ? ` — ${SIDE_TITLE[d.side]}` : ''}`}
        </button>
      </>
    );
  }

  function detailsBody(d: SideDesign) {
    return (
      <>
        {modeTabs(d)}
        {d.mode === 'upload'
          ? <UploadLogoStep current={d.uploadedCurrent} signedIn={signedIn} busy={d.busy === 'uploadLogo' || d.busy === 'bg' ? d.busy : null} error={d.uploadErr}
              onRequireSignIn={() => requireSignIn()} onUpload={d.uploadLogo} onSetBackground={d.setLogoBackground} />
          : <DetailsStep side={d.side} spec={d.spec} onChange={d.updateSpec} errors={d.specErrors} signedIn={signedIn}
              onRequireSignIn={() => requireSignIn()} inspirationThumb={d.inspirationThumb} onInspiration={d.setInspiration} />}
      </>
    );
  }

  function sideBlock(d: SideDesign, body: React.ReactNode) {
    return (
      <section key={d.side} className={bothSides ? s.sideSection : undefined} aria-label={SIDE_TITLE[d.side]}>
        {bothSides && <h2 className={s.sideTitle}>{d.side === 'top' ? '⬆️' : '⬇️'} {SIDE_TITLE[d.side]}</h2>}
        {d.busy === 'project' && <div className={s.card}><div className={s.loadingCard}><span className={`${s.spinner} ${s.spinnerDark}`} /> טוען את העיצוב…</div></div>}
        {(bothSides || d.side === side) && d.error && <div className={s.error} role="alert">{d.error}</div>}
        {body}
      </section>
    );
  }

  return (
    <div className={s.page}>
      <style dangerouslySetInnerHTML={{ __html: logoFontFaceCss() }} />
      <div className={s.wrap}>
        <h1 className={s.title}>✨ סטודיו לוגו אישי לכיפה</h1>
        <p className={s.subtitle}>{bothSides ? 'הדפסה משני הצדדים: קודם מעצבים ומאשרים את הצד העליון, אחר כך את הצד התחתון, ובסוף מאשרים את שניהם יחד בהדמיה.' : 'מעצבים לוגו, מתקנים בשיחה ורואים אותו על הכיפה שבחרתם.'}</p>

        <nav className={s.steps} aria-label="שלבים">
          {STEPS.map((st, i) => (
            <button key={st.id} type="button" className={s.stepBtn} data-active={st.id === step} data-done={i < stepIndex} disabled={!stepEnabled[st.id]} onClick={() => go(st.id)} aria-current={st.id === step ? 'step' : undefined}>
              <span className={s.stepNum}>{i + 1}</span>{st.label}
            </button>
          ))}
        </nav>

        <QuotaBadge quota={quota} signedIn={signedIn} />
        {error && <div className={s.error} role="alert">{error}</div>}
        {notice && <div className={s.ok}>{notice}</div>}

        {bothSides && step !== 'kippah' && (
          <div className={s.sidesBar} role="navigation" aria-label="שלבי העיצוב לשני הצדדים">
            {SIDES.map((sd, i) => {
              const isActive = step !== 'approve' && side === sd;
              // the bottom side opens after the top side was approved; the top side is always reachable for fixes
              const enabled = sd === 'top' || !!sidesDone.top;
              return (
                <span key={sd} style={{ display: 'contents' }}>
                  <button type="button" className={s.sidePill} data-active={isActive} data-done={sideReady(sd)} disabled={anyBusy || !enabled || isActive}
                    aria-current={isActive ? 'step' : undefined} onClick={() => openSide(sd)}>
                    {sideReady(sd) ? '✓ ' : `${i + 1}. `}{SIDE_TITLE[sd]}
                  </button>
                  <span className={s.sidesArrow} aria-hidden>←</span>
                </span>
              );
            })}
            <button type="button" className={s.sidePill} data-active={step === 'approve'} disabled={anyBusy || !bothReady || step === 'approve'}
              aria-current={step === 'approve' ? 'step' : undefined} onClick={() => go('approve')}>
              3. אישור סופי
            </button>
            <span className={s.phaseNote}>
              {step === 'approve'
                ? 'שני הצדדים אושרו — בדקו את שתי ההדמיות ואשרו סופית. אפשר עדיין לחזור לתיקון כל אחד מהצדדים.'
                : side === 'top'
                  ? (sidesDone.top ? 'מתקנים את הצד העליון. בסיום לחצו שוב על „אישור הצד” כדי לחזור להמשך.' : 'שלב 1 מתוך 2: מעצבים את הצד העליון. כשתסיימו ותאשרו אותו בהדמיה — נעבור לצד התחתון.')
                  : 'שלב 2 מתוך 2: מעצבים את הצד התחתון (פנים הכיפה). אפשר לחזור לצד העליון לתיקונים בכל רגע.'}
            </span>
            {selection && SIDES.some(sd => !selection.sidesAvailable[sd]) && (
              <span className={s.hint} style={{ width: '100%' }}>לאחד הצדדים עדיין אין תמונה לכיפה זו, ולכן לא ניתן ליצור עליו הדמיה. אפשר לפנות אלינו בוואטסאפ.</span>
            )}
          </div>
        )}

        {showRedeem && <CodeRedeem exhausted whatsapp={whatsapp} onRedeemed={(q, msg) => { setQuota(q); setNotice(msg); }} />}

        {step === 'kippah' && (
          <KippahStep product={product} selection={selection} selectedVariants={variants} loading={catalogLoading} error={catalogErr}
            side={side} bothSides={bothSides} embroidery={embroidery} onChangeSide={chooseSide}
            onChooseProduct={chooseProduct} onChangeVariant={changeVariant} onNext={() => go('details')} />
        )}

        {step === 'details' && finishFor(side) === 'embroidery' && (
          <div className={s.ok}>🧵 עיצוב לרקמה על הצד העליון — העלו לוגו מוכן או עצבו לוגו ב-AI. לרקמה מומלץ לוגו פשוט: עד 5 צבעים, בלי מעברי צבע ובלי פרטים קטנים מאוד.</div>
        )}
        {step === 'details' && active.map(d => sideBlock(d, detailsBody(d)))}
        {step === 'details' && cur.mode === 'upload' && (
          <div className={s.sticky}>
            <div className={s.stickyInner}>
              {!cur.uploadedCurrent && <div className={s.costNote}>העלאת לוגו מוכן לא צורכת ניסיונות עיצוב.</div>}
              <button type="button" className={s.primary} disabled={anyBusy || !cur.uploadedCurrent || !productId} onClick={() => go('mockup')}>המשך להדמיה על הכיפה ←</button>
            </div>
          </div>
        )}
        {step === 'details' && cur.mode === 'ai' && (
          <div className={s.sticky}>
            <div className={s.stickyInner}>
              {cur.hasVersion && <button type="button" className={s.ghost} disabled={anyBusy} onClick={() => go('design')}>בלי שינוי — חזרה ללוגו הקיים (גרסה {cur.currentVersion?.n})</button>}
              {generateButton(cur)}
            </div>
          </div>
        )}

        {step === 'design' && active.map(d => sideBlock(d, d.project
          ? <DesignStep project={d.project} quota={quota} busy={d.busy === 'generate' || d.busy === 'chat' || d.busy === 'select' ? d.busy : null}
              onSelectVersion={d.selectVersion} onSendChat={d.sendChat} onApplyProposal={d.applyProposal}
              onEditDetails={() => { if (d.currentVersion) { d.setSpec(d.currentVersion.spec); d.setMode(d.currentVersion.upload ? 'upload' : 'ai'); } go('details'); }}
              onNext={() => go('mockup')} blocked={exhausted} />
          : null))}

        {step === 'mockup' && active.map(d => sideBlock(d, d.project
          ? <MockupStep project={d.project} quota={quota} busy={d.busy === 'mockup' || d.busy === 'aiMockup' ? d.busy : null}
              selectedMockupId={d.selectedMockupId} onSelectMockup={d.setSelectedMockupId}
              onCompose={d.compose} onAiMockup={d.aiMockup} onBackToKippah={() => go('kippah')}
              onNext={bothSides ? approveSide : () => go('approve')} nextLabel={bothSides ? sideNextLabel() : undefined}
              blocked={exhausted} preferredFinish={finishFor(d.side)} />
          : null))}

        {step === 'approve' && bothSides && top.project && bottom.project && (
          <>
            {active.map(d => d.error ? <div key={d.side} className={s.error} role="alert">{SIDE_TITLE[d.side]}: {d.error}</div> : null)}
            <ApproveBothStep
              sides={[
                { title: SIDE_TITLE.top, project: top.project, mockup: top.approveMockup, onEdit: () => openSide('top') },
                { title: SIDE_TITLE.bottom, project: bottom.project, mockup: bottom.approveMockup, onEdit: () => openSide('bottom') },
              ]}
              product={product} busy={approving} error={null} initialQty={initialQty}
              onApprove={approveBoth} onBack={() => openSide(SIDES.find(sd => !sideReady(sd)) ?? 'bottom')} />
          </>
        )}
        {step === 'approve' && !bothSides && cur.project && (
          <>
            {cur.error && <div className={s.error} role="alert">{cur.error}</div>}
            <ApproveStep project={cur.project} product={product} mockup={cur.approveMockup} busy={approving} error={null}
              initialQty={initialQty} secondSideOf={addsSecondSide && existingLine ? { quantity: existingLine.quantity, sides: existingSides } : null}
              onApprove={approveOne} onBack={() => go('mockup')} />
          </>
        )}

        {otherSideOffer && (
          <div className={s.modalBack} role="dialog" aria-modal="true">
            <div className={s.modal}>
              <p className={s.cardTitle}>✓ העיצוב נשמר בסל</p>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                רוצים לעצב גם את {otherSideOffer === 'bottom' ? 'הצד התחתון (פנים הכיפה)' : 'הצד העליון'}?
                הוא יתווסף לאותן כיפות בסל (+₪{KIPA_EXTRA_SIDE_PRICE} לכיפה). לצד הזה מעצבים לוגו נפרד משלו.
              </p>
              <div className={s.row}>
                <button type="button" className={s.primary} style={{ flex: 1 }} onClick={() => {
                  const next = otherSideOffer;
                  setOtherSideOffer(null);
                  if (!designs[next].hasVersion) designs[next].reset({ ...DEFAULT_SPEC, eventType: cur.spec.eventType, fontId: cur.spec.fontId, color: cur.spec.color });
                  setSide(next); setStep('details'); window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>
                  עיצוב ל{otherSideOffer === 'bottom' ? 'צד התחתון' : 'צד העליון'}
                </button>
                <button type="button" className={s.secondary} onClick={() => { setOtherSideOffer(null); router.push('/cart'); }}>לסל</button>
              </div>
            </div>
          </div>
        )}

        {signedIn && !exhausted && step === 'design' && (
          <details style={{ marginTop: 8 }}>
            <summary className={s.ghost}>יש לי קוד להמשך עיצוב</summary>
            <CodeRedeem exhausted={false} whatsapp={whatsapp} onRedeemed={(q, msg) => { setQuota(q); setNotice(msg); }} />
          </details>
        )}
      </div>
    </div>
  );
}
