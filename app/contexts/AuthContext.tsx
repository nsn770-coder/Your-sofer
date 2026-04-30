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
      const { onAuthStateChanged } = await import('firebase/auth');
      const auth = await getAuthLazy();
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
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
              // משתמש חדש — צור רשומה
              const referredByShaliach = typeof window !== 'undefined'
                ? localStorage.getItem('shaliachRef')
                : null;

              // בדוק אם האימייל אושר כשליח לפני ההרשמה
              let newRole: UserRole = 'customer';
              let approvedShaliachId: string | undefined;
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
              });

              role = newRole;
              shaliachId = approvedShaliachId;
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
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const auth = await getAuthLazy();
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
