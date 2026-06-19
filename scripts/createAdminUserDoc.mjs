/**
 * One-off script: creates the missing users/{uid} document for benbenams@gmail.com
 * with role: 'admin', so AuthContext recognizes him as admin and he appears in the
 * /admin "משתמשים" list.
 *
 * Type sources checked (no schema invented):
 *  - app/contexts/AuthContext.tsx: UserRole = 'customer' | 'shaliach' | 'sofer' | 'admin'.
 *    Its own setDoc(userRef, {...}) on first login writes exactly:
 *    { email, displayName, photoURL, role, status: 'active', createdAt, [shaliachId], [soferId] }.
 *  - app/admin/page.tsx interface AppUser (the type the users-list UI renders):
 *    { id, email, displayName?, role: UserRole, status: string, soferId?, shaliachId?, neverLoggedIn? }
 *    id is the Firestore doc id (= uid), not a stored field.
 * This script writes the same fields AuthContext's own setDoc call would have written
 * had the user signed in through the customer site instead of /ops.
 *
 * Run: node scripts/createAdminUserDoc.mjs
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });

const authAdmin = getAuth();
const db = getFirestore();

const TARGET_UID = 'ivPTJ28hoFdzNKAK3YirfmaNEIP2';
const TARGET_EMAIL = 'benbenams@gmail.com';

console.log('--- Type שנמצא ---');
console.log("UserRole (app/contexts/AuthContext.tsx) = 'customer' | 'shaliach' | 'sofer' | 'admin'");
console.log('AppUser  (app/admin/page.tsx)            = { id, email, displayName?, role: UserRole, status: string, soferId?, shaliachId?, neverLoggedIn? }');
console.log("שדות חובה לפי AppUser: email, role, status. displayName אופציונלי אך נכלל לעקביות עם AuthContext.setDoc().\n");

async function main() {
  // 1. Pull Auth data for the UID
  console.log(`שולף נתוני Auth עבור UID: ${TARGET_UID} ...\n`);
  const userRecord = await authAdmin.getUser(TARGET_UID);
  if (userRecord.email !== TARGET_EMAIL) {
    console.error(`❌ Auth UID ${TARGET_UID} שייך ל-${userRecord.email}, לא ל-${TARGET_EMAIL}. עוצר.`);
    process.exit(1);
  }
  console.log(`   Email        : ${userRecord.email}`);
  console.log(`   Display name : ${userRecord.displayName ?? '—'}`);
  console.log(`   Photo URL    : ${userRecord.photoURL ?? '—'}\n`);

  // 2. Re-confirm the doc still doesn't exist (no overwrite)
  const userRef = db.collection('users').doc(TARGET_UID);
  const existing = await userRef.get();
  if (existing.exists) {
    console.error(`❌ users/${TARGET_UID} כבר קיים — לא דורס. נתונים נוכחיים:`);
    console.error(JSON.stringify(existing.data(), null, 2));
    process.exit(1);
  }
  console.log(`אושר: users/${TARGET_UID} לא קיים. יוצר מסמך חדש...\n`);

  // 3. Create the doc
  const docData = {
    email: userRecord.email,
    displayName: userRecord.displayName || 'ben amsalem',
    photoURL: userRecord.photoURL || null,
    role: 'admin',
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
  };
  await userRef.set(docData);

  // 4. Confirmation
  console.log('=== הושלם בהצלחה ===');
  console.log(`Document ID: users/${TARGET_UID}\n`);
  console.log('שדות שנכתבו:');
  for (const [k, v] of Object.entries(docData)) {
    console.log(`  ${k}: ${k === 'createdAt' ? 'serverTimestamp()' : JSON.stringify(v)}`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
