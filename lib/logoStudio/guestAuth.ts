'use client';
// Guest (anonymous) Firebase session for the Logo Studio only.
// Runs on a SEPARATE Firebase app instance, so the anonymous user never
// becomes the site's signed-in user (NavBar, club, checkout and AuthContext
// keep seeing "logged out"). The server verifies its ID token like any other
// Firebase token, so quota / projects / codes keep working per uid.

import type { Auth, User } from 'firebase/auth';

const GUEST_APP_NAME = 'logo-studio-guest';
let guestAuth: Auth | null = null;
let pending: Promise<User> | null = null;

export async function getGuestAuth(): Promise<Auth> {
  if (guestAuth) return guestAuth;
  const [{ initializeApp, getApps }, { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence }, { default: mainApp }] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('@/app/firebase-app'),
  ]);
  const app = getApps().find(a => a.name === GUEST_APP_NAME) ?? initializeApp(mainApp.options, GUEST_APP_NAME);
  const auth = getAuth(app);
  // keep the same guest uid across visits (same attempts + designs)
  try { await setPersistence(auth, browserLocalPersistence); }
  catch { try { await setPersistence(auth, inMemoryPersistence); } catch { /* keep default */ } }
  guestAuth = auth;
  return auth;
}

/** Returns the current guest user, creating an anonymous session if needed. */
export async function ensureGuestUser(): Promise<User> {
  const auth = await getGuestAuth();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!pending) {
    pending = import('firebase/auth')
      .then(({ signInAnonymously }) => signInAnonymously(auth))
      .then(c => c.user)
      .finally(() => { pending = null; });
  }
  return pending;
}

/** Subscribe to the guest uid (null until a guest session exists). */
export function onGuestUid(cb: (uid: string | null) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  void Promise.all([getGuestAuth(), import('firebase/auth')]).then(([auth, { onAuthStateChanged }]) => {
    if (cancelled) return;
    unsub = onAuthStateChanged(auth, u => cb(u?.uid ?? null));
  });
  return () => { cancelled = true; unsub?.(); };
}
