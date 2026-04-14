import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Lazy singleton — only initialised on the first real server request, not at build time.
let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  // Strip "Value: " prefix if accidentally copied from Firebase console UI
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
  // Support both formats: literal \n escape sequences and real newlines (multiline env)
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('[firebaseAdmin] Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars');
  }

  _app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return _app;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
