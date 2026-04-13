/**
 * Prints the last 5 products ordered by createdAt desc.
 * Shows: name, cat, category, priority
 *
 * Run: node scripts/checkLastProducts.mjs
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching last 5 products by createdAt desc...\n');

  const snapshot = await db
    .collection('products')
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  if (snapshot.empty) {
    console.log('No products found.');
    process.exit(0);
  }

  snapshot.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`#${i + 1} [${doc.id}]`);
    console.log(`   name     : ${d.name ?? '—'}`);
    console.log(`   cat      : ${d.cat ?? '—'}`);
    console.log(`   category : ${d.category ?? '—'}`);
    console.log(`   priority : ${d.priority ?? '—'}`);
    console.log();
  });

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
