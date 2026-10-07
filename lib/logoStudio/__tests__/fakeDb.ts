/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore document data / Gemini JSON are untyped at this boundary and validated field by field */
// In-memory Firestore stand-in with SERIALISED transactions (like Firestore's
// optimistic transactions after retries): reads see committed data, writes are
// buffered and applied atomically at commit, `create` fails if the doc exists,
// and a thrown error discards all buffered writes.

import type { DbLike, DocRefLike, TxLike, DocSnapLike } from '../db';

export class FakeDb implements DbLike {
  store = new Map<string, Record<string, any>>();
  private queue: Promise<unknown> = Promise.resolve();

  doc(path: string): DocRefLike {
    return { id: path.split('/').pop()!, path };
  }

  runTransaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T> {
    const run = async () => {
      const writes: (() => void)[] = [];
      const pendingCreates = new Set<string>();
      const tx: TxLike = {
        get: async (ref) => {
          await new Promise(r => setTimeout(r, 0)); // let other callers interleave up to the lock
          const d = this.store.get(ref.path);
          return { exists: !!d, data: () => (d ? structuredClone(d) : undefined) } as DocSnapLike;
        },
        set: (ref, data, opts) => {
          writes.push(() => {
            const prev = opts?.merge ? this.store.get(ref.path) ?? {} : {};
            this.store.set(ref.path, structuredClone({ ...prev, ...data }));
          });
        },
        update: (ref, data) => {
          writes.push(() => {
            const prev = this.store.get(ref.path);
            if (!prev) throw new Error(`update: missing ${ref.path}`);
            this.store.set(ref.path, structuredClone({ ...prev, ...data }));
          });
        },
        create: (ref, data) => {
          if (this.store.has(ref.path) || pendingCreates.has(ref.path)) throw new Error(`create: exists ${ref.path}`);
          pendingCreates.add(ref.path);
          writes.push(() => { this.store.set(ref.path, structuredClone(data)); });
        },
      };
      const out = await fn(tx);
      writes.forEach(w => w());
      return out;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }
}
