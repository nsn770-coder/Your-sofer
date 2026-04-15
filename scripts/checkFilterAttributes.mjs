/**
 * Check how many products have filterAttributes set, and what keys/values exist.
 * Run: node scripts/checkFilterAttributes.mjs
 */
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

async function main() {
  console.log('\n🔍 בדיקת filterAttributes\n');

  const snap = await db.collection('products').get();
  console.log(`סה"כ מוצרים: ${snap.size}\n`);

  let withAttrs = 0;
  let withoutAttrs = 0;
  const keyCounts = {};          // key → count of docs that have it
  const keyValueCounts = {};     // key → { value → count }
  const catBreakdown = {};       // cat → { with: N, without: N }

  for (const doc of snap.docs) {
    const d = doc.data();
    const cat = d.cat ?? '(ריק)';
    const fa = d.filterAttributes;

    if (!catBreakdown[cat]) catBreakdown[cat] = { with: 0, without: 0 };

    if (fa && typeof fa === 'object' && Object.keys(fa).length > 0) {
      withAttrs++;
      catBreakdown[cat].with++;
      for (const [k, v] of Object.entries(fa)) {
        keyCounts[k] = (keyCounts[k] ?? 0) + 1;
        if (!keyValueCounts[k]) keyValueCounts[k] = {};
        keyValueCounts[k][v] = (keyValueCounts[k][v] ?? 0) + 1;
      }
    } else {
      withoutAttrs++;
      catBreakdown[cat].without++;
    }
  }

  console.log(`עם filterAttributes:    ${withAttrs}`);
  console.log(`בלי filterAttributes:   ${withoutAttrs}\n`);

  if (withAttrs === 0) {
    console.log('⚠️  אין מוצרים עם filterAttributes — הסינון לפי מאפיינים לא יעבוד.\n');
  } else {
    console.log('── מפתחות קיימים ──────────────────────────');
    for (const [k, cnt] of Object.entries(keyCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(12)} ${String(cnt).padStart(5)} מוצרים`);
      const vals = Object.entries(keyValueCounts[k]).sort((a, b) => b[1] - a[1]).slice(0, 8);
      for (const [v, c] of vals) {
        console.log(`    "${v}" — ${c}`);
      }
    }

    console.log('\n── לפי קטגוריה (עם / בלי) ─────────────────');
    for (const [cat, counts] of Object.entries(catBreakdown).sort((a, b) => (b[1].with + b[1].without) - (a[1].with + a[1].without))) {
      if (counts.with > 0) {
        console.log(`  ${cat.padEnd(22)} ✅ ${counts.with}  ❌ ${counts.without}`);
      }
    }
  }

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
