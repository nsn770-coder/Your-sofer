import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
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

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// Groups ordered from specific to general — first match wins
const GROUPS = [
  { label: 'חנוכיות',               kw: ['חנוכיה'] },
  { label: 'נטלות',                 kw: ['נטלה'] },
  { label: 'הבדלה',                 kw: ['הבדלה'] },
  { label: 'שבת (כללי)',            kw: ['שבת'] },
  { label: 'קידוש',                 kw: ['קידוש'] },
  { label: 'סטים / מארזים',         kw: ['סט ', 'סט-', 'מארז'] },
  { label: 'מעמדים / בסיסים',       kw: ['מעמד', 'בסיס'] },
  { label: 'פסח / ליל סדר',         kw: ['פסח', 'ליל סדר', 'הגדה'] },
  { label: 'מנורות',                kw: ['מנורה'] },
  { label: 'ספרי תורה / עטרות',     kw: ['ספר תורה', 'עטרת', 'כתר תורה'] },
  { label: 'סידורים / ספרי קודש',   kw: ['סידור', 'תנ"ך', 'מגילה', 'הגדה', 'ספר '] },
  { label: 'תשמישי קדושה אחרים',    kw: ['בית כנסת', 'ארון קודש', 'בימה'] },
  { label: 'תכשיטים / שרשרות',      kw: ['שרשרת', 'טבעת', 'תכשיט', 'צמיד', 'עגיל'] },
  { label: 'לוחות שנה',             kw: ['לוח שנה', 'לוחות שנה'] },
  { label: 'מוצרים לתינוק / ברית',  kw: ['תינוק', 'ברית', 'מוהל'] },
  { label: 'מצות / ארגזי מצות',     kw: ['מצה', 'מצות'] },
  { label: 'מיכלי בשמים',          kw: ['בשמים'] },
];

async function main() {
  console.log('\n🔍 ניתוח מוצרי יודאיקה paldinox\n');

  const snap = await db.collection('products')
    .where('cat', '==', 'יודאיקה')
    .where('source', '==', 'paldinox')
    .get();

  const names = snap.docs.map(d => d.data().name);
  console.log(`סה"כ מוצרים: ${names.length}\n`);

  const matched = new Set();
  const results = [];

  for (const g of GROUPS) {
    const hits = [];
    names.forEach((n, i) => {
      if (!matched.has(i) && g.kw.some(kw => n.includes(kw))) {
        hits.push(i);
        matched.add(i);
      }
    });
    if (hits.length > 0) results.push({ label: g.label, count: hits.length });
  }

  // Catch-all
  const restIdxs = names.map((_, i) => i).filter(i => !matched.has(i));
  const restNames = restIdxs.map(i => names[i]);

  // Sort by count desc
  results.sort((a, b) => b.count - a.count);

  console.log('='.repeat(52));
  console.log('קבוצה                          '.padEnd(32) + 'כמות');
  console.log('='.repeat(52));
  for (const r of results) {
    const bar = '▪'.repeat(Math.min(Math.round(r.count / 3), 20));
    console.log(r.label.padEnd(32) + String(r.count).padStart(4) + '  ' + bar);
  }
  console.log('-'.repeat(52));
  console.log('לא סווג'.padEnd(32) + String(restNames.length).padStart(4));
  console.log('='.repeat(52));

  if (restNames.length > 0) {
    console.log(`\nדוגמאות מ"לא סווג" (${restNames.length} מוצרים):`);
    restNames.slice(0, 30).forEach(n => console.log('  -', n));
    if (restNames.length > 30) console.log(`  ... ועוד ${restNames.length - 30} מוצרים`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
