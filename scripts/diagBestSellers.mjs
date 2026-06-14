import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n'); let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnv();
if (!getApps().length) initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i,'').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g,'\n'),
})});
const db = getFirestore();

async function main() {
  // 1. Count orders
  const { AggregateField } = await import('firebase-admin/firestore');
  const countSnap = await db.collection('orders').count().get();
  const totalOrders = countSnap.data().count;
  console.log(`\n── הזמנות ──`);
  console.log(`סה"כ הזמנות: ${totalOrders}`);

  // 2. Sample one full order
  const sampleSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(1).get();
  if (!sampleSnap.empty) {
    const sampleOrder = sampleSnap.docs[0].data();
    console.log(`\nדוגמה להזמנה אחת (שדות top-level):`);
    for (const [k, v] of Object.entries(sampleOrder)) {
      if (k === 'items') continue; // handle separately
      console.log(`  ${k}: ${JSON.stringify(v)?.slice(0, 100)}`);
    }
    console.log(`\nפריטים בהזמנה (items array — ${(sampleOrder.items || []).length} פריטים):`);
    for (const item of (sampleOrder.items || []).slice(0, 3)) {
      console.log(`  item שדות: ${Object.keys(item).join(', ')}`);
      console.log(`  item ערכים: ${JSON.stringify(item)?.slice(0, 200)}`);
    }
  }

  // 3. Check if products have salesCount field
  console.log(`\n── salesCount על מוצרים ──`);
  const scSnap = await db.collection('products').where('salesCount', '>', 0).limit(5).get();
  console.log(`מוצרים עם salesCount > 0: ${scSnap.size}`);
  if (!scSnap.empty) {
    for (const d of scSnap.docs) {
      const p = d.data();
      console.log(`  ${p.name?.slice(0,40)}: salesCount=${p.salesCount}`);
    }
  }

  // 4. Check isBestSeller count
  const bsSnap = await db.collection('products').where('isBestSeller', '==', true).get();
  console.log(`\nמוצרים עם isBestSeller=true: ${bsSnap.size}`);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
