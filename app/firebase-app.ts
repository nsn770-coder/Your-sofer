import { initializeApp, getApps } from 'firebase/app';

// On the production domain we serve the Firebase Auth handler from our own
// origin (see the /__/auth/* rewrite in next.config.ts). This keeps the whole
// Google sign-in flow first-party, so browsers that block third-party
// cookies/storage (Chrome, Safari) no longer break signInWithPopup/Redirect.
// Everywhere else (localhost, Vercel previews) we keep firebaseapp.com.
const PROD_HOSTS = ['your-sofer.com', 'www.your-sofer.com'];
const authDomain =
  typeof window !== 'undefined' && PROD_HOSTS.includes(window.location.hostname)
    ? window.location.hostname
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'your-sofer.firebaseapp.com';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export default app;
