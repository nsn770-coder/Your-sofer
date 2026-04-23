import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
(function loadEnv() {
  const p = resolve(__dirname, '../../.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k) process.env[k] = v;
  }
})();

const SA = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

const KEYWORDS = [
  'תיק טלית',
  'תיק תפילין',
  'כיסוי טלית',
  'כיסוי תפילין',
  'נרתיק טלית',
  'נרתיק תפילין',
  'תיק לטלית',
  'תיק לתפילין',
  'bag טלית',
];

const NEW_CAT = 'תיקי טלית ותפילין';

function matchesKeyword(name) {
  const n = name ?? '';
  return KEYWORDS.some(kw => n.includes(kw));
}

async function migrate() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`מצב: ${dryRun ? 'DRY RUN (ללא שינויים)' : 'LIVE — יבצע עדכונים'}\n`);

  const snap = await db.collection('products').where('cat', '==', 'יודאיקה').get();
  const matches = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (matchesKeyword(data.name)) {
      matches.push({ id: d.id, name: data.name });
    }
  }

  console.log(`נמצאו ${matches.length} מוצרים תואמים ביודאיקה:\n`);
  matches.forEach(p => console.log(`  • ${p.name} (${p.id})`));

  if (dryRun || matches.length === 0) {
    console.log('\nDry run — לא בוצעו שינויים.');
    process.exit(0);
  }

  console.log(`\nמעדכן ${matches.length} מוצרים → "${NEW_CAT}"...`);
  let updated = 0;
  for (const p of matches) {
    await db.collection('products').doc(p.id).update({ cat: NEW_CAT, category: NEW_CAT });
    console.log(`  ✅ ${p.name}`);
    updated++;
  }

  console.log(`\nסיום! עודכנו ${updated} מוצרים.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
