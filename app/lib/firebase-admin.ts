import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APP_NAME = 'your-sofer-admin';

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) throw new Error('FIREBASE_PRIVATE_KEY is not set');
  return raw
    .replace(/\\n/g, '\n')   // literal \n  →  real newline (Vercel default)
    .replace(/\\\\n/g, '\n') // literal \\n →  real newline (double-escaped)
    .replace(/^["']|["']$/g, ''); // strip surrounding quotes if any
}

export function getAdminDb() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  const app = existing ?? initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'your-sofer',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    },
    APP_NAME,
  );
  return getFirestore(app);
}
