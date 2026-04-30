// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;

export async function getAuthLazy() {
  if (authInstance) return authInstance;
  const { getAuth } = await import('firebase/auth');
  const { default: app } = await import('../app/firebase-app');
  authInstance = getAuth(app);
  return authInstance;
}
