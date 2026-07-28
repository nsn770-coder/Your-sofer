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

const SUBCATEGORY_PAGES = ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי'];

async function main() {
  const snap = await db.collection('products').get();
  const subCounts = {};
  const catCounts = {};

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    const sub = d.subCategory || '';
    const cat = d.cat || d.category || '';
    if (sub) subCounts[sub] = (subCounts[sub] ?? 0) + 1;
    if (cat) catCounts[cat]  = (catCounts[cat]  ?? 0) + 1;
  }

  console.log('\n' + '─'.repeat(72));
  console.log('שם'.padEnd(20) + ' subCategory'.padStart(14) + '  cat'.padStart(8) + '  המלצה');
  console.log('─'.repeat(72));
  for (const name of SUBCATEGORY_PAGES) {
    const sc  = subCounts[name] ?? 0;
    const cat = catCounts[name] ?? 0;
    let rec;
    if (cat > sc * 2 && cat > 10) rec = '❌ להסיר  (cat >> subCat — קטגוריה אמיתית)';
    else if (sc > 0 && cat === 0)  rec = '✅ להשאיר (subCat בלבד)';
    else if (sc > cat)              rec = '✅ להשאיר (subCat > cat)';
    else if (sc === 0 && cat === 0) rec = '⚠️  ריק לגמרי';
    else                            rec = `⚠️  לא ברור (sc=${sc}, cat=${cat})`;
    console.log(name.padEnd(20) + String(sc).padStart(14) + String(cat).padStart(8) + '  ' + rec);
  }
  console.log('─'.repeat(72));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
