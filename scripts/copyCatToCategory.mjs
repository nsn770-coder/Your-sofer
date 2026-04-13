/**
 * Copies `cat` → `category` for every product where cat exists but category is missing/empty.
 * Uses batch writes (max 500 per batch).
 *
 * Run: node scripts/copyCatToCategory.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Load .env.local manually ─────────────────────────────────────────────────
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

const projectId = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

// ─── Init Admin SDK ───────────────────────────────────────────────────────────
initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const db = getFirestore();
const BATCH_SIZE = 400;

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching all products...');
  const snapshot = await db.collection('products').get();
  console.log(`Found ${snapshot.size} products.\n`);

  const toUpdate = snapshot.docs.filter(doc => {
    const d = doc.data();
    return d.cat && typeof d.cat === 'string' && d.cat.trim() !== '' &&
           (!d.category || typeof d.category !== 'string' || d.category.trim() === '');
  });

  console.log(`Products to update (cat present, category missing/empty): ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  let totalUpdated = 0;
  let batchNum = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.update(doc.ref, { category: doc.data().cat });
    }

    batchNum++;
    await batch.commit();
    totalUpdated += chunk.length;
    console.log(`Batch ${batchNum} committed — ${chunk.length} docs (${totalUpdated}/${toUpdate.length})`);
  }

  console.log(`\nDone. Updated ${totalUpdated} products.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
