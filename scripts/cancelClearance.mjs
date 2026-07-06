/**
 * cancelClearance.mjs — ביטול הנחת מלאי (clearance) מכל המוצרים
 *
 * מה הסקריפט עושה:
 * 1. מוצא את כל המוצרים עם clearanceDiscount=true
 * 2. מבטל: clearanceDiscount=false, מוחק clearanceSalePrice ו-originalPrice
 *    (המוצר חוזר להציג את `price` הרגיל — המחיר שכבר הותאם לקופון 5%)
 * 3. שומר גיבוי ב-scripts/backup-clearance-before-cancel.json
 *
 * הערה: הקרון היומי /api/cron/daily-clearance הוסר מ-vercel.json —
 * בלי זה המוצרים היו מסומנים מחדש כל לילה ב-03:00.
 *
 * שימוש: node scripts/cancelClearance.mjs          (ריצה אמיתית)
 *        node scripts/cancelClearance.mjs --dry    (הדמיה בלבד)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes('--dry');

const SA_CANDIDATES = [
  process.env.SERVICE_ACCOUNT_PATH,
  resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'),
  resolve(__dirname, '../app/scripts/your-sofer-firebase-adminsdk-fbsvc-dd43a60da9.json'),
  resolve(__dirname, '../app/scripts/serviceAccount.json'),
].filter(Boolean);

const SA_PATH = SA_CANDIDATES.find(p => existsSync(p));
if (!SA_PATH) { console.error('❌ לא נמצא service account'); process.exit(1); }
if (!getApps().length) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const snap = await db.collection('products').where('clearanceDiscount', '==', true).get();
console.log(`נמצאו ${snap.size} מוצרים עם הנחת מלאי פעילה`);

const backup = snap.docs.map(d => {
  const p = d.data();
  return {
    id: d.id,
    name: p.name ?? '',
    price: p.price ?? null,
    clearanceSalePrice: p.clearanceSalePrice ?? null,
    originalPrice: p.originalPrice ?? null,
  };
});

const backupPath = resolve(__dirname, 'backup-clearance-before-cancel.json');
writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
console.log(`📦 גיבוי נשמר: ${backupPath}`);

if (DRY) {
  backup.slice(0, 5).forEach(p =>
    console.log(`[DRY] ${p.name}: מחיר מבצע מלאי ₪${p.clearanceSalePrice} → יחזור למחיר רגיל ₪${p.price}`)
  );
  console.log('[DRY-RUN] לא בוצעה כתיבה — הרץ בלי --dry לביצוע');
  process.exit(0);
}

let batch = db.batch(), inBatch = 0, updated = 0;
for (const doc of snap.docs) {
  batch.update(doc.ref, {
    clearanceDiscount: false,
    clearanceSalePrice: FieldValue.delete(),
    originalPrice: FieldValue.delete(),
    lastInventoryCheck: new Date(),
  });
  updated++;
  if (++inBatch === 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
}
if (inBatch > 0) await batch.commit();

console.log(`✅ הנחת מלאי בוטלה ב-${updated} מוצרים — כולם חזרו למחיר הרגיל`);
process.exit(0);
