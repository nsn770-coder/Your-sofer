// Minimal in-memory fake matching the small structural Firestore subset used
// by lib/services/whatsappMessageStore.ts (and, from Phase 1 Step 4 on, the
// status-webhook handling built on top of it). Not a general-purpose
// Firestore emulator — just enough get/set/merge/update/auto-id/subcollection
// chaining to unit-test dual-write and status-transition logic without a
// mocking library or a real Firestore connection.

import type {
  MessageStoreFirestoreLike,
  DocRefLike,
  CollectionRefLike,
  DocSnapshotLike,
} from '@/lib/services/whatsappMessageStore';

export interface FakeFirestore extends MessageStoreFirestoreLike {
  _dump(): Record<string, Record<string, unknown>>;
  _get(path: string): Record<string, unknown> | undefined;
}

export function createFakeFirestore(): FakeFirestore {
  const store = new Map<string, Record<string, unknown>>();
  let autoIdCounter = 0;

  function makeDocRef(path: string, id: string): DocRefLike {
    return {
      id,
      async get(): Promise<DocSnapshotLike> {
        const data = store.get(path);
        return { exists: data !== undefined, id, data: () => data };
      },
      async set(data: Record<string, unknown>, opts?: { merge?: boolean }) {
        const existing = store.get(path);
        store.set(path, opts?.merge && existing ? { ...existing, ...data } : { ...data });
        return undefined;
      },
      async update(data: Record<string, unknown>) {
        const existing = store.get(path);
        if (!existing) throw new Error(`fakeFirestore: no document to update at ${path}`);
        store.set(path, { ...existing, ...data });
        return undefined;
      },
      collection(sub: string): CollectionRefLike {
        return makeCollectionRef(`${path}/${sub}`);
      },
    };
  }

  function makeCollectionRef(basePath: string): CollectionRefLike {
    return {
      doc(id?: string): DocRefLike {
        const docId = id ?? `auto_${++autoIdCounter}`;
        return makeDocRef(`${basePath}/${docId}`, docId);
      },
    };
  }

  return {
    collection(name: string): CollectionRefLike {
      return makeCollectionRef(name);
    },
    _dump() {
      return Object.fromEntries(store.entries());
    },
    _get(path: string) {
      return store.get(path);
    },
  };
}
