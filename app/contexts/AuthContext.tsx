'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

export type UserRole = 'customer' | 'shaliach' | 'sofer' | 'admin';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  soferId?: string;
  shaliachId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    async function setup() {
      const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth');
      const auth = await getAuthLazy();
      if (cancelled) return;

      // Check for pending redirect result FIRST — catches signInWithRedirect fallback returns
      try {
        const redirectResult = await getRedirectResult(auth);
        if (redirectResult?.user) {
          // onAuthStateChanged below will fire with this user and handle Firestore doc creation
          console.log('[AuthContext] Redirect sign-in result received for:', redirectResult.user.email);
        }
      } catch (e: any) {
        if (e?.code !== 'auth/null-provider' && e?.code !== 'auth/no-auth-event') {
          console.error('[getRedirectResult]', e);
        }
      }

      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
        try {
          if (firebaseUser) {
            const [{ doc, getDoc, setDoc, updateDoc, getDocs, query, collection, where, getFirestore }, { default: firebaseApp }] = await Promise.all([
              import('firebase/firestore'),
              import('../firebase-app'),
            ]);
            const db = getFirestore(firebaseApp);

            let role: UserRole = 'customer';
            let soferId: string | undefined;
            let shaliachId: string | undefined;

            // בדוק admins
            const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
            if (adminSnap.exists()) {
              role = 'admin';
            } else {
              // בדוק users collection
              const userRef = doc(db, 'users', firebaseUser.uid);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                const data = userSnap.data();
                role = data.role || 'customer';
                soferId = data.soferId;
                shaliachId = data.shaliachId;
              } else {
                // משתמש חדש - צור רשומה
                const referredByShaliach = typeof window !== 'undefined'
                  ? localStorage.getItem('shaliachRef')
                  : null;

                // בדוק אם האימייל אושר כשליח לפני ההרשמה
                let newRole: UserRole = 'customer';
                let approvedShaliachId: string | undefined;
                let approvedSoferId: string | undefined;
                if (firebaseUser.email) {
                  const appSnap = await getDocs(
                    query(
                      collection(db, 'shluchim_applications'),
                      where('email', '==', firebaseUser.email.trim().toLowerCase()),
                      where('status', '==', 'approved'),
                    )
                  );
                  if (!appSnap.empty) {
                    const appData = appSnap.docs[0].data();
                    const approvedDocId: string = appData.approvedDocId || appSnap.docs[0].id;
                    newRole = 'shaliach';
                    approvedShaliachId = approvedDocId;
                    // קשר את מסמך השליח ל-uid האמיתי
                    await updateDoc(doc(db, 'shluchim', approvedDocId), { uid: firebaseUser.uid });
                  }
                }

                // בדוק אם האימייל אושר כסופר לפני ההרשמה
                if (firebaseUser.email && newRole === 'customer') {
                  const soferAppSnap = await getDocs(
                    query(
                      collection(db, 'soferim_applications'),
                      where('email', '==', firebaseUser.email.trim().toLowerCase()),
                      where('status', '==', 'approved'),
                    )
                  );
                  if (!soferAppSnap.empty) {
                    const soferAppData = soferAppSnap.docs[0].data();
                    const approvedSoferDocId: string = soferAppData.soferId || soferAppSnap.docs[0].id;
                    newRole = 'sofer';
                    approvedSoferId = approvedSoferDocId;
                    // קשר את מסמך הסופר ל-uid האמיתי
                    await updateDoc(doc(db, 'soferim', approvedSoferDocId), { uid: firebaseUser.uid });
                  }
                }

                await setDoc(userRef, {
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName,
                  photoURL: firebaseUser.photoURL,
                  role: newRole,
                  status: 'active',
                  createdAt: new Date(),
                  ...(approvedShaliachId
                    ? { shaliachId: approvedShaliachId }
                    : referredByShaliach
                    ? { shaliachId: referredByShaliach }
                    : {}),
                  ...(approvedSoferId ? { soferId: approvedSoferId } : {}),
                });

                role = newRole;
                shaliachId = approvedShaliachId;
                soferId = approvedSoferId;
              }
            }

            if (!cancelled) {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role,
                soferId,
                shaliachId,
              });
            }
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (e) {
          console.error('[AuthContext] Firestore error during auth:', e);
          if (!cancelled) setUser(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      });
    }

    setup();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  async function signInWithGoogle() {
    try {
      const { GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } = await import('firebase/auth');
      const auth = await getAuthLazy();
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        // Popup resolved — verify auth state updates within 5 seconds.
        // COOP can allow the popup to close but block the credential from being passed back.
        await new Promise<void>((resolve) => {
          if (auth.currentUser) { resolve(); return; }
          const timer = setTimeout(() => {
            unsub();
            // Auth state didn't update after popup — fall back to redirect
            signInWithRedirect(auth, provider).finally(resolve);
          }, 5000);
          const unsub = onAuthStateChanged(auth, (u) => {
            if (u) { clearTimeout(timer); unsub(); resolve(); }
          });
        });
      } catch (popupError: any) {
        // If popup was blocked, fall back to redirect
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.message?.includes('Cross-Origin-Opener-Policy')
        ) {
          await signInWithRedirect(auth, provider);
        } else {
          throw popupError;
        }
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('שגיאה בהתחברות עם Google. אנא נסה שנית.');
        console.error('[signInWithGoogle]', err);
      }
    }
  }

  async function logout() {
    const { signOut } = await import('firebase/auth');
    const auth = await getAuthLazy();
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
