/**
 * updateTefilinCompletImage.mjs
 *
 * עדכן את aiLifestyleImage לכל מוצרי "תפילין קומפלט" עם תמונה אמיתית חדשה
 *
 * node app/scripts/updateTefilinCompletImage.mjs
 * node app/scripts/updateTefilinCompletImage.mjs --yes   (דלג על אישורים)
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Env loader ─────────────────────────────────────────────────────────────────

function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
  const vars = {};
  let key = null, val = [];
  for (const line of raw.split('\n')) {
    const m = line.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) {
      if (key) vars[key] = val.join('\n');
      key = m[1]; val = [m[2]];
    } else if (key) {
      val.push(line.trimEnd());
    }
  }
  if (key) vars[key] = val.join('\n');
  return vars;
}

const env = loadEnv();
const projectId   = env['FIREBASE_PROJECT_ID'];
const clientEmail = (env['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (env['FIREBASE_PRIVATE_KEY']  ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌  Missing Firebase credentials in .env.local');
  process.exit(1);
}

// ── Firebase Admin ────────────────────────────────────────────────────────────

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── Constants ─────────────────────────────────────────────────────────────────

const NEW_IMAGE_URL = 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1785422972/joytqdvowcnrqp1bhh3j.jpg';
const CATEGORY = 'תפילין קומפלט';
const DRY_SIZE = 5;
const BATCH_SIZE = 25;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Prompt helper ─────────────────────────────────────────────────────────────

async function confirm(msg) {
  if (process.argv.includes('--yes')) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(msg + ' (y/n) ', ans => {
      rl.close();
      resolve(ans.toLowerCase() === 'y');
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔍 Fetching all products in category: ${CATEGORY}\n`);

  // שליפת כל מוצרים בקטגוריה תפילין קומפלט
  const snapshot = await db
    .collection('products')
    .where('cat', '==', CATEGORY)
    .limit(1000)
    .get();

  const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${docs.length} products\n`);

  if (docs.length === 0) {
    console.log('✅ No products to update');
    process.exit(0);
  }

  // הצג דוגמא לדרי-רן
  console.log('📋 Sample (first 5):');
  docs.slice(0, DRY_SIZE).forEach((d, i) => {
    console.log(`   ${i + 1}. [${d.id}] ${d.name}`);
    console.log(`      Current aiLifestyleImage: ${d.aiLifestyleImage || '(none)'}`);
  });

  console.log(`\n   ... and ${Math.max(0, docs.length - DRY_SIZE)} more\n`);

  const shouldContinue = await confirm('✅ Update all?');
  if (!shouldContinue) {
    console.log('❌ Cancelled');
    process.exit(0);
  }

  console.log(`\n🔄 Updating ${docs.length} products...\n`);

  // עדכן בבאצים
  let updated = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = docs.slice(i, i + BATCH_SIZE);

    for (const doc of slice) {
      batch.update(db.collection('products').doc(doc.id), {
        aiLifestyleImage: NEW_IMAGE_URL,
      });
    }

    await batch.commit();
    updated += slice.length;
    console.log(`   ✓ Updated ${updated}/${docs.length}`);
    if (i + BATCH_SIZE < docs.length) await sleep(500);
  }

  console.log(`\n✅ Done! ${updated} products updated`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
