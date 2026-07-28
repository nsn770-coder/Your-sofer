/**
 * WRITE — מעדכן price מ-8.97 ל-9.00 ב-106 מוצרי כיפות.
 * משנה שדה price בלבד.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  let currentKey = null, currentVal = [], inMultiline = false;
  for (const line of envContent.split('\n')) {
    if (!inMultiline && line.includes('=')) {
      const eqIdx = line.indexOf('=');
      currentKey  = line.slice(0, eqIdx).trim();
      const rest  = line.slice(eqIdx + 1);
      if (rest.includes('-----BEGIN')) { inMultiline = true; currentVal = [rest]; }
      else { process.env[currentKey] = rest.trim(); currentKey = null; }
    } else if (inMultiline) {
      currentVal.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[currentKey] = currentVal.join('\n').trim();
        inMultiline = false; currentKey = null; currentVal = [];
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

// שליפה
const snap = await db.collection('products')
  .where('cat', '==', 'כיפות')
  .where('price', '==', 8.97)
  .get();

console.log(`מעדכן ${snap.size} מוצרים...`);

// batch (עד 500 לכל batch)
let batch = db.batch();
let count = 0;

for (const d of snap.docs) {
  batch.update(d.ref, { price: 9.00 });
  count++;
  if (count % 400 === 0) {
    await batch.commit();
    console.log(`  [batch] ${count} עד כה...`);
    batch = db.batch();
  }
}
if (count % 400 !== 0) await batch.commit();

console.log(`✅ עודכנו ${count} מוצרים`);

// אימות
const [after9, after897] = await Promise.all([
  db.collection('products').where('cat','==','כיפות').where('price','==',9.00).get(),
  db.collection('products').where('cat','==','כיפות').where('price','==',8.97).get(),
]);

console.log(`\n=== אימות ===`);
console.log(`  ₪9.00 בכיפות: ${after9.size} (צפוי: ~106+)`);
console.log(`  ₪8.97 בכיפות: ${after897.size} (צפוי: 0)`);

if (after897.size === 0) console.log('\n✅ הצלחה — אין יותר מוצרים ב-₪8.97');
else console.warn(`\n⚠️  נשארו ${after897.size} מוצרים ב-₪8.97`);

process.exit(0);
