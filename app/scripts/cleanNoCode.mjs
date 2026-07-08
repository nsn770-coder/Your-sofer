/**
 * cleanNoCode.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * מוחק מוצרים שאין להם שום קוד SKU — פרט למוצרי סת"ם.
 *
 * כלל (לפי הבעלים):
 *   • יש קוד SKU כלשהו (UK / X.. / כל דבר)  → נשאר. לא נוגעים.
 *   • סת"ם (קלף/תפילין/ספר תורה/מגילה/בר מצווה/עם soferId) → נשאר. לא נוגעים.
 *   • אין קוד SKU  וגם  לא סת"ם            → נמחק.
 *
 * בטיחות: לפני כל מחיקה נכתב גיבוי JSON מלא של כל שדה (ל-re-import/שחזור).
 *         תמונות Cloudinary לא נמחקות. לא נוגעים בהזמנות/לקוחות/תשלומים.
 *
 * שימוש:
 *   node app/scripts/cleanNoCode.mjs             ← DRY-RUN (ברירת מחדל, לא מוחק)
 *   node app/scripts/cleanNoCode.mjs --execute   ← גיבוי מלא ואז מחיקה
 *
 * פלט:
 *   scripts/no-code-candidates-<YYYY-MM-DD>.csv     ← רשימת המועמדים למחיקה לבדיקה
 *   scripts/no-code-keep-review-<YYYY-MM-DD>.csv    ← מה שנשמר (לוודא שלא נופל סת"ם בטעות)
 *   scripts/deleted-no-code-backup-<timestamp>.json ← גיבוי מלא, נכתב לפני מחיקה
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }    from 'fs';
import { resolve, dirname }               from 'path';
import { fileURLToPath }                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const EXECUTE   = process.argv.includes('--execute');
const DRY_RUN   = !EXECUTE;

const SA_PATH = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

// ── כלל הזיהוי ────────────────────────────────────────────────────────────────
// יש קוד = sku לא-ריק או supplierCode לא-ריק (כל ערך, לא משנה הפורמט)
function hasCode(p) {
  const sku = (p.sku ?? '').toString().trim();
  const sup = (p.supplierCode ?? '').toString().trim();
  return sku.length > 0 || sup.length > 0;
}

// קטגוריות סת"ם / כתב-יד — לעולם לא למחוק
const STAM_CATS = new Set([
  'קלפי מזוזה', 'קלפי תפילין', 'קלפים',
  'תפילין קומפלט', 'ספרי תורה', 'מגילות',
  'טליתות', 'בר מצווה',
]);
function isStam(p) {
  if (p.soferId || p.soferName) return true;
  const cat = p.category || p.cat || '';
  const sub = p.subCategory || '';
  if (STAM_CATS.has(cat) || STAM_CATS.has(sub)) return true;
  if (/תפילין|מגיל|ספר תורה|ספרי תורה|קלף|בר מצו/.test(cat + ' ' + sub)) return true;
  return false;
}

// ── טעינה ─────────────────────────────────────────────────────────────────────
console.log('═'.repeat(70));
console.log(` ניקוי מוצרים ללא קוד SKU  —  ${DRY_RUN ? '🧪 DRY-RUN (לא מוחק)' : '🗑️ EXECUTE'}`);
console.log('═'.repeat(70));

const snap = await db.collection('products').get();
const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
console.log(`סה"כ מוצרים: ${all.length}`);

const keepCode = [], keepStam = [], toDelete = [];
for (const p of all) {
  if (hasCode(p))      keepCode.push(p);      // יש קוד → נשאר
  else if (isStam(p))  keepStam.push(p);      // סת"ם בלי קוד → נשאר
  else                 toDelete.push(p);      // בלי קוד ולא סת"ם → נמחק
}

console.log('─'.repeat(70));
console.log(`  ✅ נשמר — יש קוד SKU:        ${keepCode.length}`);
console.log(`  🛡️  נשמר — סת"ם בלי קוד:      ${keepStam.length}`);
console.log(`  🗑️  למחיקה — בלי קוד, לא סת"ם: ${toDelete.length}`);

// פילוח מועמדי המחיקה לפי source + category
const brk = (list, key) => {
  const m = {};
  for (const p of list) { const k = (key(p) || '(ריק)'); m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
console.log('\n── מועמדי מחיקה לפי source ──');
for (const [s, n] of brk(toDelete, p => p.source)) console.log(`   ${String(n).padStart(5)}  ${s}`);
console.log('\n── מועמדי מחיקה לפי קטגוריה ──');
for (const [c, n] of brk(toDelete, p => p.category || p.cat)) console.log(`   ${String(n).padStart(5)}  ${c}`);
console.log('\n── 25 דוגמאות למחיקה ──');
toDelete.slice(0, 25).forEach(p =>
  console.log(`   [${p.source || 'no-source'}] cat="${p.category || p.cat || ''}" status="${p.status || ''}" | ${(p.name || '').slice(0, 42)}`));

// ── CSV ───────────────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = 'id,source,category,subCategory,sku,supplierCode,status,soferId,name';
const rowOf  = p => [p.id, p.source || '', p.category || p.cat || '', p.subCategory || '', p.sku || '', p.supplierCode || '', p.status || '', p.soferId || '', p.name || ''].map(esc).join(',');

const candPath = resolve(ROOT, `scripts/no-code-candidates-${today}.csv`);
const keepPath = resolve(ROOT, `scripts/no-code-keep-review-${today}.csv`);
writeFileSync(candPath, '﻿' + header + '\n' + toDelete.map(rowOf).join('\n'), 'utf8');
writeFileSync(keepPath, '﻿' + header + '\n' + keepStam.map(rowOf).join('\n'), 'utf8');
console.log(`\n📄 CSV מועמדי מחיקה: ${candPath}`);
console.log(`📄 CSV סת"ם שנשמר (לבדיקה): ${keepPath}`);

if (DRY_RUN) {
  console.log('\n🧪 DRY-RUN — לא נמחק כלום. עבור על ה-CSV, ואז הרץ עם --execute.');
  process.exit(0);
}

// ── EXECUTE: גיבוי מלא ואז מחיקה ──────────────────────────────────────────────
const bkPath = resolve(ROOT, `scripts/deleted-no-code-backup-${Date.now()}.json`);
writeFileSync(bkPath, JSON.stringify({ date: new Date().toISOString(), count: toDelete.length, products: toDelete }, null, 2), 'utf8');
console.log(`\n💾 גיבוי מלא נכתב לפני מחיקה: ${bkPath}`);

const BATCH = 400;
let del = 0;
for (let i = 0; i < toDelete.length; i += BATCH) {
  const chunk = toDelete.slice(i, i + BATCH);
  const batch = db.batch();
  for (const p of chunk) batch.delete(db.collection('products').doc(p.id));
  await batch.commit();
  del += chunk.length;
  process.stdout.write(`   ${del}/${toDelete.length} נמחקו\r`);
}
console.log(`\n\n✅ נמחקו ${del} מוצרים (בלי קוד, לא סת"ם).`);
console.log(`   תמונות Cloudinary לא נגעו. לשחזור: ${bkPath}`);
process.exit(0);
