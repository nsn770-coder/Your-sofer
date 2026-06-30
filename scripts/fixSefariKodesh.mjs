/**
 * Fix 2 products saved with wrong cat: 'ספרי קודש' → 'ספרי קודש וסידורים'.
 * Usage:
 *   node scripts/fixSefariKodesh.mjs           # dry-run (report only)
 *   node scripts/fixSefariKodesh.mjs --apply   # apply updates to Firestore
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

const doApply = process.argv.includes('--apply');

const snap = await db.collection('products').where('cat', '==', 'ספרי קודש').get();

if (snap.empty) {
  console.log('✅ לא נמצאו מוצרים עם cat: "ספרי קודש" — אין מה לתקן.');
  process.exit(0);
}

console.log(`📋 נמצאו ${snap.size} מוצרים עם cat: "ספרי קודש":\n`);
snap.forEach(d => {
  const data = d.data();
  console.log(`  • ${d.id} — "${data.name}" (subCategory: ${data.subCategory ?? '—'})`);
});

if (!doApply) {
  console.log('\nהרץ עם --apply כדי לעדכן.');
  process.exit(0);
}

console.log('\nמעדכן...');
const batch = db.batch();
snap.forEach(d => {
  batch.update(d.ref, {
    cat: 'ספרי קודש וסידורים',
    category: 'ספרי קודש וסידורים',
  });
});
await batch.commit();
console.log(`✅ עודכנו ${snap.size} מוצרים בהצלחה.`);
