/**
 * seedDefaultStore.mjs
 *
 * Phase 1a — Multi-tenancy seed: default store + memberships.
 * ADDITIVE ONLY — does not touch any existing product, query, route, or checkout.
 * IDEMPOTENT — safe to run multiple times; uses set+merge so nothing is overwritten.
 *
 * What it does:
 *   1. Creates / updates  stores/yoursofer
 *   2. Creates / updates  memberships/yoursofer_<uid>  for the owner
 *   3. Looks up idan's UID by email, creates / updates his membership
 *   4. Adds platformRole:"superadmin" to existing users/<uid> docs (no create)
 *
 * Usage:
 *   node app/scripts/seedDefaultStore.mjs
 *   node app/scripts/seedDefaultStore.mjs --dry-run
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN   = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('\n🧪 DRY-RUN — Firestore will NOT be modified\n');

// ── Firebase Admin init ───────────────────────────────────────────────────────
// Try multiple SA paths used across this project, then fall back to env vars.
function initAdmin() {
  if (getApps().length > 0) return getApps()[0];

  const saPaths = [
    // Root of the project (confirmed present)
    resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'),
    // Downloads folder (used in ad-hoc queries)
    'C:/Users/Owner/Downloads/your-sofer-firebase-adminsdk-fbsvc-a682983bfd.json',
    // env-var override
    process.env.SERVICE_ACCOUNT_PATH,
  ].filter(Boolean);

  for (const p of saPaths) {
    if (existsSync(p)) {
      console.log(`🔑 Using service account: ${p}`);
      return initializeApp({ credential: cert(JSON.parse(readFileSync(p, 'utf8'))) });
    }
  }

  // Last resort: env vars (like lib/firebaseAdmin.ts)
  const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('No service account file found and FIREBASE_* env vars are missing.');
  }
  console.log('🔑 Using env-var credentials');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const adminApp = initAdmin();
const db       = getFirestore(adminApp);
const auth     = getAuth(adminApp);

// ── Constants ─────────────────────────────────────────────────────────────────
const OWNER_UID  = 'CqYU8azKVdQPt6PVahDLmCJ5fp53';
const IDAN_EMAIL = 'bnsymwlydn2@gmail.com';

// ── Summary counters ──────────────────────────────────────────────────────────
const summary = { created: [], updated: [], skipped: [], warnings: [] };

function log(action, path, detail = '') {
  const icon = { created: '✅', updated: '🔄', skipped: '⏭ ', warning: '⚠️ ' }[action] ?? '  ';
  console.log(`  ${icon} [${action.toUpperCase()}] ${path}${detail ? '  — ' + detail : ''}`);
  if (action === 'warning') summary.warnings.push(path);
  else summary[action === 'created' || action === 'updated' ? action : 'skipped'].push(path);
}

async function setDoc(ref, data, label) {
  if (DRY_RUN) { log('created', label, 'DRY-RUN'); return; }
  await ref.set(data, { merge: true });
}

// ── 1. stores/yoursofer ───────────────────────────────────────────────────────
async function seedStore() {
  console.log('\n── Step 1: stores/yoursofer ──────────────────────────────');
  const ref  = db.collection('stores').doc('yoursofer');
  const snap = await ref.get();

  const data = {
    storeId:         'yoursofer',
    ownerUserId:     OWNER_UID,
    storeName:       'YourSofer',
    slug:            'yoursofer',
    logo:            '',
    customDomain:    'your-sofer.com',
    subdomain:       'yoursofer',
    theme:           { primary: '', accent: '', font: '', heroImage: '' },
    currency:        'ILS',
    language:        'he',
    paymentSettings: { provider: 'cardcom' },
    shippingSettings:{},
    status:          'active',
    plan:            'owner',
    commissionRate:  0,
    metaPixelId:     '',
    gaId:            'G-PM7GW4MWEJ',
    createdAt:       snap.exists ? snap.data().createdAt : FieldValue.serverTimestamp(),
  };

  await setDoc(ref, data, 'stores/yoursofer');
  log(snap.exists ? 'updated' : 'created', 'stores/yoursofer');
}

// ── 2 + 3. memberships ───────────────────────────────────────────────────────
async function seedMembership(uid, role, label) {
  const docId = `yoursofer_${uid}`;
  const ref   = db.collection('memberships').doc(docId);
  const snap  = await ref.get();

  const data = {
    userId:    uid,
    storeId:   'yoursofer',
    role,
    createdAt: snap.exists ? snap.data().createdAt : FieldValue.serverTimestamp(),
  };

  await setDoc(ref, data, `memberships/${docId}`);
  log(snap.exists ? 'updated' : 'created', `memberships/${docId}`, label);
}

async function seedMemberships() {
  console.log('\n── Step 2: memberships ───────────────────────────────────');

  // Owner (UID known)
  await seedMembership(OWNER_UID, 'owner', 'owner');

  // Idan (look up by email)
  try {
    const user = await auth.getUserByEmail(IDAN_EMAIL);
    await seedMembership(user.uid, 'superadmin', `idan — ${IDAN_EMAIL}`);
  } catch (e) {
    const msg = `User not found for ${IDAN_EMAIL}: ${e.message}`;
    console.log(`  ⚠️  ${msg}`);
    summary.warnings.push(msg);
  }
}

// ── 4. users — add platformRole only if doc exists ───────────────────────────
async function seedUserRole(uid, label) {
  const ref  = db.collection('users').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const msg = `users/${uid} (${label}) does not exist — skipping`;
    console.log(`  ⚠️  ${msg}`);
    summary.warnings.push(msg);
    return;
  }

  const patch = { platformRole: 'superadmin' };
  if (!DRY_RUN) await ref.set(patch, { merge: true });
  log('updated', `users/${uid}`, `platformRole=superadmin  (${label})`);
}

async function seedUserRoles() {
  console.log('\n── Step 3: users — platformRole ──────────────────────────');

  await seedUserRole(OWNER_UID, 'owner');

  try {
    const user = await auth.getUserByEmail(IDAN_EMAIL);
    await seedUserRole(user.uid, `idan — ${IDAN_EMAIL}`);
  } catch (e) {
    const msg = `Cannot look up ${IDAN_EMAIL} for users update: ${e.message}`;
    console.log(`  ⚠️  ${msg}`);
    summary.warnings.push(msg);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(55));
  console.log('🏪 YourSofer — Seed Default Store (Phase 1a)');
  console.log('═'.repeat(55));

  await seedStore();
  await seedMemberships();
  await seedUserRoles();

  console.log('\n' + '═'.repeat(55));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(55));
  console.log(`  ✅ Created  : ${summary.created.length}`);
  summary.created.forEach(p  => console.log(`       ${p}`));
  console.log(`  🔄 Updated  : ${summary.updated.length}`);
  summary.updated.forEach(p  => console.log(`       ${p}`));
  console.log(`  ⏭  Skipped  : ${summary.skipped.length}`);
  summary.skipped.forEach(p  => console.log(`       ${p}`));
  if (summary.warnings.length) {
    console.log(`  ⚠️  Warnings : ${summary.warnings.length}`);
    summary.warnings.forEach(w => console.log(`       ${w}`));
  }
  if (DRY_RUN) console.log('\n🧪 DRY-RUN complete — nothing was written.');
  console.log('═'.repeat(55));

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
