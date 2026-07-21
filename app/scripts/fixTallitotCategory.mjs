/**
 * fixTallitotCategory.mjs — מעביר את הטליתות המיובאות (source=mofet)
 * מהקטגוריה 'טליתות' לקטגוריה החיה של האתר: 'טליתות וציציות'.
 *
 * Usage: node app/scripts/fixTallitotCategory.mjs
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
}
const db = getFirestore();

const snap = await db.collection('products').where('source', '==', 'mofet').get();
console.log(`נמצאו ${snap.size} מוצרי טליתות מהייבוא`);

const batch = db.batch();
snap.docs.forEach(d => batch.update(d.ref, { cat: 'טליתות וציציות', category: 'טליתות וציציות' }));
await batch.commit();

console.log(`✅ ${snap.size} מוצרים הועברו לקטגוריה "טליתות וציציות"`);
console.log('עכשיו הרץ: node scripts/syncAlgolia.mjs');
process.exit(0);
