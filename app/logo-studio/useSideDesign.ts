'use client';
// One kippah side's design: its own project, texts, mode (upload / AI),
// versions, mockups and busy/error state. The studio page runs one instance
// per side, so with "both sides" the customer works on the top AND the bottom
// on the same page, step by step.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SPEC, validateSpec, type LogoSpec } from '@/lib/logoStudio/types';
import type { Placement, KippahSide } from '@/lib/logoStudio/catalog';
import { studioApi, ApiError, newOpId, type ProjectView, type QuotaView, type MessageView, type ApproveResult, type VersionView, type MockupView } from './studioApi';
import { prepareLogoFile } from './components/UploadLogoStep';

export type LogoMode = 'upload' | 'ai';
export type SideBusy = null | 'generate' | 'chat' | 'select' | 'mockup' | 'aiMockup' | 'approve' | 'project' | 'uploadLogo' | 'bg';

export const errText = (e: unknown, fallback = 'אירעה שגיאה. נסו שוב.') => (e instanceof ApiError ? e.messageHe ?? fallback : fallback);

export interface SideContext {
  productId: string | null;
  variants: Record<string, string>;
  signedIn: boolean;
  /** latest signed-in state (for actions queued before sign-in) */
  isSignedIn: () => boolean;
  requireSignIn: (then?: () => void) => void;
  exhausted: boolean;
  setQuota: (q: QuotaView) => void;
  refreshMe: () => Promise<void>;
  /** a new logo version was generated with AI (the page may move to the next step) */
  onGenerated?: (side: KippahSide) => void;
}

export interface SideDesign {
  side: KippahSide;
  projectId: string | null;
  project: ProjectView | null;
  spec: LogoSpec;
  mode: LogoMode;
  inspirationThumb: string | null;
  selectedMockupId: string | null;
  busy: SideBusy;
  error: string | null;
  uploadErr: string | null;
  specErrors: string[];
  currentVersion: VersionView | null;
  uploadedCurrent: VersionView | null;
  approveMockup: MockupView | null;
  hasVersion: boolean;
  setMode: (m: LogoMode) => void;
  setError: (e: string | null) => void;
  setSpec: (s: LogoSpec) => void;
  updateSpec: (patch: Partial<LogoSpec>) => void;
  setInspiration: (assetId: string | null, thumb: string | null) => void;
  setSelectedMockupId: (id: string | null) => void;
  /** restore a parked / drafted side (project is loaded when signed in) */
  hydrate: (d: { projectId?: string | null; spec?: LogoSpec; mode?: LogoMode }) => void;
  reset: (spec?: LogoSpec) => void;
  patchSelection: (patch: { productId?: string; selectedVariants: Record<string, string> }) => Promise<void>;
  generate: (useSpec: LogoSpec, baseVersionId: string | null, source: 'initial' | 'revision' | 'edit') => Promise<void>;
  generateFromDraft: () => Promise<void>;
  selectVersion: (id: string) => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  applyProposal: (p: NonNullable<MessageView['proposal']>) => void;
  uploadLogo: (file: File) => Promise<void>;
  setLogoBackground: (remove: boolean) => Promise<void>;
  compose: (placement: Placement, finish: 'print' | 'embroidery') => Promise<void>;
  aiMockup: (placement: Placement, finish: 'print' | 'embroidery', confirmCharge: boolean) => Promise<void>;
  /** server approval snapshot of the current version + mockup (no cart change) */
  approveSnapshot: () => Promise<ApproveResult | null>;
}

