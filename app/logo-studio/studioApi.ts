'use client';
// Client → Logo Studio API. Every call carries the Firebase ID token; the
// server derives the customer from it (never from local storage).

import { getAuthLazy } from '@/lib/authLazy';
import type { LogoSpec } from '@/lib/logoStudio/types';
import type { ResolvedSelection, Placement } from '@/lib/logoStudio/catalog';
import type { ProductionInfo } from '@/lib/logoStudio/production';

export interface QuotaView { freeGranted: number; bonusGranted: number; used: number; pending: number; remaining: number }

export interface CatalogProduct { id: string; name: string; price: number; imgUrl: string | null; variantOptions: { name: string; values: string[] }[] }

export interface AssetUrls { url: string; thumb: string }
export interface VersionView {
  id: string; n: number; parentVersionId: string | null; spec: LogoSpec; summary: string[]; warnings: string[];
  source: string; createdAt: number; includedAiMockupUsed: boolean;
  logo: AssetUrls & { width: number; height: number; rasterScale: number };
  aiLayers: string[];
}
export interface MockupView extends AssetUrls {
  id: string; versionId: string; kind: 'composite' | 'ai'; placement: Placement; finish: 'print' | 'embroidery';
  createdAt: number; charged: boolean; stale: boolean;
}
export interface MessageView {
  id: string; role: 'user' | 'assistant'; text: string; createdAt: number; versionId: string | null;
  proposal: { baseVersionId: string; spec: LogoSpec; summary: string[]; newAiGraphic: boolean } | null;
}
export interface ProjectView {
  id: string; productId: string; selectedVariants: Record<string, string>; finish: 'print' | 'embroidery';
  draftSpec: LogoSpec; currentVersionId: string | null;
  approval: { approvalId: string; versionId: string; mockupId: string; at: number } | null;
  selection: ResolvedSelection; minDpi: number;
  inspiration: { assetId: string; thumb: string } | null;
  versions: VersionView[]; mockups: MockupView[]; messages: MessageView[];
}
export interface ApproveResult {
  approvalId: string; productId: string; productName: string; productImageUrl: string;
  materialKind: 'satin' | 'linen' | 'other' | null; selectedVariants: Record<string, string>;
  spec: LogoSpec; font: string; logoUrl: string; logoThumbUrl: string; mockupUrl: string; mockupThumbUrl: string;
  finish: 'print' | 'embroidery'; placement: Placement; production: ProductionInfo;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public messageHe: string | null, public data: Record<string, unknown>) {
    super(code);
  }
}

async function token(required: boolean): Promise<string | null> {
  const auth = await getAuthLazy();
  const u = auth.currentUser;
  if (!u) {
    if (required) throw new ApiError(401, 'auth_required', 'נדרשת התחברות.', {});
    return null;
  }
  return u.getIdToken();
}

async function call<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const t = await token(init.auth !== false);
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (t) headers.Authorization = `Bearer ${t}`;
  if (init.body && typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'network', 'אין חיבור לרשת. בדקו את החיבור ונסו שוב.', {});
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message ?? null, data);
  return data as T;
}

export const newOpId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');

export const studioApi = {
  me: () => call<{ quota: QuotaView; projects: { id: string; updatedAt: number; productId: string; primaryText: string; versionCount: number; approved: boolean }[]; contactWhatsapp: string; services: { storage: boolean; ai: boolean } }>('/api/logo-studio/me'),
  catalogList: () => call<{ products: CatalogProduct[] }>('/api/logo-studio/catalog', { auth: false }),
  catalogItem: (productId: string, v: Record<string, string>) =>
    call<{ product: CatalogProduct; selection: ResolvedSelection; studioEnabled: boolean }>(`/api/logo-studio/catalog?productId=${encodeURIComponent(productId)}&v=${encodeURIComponent(JSON.stringify(v))}`, { auth: false }),
  createProject: (productId: string, selectedVariants: Record<string, string>, draftSpec: LogoSpec) =>
    call<{ project: ProjectView }>('/api/logo-studio/projects', { method: 'POST', body: JSON.stringify({ productId, selectedVariants, draftSpec }) }),
  getProject: (id: string) => call<{ project: ProjectView }>(`/api/logo-studio/projects/${id}`),
  patchProject: (id: string, patch: Record<string, unknown>) =>
    call<{ project: ProjectView }>(`/api/logo-studio/projects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  generate: (id: string, body: { opId: string; spec: LogoSpec; baseVersionId: string | null; source: 'initial' | 'revision' | 'edit' }) =>
    call<{ versionId: string; quota: QuotaView | null; project: ProjectView }>(`/api/logo-studio/projects/${id}/generate`, { method: 'POST', body: JSON.stringify(body) }),
  chat: (id: string, message: string, baseVersionId: string) =>
    call<{ type: 'proposal' | 'clarify' | 'chat'; reply: string; proposal: MessageView['proposal']; quota: QuotaView }>(`/api/logo-studio/projects/${id}/chat`, { method: 'POST', body: JSON.stringify({ message, baseVersionId }) }),
  mockup: (id: string, body: { versionId: string; placement: Placement; finish: 'print' | 'embroidery'; kind: 'composite' | 'ai'; opId?: string; confirmCharge?: boolean }) =>
    call<{ mockupId: string; quota: QuotaView | null; project: ProjectView }>(`/api/logo-studio/projects/${id}/mockup`, { method: 'POST', body: JSON.stringify(body) }),
  approve: (id: string, versionId: string, mockupId: string) =>
    call<ApproveResult>(`/api/logo-studio/projects/${id}/approve`, { method: 'POST', body: JSON.stringify({ versionId, mockupId }) }),
  redeem: (code: string) => call<{ granted: number; quota: QuotaView; message: string }>('/api/logo-studio/redeem', { method: 'POST', body: JSON.stringify({ code }) }),
  upload: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return call<{ assetId: string; thumb: string }>('/api/logo-studio/upload', { method: 'POST', body: fd });
  },
};
