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
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
})});

const db = getFirestore();

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  אבחון כיפות — ספירה ומקורות תמונות');
  console.log('══════════════════════════════════════════\n');

  const snap = await db.collection('products').where('cat', '==', 'כיפות').get();
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`סה"כ מוצרים cat="כיפות": ${products.length}`);

  // Visible (not hidden)
  const visible = products.filter(p => p.hidden !== true);
  const hidden  = products.filter(p => p.hidden === true);
  console.log(`  גלויים (hidden !== true): ${visible.length}`);
  console.log(`  מוסתרים (hidden === true): ${hidden.length}`);

  // Image source breakdown
  let cloudinary = 0, israelJudaica = 0, noImage = 0, otherUrl = 0;
  const sampleIsraelJudaica = [];
  const sampleCloudinary = [];
  const sampleNoImage = [];

  for (const p of visible) {
    const url = (p.imgUrl || p.image_url || '').trim();
    if (!url) {
      noImage++;
      if (sampleNoImage.length < 3) sampleNoImage.push({ id: p.id, name: (p.name||'').slice(0,40) });
    } else if (url.includes('cloudinary.com')) {
      cloudinary++;
      if (sampleCloudinary.length < 2) sampleCloudinary.push({ id: p.id, url: url.slice(0,80) });
    } else if (url.includes('israel-judaica.com') || url.includes('israelj')) {
      israelJudaica++;
      if (sampleIsraelJudaica.length < 5) sampleIsraelJudaica.push({ id: p.id, name: (p.name||'').slice(0,40), url: url.slice(0,80) });
    } else {
      otherUrl++;
    }
  }

  console.log(`\n── מקורות תמונות (visible בלבד) ──`);
  console.log(`  Cloudinary:         ${cloudinary}`);
  console.log(`  israel-judaica.com: ${israelJudaica}`);
  console.log(`  אחר/לא ידוע:       ${otherUrl}`);
  console.log(`  ללא תמונה:         ${noImage}`);

  if (sampleIsraelJudaica.length > 0) {
    console.log(`\n── דוגמאות israel-judaica (${israelJudaica} סה"כ) ──`);
    for (const p of sampleIsraelJudaica) {
      console.log(`  [${p.id}] "${p.name}"`);
      console.log(`    URL: ${p.url}`);
    }
  }

  // SubCategory breakdown
  const subcatCounts = {};
  for (const p of visible) {
    const sub = p.subCategory || '(אין)';
    subcatCounts[sub] = (subcatCounts[sub] || 0) + 1;
  }
  console.log(`\n── פירוט לפי subCategory ──`);
  for (const [sub, cnt] of Object.entries(subcatCounts).sort((a,b) => b[1]-a[1])) {
    console.log(`  "${sub}": ${cnt}`);
  }

  // Priority distribution
  const withPriority = visible.filter(p => typeof p.priority === 'number');
  console.log(`\n── עדיפות (priority) ──`);
  console.log(`  מוצרים עם priority מוגדר: ${withPriority.length} / ${visible.length}`);

  // inStock / outOfStock
  const outOfStock  = visible.filter(p => p.outOfStock === true);
  const inStockZero = visible.filter(p => typeof p.inStock === 'number' && p.inStock === 0);
  console.log(`\n── מלאי ──`);
  console.log(`  outOfStock===true: ${outOfStock.length}`);
  console.log(`  inStock===0:       ${inStockZero.length}`);

  console.log('\n══ סיום ══\n');
}

main().catch(err => { console.error(err); process.exit(1); });
