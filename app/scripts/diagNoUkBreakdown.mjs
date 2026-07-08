/**
 * diagNoUkBreakdown.mjs  —  קריאה בלבד. לא כותב שום דבר ל-Firestore.
 * ─────────────────────────────────────────────────────────────────────────────
 * מפרק את כל המוצרים שאין להם קוד UK תקין (sku לא בפורמט ^UK\d+$) לשלושה דליים:
 *   1. STAM      → קטגוריית סת"ם או soferId → להחריג, לעולם לא למחוק
 *   2. PALDINOX  → source==='paldinox' → מוצרי ספק לגיטימיים, החלטה נפרדת
 *   3. DELETE?   → כל השאר ללא UK → מועמדי מחיקה אמיתיים לבדיקה
 *
 * מטרה: לראות מספרים אמיתיים ופילוח לפי קטגוריה לפני כל החלטה על מחיקה/ארכוב.
 *
 * שימוש:  node app/scripts/diagNoUkBreakdown.mjs
 * פלט:    scripts/no-uk-breakdown-<YYYY-MM-DD>.csv   (רשימה מלאה עם הדלי של כל מוצר)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }    from 'fs';
import { resolve, dirname }               from 'path';
import { fileURLToPath }                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const SA_PATH   = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const isUK = s => /^UK\d+$/.test(String(s || ''));

// קטגוריות סת"ם / כתב-יד — להחריג לחלוטין (לעולם לא למחוק)
const STAM_CATS = new Set([
  'קלפי מזוזה', 'קלפי תפילין', 'קלפים',
  'תפילין קומפלט', 'ספרי תורה', 'מגילות',
  'טליתות', 'בר מצווה',
]);

function isStam(p) {
  if (p.soferId || p.soferName) return true;                 // מוצר של סופר
  const cat = p.category || p.cat || '';
  const sub = p.subCategory || '';
  if (STAM_CATS.has(cat)) return true;
  if (STAM_CATS.has(sub)) return true;
  // גיבוי: התאמה חלקית לשם קטגוריה (תפילין/מגיל/ספר תורה/קלף)
  if (/תפילין|מגיל|ספר תורה|ספרי תורה|קלף|בר מצו/.test(cat + ' ' + sub)) return true;
  return false;
}

const snap = await db.collection('products').get();
const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const noUk = all.filter(p => !isUK(p.sku) && !isUK(p.supplierCode));

const buckets = { STAM: [], PALDINOX: [], DELETE: [] };
for (const p of noUk) {
  if (isStam(p))                       buckets.STAM.push(p);
  else if (p.source === 'paldinox')    buckets.PALDINOX.push(p);
  else                                 buckets.DELETE.push(p);
}

const catBreakdown = list => {
  const m = {};
  for (const p of list) { const k = (p.category || p.cat || '(ללא קטגוריה)'); m[k] = (m[k] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

console.log('═'.repeat(70));
console.log(' פילוח מוצרים ללא קוד UK  (קריאה בלבד)');
console.log('═'.repeat(70));
console.log(`סה"כ מוצרים: ${all.length}`);
console.log(`ללא קוד UK תקין: ${noUk.length}`);
console.log('─'.repeat(70));
console.log(`  🛡️  STAM (מוחרג, לא נמחק):     ${buckets.STAM.length}`);
console.log(`  🏭  PALDINOX (החלטה נפרדת):    ${buckets.PALDINOX.length}`);
console.log(`  🗑️  DELETE? (מועמדי מחיקה):     ${buckets.DELETE.length}`);

console.log('\n── פילוח DELETE? לפי קטגוריה ──');
for (const [cat, n] of catBreakdown(buckets.DELETE)) console.log(`   ${String(n).padStart(5)}  ${cat}`);

console.log('\n── פילוח STAM (מוחרג) לפי קטגוריה — לוודא שלא נופל משהו לא נכון ──');
for (const [cat, n] of catBreakdown(buckets.STAM)) console.log(`   ${String(n).padStart(5)}  ${cat}`);

console.log('\n── 25 דוגמאות מ-DELETE? ──');
buckets.DELETE.slice(0, 25).forEach(p =>
  console.log(`   [${p.source || 'no-source'}] cat="${p.category || p.cat || ''}" sku="${p.sku || ''}" | ${(p.name || '').slice(0, 40)}`));

// CSV מלא לבדיקה
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [];
for (const [bucket, list] of Object.entries(buckets))
  for (const p of list) rows.push([p.id, bucket, p.source || '', p.category || p.cat || '', p.subCategory || '', p.sku || '', p.status || '', p.soferId || '', (p.name || '')]);
const header = 'id,bucket,source,category,subCategory,sku,status,soferId,name';
const csvPath = resolve(ROOT, `scripts/no-uk-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
writeFileSync(csvPath, '﻿' + header + '\n' + rows.map(r => r.map(esc).join(',')).join('\n'), 'utf8');
console.log(`\n📄 CSV מלא: ${csvPath}`);
console.log('\n🧪 קריאה בלבד — לא שונה כלום. נחליט לפי המספרים.');
process.exit(0);
