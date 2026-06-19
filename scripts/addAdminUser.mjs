/**
 * One-off script: grants full admin access to benbenams@gmail.com.
 * - Looks up the existing Firebase Auth user (must have signed in via Google already).
 * - Writes opsUsers/{email} with role "owner" (top-level /ops dashboard role).
 * - Writes admins/{uid} (used by AuthContext / verifyAdminToken for general admin checks).
 *
 * Run: node scripts/addAdminUser.mjs
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

const TARGET_EMAIL = 'benbenams@gmail.com';

async function main() {
  // 1. Look up UID from Firebase Auth — must already exist (user signed in via Google).
  console.log(`Looking up Firebase Auth UID for: ${TARGET_EMAIL} ...\n`);
  let uid;
  try {
    const userRecord = await authAdmin.getUserByEmail(TARGET_EMAIL);
    uid = userRecord.uid;
    console.log(`נמצא ב-Firebase Auth:`);
    console.log(`   UID          : ${uid}`);
    console.log(`   Display name : ${userRecord.displayName ?? '—'}`);
    console.log(`   Email        : ${userRecord.email}`);
    console.log();
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`שגיאה: המשתמש ${TARGET_EMAIL} לא נמצא ב-Firebase Auth.`);
      console.error(`   המשתמש צריך להתחבר פעם אחת עם Google כדי שייווצר לו UID, לפני הרצת הסקריפט הזה.`);
    } else {
      console.error('שגיאה:', err.message);
    }
    process.exit(1);
  }

  // 2. Write opsUsers/{email} — owner role (top-level /ops dashboard access)
  const opsUserRef = db.collection('opsUsers').doc(TARGET_EMAIL);
  await opsUserRef.set({
    email: TARGET_EMAIL,
    role: 'owner',
    active: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  // 3. Write admins/{uid}
  const adminRef = db.collection('admins').doc(uid);
  await adminRef.set({
    email: TARGET_EMAIL,
    grantedAt: FieldValue.serverTimestamp(),
  });

  // 4. Confirmation
  console.log('=== הושלם בהצלחה ===');
  console.log(`UID: ${uid}\n`);
  console.log('נכתב ל-Firestore:');
  console.log(`  1) collection: opsUsers   | document ID: ${TARGET_EMAIL} | role: owner`);
  console.log(`  2) collection: admins     | document ID: ${uid} | (admin grant)`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
