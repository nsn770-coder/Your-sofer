import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  })});
}
const db = getFirestore();

const RENAMES = [
  { from: 'נטילת ידיים',   to: 'נטילת ידיים ומים אחרונים' },
  { from: 'מצתים ומלחיות', to: 'מצתים, מלחיות ומתקנים לגפרורים' },
  { from: 'קרשי חלה',      to: 'קרשי חלה, סכינים ומפיונים' },
];

const BATCH_SIZE = 400;

async function renameGroup(from, to) {
  const snap = await db.collection('products').where('subCategory', '==', from).get();
  const total = snap.size;
  let updated = 0;

  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    batch.update(doc.ref, { subCategory: to });
    updated++;
    batchCount++;
    if (batchCount === BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();

  return { total, updated };
}

async function main() {
  console.log('\nמעדכן subCategory — 3 קבוצות\n');
  let grandTotal = 0;
  for (const { from, to } of RENAMES) {
    const { updated } = await renameGroup(from, to);
    grandTotal += updated;
    console.log(`  "${from}" → "${to}"  |  עודכנו: ${updated}`);
  }
  console.log(`\nסה"כ עודכנו: ${grandTotal} מוצרים`);
  process.exit(0);
}

main().catch(err => { console.error('שגיאה:', err.message); process.exit(1); });
