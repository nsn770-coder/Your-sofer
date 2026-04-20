import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps().length === 0 ? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
}) : getApps()[0];

const db = getFirestore(app);
const snap = await db.collection('products').orderBy('createdAt', 'desc').limit(5).get();
snap.forEach(d => {
  const data = d.data();
  console.log('name:', data.name);
  console.log('cat:', data.cat);
  console.log('category:', data.category);
  console.log('priority:', data.priority);
  console.log('---');
});