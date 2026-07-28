/**
 * mergeDuplicates.mjs — מיזוג כפילויות (שם זהה + SKU זהה)
 *
 * מצבי הרצה:
 *   node scripts/mergeDuplicates.mjs          → DRY-RUN בלבד (לא משנה כלום)
 *   node scripts/mergeDuplicates.mjs --apply  → מחיקה אמיתית (כותב גיבוי קודם)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = !process.argv.includes('--apply');

// ── env ───────────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── normalise ─────────────────────────────────────────────────────────────────
function normalize(name) {
  if (!name) return '';
  let s = name.replace(/[ְ-ׇ]/g, '');
  s = s.replace(/["״""″❝❞]/g, '"');
  s = s.replace(/['׳''ʼ`´]/g, "'");
  s = s.replace(/\s+/g, ' ').trim();
  return s.toLowerCase();
}

// ── helpers ───────────────────────────────────────────────────────────────────
function hasDesc(d)  { return typeof d.desc === 'string' && d.desc.trim().length > 0; }
function hasImage(d) { return !!(d.imgUrl || d.image_url); }

// ── load data ─────────────────────────────────────────────────────────────────
console.log('קורא מוצרים מ-Firestore...');
const prodSnap = await db.collection('products').get();
console.log(`  סה"כ מסמכים: ${prodSnap.size}`);

// group by normalizedName|sku → exactly-2 docs pairs
const byKey = new Map();
for (const doc of prodSnap.docs) {
  const d   = doc.data();
  const sku = (d.sku || '').trim();
  if (!sku) continue;
  const norm = normalize(d.name || '');
  if (!norm) continue;
  const key = norm + '|||' + sku.toLowerCase();
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push({ id: doc.id, data: d });
}
const pairs = [...byKey.values()].filter(arr => arr.length === 2);
console.log(`  זוגות (שם זהה + SKU זהה, בדיוק 2 docs): ${pairs.length}`);

console.log('קורא הזמנות...');
const ordersSnap = await db.collection('orders').get();
const referencedIds = new Set();
for (const order of ordersSnap.docs) {
  for (const item of (order.data().items ?? [])) {
    if (item.productId) referencedIds.add(item.productId);
    if (item.id)        referencedIds.add(item.id);
  }
}
console.log(`  מוצרים ייחודיים בהזמנות: ${referencedIds.size}\n`);

// ── decision logic ────────────────────────────────────────────────────────────
// returns { keep, delete: docEntry, rule }
function decide(a, b) {
  const aLinked = referencedIds.has(a.id);
  const bLinked = referencedIds.has(b.id);

  // כלל 1: מקושר להזמנה
  if (aLinked && !bLinked) return { keep: a, del: b, rule: 1 };
  if (bLinked && !aLinked) return { keep: b, del: a, rule: 1 };
  // (שניהם מקושרים — לא אמור לקרות לפי האבחון, אבל נטפל בזה כ-rule 1 גם)
  if (aLinked && bLinked)  return { keep: a, del: b, rule: 1 };

  // כלל 2: desc לא-null ותמונה תקינה
  const aGood = hasDesc(a.data) && hasImage(a.data);
  const bGood = hasDesc(b.data) && hasImage(b.data);
  if ( aGood && !bGood) return { keep: a, del: b, rule: 2 };
  if (!aGood &&  bGood) return { keep: b, del: a, rule: 2 };
  // אם שניהם טובים: עדיפות ל-desc ארוך יותר
  if (aGood && bGood) {
    const aLen = (a.data.desc || '').length;
    const bLen = (b.data.desc || '').length;
    if (aLen >= bLen) return { keep: a, del: b, rule: 2 };
    return { keep: b, del: a, rule: 2 };
  }

  // כלל 3: שווים — דטרמיניסטי לפי id אלפביתי
  if (a.id < b.id) return { keep: a, del: b, rule: 3 };
  return { keep: b, del: a, rule: 3 };
}

// ── build plan ────────────────────────────────────────────────────────────────
const plan = [];   // { keep, del, rule, sku, name }
let rule1 = 0, rule2 = 0, rule3 = 0;

for (const [a, b] of pairs) {
  const { keep, del, rule } = decide(a, b);
  plan.push({ keep, del, rule, sku: a.data.sku, name: a.data.name });
  if (rule === 1) rule1++;
  else if (rule === 2) rule2++;
  else rule3++;
}

// ── DRY-RUN report ────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════');
console.log('  DRY-RUN — תוכנית מיזוג כפילויות');
console.log('══════════════════════════════════════════════════════════\n');

console.log(`▸ סה"כ docs שיימחקו:  ${plan.length}`);
console.log(`  כלל 1 (קישור הזמנה):  ${rule1}`);
console.log(`  כלל 2 (desc + תמונה): ${rule2}`);
console.log(`  כלל 3 (id אלפביתי):   ${rule3}\n`);

// ── כלל 1: כל 6 הזוגות המקושרים ────────────────────────────────────────────
const rule1Items = plan.filter(p => p.rule === 1);
console.log(`── כלל 1: זוגות מקושרים להזמנה (${rule1Items.length} זוגות) ──\n`);
for (const p of rule1Items) {
  const keepLinked  = referencedIds.has(p.keep.id)  ? '🔗' : '  ';
  const delLinked   = referencedIds.has(p.del.id)   ? '🔗' : '  ';
  console.log(`  SKU: ${p.sku}`);
  console.log(`    שם:     "${p.name}"`);
  console.log(`    שומר:   ${keepLinked} ${p.keep.id}  ₪${p.keep.data.price}  inStock=${p.keep.data.inStock ?? '—'}`);
  console.log(`    מוחק:   ${delLinked} ${p.del.id}   ₪${p.del.data.price}  inStock=${p.del.data.inStock ?? '—'}`);
  console.log('');
}

// ── 10 דוגמאות מהשאר (כללים 2+3) ────────────────────────────────────────────
const rest = plan.filter(p => p.rule !== 1);
const samples = [...rest.filter(p => p.rule === 2).slice(0, 5),
                 ...rest.filter(p => p.rule === 3).slice(0, 5)];
console.log(`── 10 דוגמאות (כלל 2 ו-3) ──\n`);
for (const p of samples) {
  const ruleLabel = p.rule === 2 ? 'כלל 2 (desc+תמונה)' : 'כלל 3 (id אלפביתי)';
  const keepDesc  = hasDesc(p.keep.data) ? `desc(${(p.keep.data.desc||'').length}תו)` : 'desc=null';
  const delDesc   = hasDesc(p.del.data)  ? `desc(${(p.del.data.desc||'').length}תו)`  : 'desc=null';
  const keepImg   = hasImage(p.keep.data) ? 'img=✓' : 'img=✗';
  const delImg    = hasImage(p.del.data)  ? 'img=✓' : 'img=✗';
  console.log(`  [${ruleLabel}]  SKU: ${p.sku}`);
  console.log(`    שם:     "${p.name}"`);
  console.log(`    שומר:   ${p.keep.id}  ${keepDesc}  ${keepImg}  ₪${p.keep.data.price}`);
  console.log(`    מוחק:   ${p.del.id}   ${delDesc}  ${delImg}  ₪${p.del.data.price}`);
  console.log('');
}

// ── APPLY mode ────────────────────────────────────────────────────────────────
if (!DRY_RUN) {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  --apply: כותב גיבוי ומוחק...');
  console.log('══════════════════════════════════════════════════════════\n');

  // backup
  const backup = plan.map(p => ({ id: p.del.id, sku: p.sku, name: p.name, data: p.del.data }));
  const backupPath = resolve(__dirname, '../app/scripts/backup-duplicates-' + new Date().toISOString().slice(0,10) + '.json');
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`  ✅ גיבוי נכתב: ${backupPath}  (${backup.length} docs)`);

  // delete in batches of 400
  let deleted = 0;
  const ids = plan.map(p => p.del.id);
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + 400)) {
      batch.delete(db.collection('products').doc(id));
    }
    await batch.commit();
    deleted += Math.min(400, ids.length - i);
    console.log(`  נמחקו ${deleted}/${ids.length}...`);
  }
  console.log(`\n  ✅ הושלם — נמחקו ${deleted} docs.`);
} else {
  console.log('══════════════════════════════════════════════════════════');
  console.log('  DRY-RUN בלבד — לא נמחק ולא נשונה כלום.');
  console.log('  להרצה אמיתית: node scripts/mergeDuplicates.mjs --apply');
  console.log('══════════════════════════════════════════════════════════\n');
}

process.exit(0);
