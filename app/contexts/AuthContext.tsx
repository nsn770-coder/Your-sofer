'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

export type UserRole = 'customer' | 'shaliach' | 'sofer' | 'partner' | 'admin';

// כתובת — נשמרת ב-addresses[] ב-Firestore
export interface Address {
  id: string;
  label: string;       // "בית", "עבודה", "אחר"
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zip?: string;
  country: string;
  phone?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  idToken?: string; // JWT token for API calls
  role: UserRole;
  soferId?: string;
  shaliachId?: string;
  partnerId?: string;
  partnerRole?: 'owner' | 'manager' | 'marketing' | 'viewer';
  // שדות פרופיל לקוח (מתמלאים מ-Firestore)
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string | null;           // ISO date string "YYYY-MM-DD"
  defaultShippingAddress?: Address | null;
  defaultBillingAddress?: Address | null;
  addresses?: Address[];
  newsletterSubscribed?: boolean;
  // שדות מועדון — תצוגה בלבד; לוגיקת צבירה בשלב 3
  totalSpent?: number;       // ₪ מצטבר — קובע דרגה (הדרגה לעולם לא יורדת)
  loyaltyPoints?: number;    // נקודות לממש
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateLocalUser: (updates: Partial<AuthUser>) => void;  // עדכון מקומי אחרי שמירה ב-Firestore
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function updateLocalUser(updates: Partial<AuthUser>) {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }

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
            let extraProfile: Partial<AuthUser> = {};

            // בדוק admins
            const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
            if (adminSnap.exists()) {
              role = 'admin';
              // אדמין הוא גם לקוח — טען את פרופיל המועדון שלו (נקודות, הוצאה, פרטים)
              // בלי זה עמוד הנקודות והתפריט מציגים 0 לאדמינים למרות שיש להם צבירה.
              try {
                const adminUserSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (adminUserSnap.exists()) {
                  const data = adminUserSnap.data();
                  extraProfile = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone,
                    dateOfBirth: data.dateOfBirth ?? null,
                    defaultShippingAddress: data.defaultShippingAddress ?? null,
                    defaultBillingAddress: data.defaultBillingAddress ?? null,
                    addresses: data.addresses ?? [],
                    newsletterSubscribed: data.newsletterSubscribed ?? false,
                    totalSpent: data.totalSpent ?? 0,
                    loyaltyPoints: data.loyaltyPoints ?? 0,
                  };
                }
              } catch (e) {
                console.warn('[AuthContext] admin club profile load skipped:', e);
              }
            } else {
              // בדוק users collection
              const userRef = doc(db, 'users', firebaseUser.uid);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                const data = userSnap.data();
                role = data.role || 'customer';
                soferId = data.soferId;
                shaliachId = data.shaliachId;
                // שדות פרופיל לקוח — נטענים אם קיימים
                extraProfile = {
                  firstName: data.firstName,
                  lastName: data.lastName,
                  phone: data.phone,
                  dateOfBirth: data.dateOfBirth ?? null,
                  defaultShippingAddress: data.defaultShippingAddress ?? null,
                  defaultBillingAddress: data.defaultBillingAddress ?? null,
                  addresses: data.addresses ?? [],
                  newsletterSubscribed: data.newsletterSubscribed ?? false,
                  // שדות מועדון — 0 כברירת מחדל עד שיתמלאו בשלב 3
                  totalSpent: data.totalSpent ?? 0,
                  loyaltyPoints: data.loyaltyPoints ?? 0,
                };
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
                  // Never let a permission error here kill the whole sign-in —
                  // this check only matters for pre-approved shluchim.
                  try {
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
                  } catch (e) {
                    console.warn('[AuthContext] shluchim_applications check skipped:', e);
                  }
                }

                // בדוק אם האימייל אושר כסופר לפני ההרשמה
                if (firebaseUser.email && newRole === 'customer') {
                  try {
                  const soferAppSnap = await getDocs(
                    query(
                      collection(db, 'soferim_applications'),
                      where('email', '==', firebaseUser.email.trim().toLowerCase()),
                      where('status', '==', 'approved'),
                    )
                  );
                  if (!soferAppSnap.empty) {
                    const soferAppData = soferAppSnap.docs[0].data();
                    // soferAppData.soferId is set for approvals after the back-write fix.
                    // For older approvals it's missing — fall back to an email lookup in soferim.
                    let resolvedSoferId: string = soferAppData.soferId || '';
                    if (!resolvedSoferId) {
                      const soferimSnap = await getDocs(
                        query(collection(db, 'soferim'), where('email', '==', firebaseUser.email.trim().toLowerCase()))
                      );
                      if (!soferimSnap.empty) resolvedSoferId = soferimSnap.docs[0].id;
                    }
                    newRole = 'sofer';
                    approvedSoferId = resolvedSoferId || undefined;
                    // Link soferim doc to real Firebase uid — non-critical, never abort auth if this fails
                    if (resolvedSoferId) {
                      try {
                        await updateDoc(doc(db, 'soferim', resolvedSoferId), { uid: firebaseUser.uid });
                      } catch {
                        console.warn('[AuthContext] Could not link uid to soferim doc:', resolvedSoferId);
                      }
                    }
                  }
                  } catch (e) {
                    console.warn('[AuthContext] soferim_applications check skipped:', e);
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
                ...extraProfile,
              });
            }
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (e) {
          console.error('[AuthContext] Firestore error during auth:', e);
          // Firebase Auth succeeded — a Firestore hiccup must NOT log the user
          // out of the UI. Fall back to a minimal customer identity.
          if (!cancelled) {
            setUser(firebaseUser ? {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'customer',
            } : null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      });
    }

    setup().catch((e) => {
      console.error('[AuthContext] Firebase setup failed:', e);
      if (!cancelled) setLoading(false);
    });

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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, updateLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
