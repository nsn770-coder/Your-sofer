import app from './firebase-app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;