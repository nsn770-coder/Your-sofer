/**
 * Looks up the Firebase Auth UID for yosef21me@gmail.com,
 * then creates/confirms admins/{uid} so AuthContext grants admin role.
 *
 * Run: node scripts/fixAdminByEmail.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const envVars = {};
let currentKey = null, currentValue = [];
for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!m) continue;
    currentKey = m[1]; currentValue = [m[2]];
  } else {
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      envVars[currentKey] = currentValue.join('\n');
      const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      currentKey = m[1]; currentValue = [m[2]];
    } else { currentValue.push(line.trimEnd()); }
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

const projectId   = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase credentials in .env.local'); process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const authAdmin = getAuth();
const db = getFirestore();

const TARGET_EMAIL = 'yosef21me@gmail.com';

async function main() {
  // 1. Look up UID from Firebase Auth
  console.log(`Looking up Firebase Auth UID for: ${TARGET_EMAIL} ...\n`);
  let uid;
  try {
    const userRecord = await authAdmin.getUserByEmail(TARGET_EMAIL);
    uid = userRecord.uid;
    console.log(`✅ נמצא ב-Firebase Auth:`);
    console.log(`   UID          : ${uid}`);
    console.log(`   Display name : ${userRecord.displayName ?? '—'}`);
    console.log(`   Email        : ${userRecord.email}`);
    console.log();
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ המשתמש ${TARGET_EMAIL} לא נמצא ב-Firebase Auth.`);
      console.error(`   יוסף חיים צריך להיכנס פעם אחת עם Google כדי שייווצר לו UID.`);
    } else {
      console.error('שגיאה:', err.message);
    }
    process.exit(1);
  }

  // 2. Check / create admins/{uid}
  const adminRef = db.collection('admins').doc(uid);
  const adminSnap = await adminRef.get();

  if (adminSnap.exists()) {
    console.log(`✅ admins/${uid} כבר קיים:`);
    console.log(`   ${JSON.stringify(adminSnap.data())}`);
  } else {
    await adminRef.set({
      email: TARGET_EMAIL,
      name:  'יוסף חיים',
      role:  'admin',
    });
    console.log(`✅ נוצר מסמך חדש: admins/${uid}`);
    console.log(`   email : ${TARGET_EMAIL}`);
    console.log(`   name  : יוסף חיים`);
    console.log(`   role  : admin`);
  }

  // 3. Also update users/{uid} role to admin if it exists
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists()) {
    const currentRole = userSnap.data()?.role;
    if (currentRole !== 'admin') {
      await userRef.update({ role: 'admin' });
      console.log(`\n✅ עודכן גם users/${uid}.role → "admin" (היה: "${currentRole}")`);
    } else {
      console.log(`\n✅ users/${uid}.role כבר "admin"`);
    }
  } else {
    console.log(`\nℹ️  אין מסמך ב-users/${uid} עדיין (ייווצר בכניסה הבאה).`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
