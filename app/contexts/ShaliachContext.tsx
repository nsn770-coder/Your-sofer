'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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

  // PERF (LCP/CLS root cause): deliberately NOT useSearchParams() here.
  // This provider wraps the entire app in layout.tsx inside <Suspense fallback={null}>.
  // useSearchParams() suspends during static prerender, so every prerendered page
  // shipped EMPTY HTML (the null fallback) and only rendered after JS hydration —
  // blank first paint → LCP 4.6–6s and CLS ~1.9 when content popped in.
  // Reading window.location.search inside useEffect (re-run on route change via
  // usePathname) captures ?ref= identically without blocking prerender.
  const pathname = usePathname();

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');

    if (ref) {
      localStorage.setItem('shaliachRef', ref);
      setRefCode(ref);
      loadShaliach(ref);
    } else {
      const saved = localStorage.getItem('shaliachRef');
      if (saved) {
        setRefCode(saved);
        loadShaliach(saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // re-runs on every route change, not just mount

  async function loadShaliach(code: string) {
    try {
      const [{ doc, getDoc, getFirestore }, { default: firebaseApp }] = await Promise.all([
        import('firebase/firestore'),
        import('../firebase-app'),
      ]);
      const db = getFirestore(firebaseApp);
      const snap = await getDoc(doc(db, 'shluchim', code));
      if (snap.exists()) {
        setShaliach({ id: snap.id, ...snap.data() } as Shaliach);
      } else {
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
