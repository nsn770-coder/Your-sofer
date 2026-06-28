/**
 * diagHagim.mjs
 * בודק מה ה-cat האמיתי של מוצרי חגים ב-Firestore
 */
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

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const HAG_SUBCATS = ['חנוכה', 'פסח', 'סוכות', 'פורים', 'ראש השנה'];

async function main() {
  const snap = await db.collection('products').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log('\n══════════════════════════════════════════');
  console.log('  אבחון חגים — cat vs subCategory');
  console.log('══════════════════════════════════════════\n');

  // סטטיסטיקה לפי תת-קטגוריה
  for (const sub of HAG_SUBCATS) {
    const prods = all.filter(p => p.subCategory === sub);
    const catBreakdown = {};
    for (const p of prods) {
      const c = p.cat ?? '(חסר)';
      catBreakdown[c] = (catBreakdown[c] ?? 0) + 1;
    }
    console.log(`subCategory="${sub}" — ${prods.length} מוצרים:`);
    for (const [cat, cnt] of Object.entries(catBreakdown).sort((a,b) => b[1]-a[1])) {
      const mark = cat === 'חגים' ? '✓' : '⚠️';
      console.log(`  ${mark}  cat="${cat}"  →  ${cnt} מוצרים`);
    }
    // דוגמה אחת
    if (prods.length > 0) {
      const ex = prods[0];
      console.log(`  דוגמה: "${(ex.name||'').slice(0,40)}" | cat="${ex.cat}" | sub="${ex.subCategory}"`);
    }
    console.log();
  }

  // מה קורה עם cat='חגים' ישירות?
  const catHagim = all.filter(p => p.cat === 'חגים');
  console.log(`\n✅ מוצרים עם cat="חגים": ${catHagim.length}`);
  const subBreakdown = {};
  for (const p of catHagim) {
    const s = p.subCategory ?? '(חסר)';
    subBreakdown[s] = (subBreakdown[s] ?? 0) + 1;
  }
  for (const [s, cnt] of Object.entries(subBreakdown).sort((a,b) => b[1]-a[1])) {
    console.log(`  subCategory="${s}"  →  ${cnt} מוצרים`);
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
