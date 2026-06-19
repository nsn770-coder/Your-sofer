import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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

const ALREADY_FIXED = 'MK5mg2bmEZRt7aifaJp1';

// ── helper: serialise Firestore Timestamp / other types for JSON backup
function serialise(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj._seconds !== undefined) return { _seconds: obj._seconds, _nanoseconds: obj._nanoseconds };
  if (Array.isArray(obj)) return obj.map(serialise);
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = serialise(v);
  return out;
}

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  BACKFILL  —  סטים ומארזים  (targeted, safe)');
  console.log('══════════════════════════════════════════════\n');

  // ── 1. Find candidates: cat == "סטים ומארזים" && subCategory != "סטים ומארזים"
  const snap = await db.collection('products')
    .where('cat', '==', 'סטים ומארזים')
    .get();

  const candidates = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => {
      if (p.id === ALREADY_FIXED) return false;           // already corrected
      const sub = (p.subCategory ?? '').trim();
      return sub !== 'סטים ומארזים';                      // only true orphans
    });

  console.log(`מוצרים עם cat="סטים ומארזים": ${snap.size}`);
  console.log(`כבר תוקן (MK5mg2bmEZRt7aifaJp1): 1`);
  console.log(`מועמדים לעדכון: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log('אין מה לעדכן. יוצא.');
    return;
  }

  // ── 2. Backup
  mkdirSync(resolve(__dirname, '../backups'), { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = resolve(__dirname, `../backups/setim-umarazim-backup-${ts}.json`);
  const backupData = candidates.map(p => serialise(p));
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`✅ גיבוי: ${candidates.length} מסמכים → backups/setim-umarazim-backup-${ts}.json\n`);

  // ── 3. Count before
  const beforeSnap = await db.collection('products')
    .where('subCategory', '==', 'סטים ומארזים')
    .get();
  console.log(`לפני: ${beforeSnap.size} מוצרים עם subCategory="סטים ומארזים"`);

  // ── 4. Firestore batch update
  const BATCH_SIZE = 450;
  const updatedIds = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = candidates.slice(i, i + BATCH_SIZE);
    for (const p of chunk) {
      const ref = db.collection('products').doc(p.id);
      batch.update(ref, {
        subCategory: 'סטים ומארזים',
        category: 'יודאיקה',
      });
      updatedIds.push(p.id);
    }
    await batch.commit();
    console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: עודכנו ${chunk.length} מסמכים`);
  }

  console.log(`\n✅ Firestore: עודכנו ${updatedIds.length} מוצרים\n`);
  console.log('מוצרים שעודכנו:');
  for (const p of candidates) {
    const name = (p.name ?? '').substring(0, 50);
    console.log(`  ${p.id}  "${name}"`);
  }

  // ── 5. Verify: re-query subCategory == "סטים ומארזים"
  console.log('\n── אימות ──');
  await new Promise(r => setTimeout(r, 1500)); // brief pause for consistency
  const afterSnap = await db.collection('products')
    .where('subCategory', '==', 'סטים ומארזים')
    .get();
  console.log(`אחרי: ${afterSnap.size} מוצרים עם subCategory="סטים ומארזים"  (לפני: ${beforeSnap.size})`);

  // ── 6. Algolia partial update
  const appId = (process.env.ALGOLIA_APP_ID ?? '').trim();
  const adminKey = (process.env.ALGOLIA_ADMIN_KEY ?? '').trim();

  if (!appId || !adminKey) {
    console.log('\n⚠️  ALGOLIA_APP_ID / ALGOLIA_ADMIN_KEY חסרים — מדלג על סנכרון Algolia');
    return;
  }

  console.log('\n── Algolia partial update ──');
  try {
    const { algoliasearch } = await import('algoliasearch');
    const client = algoliasearch(appId, adminKey);

    const objects = updatedIds.map(id => ({
      objectID: id,
      subCategory: 'סטים ומארזים',
      category: 'יודאיקה',
    }));

    await client.partialUpdateObjects({
      indexName: 'products',
      objects,
      createIfNotExists: false,
    });

    console.log(`✅ Algolia: עודכנו ${objects.length} רשומות (partial update)`);
  } catch (err) {
    console.warn('⚠️  Algolia update נכשל (Firestore כבר עודכן):', err.message);
  }

  console.log('\n══ סיום ══');
  console.log(`  גובו:   ${candidates.length}`);
  console.log(`  עודכנו: ${updatedIds.length}`);
  console.log(`  לפני:   ${beforeSnap.size} מוצרים בקטגוריה`);
  console.log(`  אחרי:   ${afterSnap.size} מוצרים בקטגוריה\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
