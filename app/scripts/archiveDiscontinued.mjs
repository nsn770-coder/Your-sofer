/**
 * archiveDiscontinued.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * מטרה: לזהות ולארכב (ARCHIVE בלבד — לא מחיקה) מוצרים שכבר לא קיימים אצל הספק
 *       באתר שלו. ההחלטה מתבססת אך ורק על מצב הספק — לא על המלאי שלנו.
 *
 * כלל ברזל: לעולם לא מוחקים. ארכוב = status:'archived' (המוצר נעלם מהחנות כי
 *           הסטור מציג רק status==='active' && hidden!==true). לא נוגעים בתמונות
 *           ולא בשום שדה אחר. שומרים prevStatus + לוג לשחזור בקליק.
 *
 * טווח (scope):
 *   • source === 'israel-judaica'  → נבדק מול הפיד החי של israel-judaica.com (לפי UK sku)
 *   • source === 'paldinox'        → נבדק מול דף המוצר החי ב-paldinox.co.il (לפי sourceUrl)
 *   • כל השאר (סת"ם / סופרים / ללא source) → מדלגים לחלוטין. לא נבדק, לא מארכב.
 *
 * שתי פעולות נפרדות (כל אחת פקודה מפורשת משלה):
 *   • not_at_supplier  → הקוד/הקישור כבר לא קיים באתר הספק  → ARCHIVE (status:'archived')
 *   • no_uk_code       → מוצר israel-judaica ללא UK sku תקין (לא ניתן לאמת מול הספק)
 *                        → DELETE. לפי החלטת הבעלים: נמחק כדי לייבא מחדש מה-sync.
 *                        לפני כל מחיקה נכתב גיבוי JSON מלא של כל שדה (רשת ביטחון / re-import).
 *                        תמונות Cloudinary לא נמחקות.
 *
 * שימוש:
 *   node app/scripts/archiveDiscontinued.mjs                        ← DRY-RUN (ברירת מחדל, לא כותב לענן)
 *   node app/scripts/archiveDiscontinued.mjs --execute-archive      ← מארכב את not_at_supplier
 *   node app/scripts/archiveDiscontinued.mjs --execute-delete-no-uk ← גיבוי מלא + מחיקת no_uk_code (IJ)
 *   (אפשר להריץ את שתי פקודות הביצוע בנפרד, כל אחת רק אחרי בדיקת ה-CSV שלה)
 *
 * פלט:
 *   scripts/archive-candidates-<YYYY-MM-DD>.csv      ← מועמדים לארכוב (not_at_supplier)
 *   scripts/archive-no-uk-code-<YYYY-MM-DD>.csv       ← מועמדים למחיקה (no_uk_code)
 *   scripts/archive-rollback-<timestamp>.json         ← נכתב ב---execute-archive (שחזור ארכוב)
 *   scripts/deleted-no-uk-backup-<timestamp>.json     ← גיבוי מלא, נכתב לפני מחיקה
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue }      from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }    from 'fs';
import { resolve, dirname }               from 'path';
import { fileURLToPath }                  from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');

// ── CLI flags ────────────────────────────────────────────────────────────────
const args                 = process.argv.slice(2);
const EXECUTE_ARCHIVE      = args.includes('--execute-archive');
const EXECUTE_DELETE_NOUK  = args.includes('--execute-delete-no-uk');
const DRY_RUN              = !EXECUTE_ARCHIVE && !EXECUTE_DELETE_NOUK;

// ── Firebase (read-only unless --execute) ────────────────────────────────────
const SA_PATH = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ═════════════════════════════════════════════════════════════════════════════
// ISRAEL-JUDAICA — פיד חי (קוד UK)
// ═════════════════════════════════════════════════════════════════════════════
const IJ_BASE = 'https://www.israel-judaica.com';
const IJ_BATCH = 100;

// כל קודי הקטגוריות אצל הספק (מתוך fullSyncIsraelJudaica.mjs)
const IJ_CATEGORY_CODES = [
  '1116','1118','1119','1121','1122','1123','1124','1125','1127',
  '1129','1130','1131','1132','1133',
  '1135','1136','1137','1138','1139',
  '1143','1144','1145','1146','1147','1148','1149','1150','1151',
  '1153','1154','1156','1157','1158','1159',
  '1160','1161','1163','1164','1165','1166','1167','1168','1169',
  '1171','1172','1173','1174','1175',
  '1177','1178','1180','1181','1184','1185','1187','1193',
];

async function ijFetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category: categoryCode, filterChoices: '[]',
    limit: String(IJ_BATCH), offset: String(offset),
    sortValue: '', sortDirection: '', note: '', search_term: '',
  });
  const res = await fetch(`${IJ_BASE}/index.php?option=com_art&task=category.getProducts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.status) return {};
  return json.products || {};
}

async function ijFetchAllSkus() {
  const skuSet = new Set();
  for (let i = 0; i < IJ_CATEGORY_CODES.length; i++) {
    const code = IJ_CATEGORY_CODES[i];
    process.stdout.write(`   [${i + 1}/${IJ_CATEGORY_CODES.length}] code=${code} ... `);
    let offset = 0, catCount = 0;
    try {
      while (true) {
        const batch = await ijFetchBatch(code, offset);
        const keys = Object.keys(batch);
        if (!keys.length) break;
        for (const sku of keys) { skuSet.add(String(sku)); catCount++; }
        if (keys.length < IJ_BATCH) break;
        offset += IJ_BATCH;
        await sleep(250);
      }
      process.stdout.write(`${catCount} מוצרים\n`);
    } catch (e) {
      process.stdout.write(`❌ ${e.message}\n`);
    }
    await sleep(350);
  }
  return skuSet;
}

// ═════════════════════════════════════════════════════════════════════════════
// PALDINOX — בדיקת קיום דף מוצר חי (sourceUrl)
// ═════════════════════════════════════════════════════════════════════════════
/**
 * מחזיר 'exists' | 'gone' | 'unknown' לפי דף המוצר החי.
 * gone  = 404/410, או הפניה (redirect) אל דף שאינו /product/ (מוצר שהוסר בוורדפרס).
 * unknown = שגיאת רשת / סטטוס לא-חד-משמעי  → לא מארכבים (לא מנחשים).
 */
