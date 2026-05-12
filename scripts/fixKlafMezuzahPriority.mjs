/**
 * Adds priority: 0 to all 'קלפי מזוזה' products that are missing the field.
 * Run: node scripts/fixKlafMezuzahPriority.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const projectId   = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  console.log("📦 Fetching קלפי מזוזה products...");
  const snap = await db.collection('products').where('cat', '==', 'קלפי מזוזה').get();
  console.log(`   Found ${snap.size} products.\n`);

  let updated = 0;
  let skipped = 0;

  const batch = db.batch();
  for (const d of snap.docs) {
    if (d.data().priority === undefined) {
      batch.update(d.ref, { priority: 0 });
      updated++;
    } else {
      skipped++;
    }
  }

  if (updated > 0) {
    await batch.commit();
  }

  console.log(`✅ Updated : ${updated}`);
  console.log(`⏭  Skipped : ${skipped} (priority already set)`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
