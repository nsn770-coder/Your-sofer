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

// All category names referenced anywhere in navigation
const ALL_REFERENCED_CATS = new Set([
  // MEGA_MENU_DATA (NavBar)
  'בתי מזוזה','קלפי מזוזה','תפילין קומפלט','קלפי תפילין','כיסוי תפילין',
  'סט טלית תפילין','תיקי טלית ותפילין','טליתות וציציות','כיפות','יודאיקה',
  'כלי שולחן והגשה','עיצוב הבית','שבת','תכשיטים','מוצרי בית כנסת',
  'ספרי קודש וסידורים',
  // SIMPLE_NAV / special routes
  'מגילות','ספרי תורה','בר מצווה',
  // navigation.ts + homepageCards.ts
  'מתנות','סטים ומארזים','טליתות',
  // lifeEvents.ts
  'מתנות',
  // barMitzvaSteps
  'ספרים',
]);

async function main() {
  // 1. Count active products per cat
  const prodSnap = await db.collection('products').get();
  const catCounts = {};
  const subCatCounts = {};
  let total = 0;
  for (const doc of prodSnap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    total++;
    const cat = d.cat || d.category || '__missing__';
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    const sc = d.subCategory || '__missing__';
    const key = `${cat}|||${sc}`;
    subCatCounts[key] = (subCatCounts[key] ?? 0) + 1;
  }
  console.log(`\nמוצרים active: ${total}\n`);

  // 2. Print all cat counts (sorted desc)
  const sorted = Object.entries(catCounts).sort((a,b) => b[1]-a[1]);
  console.log('=== ספירה לפי cat ===');
  for (const [cat, count] of sorted) {
    console.log(`  ${String(count).padStart(5)}  ${cat}`);
  }

  // 3. Referenced cats with 0 products
  console.log('\n=== קטגוריות מנוהלות עם 0 מוצרים ===');
  for (const cat of [...ALL_REFERENCED_CATS].sort()) {
    const count = catCounts[cat] ?? 0;
    if (count === 0) console.log(`  [0]  ${cat}`);
  }

  // 4. Categories collection docs
  const catCollSnap = await db.collection('categories').get();
  console.log(`\n=== אוסף categories ב-Firestore (${catCollSnap.size} docs) ===`);
  const catDocs = catCollSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  catDocs.sort((a,b) => (a.id > b.id ? 1 : -1));
  for (const cd of catDocs) {
    const count = catCounts[cd.id] ?? 0;
    const mark = count === 0 ? '[0 מוצרים]' : `[${count} מוצרים]`;
    console.log(`  ${mark.padEnd(16)}  ${cd.id}`);
  }

  // 5. SubCategories with 0 per known cats
  console.log('\n=== subCategories ריקות בתוך קטגוריות קיימות ===');
  const emptySubCats = Object.entries(subCatCounts)
    .filter(([,v]) => v === 0)
    .map(([k]) => k);
  // Actually show ALL subcats per cat for cats that matter
  const catsToCheck = ['כיפות','בתי מזוזה','שבת','יודאיקה'];
  for (const cat of catsToCheck) {
    const subs = Object.entries(subCatCounts)
      .filter(([k]) => k.startsWith(cat + '|||'))
      .sort((a,b) => b[1]-a[1]);
    console.log(`\n  ${cat}:`);
    for (const [k, v] of subs) {
      const sc = k.split('|||')[1];
      console.log(`    ${String(v).padStart(4)}  ${sc}`);
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
