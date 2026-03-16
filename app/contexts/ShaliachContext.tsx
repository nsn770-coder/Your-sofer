'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

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
  }, []);

  async function loadShaliach(code: string) {
    try {
      const snap = await getDoc(doc(db, 'shluchim', code));
      if (snap.exists()) {
        setShaliach({ id: snap.id, ...snap.data() } as Shaliach);
      }
    } catch (e) {
      console.error(e);
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