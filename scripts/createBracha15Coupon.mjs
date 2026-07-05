/**
 * createBracha15Coupon.mjs — יצירת קופון ברכה15 (15% הנחה על כל האתר)
 * שימוש: node scripts/createBracha15Coupon.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SA_CANDIDATES = [
  process.env.SERVICE_ACCOUNT_PATH,
  resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'),
  resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json'),
  resolve(__dirname, '../app/scripts/serviceAccount.json'),
].filter(Boolean);

const SA_PATH = SA_CANDIDATES.find(p => existsSync(p));
if (!SA_PATH) { console.error('❌ לא נמצא service account'); process.exit(1); }
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const CODE = 'ברכה15';

await db.collection('coupons').doc(CODE).set({
  code: CODE,
  discount: 15,
  type: 'percent',
  active: true,
  singleUse: false,          // רב-פעמי — קופון פומבי לכל האתר
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log(`✅ קופון "${CODE}" נוצר/עודכן: 15% הנחה, פעיל, רב-פעמי`);
process.exit(0);