async function paldinoxCheck(url) {
  if (!url) return 'unknown';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9' }, redirect: 'follow' });
    if (res.status === 404 || res.status === 410) return 'gone';
    if (!res.ok) return 'unknown';
    // WooCommerce לרוב מפנה מוצר שהוסר אל דף החנות/קטגוריה
    const finalUrl = decodeURIComponent(res.url || url);
    if (!finalUrl.includes('/product/')) return 'gone';
    // בדיקת גוף העמוד — הודעות "לא נמצא" נפוצות
    const html = await res.text();
    if (/class="[^"]*error404|לא נמצאו מוצרים|העמוד המבוקש לא נמצא/i.test(html)) return 'gone';
    return 'exists';
  } catch {
    return 'unknown';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
const isUK = s => /^UK\d+$/.test(String(s || ''));

async function main() {
  console.log('═'.repeat(70));
  console.log(' YourSofer — ארכוב מוצרים שפסקו אצל הספק  (ARCHIVE ONLY)');
  console.log('═'.repeat(70));
  const modeLabel = DRY_RUN ? '🧪 DRY-RUN — לא נכתב לענן'
    : [EXECUTE_ARCHIVE ? 'ARCHIVE (not_at_supplier)' : null,
       EXECUTE_DELETE_NOUK ? 'DELETE (no_uk_code)' : null].filter(Boolean).join(' + ');
  console.log(`מצב: ${modeLabel}`);
  console.log('═'.repeat(70));

  // ── טעינת כל המוצרים ────────────────────────────────────────────────────────
  console.log('\n📥 טוען את כל המוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const byId = new Map(all.map(p => [p.id, p]));   // גישה למסמך המלא (לגיבוי לפני מחיקה)
  console.log(`   סה"כ: ${all.length} מוצרים`);

  const ij      = all.filter(p => p.source === 'israel-judaica');
  const pal     = all.filter(p => p.source === 'paldinox');
  const skipped = all.filter(p => p.source !== 'israel-judaica' && p.source !== 'paldinox');
  console.log(`   israel-judaica: ${ij.length} | paldinox: ${pal.length} | מדולגים (סת"ם/אחר): ${skipped.length}`);

  const candidates = [];   // { id, source, name, code, reason, prevStatus, checkedUrl }
  const noUkList   = [];   // israel-judaica ללא UK sku — דיווח נפרד

  // ── israel-judaica ─────────────────────────────────────────────────────────
  console.log('\n══ israel-judaica: שליפת כל ה-SKUs החיים מהספק ══');
  const ijSupplierSkus = await ijFetchAllSkus();
  console.log(`   📦 ${ijSupplierSkus.size} SKUs ייחודיים אצל הספק כרגע`);

  for (const p of ij) {
    const code = p.sku || p.supplierCode || '';
    if (!isUK(code)) {
      noUkList.push({ id: p.id, source: 'israel-judaica', name: p.name || '', code: code || '(ריק)', reason: 'no_uk_code', prevStatus: p.status ?? '' });
      continue;
    }
    if (!ijSupplierSkus.has(String(code))) {
      candidates.push({ id: p.id, source: 'israel-judaica', name: p.name || '', code, reason: 'not_at_supplier', prevStatus: p.status ?? '', checkedUrl: `${IJ_BASE} (feed)` });
    }
  }
  console.log(`   ⇒ לא קיימים אצל הספק: ${candidates.filter(c => c.source === 'israel-judaica').length}`);
  console.log(`   ⇒ ללא UK sku (דיווח נפרד): ${noUkList.length}`);

  // ── paldinox ────────────────────────────────────────────────────────────────
  console.log('\n══ paldinox: בדיקת דף מוצר חי לכל מוצר (sourceUrl) ══');
  let checked = 0, gone = 0, unknown = 0, noUrl = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < pal.length; i += CONCURRENCY) {
    const chunk = pal.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(async p => {
      const url = p.sourceUrl || '';
      if (!url) return { p, status: 'no_url' };
      const status = await paldinoxCheck(url);
      return { p, status, url };
    }));
    for (const { p, status, url } of results) {
      checked++;
      if (status === 'no_url') { noUrl++; continue; }          // אין קישור לאימות → לא מארכבים
      if (status === 'unknown') { unknown++; continue; }        // ספק/שגיאה → לא מנחשים
      if (status === 'gone') {
        gone++;
        candidates.push({ id: p.id, source: 'paldinox', name: p.name || '', code: url, reason: 'not_at_supplier', prevStatus: p.status ?? '', checkedUrl: url });
      }
    }
    process.stdout.write(`   נבדקו ${Math.min(i + CONCURRENCY, pal.length)}/${pal.length} | פסקו: ${gone} | לא ודאי: ${unknown} | ללא קישור: ${noUrl}\r`);
    await sleep(300);
  }
  console.log(`\n   ⇒ paldinox שפסקו (מאומת): ${gone} | לא ודאי (דולגו): ${unknown} | ללא sourceUrl (דולגו): ${noUrl}`);

  // ── כתיבת CSV (תמיד — לבדיקה) ───────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const archiveRows = candidates;          // not_at_supplier → ARCHIVE
  const deleteRows  = noUkList;            // no_uk_code (IJ)  → DELETE

  const csvHeader = 'id,source,name,code_or_url,reason,prevStatus,checkedUrl';
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const toCsv = list => '﻿' + csvHeader + '\n' +
    list.map(r => [r.id, r.source, r.name, r.code, r.reason, r.prevStatus, r.checkedUrl ?? ''].map(esc).join(',')).join('\n');

  const archivePath = resolve(ROOT, `scripts/archive-candidates-${today}.csv`);
  const deletePath  = resolve(ROOT, `scripts/archive-no-uk-code-${today}.csv`);
  writeFileSync(archivePath, toCsv(archiveRows), 'utf8');
  writeFileSync(deletePath,  toCsv(deleteRows),  'utf8');

  // ── סיכום ───────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log(' סיכום');
  console.log('═'.repeat(70));
  console.log(`   ARCHIVE (not_at_supplier): ${archiveRows.length}`);
  console.log(`   DELETE  (no_uk_code, IJ):  ${deleteRows.length}`);
  console.log(`\n   📄 CSV לארכוב:  ${archivePath}`);
  console.log(`   📄 CSV למחיקה:  ${deletePath}`);
  console.log('\n   דוגמאות (ARCHIVE):');
  archiveRows.slice(0, 10).forEach(r => console.log(`     [${r.source}] ${String(r.code).slice(0, 40).padEnd(40)} ${(r.name || '').slice(0, 34)}`));
  console.log('   דוגמאות (DELETE):');
  deleteRows.slice(0, 10).forEach(r => console.log(`     [${r.source}] ${String(r.code).slice(0, 14).padEnd(14)} ${(r.name || '').slice(0, 40)}`));

  if (DRY_RUN) {
    console.log('\n🧪 DRY-RUN — לא שונתה אף רשומה בענן.');
    console.log('   עבור על שני ה-CSV, ואז הרץ:');
    console.log('     ארכוב:  node app/scripts/archiveDiscontinued.mjs --execute-archive');
    console.log('     מחיקה:  node app/scripts/archiveDiscontinued.mjs --execute-delete-no-uk');
    process.exit(0);
  }

  const now = new Date();
  const BATCH = 400;

  // ── EXECUTE ARCHIVE: not_at_supplier → status:'archived' (הפיך) ─────────────
  if (EXECUTE_ARCHIVE) {
    console.log(`\n🚀 מארכב ${archiveRows.length} מוצרים (status → archived)...`);
    const rollback = [];
    let done = 0;
    for (let i = 0; i < archiveRows.length; i += BATCH) {
      const chunk = archiveRows.slice(i, i + BATCH);
      const batch = db.batch();
      for (const r of chunk) {
        rollback.push({ id: r.id, prevStatus: r.prevStatus, reason: r.reason });
        batch.update(db.collection('products').doc(r.id), {
          status: 'archived',
          archivedAt: now,
          archivedReason: r.reason,
          archivedPrevStatus: r.prevStatus ?? null,
        });
      }
      await batch.commit();
      done += chunk.length;
      process.stdout.write(`   ${done}/${archiveRows.length} אורכבו\r`);
    }
    const rbPath = resolve(ROOT, `scripts/archive-rollback-${Date.now()}.json`);
    writeFileSync(rbPath, JSON.stringify({ date: now.toISOString(), count: rollback.length, items: rollback }, null, 2), 'utf8');
    console.log(`\n   ✅ אורכבו ${done} | 💾 לוג שחזור: ${rbPath}`);
  }

  // ── EXECUTE DELETE no_uk_code: גיבוי מלא ואז מחיקה ──────────────────────────
  if (EXECUTE_DELETE_NOUK) {
    console.log(`\n🗑️  מחיקת ${deleteRows.length} מוצרי no_uk_code (israel-judaica)...`);
    // גיבוי מלא של כל שדה — רשת ביטחון ל-re-import/שחזור (חובה, לא ניתן לדילוג)
    const fullBackup = deleteRows.map(r => byId.get(r.id)).filter(Boolean);
    const bkPath = resolve(ROOT, `scripts/deleted-no-uk-backup-${Date.now()}.json`);
    writeFileSync(bkPath, JSON.stringify({ date: now.toISOString(), count: fullBackup.length, products: fullBackup }, null, 2), 'utf8');
    console.log(`   💾 גיבוי מלא נכתב לפני מחיקה: ${bkPath}`);

    let del = 0;
    for (let i = 0; i < deleteRows.length; i += BATCH) {
      const chunk = deleteRows.slice(i, i + BATCH);
      const batch = db.batch();
      for (const r of chunk) batch.delete(db.collection('products').doc(r.id));
      await batch.commit();
      del += chunk.length;
      process.stdout.write(`   ${del}/${deleteRows.length} נמחקו\r`);
    }
    console.log(`\n   ✅ נמחקו ${del} מוצרים (תמונות Cloudinary לא נגעו). לייבוא מחדש: הרץ את sync הספק.`);
    console.log(`   ℹ️  לשחזור: הקבצים ב-${bkPath} מכילים את כל השדות של כל מוצר שנמחק.`);
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
