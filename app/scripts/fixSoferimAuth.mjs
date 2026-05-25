// fixSoferimAuth.mjs
// Finds soferim in Firestore with no Firebase Auth account and creates one.
//
// Dry run (no writes):
//   node app/scripts/fixSoferimAuth.mjs --test
// Live run:
//   node app/scripts/fixSoferimAuth.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, 'your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const auth = getAuth();

const TEST = process.argv.includes('--test');
console.log(TEST ? '🧪 DRY RUN — no writes\n' : '🚀 LIVE RUN — writing to Firebase Auth + Firestore\n');

const soferimSnap = await db.collection('soferim').get();
console.log(`📋 Found ${soferimSnap.size} soferim\n`);

let missing = 0;
let created = 0;
let alreadyExists = 0;
let noEmail = 0;
let failed = 0;

for (const soferDoc of soferimSnap.docs) {
  const s = soferDoc.data();
  const soferId = soferDoc.id;
  const email = (s.email || '').trim().toLowerCase();

  console.log(`──────────────────────────────────`);
  console.log(`📄 soferim/${soferId}  (${s.name || '—'})`);

  if (!email) {
    console.log(`   ⚠️  No email — skipping`);
    noEmail++;
    continue;
  }

  console.log(`   📧 ${email}`);

  // Check if Firebase Auth user exists
  let authUser = null;
  try {
    authUser = await auth.getUserByEmail(email);
    console.log(`   ✅ Firebase Auth user exists: ${authUser.uid}`);
    alreadyExists++;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`   ❌ No Firebase Auth account found`);
      missing++;
    } else {
      console.log(`   ❌ Error checking auth: ${err.message}`);
      failed++;
      continue;
    }
  }

  if (authUser) {
    // Auth user exists — ensure users collection doc is correct
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      const d = userDoc.data();
      const needsUpdate = d.uid !== authUser.uid || d.role !== 'sofer' || d.soferId !== soferId;
      if (needsUpdate) {
        console.log(`   🔧 users/${userDoc.id} — updating uid/role/soferId`);
        if (!TEST) {
          await userDoc.ref.update({ uid: authUser.uid, role: 'sofer', soferId });
          console.log(`   ✅ Updated`);
        }
      } else {
        console.log(`   ✅ users doc is correct — no action needed`);
      }
    } else {
      console.log(`   ⚠️  No users doc found — creating users/${authUser.uid}`);
      if (!TEST) {
        await db.collection('users').doc(authUser.uid).set({
          email,
          displayName: s.name || '',
          role: 'sofer',
          soferId,
          status: 'active',
          uid: authUser.uid,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`   ✅ Created`);
      }
    }
    continue;
  }

  // No auth user — create one
  console.log(`   🔧 Creating Firebase Auth account for ${email}...`);
  if (TEST) {
    console.log(`   [DRY RUN] would create auth user: ${email} (displayName: ${s.name || '—'})`);
    created++;
    continue;
  }

  try {
    const newUser = await auth.createUser({
      email,
      displayName: s.name || '',
      password: 'Sofer2024!',
      emailVerified: false,
    });
    console.log(`   ✅ Created Firebase Auth user: ${newUser.uid}`);
    created++;

    // Check if there's already a users doc by email
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      if (userDoc.id === newUser.uid) {
        await userDoc.ref.update({ uid: newUser.uid, role: 'sofer', soferId, neverLoggedIn: true });
      } else {
        // Merge existing data into the auth-uid keyed doc
        const existing = userDoc.data();
        await db.collection('users').doc(newUser.uid).set(
          { ...existing, uid: newUser.uid, role: 'sofer', soferId, neverLoggedIn: true, updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
      }
      console.log(`   ✅ Linked existing users doc to new auth uid ${newUser.uid}`);
    } else {
      // Create fresh users doc keyed by auth uid
      await db.collection('users').doc(newUser.uid).set({
        email,
        displayName: s.name || '',
        role: 'sofer',
        soferId,
        status: 'active',
        uid: newUser.uid,
        neverLoggedIn: true,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`   ✅ Created users/${newUser.uid}`);
    }
  } catch (err) {
    console.log(`   ❌ Failed: ${err.message}`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`🎉 Done`);
console.log(`📊 Total soferim:    ${soferimSnap.size}`);
console.log(`❌ Missing auth:     ${missing}`);
console.log(`✅ Created:          ${created}`);
console.log(`✅ Already existed:  ${alreadyExists}`);
console.log(`⚠️  No email:        ${noEmail}`);
console.log(`❌ Failed:           ${failed}`);
if (TEST) console.log(`\n🧪 Dry run — re-run without --test to apply.`);

process.exit(0);
