'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import s from './LogoStudio.module.css';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart, getEventKippahPricePerUnit } from '@/app/contexts/CartContext';
import { logoFontFaceCss } from '@/lib/logoStudio/fonts';
import { DEFAULT_SPEC, validateSpec, type LogoSpec } from '@/lib/logoStudio/types';
import type { ResolvedSelection, Placement, KippahSide } from '@/lib/logoStudio/catalog';
import { KIPA_EXTRA_SIDE_PRICE, KIPA_MIN_QTY } from '@/app/lib/kippot';
import type { CartItem } from '@/app/contexts/CartContext';
import { studioApi, ApiError, newOpId, type ProjectView, type QuotaView, type CatalogProduct, type MessageView } from './studioApi';
import KippahStep from './components/KippahStep';
import DetailsStep from './components/DetailsStep';
import DesignStep from './components/DesignStep';
import MockupStep from './components/MockupStep';
import ApproveStep from './components/ApproveStep';
import { QuotaBadge, CodeRedeem } from './components/QuotaPanel';

type StepId = 'kippah' | 'details' | 'design' | 'mockup' | 'approve';
const STEPS: { id: StepId; label: string }[] = [
  { id: 'kippah', label: 'בחירת כיפה' },
  { id: 'details', label: 'התאמת הלוגו' },
  { id: 'design', label: 'יצירה ותיקונים' },
  { id: 'mockup', label: 'הדמיה על הכיפה' },
  { id: 'approve', label: 'אישור ושמירה' },
];

/** Local draft — ONLY to protect the customer's choices from refresh/redirect loss. Never used for identity or quota. */
const DRAFT_KEY = 'ls:draft:v1';
interface Draft { productId: string | null; selectedVariants: Record<string, string>; spec: LogoSpec; projectId: string | null; step: StepId; side?: KippahSide; qty?: number }
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

const errText = (e: unknown, fallback = 'אירעה שגיאה. נסו שוב.') => (e instanceof ApiError ? e.messageHe ?? fallback : fallback);

