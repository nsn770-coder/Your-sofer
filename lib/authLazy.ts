// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;

export async function getAuthLazy() {
  if (authInstance) return authInstance;
  const [
    { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence },
    { default: app },
  ] = await Promise.all([
    import('firebase/auth'),
    import('../app/firebase-app'),
  ]);
  const auth = getAuth(app);
  // iOS Safari private mode blocks IndexedDB (Firebase Auth default).
  // Explicitly use localStorage; fall back to in-memory if that also fails.
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, inMemoryPersistence);
    } catch {
      // keep whatever default was already set
    }
  }
  authInstance = auth;
  return authInstance;
}
