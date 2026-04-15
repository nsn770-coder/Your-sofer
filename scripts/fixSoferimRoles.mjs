/**
 * For every active sofer document in `soferim/`,
 * find the matching user in `users/` by email,
 * and set role: 'sofer' + soferId if not already set.
 *
 * Run: node scripts/fixSoferimRoles.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
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
const db = getFirestore();

async function main() {
  // 1. Load all active soferim
  const soferimSnap = await db.collection('soferim').where('status', '==', 'active').get();
  console.log(`\nנמצאו ${soferimSnap.size} סופרים פעילים.\n`);

  let fixed = 0, skipped = 0, noUser = 0;

  for (const soferDoc of soferimSnap.docs) {
    const sofer = soferDoc.data();
    const email = sofer.email?.trim().toLowerCase();

    if (!email) {
      console.log(`⚠️  ${soferDoc.id} (${sofer.name}) — אין אימייל, מדלג`);
      skipped++;
      continue;
    }

    // 2. Find matching user by email
    const usersSnap = await db.collection('users').where('email', '==', email).get();

    if (usersSnap.empty) {
      console.log(`❌  ${sofer.name} (${email}) — לא נמצא ב-users`);
      noUser++;
      continue;
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const alreadyOk = userData.role === 'sofer' && userData.soferId === soferDoc.id;

    if (alreadyOk) {
      console.log(`✅  ${sofer.name} — כבר מוגדר נכון (role: sofer, soferId: ${soferDoc.id})`);
      skipped++;
      continue;
    }

    // 3. Never downgrade an admin
    if (userData.role === 'admin') {
      console.log(`⚠️  ${sofer.name} (${email}) — role=admin, מדלג (לא מוריד לסופר)`);
      skipped++;
      continue;
    }

    // 4. Update user
    await userDoc.ref.update({ role: 'sofer', soferId: soferDoc.id });
    console.log(`🔧  ${sofer.name} (${email})`);
    console.log(`    uid: ${userDoc.id}`);
    console.log(`    role: ${userData.role} → sofer`);
    console.log(`    soferId: ${userData.soferId ?? '—'} → ${soferDoc.id}`);
    fixed++;
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`תוקנו:  ${fixed}`);
  console.log(`כבר בסדר: ${skipped}`);
  console.log(`ללא משתמש: ${noUser}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
