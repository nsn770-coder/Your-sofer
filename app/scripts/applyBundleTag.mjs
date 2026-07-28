/**
 * WRITE — מוסיף/מעדכן bundlePromo על 613 מוצרי כיפות.
 * משנה שדה bundlePromo בלבד.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');
try {
  const env = readFileSync(envPath, 'utf-8');
  let key = null, val = [], multi = false;
  for (const line of env.split('\n')) {
    if (!multi && line.includes('=')) {
      const eq = line.indexOf('=');
      key = line.slice(0, eq).trim();
      const rest = line.slice(eq + 1);
      if (rest.includes('-----BEGIN')) { multi = true; val = [rest]; }
      else { process.env[key] = rest.trim(); key = null; }
    } else if (multi) {
      val.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[key] = val.join('\n').trim();
        multi = false; key = null; val = [];
      }
    }
  }
} catch { /* rely on existing env */ }

const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
if (!projectId || !clientEmail || !privateKey) { console.error('❌ חסרים משתני סביבה'); process.exit(1); }
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

function resolveTag(price) {
  if (price >= 34 && price <= 44) return '3for100';
  if (price >= 25 && price <= 33) return '4for100';
  if (price >= 20 && price <= 24) return '5for100';
  if (price === 9)                return '12for100';
  return null;
}

console.log('טוען כל מוצרי כיפות...');
const snap = await db.collection('products').where('cat', '==', 'כיפות').get();
console.log(`סה"כ: ${snap.size} מוצרים\n`);

const tallies = { '3for100': 0, '4for100': 0, '5for100': 0, '12for100': 0, removed: 0, skipped: 0 };

const BATCH_SIZE = 400;
let batch = db.batch();
let batchCount = 0;
let total = 0;

async function flush() {
  if (batchCount === 0) return;
  await batch.commit();
  batch = db.batch();
  batchCount = 0;
}

for (const d of snap.docs) {
  const price = d.data().price;
  const tag   = resolveTag(price);

  if (tag) {
    batch.update(d.ref, { bundlePromo: tag });
    tallies[tag]++;
  } else {
    // הסר bundlePromo אם קיים בטעות
    const existing = d.data().bundlePromo;
    if (existing) {
      batch.update(d.ref, { bundlePromo: FieldValue.delete() });
      tallies.removed++;
    } else {
      tallies.skipped++;
      continue; // אל תוסיף לbatch
    }
  }

  batchCount++;
  total++;
  if (batchCount >= BATCH_SIZE) {
    await flush();
    console.log(`  [batch] ${total} עד כה...`);
  }
}
await flush();

console.log(`\n✅ עודכנו ${total} מסמכים`);
console.log(`   3for100:  ${tallies['3for100']}`);
console.log(`   4for100:  ${tallies['4for100']}`);
console.log(`   5for100:  ${tallies['5for100']}`);
console.log(`   12for100: ${tallies['12for100']}`);
if (tallies.removed) console.log(`   הוסר bundlePromo קיים: ${tallies.removed}`);
console.log(`   לא שונו (מחוץ לטווח): ${tallies.skipped}`);

// אימות
console.log('\n=== אימות מ-Firestore ===');
const [t3, t4, t5, t12] = await Promise.all([
  db.collection('products').where('cat','==','כיפות').where('bundlePromo','==','3for100').get(),
  db.collection('products').where('cat','==','כיפות').where('bundlePromo','==','4for100').get(),
  db.collection('products').where('cat','==','כיפות').where('bundlePromo','==','5for100').get(),
  db.collection('products').where('cat','==','כיפות').where('bundlePromo','==','12for100').get(),
]);
console.log(`  3for100:  ${t3.size}  (צפוי: 155)`);
console.log(`  4for100:  ${t4.size}  (צפוי: 221)`);
console.log(`  5for100:  ${t5.size}  (צפוי: 131)`);
console.log(`  12for100: ${t12.size} (צפוי: 106)`);
console.log(`  סה"כ מתויגים: ${t3.size + t4.size + t5.size + t12.size} (צפוי: 613)`);

process.exit(0);
