/**
 * One-off script: STEP 1-3 ONLY (read-only).
 * Locates the users/ doc for benbenams@gmail.com (uid ivPTJ28hoFdzNKAK3YirfmaNEIP2),
 * prints its current fields, and STOPS — no write happens here.
 *
 * Run: node scripts/promoteUserToAdmin.mjs
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const TARGET_UID = 'ivPTJ28hoFdzNKAK3YirfmaNEIP2';
const TARGET_EMAIL = 'benbenams@gmail.com';

async function main() {
  console.log(`מנסה users/${TARGET_UID} (לפי UID) ...\n`);
  const byUidRef = db.collection('users').doc(TARGET_UID);
  const byUidSnap = await byUidRef.get();

  let foundSnap = null;
  let foundDocId = null;

  if (byUidSnap.exists) {
    foundSnap = byUidSnap;
    foundDocId = byUidSnap.id;
    console.log(`נמצא מסמך לפי UID.`);
  } else {
    console.log(`לא נמצא users/${TARGET_UID}. מחפש לפי email == "${TARGET_EMAIL}" ...\n`);
    const q = await db.collection('users').where('email', '==', TARGET_EMAIL).get();
    if (!q.empty) {
      foundSnap = q.docs[0];
      foundDocId = foundSnap.id;
      console.log(`נמצא מסמך לפי שאילתת email (${q.size} תוצאה/ות, מציג את הראשונה).`);
    }
  }

  if (!foundSnap) {
    console.error(`\n❌ לא נמצא שום מסמך ב-users עבור UID=${TARGET_UID} או email=${TARGET_EMAIL}.`);
    console.error(`   לא בוצע שום שינוי. יש לבדוק מה המבנה הנכון לפני שממשיכים.`);
    process.exit(1);
  }

  const data = foundSnap.data();
  console.log(`\nDocument ID : ${foundDocId}`);
  console.log(`role נוכחי   : ${JSON.stringify(data.role)}`);
  console.log(`\n--- כל השדות של המסמך ---`);
  console.log(JSON.stringify(data, null, 2));

  console.log(`\n⏸  עוצר כאן. לא בוצע שום עדכון. ממתין לאישור לפני כתיבה.`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
