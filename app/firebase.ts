import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I",
  authDomain: "your-sofer.firebaseapp.com",
  projectId: "your-sofer",
  storageBucket: "your-sofer.firebasestorage.app",
  messagingSenderId: "7710397068",
  appId: "1:7710397068:web:3c9880f24871efd4d661a9"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;