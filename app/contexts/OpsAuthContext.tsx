'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAuthLazy } from '@/lib/authLazy';
import type { OpsRole, OpsUser } from '../ops/types';

interface OpsAuthContextType {
  opsUser: OpsUser | null;
  loading: boolean;
  accessDenied: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const OpsAuthContext = createContext<OpsAuthContextType | null>(null);

export function OpsAuthProvider({ children }: { children: React.ReactNode }) {
  const [opsUser, setOpsUser] = useState<OpsUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function setup() {
      const { onAuthStateChanged, signOut } = await import('firebase/auth');
      const auth = await getAuthLazy();
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
        if (!firebaseUser) {
          if (!cancelled) { setOpsUser(null); setLoading(false); }
          return;
        }

        try {
          const q = query(
            collection(db, 'opsUsers'),
            where('email', '==', firebaseUser.email)
          );
          const snap = await getDocs(q);

          if (snap.empty) {
            if (!cancelled) { setAccessDenied(true); setOpsUser(null); setLoading(false); }
            await signOut(auth);
            return;
          }

          const docSnap = snap.docs[0];
          const data = docSnap.data();

          if (!data.active) {
            if (!cancelled) { setAccessDenied(true); setOpsUser(null); setLoading(false); }
            await signOut(auth);
            return;
          }

          // Update uid + lastLogin
          await updateDoc(docSnap.ref, {
            uid: firebaseUser.uid,
            lastLogin: serverTimestamp(),
          });

          if (!cancelled) {
            setOpsUser({
              uid: firebaseUser.uid,
              email: data.email,
              name: data.name,
              role: data.role as OpsRole,
              active: data.active,
            });
            setAccessDenied(false);
          }
        } catch (err) {
          console.error('OpsAuth error:', err);
          if (!cancelled) setOpsUser(null);
        }

        if (!cancelled) setLoading(false);
      });
    }

    setup();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  async function signInWithGoogle() {
    setAccessDenied(false);
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const auth = await getAuthLazy();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function logout() {
    const { signOut } = await import('firebase/auth');
    const auth = await getAuthLazy();
    await signOut(auth);
    setOpsUser(null);
    setAccessDenied(false);
  }

  return (
    <OpsAuthContext.Provider value={{ opsUser, loading, accessDenied, signInWithGoogle, logout }}>
      {children}
    </OpsAuthContext.Provider>
  );
}

export function useOpsAuth() {
  const ctx = useContext(OpsAuthContext);
  if (!ctx) throw new Error('useOpsAuth must be used within OpsAuthProvider');
  return ctx;
}
