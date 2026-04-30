'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Shaliach {
  id: string;
  name: string;
  email: string;
  commissionPercent: number;
  chabadName?: string;
  city?: string;
  rabbiName?: string;
  logoUrl?: string;
  phone?: string;
}

interface ShaliachContextType {
  shaliach: Shaliach | null;
  refCode: string | null;
}

const ShaliachContext = createContext<ShaliachContextType>({ shaliach: null, refCode: null });

export function ShaliachProvider({ children }: { children: React.ReactNode }) {
  const [shaliach, setShaliach] = useState<Shaliach | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  // useSearchParams is the correct Next.js App Router way to read ?ref=
  // (window.location.search misses client-side navigations and can be stale)
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');

    console.log('[ShaliachContext] searchParams ref:', ref);
    console.log('[ShaliachContext] localStorage shaliachRef:', localStorage.getItem('shaliachRef'));

    if (ref) {
      localStorage.setItem('shaliachRef', ref);
      setRefCode(ref);
      loadShaliach(ref);
    } else {
      const saved = localStorage.getItem('shaliachRef');
      if (saved) {
        console.log('[ShaliachContext] Using saved ref from localStorage:', saved);
        setRefCode(saved);
        loadShaliach(saved);
      }
    }
  }, [searchParams]); // re-runs on every URL change, not just mount

  async function loadShaliach(code: string) {
    console.log('[ShaliachContext] Fetching shluchim/' + code);
    try {
      const [{ doc, getDoc, getFirestore }, { default: firebaseApp }] = await Promise.all([
        import('firebase/firestore'),
        import('../firebase-app'),
      ]);
      const db = getFirestore(firebaseApp);
      const snap = await getDoc(doc(db, 'shluchim', code));
      console.log('[ShaliachContext] Doc exists:', snap.exists(), snap.data());
      if (snap.exists()) {
        setShaliach({ id: snap.id, ...snap.data() } as Shaliach);
        console.log('[ShaliachContext] Shaliach set:', snap.data());
      } else {
        console.warn('[ShaliachContext] No document found at shluchim/' + code);
        setShaliach(null);
      }
    } catch (e) {
      console.error('[ShaliachContext] Firestore error:', e);
    }
  }

  return (
    <ShaliachContext.Provider value={{ shaliach, refCode }}>
      {children}
    </ShaliachContext.Provider>
  );
}

export function useShaliach() {
  return useContext(ShaliachContext);
}