export default function LogoStudioClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const { items: cartItems, addItem, removeItem } = useCart();

  const [step, setStep] = useState<StepId>('kippah');
  const [productId, setProductId] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [side, setSide] = useState<KippahSide>('top');
  const [initialQty, setInitialQty] = useState<number>(KIPA_MIN_QTY);
  const [otherSideOffer, setOtherSideOffer] = useState<null | { side: KippahSide; spec: LogoSpec }>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [selection, setSelection] = useState<ResolvedSelection | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogErr, setCatalogErr] = useState<string | null>(null);
  const [spec, setSpec] = useState<LogoSpec>(DEFAULT_SPEC);
  const [inspirationThumb, setInspirationThumb] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [quota, setQuota] = useState<QuotaView | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'generate' | 'chat' | 'select' | 'mockup' | 'aiMockup' | 'approve' | 'project'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);
  const pendingAfterLogin = useRef<null | (() => void)>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signedIn = !!user;
  // latest auth state for callbacks queued before sign-in (avoid stale closures)
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const exhausted = signedIn && quota !== null && quota.remaining < 1;

  // ── init from URL / draft ──────────────────────────────────────────────────
  const initRan = useRef(false);
  useEffect(() => {
    if (initRan.current) return; // run once — later URL changes (e.g. starting the other side) must not re-apply the draft
    initRan.current = true;
    const draft = readDraft();
    // from /kippot-order or /event-kippot: ?style=<id>&qty=<n>&side=top|bottom
    const qpStyle = params.get('style');
    const qpProduct = params.get('productId') || (qpStyle && /^[a-z0-9-]{1,40}$/.test(qpStyle) ? `style:${qpStyle}` : null);
    const qpProject = params.get('project');
    const qpVariants = parseVariants(params.get('v'));
    const qpQty = Number(params.get('qty'));
    const qpSide = params.get('side');
    if (qpProduct) {
      setProductId(qpProduct);
      setVariants(qpVariants);
      if (draft?.spec) setSpec(validateSpec(draft.spec).spec);
      setSide(qpSide === 'bottom' ? 'bottom' : 'top');
      if (Number.isFinite(qpQty) && qpQty >= KIPA_MIN_QTY) setInitialQty(Math.min(5000, Math.round(qpQty)));
      setStep('kippah');
    } else if (draft) {
      setProductId(draft.productId);
      setVariants(draft.selectedVariants ?? {});
      setSpec(validateSpec(draft.spec).spec);
      setSide(draft.side === 'bottom' ? 'bottom' : 'top');
      if (draft.qty && draft.qty >= KIPA_MIN_QTY) setInitialQty(draft.qty);
      setStep(draft.step ?? 'kippah');
    }
    const pid = qpProject || (!qpProduct ? draft?.projectId : null) || null;
    if (pid && /^[a-f0-9]{8,40}$/.test(pid)) setProjectId(pid);
    setInitDone(true);
  }, [params]);

  // persist draft
  useEffect(() => {
    if (!initDone) return;
    writeDraft({ productId, selectedVariants: variants, spec, projectId, step, side, qty: initialQty });
  }, [initDone, productId, variants, spec, projectId, step, side, initialQty]);

  // ── catalog item ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) { setProduct(null); setSelection(null); return; }
    let cancelled = false;
    setCatalogLoading(true); setCatalogErr(null);
    studioApi.catalogItem(productId, variants, side)
      .then(r => {
        if (cancelled) return;
        setProduct(r.product); setSelection(r.selection);
        if (!r.studioEnabled) setCatalogErr('שימו לב: הכיפה הזו לא מסומנת לעיצוב אישי. אפשר לבחור כיפה אחרת מהרשימה.');
      })
      .catch(e => { if (!cancelled) setCatalogErr(errText(e, 'טעינת הכיפה נכשלה.')); })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, [productId, variants, side]);

  // ── signed-in: quota + project ─────────────────────────────────────────────
  const refreshMe = useCallback(async () => {
    try {
      const me = await studioApi.me();
      setQuota(me.quota); setWhatsapp(me.contactWhatsapp);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { if (user) refreshMe(); else setQuota(null); }, [user, refreshMe]);

  useEffect(() => {
    if (!user || !projectId || project?.id === projectId) return;
    setBusy('project');
    studioApi.getProject(projectId)
      .then(r => {
        setProject(r.project);
        setProductId(r.project.productId);
        setVariants(r.project.selectedVariants);
        setSide(r.project.side ?? 'top');
        setSpec(r.project.draftSpec);
        setInspirationThumb(r.project.inspiration?.thumb ?? null);
        if (params.get('project')) setStep(r.project.currentVersionId ? 'design' : 'details');
      })
      .catch(e => {
        if (e instanceof ApiError && e.status === 404) { setProjectId(null); return; }
        setError(errText(e, 'טעינת הפרויקט נכשלה.'));
      })
      .finally(() => setBusy(null));
  }, [user, projectId, project?.id, params]);

  // run an action queued before sign-in
  useEffect(() => {
    if (user && pendingAfterLogin.current) {
      const fn = pendingAfterLogin.current;
      pendingAfterLogin.current = null;
      fn();
    }
  }, [user]);

  const requireSignIn = useCallback(async (then?: () => void) => {
    pendingAfterLogin.current = then ?? null;
    setError(null);
    try { await signInWithGoogle(); }
    catch { setError('ההתחברות נכשלה. נסו שוב.'); pendingAfterLogin.current = null; }
  }, [signInWithGoogle]);

  // ── draft edits (debounced server save when a project exists) ──────────────
  const updateSpec = useCallback((patch: Partial<LogoSpec>) => {
    setSpec(prev => {
      const next = { ...prev, ...patch };
      if (projectId && user) {
        if (patchTimer.current) clearTimeout(patchTimer.current);
        patchTimer.current = setTimeout(() => { studioApi.patchProject(projectId, { draftSpec: next }).catch(() => undefined); }, 1500);
      }
      return next;
    });
  }, [projectId, user]);

  const { errors: specErrors } = useMemo(() => validateSpec(spec), [spec]);

  // ── selection changes ──────────────────────────────────────────────────────
  async function chooseProduct(id: string) {
    setProductId(id); setVariants({}); setSelectedMockupId(null);
    if (projectId && user) {
      try { const r = await studioApi.patchProject(projectId, { productId: id, selectedVariants: {} }); setProject(r.project); }
      catch (e) { setError(errText(e)); }
    }
  }
  async function changeSide(next: KippahSide) {
    if (next === side) return;
    setSide(next); setSelectedMockupId(null);
    if (projectId && user) {
      try { const r = await studioApi.patchProject(projectId, { side: next }); setProject(r.project); }
      catch (e) { setError(errText(e)); }
    }
  }
  async function changeVariant(name: string, value: string) {
    const next = { ...variants, [name]: value };
    setVariants(next); setSelectedMockupId(null);
    if (projectId && user) {
      try { const r = await studioApi.patchProject(projectId, { selectedVariants: next }); setProject(r.project); }
      catch (e) { setError(errText(e)); }
    }
  }

  // ── generation ─────────────────────────────────────────────────────────────
  async function ensureProject(): Promise<string> {
    if (projectId && project) return projectId;
    if (!productId) throw new ApiError(400, 'product_required', 'נא לבחור כיפה.', {});
    const r = await studioApi.createProject(productId, variants, spec, side);
    setProjectId(r.project.id); setProject(r.project);
    return r.project.id;
  }

  async function generate(useSpec: LogoSpec, baseVersionId: string | null, source: 'initial' | 'revision' | 'edit') {
    if (busy) return;
    if (!userRef.current) { requireSignIn(() => generate(useSpec, baseVersionId, source)); return; }
    if (exhausted) { setError(null); return; }
    setBusy('generate'); setError(null); setNotice(null);
    try {
      const pid = await ensureProject();
      const r = await studioApi.generate(pid, { opId: newOpId(), spec: useSpec, baseVersionId, source });
      setProject(r.project); setSpec(r.project.draftSpec);
      if (r.quota) setQuota(r.quota);
      setSelectedMockupId(null);
      setStep('design');
    } catch (e) {
      if (e instanceof ApiError && e.data?.quota) setQuota(e.data.quota as QuotaView);
      if (e instanceof ApiError && e.code === 'quota_exhausted') { await refreshMe(); }
      else setError(errText(e, 'היצירה נכשלה. הניסיון לא נוצל — אפשר לנסות שוב.'));
    } finally {
      setBusy(null);
    }
  }

  async function selectVersion(id: string) {
    if (!projectId) return;
    setBusy('select');
    try { const r = await studioApi.patchProject(projectId, { currentVersionId: id }); setProject(r.project); setSpec(r.project.draftSpec); setSelectedMockupId(null); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(null); }
  }

  async function sendChat(text: string) {
    if (!projectId || !project?.currentVersionId) return;
    setBusy('chat'); setError(null);
    try {
      const r = await studioApi.chat(projectId, text, project.currentVersionId);
      setQuota(r.quota);
      const fresh = await studioApi.getProject(projectId);
      setProject(fresh.project);
    } catch (e) {
      setError(errText(e, 'שליחת ההודעה נכשלה.'));
    } finally {
      setBusy(null);
    }
  }

  function applyProposal(p: NonNullable<MessageView['proposal']>) {
    generate(p.spec, p.baseVersionId, 'revision');
  }

  // ── mockups ────────────────────────────────────────────────────────────────
  async function compose(placement: Placement, finish: 'print' | 'embroidery') {
    if (!projectId || !project?.currentVersionId) return;
    setBusy('mockup'); setError(null);
    try {
      const r = await studioApi.mockup(projectId, { versionId: project.currentVersionId, placement, finish, kind: 'composite' });
      setProject(r.project); setSelectedMockupId(r.mockupId);
    } catch (e) { setError(errText(e, 'יצירת ההדמיה נכשלה. נסו שוב.')); }
    finally { setBusy(null); }
  }
  async function aiMockup(placement: Placement, finish: 'print' | 'embroidery', confirmCharge: boolean) {
    if (!projectId || !project?.currentVersionId) return;
    setBusy('aiMockup'); setError(null);
    try {
      const r = await studioApi.mockup(projectId, { versionId: project.currentVersionId, placement, finish, kind: 'ai', opId: newOpId(), confirmCharge });
      setProject(r.project); setSelectedMockupId(r.mockupId);
      if (r.quota) setQuota(r.quota);
    } catch (e) {
      if (e instanceof ApiError && e.data?.quota) setQuota(e.data.quota as QuotaView);
      setError(errText(e, 'ההדמיה המציאותית נכשלה. לא נוצל ניסיון.'));
    } finally { setBusy(null); }
  }

  const currentVersion = project?.versions.find(v => v.id === project.currentVersionId) ?? null;
  const approveMockup = useMemo(() => {
    if (!project || !currentVersion) return null;
    const own = project.mockups.filter(m => m.versionId === currentVersion.id && !m.stale);
    return own.find(m => m.id === selectedMockupId) ?? own[0] ?? null;
  }, [project, currentVersion, selectedMockupId]);

  // ── approve → cart ─────────────────────────────────────────────────────────
  // One kippah line per product/style. A design for the OTHER side of a line
  // that is already in the cart is added to that line as its second side
  // (+₪KIPA_EXTRA_SIDE_PRICE per kippah, like "print-both" on /kippot-order).
  const cartLineIdFor = (p: { styleId: string | null; inventoryProductId: string | null; productId: string }) =>
    p.styleId ? (p.inventoryProductId ?? `event-logo-${p.styleId}`) : p.productId;
  const pendingLineId = project ? cartLineIdFor({ styleId: project.isStyle ? project.productId.replace(/^style:/, '') : null, inventoryProductId: project.inventoryProductId, productId: project.productId }) : null;
  const existingLine: CartItem | undefined = pendingLineId ? cartItems.find(i => i.id === pendingLineId && i.customDesign?.logoStudio) : undefined;
  const existingSides: KippahSide[] = existingLine?.customDesign?.logoStudio
    ? [existingLine.customDesign.logoStudio.side ?? 'top', ...(existingLine.customDesign.logoStudioSecond ? [existingLine.customDesign.logoStudioSecond.side ?? 'bottom'] : [])]
    : [];
  const addsSecondSide = !!existingLine && existingSides.length > 0 && !existingSides.includes(side) && existingSides.length < 2;

  async function approve(qty: number) {
    if (!projectId || !currentVersion || !approveMockup) return;
    setBusy('approve'); setError(null);
    try {
      const a = await studioApi.approve(projectId, currentVersion.id, approveMockup.id);
      const material = a.materialKind === 'satin' ? 'satin' as const : 'linen' as const;
      const label = a.spec.primaryText || a.spec.monogramLetters || 'לוגו אישי';
      const variantsLabel = Object.values(a.selectedVariants).join(' · ');
      const lineId = cartLineIdFor(a);
      const design = {
        approvalId: a.approvalId,
        projectId,
        versionId: currentVersion.id,
        versionNumber: currentVersion.n,
        side: a.side,
        logoUrl: a.logoUrl,
        mockupUrl: a.mockupUrl,
        finish: a.finish,
        placement: a.placement,
        variantsLabel,
        printWidthMm: a.production.printWidthMm,
        printHeightMm: a.production.printHeightMm,
        productionReady: a.production.ready,
      };
      const sideLabel = a.side === 'bottom' ? 'צד תחתון' : 'צד עליון';
      const printLine = (id: string, quantity: number) => ({
        id, name: `${a.finish === 'embroidery' ? 'רקמה' : 'הדפסה'} לכיפות — ${sideLabel} — לוגו אישי מהסטודיו (כלול במחיר)`,
        price: 0, quantity, cat: 'הדפסה', imgUrl: a.logoThumbUrl,
        printCustomization: {
          uploadedImageUrl: a.logoUrl, originalImageUrl: a.logoUrl,
          productType: 'כיפות', side: a.side, bgRemoved: true,
          designText: label, mockupUrl: a.mockupUrl,
          selectedFontLabel: a.font, printType: a.finish,
          ...(a.styleId ? { kippahStyle: a.styleId } : {}),
        },
      });

      const existing = cartItems.find(i => i.id === lineId && i.customDesign?.logoStudio);
      const exPrimary = existing?.customDesign?.logoStudio;
      const exSecond = existing?.customDesign?.logoStudioSecond;
      const asSecond = !!exPrimary && (exPrimary.side ?? 'top') !== a.side;

      if (existing && asSecond) {
        // add / replace the second side on the line that is already in the cart
        const quantity = existing.quantity;
        const unit = getEventKippahPricePerUnit(0, quantity, material) + KIPA_EXTRA_SIDE_PRICE;
        removeItem(lineId);
        addItem({ ...existing, price: unit, customDesign: { ...existing.customDesign!, logoStudioSecond: design } });
        removeItem(`print-side2-${lineId}`);
        addItem(printLine(`print-side2-${lineId}`, quantity));
      } else {
        const keepSecond = exSecond && (exSecond.side ?? 'bottom') !== a.side ? exSecond : undefined;
        const unit = getEventKippahPricePerUnit(0, qty, material) + (keepSecond ? KIPA_EXTRA_SIDE_PRICE : 0);
        removeItem(lineId);
        removeItem(`print-${lineId}`);
        if (!keepSecond) removeItem(`print-side2-${lineId}`);
        addItem({
          id: lineId,
          ...(a.inventoryProductId ? { productId: a.inventoryProductId } : {}),
          name: a.styleId ? `כיפות ${a.productName.replace(/^כיפה (פשתן|סאטן) — /, '')} — לוגו אישי מהסטודיו` : a.productName,
          price: unit,
          imgUrl: a.mockupThumbUrl,
          quantity: qty,
          cat: 'כיפות',
          ...(Object.keys(a.selectedVariants).length ? { selectedVariants: a.selectedVariants } : {}),
          // existing order/admin/email pipelines already carry `customDesign`
          customDesign: {
            designId: a.approvalId,
            baseColor: '',
            productImageUrl: a.productImageUrl,
            text: label,
            textColor: a.spec.color,
            fontSize: 0,
            fontFamily: a.font,
            position: 'center',
            quantity: qty,
            previewImageUrl: a.mockupThumbUrl,
            createdAt: new Date().toISOString(),
            logoStudio: design,
            ...(keepSecond ? { logoStudioSecond: keepSecond } : {}),
          },
        });
        addItem(printLine(`print-${lineId}`, qty));
        if (keepSecond) {
          removeItem(`print-side2-${lineId}`);
          addItem({ ...printLine(`print-side2-${lineId}`, qty), imgUrl: undefined, printCustomization: { uploadedImageUrl: keepSecond.logoUrl, originalImageUrl: keepSecond.logoUrl, productType: 'כיפות', side: keepSecond.side ?? 'bottom', bgRemoved: true, mockupUrl: keepSecond.mockupUrl } });
        }
      }
      window.gtag?.('event', 'add_to_cart', { currency: 'ILS', items: [{ item_id: a.inventoryProductId ?? a.productId, item_name: a.productName, quantity: qty }] });

      // offer the other side when it has a photo and is not designed yet
      const other: KippahSide = a.side === 'top' ? 'bottom' : 'top';
      const hasOtherAlready = asSecond || !!(existing && !asSecond && exSecond && (exSecond.side ?? 'bottom') === other);
      if (project?.selection.sidesAvailable[other] && !hasOtherAlready) {
        setOtherSideOffer({ side: other, spec: a.spec });
      } else {
        router.push('/cart');
      }
    } catch (e) {
      setError(errText(e, 'האישור נכשל. נסו שוב.'));
    } finally {
      setBusy(null);
    }
  }

  function startOtherSide(next: KippahSide, baseSpec: LogoSpec) {
    // new project for the other side, same kippah; the texts carry over as a starting point
    setOtherSideOffer(null);
    setProject(null); setProjectId(null); setSelectedMockupId(null);
    setSide(next);
    setSpec({ ...baseSpec, inspirationAssetId: null });
    setInspirationThumb(null);
    router.replace('/logo-studio');
    setStep('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── navigation guards ──────────────────────────────────────────────────────
  const hasVersion = !!project?.versions.length;
  const stepEnabled: Record<StepId, boolean> = {
    kippah: true,
    details: !!productId,
    design: hasVersion,
    mockup: hasVersion,
    approve: hasVersion && !!approveMockup,
  };
  const go = (id: StepId) => { if (stepEnabled[id]) { setStep(id); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
  const stepIndex = STEPS.findIndex(x => x.id === step);

  const generateLabel = hasVersion ? 'צור גרסה חדשה מהפרטים' : 'צור את הלוגו';

  return (
    <div className={s.page}>
      <style dangerouslySetInnerHTML={{ __html: logoFontFaceCss() }} />
      <div className={s.wrap}>
        <h1 className={s.title}>✨ סטודיו לוגו אישי לכיפה</h1>
        <p className={s.subtitle}>מעצבים לוגו, מתקנים בשיחה ורואים אותו על הכיפה שבחרתם.</p>

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
        {busy === 'project' && <div className={s.card}><div className={s.loadingCard}><span className={`${s.spinner} ${s.spinnerDark}`} /> טוען את העיצוב שלך…</div></div>}

        {exhausted && step !== 'kippah' && (
          <CodeRedeem exhausted whatsapp={whatsapp} onRedeemed={(q, msg) => { setQuota(q); setNotice(msg); }} />
        )}

        {step === 'kippah' && (
          <KippahStep product={product} selection={selection} selectedVariants={variants} loading={catalogLoading} error={catalogErr}
            side={side} onChangeSide={changeSide}
            onChooseProduct={chooseProduct} onChangeVariant={changeVariant} onNext={() => go('details')} />
        )}

        {step === 'details' && (
          <>
            <DetailsStep spec={spec} onChange={updateSpec} errors={specErrors} signedIn={signedIn}
              onRequireSignIn={() => requireSignIn()}
              inspirationThumb={inspirationThumb}
              onInspiration={(assetId, thumb) => { updateSpec({ inspirationAssetId: assetId }); setInspirationThumb(thumb); }} />
            <div className={s.sticky}>
              <div className={s.stickyInner}>
                {!signedIn && !authLoading && <div className={s.costNote}>כדי לשמור את העיצובים ואת הניסיונות שלכם, נבקש להתחבר עם Google לפני היצירה.</div>}
                {signedIn && quota && !exhausted && <div className={s.costNote}>היצירה תצרוך ניסיון עיצוב אחד (נותרו {quota.remaining}). אם היצירה תיכשל — הניסיון לא ינוצל.</div>}
                {exhausted && <div className={s.costNote}>ניצלת את ניסיונות העיצוב — הזינו קוד למעלה כדי להמשיך.</div>}
                <button type="button" className={s.primary} disabled={!!busy || specErrors.length > 0 || exhausted || !productId}
                  onClick={() => generate(validateSpec(spec).spec, project?.currentVersionId ?? null, hasVersion ? 'edit' : 'initial')}>
                  {busy === 'generate' ? <><span className={s.spinner} /> יוצרים את הלוגו… (עד דקה)</> : !signedIn ? `התחברות ו${generateLabel}` : generateLabel}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'design' && project && (
          <DesignStep project={project} quota={quota} busy={busy === 'generate' || busy === 'chat' || busy === 'select' ? busy : null}
            onSelectVersion={selectVersion} onSendChat={sendChat} onApplyProposal={applyProposal}
            onEditDetails={() => { if (currentVersion) setSpec(currentVersion.spec); go('details'); }}
            onNext={() => go('mockup')} blocked={exhausted} />
        )}

        {step === 'mockup' && project && (
          <MockupStep project={project} quota={quota} busy={busy === 'mockup' || busy === 'aiMockup' ? busy : null}
            selectedMockupId={selectedMockupId} onSelectMockup={setSelectedMockupId}
            onCompose={compose} onAiMockup={aiMockup} onBackToKippah={() => go('kippah')} onNext={() => go('approve')} blocked={exhausted} />
        )}

        {step === 'approve' && project && (
          <ApproveStep project={project} product={product} mockup={approveMockup} busy={busy === 'approve'} error={null}
            initialQty={initialQty} secondSideOf={addsSecondSide && existingLine ? { quantity: existingLine.quantity, sides: existingSides } : null}
            onApprove={approve} onBack={() => go('mockup')} />
        )}

        {otherSideOffer && (
          <div className={s.modalBack} role="dialog" aria-modal="true">
            <div className={s.modal}>
              <p className={s.cardTitle}>✓ העיצוב נשמר בסל</p>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                רוצים לעצב גם את {otherSideOffer.side === 'bottom' ? 'הצד התחתון (פנים הכיפה)' : 'הצד העליון'}?
                הוא יתווסף לאותן כיפות בסל (+₪{KIPA_EXTRA_SIDE_PRICE} לכיפה). הטקסטים יועתקו כנקודת התחלה ואפשר לשנות אותם.
              </p>
              <div className={s.row}>
                <button type="button" className={s.primary} style={{ flex: 1 }} onClick={() => startOtherSide(otherSideOffer.side, otherSideOffer.spec)}>
                  עיצוב ל{otherSideOffer.side === 'bottom' ? 'צד התחתון' : 'צד העליון'}
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
