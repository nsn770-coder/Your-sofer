// deleteNonActiveProducts.mjs — מחיקת כל המוצרים הלא-פעילים מ-Firestore
//
// מוחק: hidden=true, וכן כל status שאינו 'active' (inactive / draft / rejected / pending)
// שומר: מוצרים active ומוצרים ללא שדה status (מוצרי legacy חיים באתר)
//
// שלב 1 (חובה) — dry-run, רק מציג מה יימחק:
//   node app/scripts/deleteNonActiveProducts.mjs
//
// שלב 2 — מחיקה בפועל (נוצר קודם גיבוי JSON מלא):
//   node app/scripts/deleteNonActiveProducts.mjs --execute
//
// שחזור: קובץ הגיבוי נשמר ב-app/scripts/backups/ — אפשר לשחזר ממנו בכל רגע.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const EXECUTE = process.argv.includes('--execute');

// ── שליפת כל המוצרים (paginated) ─────────────────────────────────────────────
const all = [];
let cursor = null;
while (true) {
  let q = db.collection('products').limit(500);
  if (cursor) q = q.startAfter(cursor);
  const snap = await q.get();
  if (snap.empty) break;
  cursor = snap.docs[snap.docs.length - 1];
  for (const d of snap.docs) all.push({ id: d.id, data: d.data() });
}

// ── סינון: מה נמחק ────────────────────────────────────────────────────────────
const toDelete = all.filter(p =>
  p.data.hidden === true || (p.data.status && p.data.status !== 'active')
);
const byReason = {};
for (const p of toDelete) {
  const r = p.data.hidden === true ? `hidden (status=${p.data.status ?? 'none'})` : `status=${p.data.status}`;
  byReason[r] = (byReason[r] ?? 0) + 1;
}

console.log('══════════════════════════════════════════════');
console.log(EXECUTE ? '⚠️  מצב מחיקה (--execute)' : '🔍 DRY-RUN — לא נמחק כלום');
console.log('══════════════════════════════════════════════');
console.log(`סה"כ מוצרים ב-Firestore:  ${all.length}`);
console.log(`מיועדים למחיקה:           ${toDelete.length}`);
console.log(`יישארו:                   ${all.length - toDelete.length}`);
console.log('\nפירוט:');
for (const [r, c] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${r}: ${c}`);
}

if (!EXECUTE) {
  console.log('\nזהו dry-run. להרצה אמיתית (אחרי גיבוי אוטומטי):');
  console.log('  node app/scripts/deleteNonActiveProducts.mjs --execute');
  process.exit(0);
}

// ── גיבוי מלא לפני מחיקה ─────────────────────────────────────────────────────
const backupDir = path.join(__dirname, 'backups');
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `deleted-products-${stamp}.json`);
writeFileSync(backupFile, JSON.stringify(toDelete, null, 1));
console.log(`\n💾 גיבוי נשמר: ${backupFile}`);

// ── מחיקה ב-batches של 500 ───────────────────────────────────────────────────
let deleted = 0;
for (let i = 0; i < toDelete.length; i += 500) {
  const batch = db.batch();
  for (const p of toDelete.slice(i, i + 500)) {
    batch.delete(db.collection('products').doc(p.id));
  }
  await batch.commit();
  deleted += Math.min(500, toDelete.length - i);
  console.log(`  נמחקו ${deleted}/${toDelete.length}...`);
}

console.log(`\n✅ הושלם. נמחקו ${deleted} מוצרים. נשארו ${all.length - deleted}.`);
console.log('הערה: תתי-אוספים (reviews) של מוצרים שנמחקו אינם נמחקים אוטומטית — הם לא מפריעים לכלום.');
console.log('ה-sitemap יתעדכן אוטומטית תוך שעה (revalidate 3600), וגוגל יסיר את הדפים בהדרגה (404).');
process.exit(0);
