import app from './firebase-app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;