export function useSideDesign(side: KippahSide, ctx: SideContext, initialMode: LogoMode = 'ai'): SideDesign {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [spec, setSpec] = useState<LogoSpec>(DEFAULT_SPEC);
  const [mode, setMode] = useState<LogoMode>(initialMode);
  const [inspirationThumb, setInspirationThumb] = useState<string | null>(null);
  const [selectedMockupId, setSelectedMockupId] = useState<string | null>(null);
  const [busy, setBusy] = useState<SideBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load the project (after refresh / when restoring a side)
  useEffect(() => {
    if (!ctx.signedIn || !projectId || project?.id === projectId) return;
    let cancelled = false;
    setBusy('project');
    studioApi.getProject(projectId)
      .then(r => {
        if (cancelled) return;
        setProject(r.project);
        setSpec(r.project.draftSpec);
        setInspirationThumb(r.project.inspiration?.thumb ?? null);
        const cur = r.project.versions.find(v => v.id === r.project.currentVersionId);
        if (cur?.upload) setMode('upload');
      })
      .catch(e => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) { setProjectId(null); return; }
        setError(errText(e, 'טעינת העיצוב נכשלה.'));
      })
      .finally(() => { if (!cancelled) setBusy(null); });
    return () => { cancelled = true; };
  }, [ctx.signedIn, projectId, project?.id]);

  const updateSpec = useCallback((patch: Partial<LogoSpec>) => {
    setSpec(prev => {
      const next = { ...prev, ...patch };
      if (projectId && ctx.signedIn) {
        if (patchTimer.current) clearTimeout(patchTimer.current);
        patchTimer.current = setTimeout(() => { studioApi.patchProject(projectId, { draftSpec: next }).catch(() => undefined); }, 1500);
      }
      return next;
    });
  }, [projectId, ctx.signedIn]);

  const specErrors = useMemo(() => validateSpec(spec).errors, [spec]);
  const currentVersion = project?.versions.find(v => v.id === project.currentVersionId) ?? null;
  const uploadedCurrent = currentVersion?.upload ? currentVersion : null;
  const approveMockup = useMemo(() => {
    if (!project || !currentVersion) return null;
    const own = project.mockups.filter(m => m.versionId === currentVersion.id && !m.stale);
    return own.find(m => m.id === selectedMockupId) ?? own[0] ?? null;
  }, [project, currentVersion, selectedMockupId]);

  async function ensureProject(): Promise<string> {
    if (projectId && project) return projectId;
    if (!ctx.productId) throw new ApiError(400, 'product_required', 'נא לבחור כיפה.', {});
    const r = await studioApi.createProject(ctx.productId, ctx.variants, spec, side);
    setProjectId(r.project.id); setProject(r.project);
    return r.project.id;
  }

  async function generate(useSpec: LogoSpec, baseVersionId: string | null, source: 'initial' | 'revision' | 'edit') {
    if (busy) return;
    if (!ctx.isSignedIn()) { ctx.requireSignIn(() => { void generate(useSpec, baseVersionId, source); }); return; }
    if (ctx.exhausted) return;
    setBusy('generate'); setError(null);
    try {
      const pid = await ensureProject();
      const r = await studioApi.generate(pid, { opId: newOpId(), spec: useSpec, baseVersionId, source });
      setProject(r.project); setSpec(r.project.draftSpec);
      if (r.quota) ctx.setQuota(r.quota);
      setSelectedMockupId(null);
      ctx.onGenerated?.(side);
    } catch (e) {
      if (e instanceof ApiError && e.data?.quota) ctx.setQuota(e.data.quota as QuotaView);
      if (e instanceof ApiError && e.code === 'quota_exhausted') await ctx.refreshMe();
      else setError(errText(e, 'היצירה נכשלה. הניסיון לא נוצל — אפשר לנסות שוב.'));
    } finally {
      setBusy(null);
    }
  }

  return {
    side, projectId, project, spec, mode, inspirationThumb, selectedMockupId, busy, error, uploadErr, specErrors,
    currentVersion, uploadedCurrent, approveMockup, hasVersion: !!project?.versions.length,
    setMode: m => { setMode(m); setError(null); setUploadErr(null); },
    setError,
    setSpec,
    updateSpec,
    setInspiration: (assetId, thumb) => { updateSpec({ inspirationAssetId: assetId }); setInspirationThumb(thumb); },
    setSelectedMockupId,
    hydrate: d => {
      if (d.spec) setSpec(validateSpec(d.spec).spec);
      if (d.mode) setMode(d.mode);
      if (d.projectId !== undefined) { setProject(null); setProjectId(d.projectId && /^[a-f0-9]{8,40}$/.test(d.projectId) ? d.projectId : null); }
    },
    reset: next => {
      setProject(null); setProjectId(null); setSelectedMockupId(null); setInspirationThumb(null);
      setError(null); setUploadErr(null);
      setSpec(next ?? DEFAULT_SPEC);
    },
    patchSelection: async patch => {
      setSelectedMockupId(null);
      if (!projectId || !ctx.signedIn) return;
      try { const r = await studioApi.patchProject(projectId, patch); setProject(r.project); }
      catch (e) { setError(errText(e)); }
    },
    generate,
    generateFromDraft: () => generate(validateSpec(spec).spec, project?.currentVersionId ?? null, project?.versions.length ? 'edit' : 'initial'),
    selectVersion: async id => {
      if (!projectId) return;
      setBusy('select');
      try { const r = await studioApi.patchProject(projectId, { currentVersionId: id }); setProject(r.project); setSpec(r.project.draftSpec); setSelectedMockupId(null); }
      catch (e) { setError(errText(e)); }
      finally { setBusy(null); }
    },
    sendChat: async text => {
      if (!projectId || !project?.currentVersionId) return;
      setBusy('chat'); setError(null);
      try {
        const r = await studioApi.chat(projectId, text, project.currentVersionId);
        ctx.setQuota(r.quota);
        const fresh = await studioApi.getProject(projectId);
        setProject(fresh.project);
      } catch (e) {
        setError(errText(e, 'שליחת ההודעה נכשלה.'));
      } finally {
        setBusy(null);
      }
    },
    applyProposal: p => { void generate(p.spec, p.baseVersionId, 'revision'); },
    uploadLogo: async function uploadLogo(file: File) {
      if (busy) return;
      if (!ctx.isSignedIn()) { ctx.requireSignIn(() => { void uploadLogo(file); }); return; }
      setBusy('uploadLogo'); setUploadErr(null); setError(null);
      try {
        let f: File;
        try { f = await prepareLogoFile(file); }
        catch { throw new ApiError(413, 'too_large', 'הקובץ גדול מדי. נסו קובץ קטן יותר (עד 4MB) או שלחו לנו אותו בוואטסאפ.', {}); }
        const pid = await ensureProject();
        const up = await studioApi.upload(f, 'logo');
        const r = await studioApi.uploadLogoVersion(pid, up.assetId, false);
        setProject(r.project); setSelectedMockupId(null);
      } catch (e) {
        setUploadErr(errText(e, 'העלאת הלוגו נכשלה. נסו שוב.'));
      } finally {
        setBusy(null);
      }
    },
    setLogoBackground: async remove => {
      const cur = currentVersion;
      if (!projectId || !project || !cur?.upload || busy) return;
      setBusy('bg'); setUploadErr(null);
      try {
        // the same file was already processed this way → just switch back to it (instant)
        const existing = project.versions.find(v => v.upload?.assetId === cur.upload!.assetId && v.upload.bgRemoved === remove);
        const r = existing
          ? await studioApi.patchProject(projectId, { currentVersionId: existing.id })
          : await studioApi.uploadLogoVersion(projectId, cur.upload.assetId, remove);
        setProject(r.project); setSelectedMockupId(null);
      } catch (e) {
        setUploadErr(errText(e, remove ? 'הסרת הרקע נכשלה. נסו שוב.' : 'הפעולה נכשלה. נסו שוב.'));
      } finally {
        setBusy(null);
      }
    },
    compose: async (placement, finish) => {
      if (!projectId || !project?.currentVersionId) return;
      setBusy('mockup'); setError(null);
      try {
        const r = await studioApi.mockup(projectId, { versionId: project.currentVersionId, placement, finish, kind: 'composite' });
        setProject(r.project); setSelectedMockupId(r.mockupId);
      } catch (e) { setError(errText(e, 'יצירת ההדמיה נכשלה. נסו שוב.')); }
      finally { setBusy(null); }
    },
    aiMockup: async (placement, finish, confirmCharge) => {
      if (!projectId || !project?.currentVersionId) return;
      setBusy('aiMockup'); setError(null);
      try {
        const r = await studioApi.mockup(projectId, { versionId: project.currentVersionId, placement, finish, kind: 'ai', opId: newOpId(), confirmCharge });
        setProject(r.project); setSelectedMockupId(r.mockupId);
        if (r.quota) ctx.setQuota(r.quota);
      } catch (e) {
        if (e instanceof ApiError && e.data?.quota) ctx.setQuota(e.data.quota as QuotaView);
        setError(errText(e, 'ההדמיה המציאותית נכשלה. לא נוצל ניסיון.'));
      } finally { setBusy(null); }
    },
    approveSnapshot: async () => {
      if (!projectId || !currentVersion || !approveMockup) return null;
      setBusy('approve'); setError(null);
      try { return await studioApi.approve(projectId, currentVersion.id, approveMockup.id); }
      catch (e) { setError(errText(e, 'האישור נכשל. נסו שוב.')); return null; }
      finally { setBusy(null); }
    },
  };
}
