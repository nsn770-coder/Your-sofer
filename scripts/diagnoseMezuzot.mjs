/**
 * diagnoseMezuzot.mjs — אבחון: למה מוצרי בתי מזוזה לא מוצגים באתר?
 * Usage: node scripts/diagnoseMezuzot.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const MEZUZAH_SUBCATS = new Set([
  'מזוזות זכוכית', 'מזוזות אלומיניום', 'מזוזות פולירזין', 'מזוזות לרכב',
  'מזוזות מתכת', 'מזוזות עץ', 'מזוזות פלסטיק',
]);

const snap = await db.collection('products').get();
const all = [];
snap.forEach(d => all.push({ id: d.id, ...d.data() }));

// כל מה שקשור לבתי מזוזה: לפי cat או לפי subCategory של הספק
const mez = all.filter(p =>
  p.cat === 'בתי מזוזה' || p.category === 'בתי מזוזה' || MEZUZAH_SUBCATS.has(p.subCategory)
);

console.log(`\nסה"כ מוצרים שקשורים לבתי מזוזה: ${mez.length}\n`);

const count = (label, fn) => console.log(`  ${label}: ${mez.filter(fn).length}`);

console.log('── פילוח לפי cat ──');
const byCat = {};
mez.forEach(p => { byCat[p.cat ?? '(ריק)'] = (byCat[p.cat ?? '(ריק)'] || 0) + 1; });
Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  cat="${k}": ${v}`));

console.log('\n── פילוח מצב תצוגה ──');
count('hidden === true (מוסתר)', p => p.hidden === true);
count("status === 'draft' (טיוטה)", p => p.status === 'draft');
count('price חסר או 0', p => !p.price);
count('outOfStock === true', p => p.outOfStock === true);
count('active === false', p => p.active === false);

console.log('\n── מה שהאתר באמת מציג (cat="בתי מזוזה" וגם לא מוסתר) ──');
const visible = mez.filter(p => (p.cat === 'בתי מזוזה') && p.hidden !== true);
console.log(`  מוצגים בפועל: ${visible.length}`);

console.log('\n── ה"נעלמים": subCategory של מזוזות אבל cat אחר או מוסתר ──');
const missing = mez.filter(p => !(p.cat === 'בתי מזוזה' && p.hidden !== true));
const sample = missing.slice(0, 15);
sample.forEach(p => console.log(`  • ${(p.name||'').slice(0,40)} | cat="${p.cat}" | hidden=${p.hidden} | status=${p.status} | price=${p.price} | sku=${p.sku||p.supplierCode||''}`));
if (missing.length > 15) console.log(`  ... ועוד ${missing.length - 15}`);
console.log(`\n  סה"כ נעלמים: ${missing.length}`);
