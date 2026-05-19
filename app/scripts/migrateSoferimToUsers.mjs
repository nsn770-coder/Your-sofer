// migrateSoferimToUsers.mjs
// One-time migration: create users docs for soferim with no linked users doc.
//
// Dry run (no writes):
//   node app/scripts/migrateSoferimToUsers.mjs --test
// Live run:
//   node app/scripts/migrateSoferimToUsers.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, 'your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEST = process.argv.includes('--test');
console.log(TEST ? '🧪 DRY RUN — no writes\n' : '🚀 LIVE RUN — writing to Firestore\n');

// ── Fetch all soferim and users ──────────────────────────────────────────────
const [soferimSnap, usersSnap] = await Promise.all([
  db.collection('soferim').get(),
  db.collection('users').get(),
]);

console.log(`📋 soferim docs:  ${soferimSnap.size}`);
console.log(`👥 users docs:    ${usersSnap.size}\n`);

// Build lookup sets from the users collection
const usersByEmail = new Map();   // normalizedEmail → userId
const usersBySoferId = new Set(); // soferId values that already exist

for (const u of usersSnap.docs) {
  const d = u.data();
  if (d.email) usersByEmail.set(d.email.trim().toLowerCase(), u.id);
  if (d.soferId) usersBySoferId.add(d.soferId);
}

// ── Process each sofer ───────────────────────────────────────────────────────
let created = 0;
let skipped = 0;
let failed = 0;

for (const soferDoc of soferimSnap.docs) {
  const s = soferDoc.data();
  const soferId = soferDoc.id;
  const email = (s.email || '').trim().toLowerCase();

  const linkedBySoferId = usersBySoferId.has(soferId);
  const linkedByEmail   = email && usersByEmail.has(email);

  console.log(`──────────────────────────────────────`);
  console.log(`📄 soferim/${soferId}  (${s.name || '—'}  ${email || '—'})`);

  if (linkedBySoferId) {
    console.log(`   ✅ already linked — users doc has soferId: ${soferId}`);
    skipped++;
    continue;
  }
  if (linkedByEmail) {
    const existingUid = usersByEmail.get(email);
    console.log(`   ✅ already linked by email — users/${existingUid}`);
    skipped++;
    continue;
  }

  console.log(`   ⚠️  no linked users doc — will create`);

  if (TEST) {
    console.log(`   [DRY RUN] would create users doc with role=sofer, soferId=${soferId}`);
    created++;
    continue;
  }

  try {
    const newUserRef = db.collection('users').doc(); // auto-generated id (no Firebase uid yet)
    await newUserRef.set({
      email: s.email || '',
      displayName: s.name || '',
      role: 'sofer',
      soferId,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      migratedAt: FieldValue.serverTimestamp(),
    });
    await soferDoc.ref.update({ uid: null, migrated: true });
    console.log(`   ✅ created users/${newUserRef.id}`);
    created++;
  } catch (err) {
    console.log(`   ❌ error: ${err.message}`);
    failed++;
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════`);
console.log(`🎉 Done`);
console.log(`✅ Created:  ${created}`);
console.log(`⏭  Skipped:  ${skipped}`);
console.log(`❌ Failed:   ${failed}`);
if (TEST) console.log(`\n🧪 Dry run — re-run without --test to apply.`);

process.exit(0);
