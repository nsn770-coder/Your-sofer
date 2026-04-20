/**
 * Deletes all products with price === 0 or price === "0" from Firestore.
 * Uses batch deletes (max 500 per batch).
 * Run: node scripts/deleteZeroPriceProducts.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function batchDelete(docs) {
  const BATCH_SIZE = 500;
  let deleted = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, docs.length - i);
    console.log(`  מחיקת batch ${Math.floor(i / BATCH_SIZE) + 1}: ${deleted}/${docs.length}`);
  }
  return deleted;
}

async function main() {
  console.log('\nמחפש מוצרים עם price === 0 ...\n');

  // Fetch all products (Firestore can't query price == 0 AND price == "0" in one query)
  const snap = await db.collection('products').get();
  console.log(`סה"כ מוצרים ב-collection: ${snap.size}`);

  const toDelete = [];
  snap.forEach(d => {
    const price = d.data().price;
    if (price === 0 || price === '0' || price === 0.0) {
      toDelete.push(d);
      console.log(`  🗑️  ${d.id} — "${d.data().name ?? '(ללא שם)'}" price=${JSON.stringify(price)}`);
    }
  });

  console.log(`\nנמצאו ${toDelete.length} מוצרים עם price === 0`);

  if (toDelete.length === 0) {
    console.log('אין מה למחוק.');
    process.exit(0);
  }

  console.log('\nמוחק...');
  const deleted = await batchDelete(toDelete);

  console.log(`\n✅ נמחקו ${deleted} מוצרים בהצלחה.`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
