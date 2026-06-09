/**
 * Admin SDK — שלושה שלבים:
 * 0. גיבוי 310 מוצרים → JSON מקומי
 * 1. coverStyle: "רש"י ר"ת" ל-3 מוצרים
 * 2. מיגרציה cat/category: "כיסוי תפילין" → "סט טלית תפילין" (55 מוצרים)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

// ── Load .env.local ──────────────────────────────────────────────────────────
const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  let currentKey = null, currentVal = [], inMultiline = false;
  for (const line of envContent.split('\n')) {
    if (!inMultiline && line.includes('=')) {
      const eqIdx = line.indexOf('=');
      currentKey  = line.slice(0, eqIdx).trim();
      const rest  = line.slice(eqIdx + 1);
      if (rest.includes('-----BEGIN')) { inMultiline = true; currentVal = [rest]; }
      else { process.env[currentKey] = rest.trim(); currentKey = null; }
    } else if (inMultiline) {
      currentVal.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[currentKey] = currentVal.join('\n').trim();
        inMultiline = false; currentKey = null; currentVal = [];
      }
    }
  }
} catch { /* rely on existing env */ }

// ── Init Admin ───────────────────────────────────────────────────────────────
const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ חסרים משתני סביבה'); process.exit(1);
}
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── helpers ───────────────────────────────────────────────────────────────────
async function countCat(cat) {
  const snap = await db.collection('products').where('cat', '==', cat).get();
  return snap.size;
}

// ════════════════════════════════════════════════════════════════
// שלב 0 — גיבוי
// ════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('שלב 0 — גיבוי 310 מוצרים');
console.log('══════════════════════════════════════════════════════');

const [snapCovers, snapSets] = await Promise.all([
  db.collection('products').where('cat', '==', 'כיסוי תפילין').get(),
  db.collection('products').where('cat', '==', 'סט טלית תפילין').get(),
]);

const backup = [];
[...snapCovers.docs, ...snapSets.docs].forEach(d => {
  backup.push({ id: d.id, ...d.data() });
});

const dateStr  = new Date().toISOString().slice(0, 10);
const backupPath = resolve(__dir, `backup-covers-${dateStr}.json`);
writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');

console.log(`✅ גובו ${backup.length} מוצרים → ${backupPath}`);
console.log(`   מהם: ${snapCovers.size} "כיסוי תפילין" + ${snapSets.size} "סט טלית תפילין"`);

if (backup.length !== 310) {
  console.warn(`⚠️  ציפינו ל-310, קיבלנו ${backup.length} — המשך בכל זאת.`);
}

// ════════════════════════════════════════════════════════════════
// שלב 1 — coverStyle לרש"י ר"ת
// ════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('שלב 1 — coverStyle: "רש"י ר"ת" ל-3 מוצרים');
console.log('══════════════════════════════════════════════════════');

const RASHI_TAM_IDS = [
  '1illIq0YbsCCzce0rpNN',
  '47vPam6IGCNv4DYe4sMp',
  'BytNVLipUibuIfEMeCE4',
];

for (const id of RASHI_TAM_IDS) {
  const ref  = db.collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`  ⚠️  [${id}] לא נמצא`); continue; }
  const before = snap.data();
  await ref.update({ coverStyle: 'רש"י ר"ת' });
  console.log(`  ✅ [${id}] "${before.name}" → coverStyle: "רש"י ר"ת"`);
}

// ════════════════════════════════════════════════════════════════
// שלב 2 — מיגרציה cat + category
// ════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('שלב 2 — מיגרציה: "כיסוי תפילין" → "סט טלית תפילין"');
console.log('══════════════════════════════════════════════════════');

// טעינה מחדש (אחרי שלב 1, לא צריך אבל בטוח)
const toMigrate = await db.collection('products').where('cat', '==', 'כיסוי תפילין').get();
console.log(`  מצאתי ${toMigrate.size} מוצרים לשינוי...`);

// batch writes — Firestore מגביל 500 לכל batch
const BATCH_SIZE = 400;
let updated = 0;
let batch    = db.batch();
let batchCount = 0;

for (const docSnap of toMigrate.docs) {
  batch.update(docSnap.ref, { cat: 'סט טלית תפילין', category: 'סט טלית תפילין' });
  batchCount++;
  updated++;
  if (batchCount === BATCH_SIZE) {
    await batch.commit();
    console.log(`  [batch] שלחתי ${updated} עד כה...`);
    batch = db.batch();
    batchCount = 0;
  }
}
if (batchCount > 0) await batch.commit();

console.log(`  ✅ עודכנו ${updated} מוצרים`);

// ════════════════════════════════════════════════════════════════
// אימות סופי
// ════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('אימות סופי — ספירה חדשה מ-Firestore');
console.log('══════════════════════════════════════════════════════');

const [afterSets, afterCovers] = await Promise.all([
  countCat('סט טלית תפילין'),
  countCat('כיסוי תפילין'),
]);

console.log(`  "סט טלית תפילין": ${afterSets} מוצרים (צפוי: 310)`);
console.log(`  "כיסוי תפילין":   ${afterCovers} מוצרים (צפוי: 0)`);

if (afterSets === 310 && afterCovers === 0) {
  console.log('\n✅ מיגרציה הושלמה בהצלחה!');
} else {
  console.warn('\n⚠️  ספירה לא תואמת — בדוק ידנית.');
}

process.exit(0);
