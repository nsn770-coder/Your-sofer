/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore document data / Gemini JSON are untyped at this boundary and validated field by field */
// Minimal structural Firestore interface used by the quota / code / rate-limit
// logic. firebase-admin's Firestore satisfies it directly; tests use an
// in-memory implementation with serialised transactions.

export interface DocSnapLike {
  exists: boolean;
  data(): Record<string, any> | undefined;
}
export interface DocRefLike {
  id: string;
  path: string;
}
export interface TxLike {
  get(ref: DocRefLike): Promise<DocSnapLike>;
  set(ref: DocRefLike, data: Record<string, any>, opts?: { merge?: boolean }): unknown;
  update(ref: DocRefLike, data: Record<string, any>): unknown;
  create(ref: DocRefLike, data: Record<string, any>): unknown;
}
export interface DbLike {
  doc(path: string): DocRefLike;
  runTransaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T>;
}

export const COL = {
  users: 'logoStudioUsers',
  ops: 'logoStudioOps',
  codes: 'logoStudioCodes',
  rate: 'logoStudioRate',
  projects: 'logoProjects',
  approvals: 'logoApprovals',
  assets: 'logoStudioAssets',
  settingsDoc: 'settings/logoStudio',
  /** studio config per event-kippot style id (bottom photo, print area, mm) */
  styleConfigDoc: 'settings/logoStudioStyles',
} as const;
