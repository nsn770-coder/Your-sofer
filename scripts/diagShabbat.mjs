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
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\n/g,'\n'),
})});
const db = getFirestore();

async function main() {
  const snap = await db.collection('products').get();
  let subShabbat = 0; // products where subCategory === 'שבת' (what CategoryClient loads)
  let catShabbat  = 0; // products where cat === 'שבת' (what we expect)
  const subShabbatCats = {};  // breakdown of cat for products with subCategory='שבת'
  const catShabbatSubs = {};  // breakdown of subCategory for products with cat='שבת'

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    if (d.subCategory === 'שבת') {
      subShabbat++;
      subShabbatCats[d.cat || '__missing__'] = (subShabbatCats[d.cat || '__missing__'] ?? 0) + 1;
    }
    if ((d.cat || d.category) === 'שבת') {
      catShabbat++;
      catShabbatSubs[d.subCategory || '__none__'] = (catShabbatSubs[d.subCategory || '__none__'] ?? 0) + 1;
    }
  }

  console.log('\n=== מה CategoryClient באמת טוען עבור /category/שבת ===');
  console.log(`where('subCategory', '==', 'שבת') → ${subShabbat} מוצרים`);
  if (subShabbat > 0) {
    console.log('  פילוח לפי cat:');
    for (const [cat, c] of Object.entries(subShabbatCats).sort((a,b) => b[1]-a[1]))
      console.log(`    ${String(c).padStart(4)}  cat="${cat}"`);
  }

  console.log(`\nwhere('cat', '==', 'שבת') → ${catShabbat} מוצרים (מה ה-verification בדק)`);
  if (catShabbat > 0) {
    console.log('  פילוח לפי subCategory (עד 15):');
    for (const [sub, c] of Object.entries(catShabbatSubs).sort((a,b) => b[1]-a[1]).slice(0,15))
      console.log(`    ${String(c).padStart(4)}  subCategory="${sub}"`);
  }

  console.log('\n=== סיכום: פריטי "שבת" במגה-מניו — מה נטען vs מה מסונן ===');
  const shabbatMenuItems = [
    { label: 'כל שבת',         filter: null },
    { label: 'פמוטים',         filter: 'פמוטים' },
    { label: 'כיסויי חלה',    filter: 'כיסויי חלה' },
    { label: 'כוסות קידוש',   filter: 'כוסות קידוש' },
    { label: 'מלחיות ומצתים', filter: 'מצתים, מלחיות ומתקנים לגפרורים' },
    { label: 'קרשי חלה',      filter: 'קרשי חלה, סכינים ומפיונים' },
    { label: 'כיסויי פלטה',   filter: 'כיסויי פלטה' },
    { label: 'חתן וכלה',      filter: 'חתן וכלה' },
  ];
  console.log('  (CategoryClient טוען subCategory="שבת" → X מוצרים)');
  console.log('  (הסינון אחר-כך מחפש subCategory=filter בתוך ה-X מוצרים האלה)');
  for (const item of shabbatMenuItems) {
    if (item.filter === null) {
      console.log(`  כל שבת: יציג ${subShabbat} מוצרים (subCategory="שבת")`);
    } else {
      const inLoaded = (subShabbatCats[item.filter] ?? 0); // wrong metric but shows if any
      const inCat    = catShabbatSubs[item.filter] ?? 0;
      const inSubShabbat = 0; // products with subCategory='שבת' won't have subCategory='פמוטים'
      console.log(`  ${item.label}: נטען=${subShabbat} prod, subCatSet.has("${item.filter}")=false → 0 תוצאות | אבל cat=שבת & subCat=${item.filter}: ${inCat} מוצרים ← לא נטענו`);
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
