/**
 * Adds priority fields to all documents in the "products" collection.
 * Fields added (only if missing): priority, isBestSeller, badge, filterAttributes
 *
 * Run: node scripts/addPriorityFields.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Load .env.local manually (dotenv doesn't support .env.local by default) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
let currentKey = null;
let currentValue = [];

for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!match) continue;
    currentKey = match[1];
    currentValue = [match[2]];
  } else {
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      // Save previous key
      envVars[currentKey] = currentValue.join('\n');
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      currentKey = match[1];
      currentValue = [match[2]];
    } else {
      currentValue.push(line.trimEnd());
    }
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

// Strip accidental "Value: " prefix from client email
const projectId = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

// ─── Init Admin SDK ───────────────────────────────────────────────────────────
initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore();
const BATCH_SIZE = 400;

const DEFAULTS = {
  priority: 50,
  isBestSeller: false,
  badge: null,
  filterAttributes: {},
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📦 Fetching all products from Firestore...');
  const snapshot = await db.collection('products').get();
  console.log(`   Found ${snapshot.size} products.\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let batchCount = 0;

  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let batchUpdates = 0;

    for (const doc of chunk) {
      const data = doc.data();
      const missing = {};

      for (const [field, defaultVal] of Object.entries(DEFAULTS)) {
        if (!(field in data)) {
          missing[field] = defaultVal;
        }
      }

      if (Object.keys(missing).length === 0) {
        totalSkipped++;
        continue;
      }

      batch.update(doc.ref, missing);
      batchUpdates++;
      totalUpdated++;
    }

    if (batchUpdates > 0) {
      batchCount++;
      await batch.commit();
      console.log(`  ✅ Batch ${batchCount} committed — ${batchUpdates} docs updated (docs ${i + 1}–${Math.min(i + BATCH_SIZE, docs.length)})`);
    } else {
      console.log(`  ⏭  Batch ${batchCount + 1} skipped — all docs already have fields (docs ${i + 1}–${Math.min(i + BATCH_SIZE, docs.length)})`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`🎉 Done!`);
  console.log(`   Updated : ${totalUpdated}`);
  console.log(`   Skipped : ${totalSkipped} (fields already present)`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
