/**
 * switchToCoupon5.mjs — מעבר מקופון 15% לקופון 5% בלי לשנות את המחיר הסופי ללקוח
 *
 * מה הסקריפט עושה:
 * 1. לכל מוצר: מחיר חדש = (מחיר נוכחי × 0.85) ÷ 0.95
 *    (המחיר הסופי אחרי קופון 5% יוצא זהה למחיר הסופי שהיה אחרי קופון 15%)
 *    מעדכן גם salePrice ו-clearanceSalePrice אם קיימים. `was` (מחיר מחוק) לא נגעים.
 * 2. שומר גיבוי מלא ב-scripts/backup-prices-before-coupon5.json + שדה preCoupon5 בכל מוצר.
 * 3. אידמפוטנטי — מוצר עם coupon5Repriced=true לא יעודכן שוב בריצה חוזרת.
 * 4. מבטל את קופוני ברכה15 ו-CLUB15, יוצר/מעדכן קופון ברכה5 (5%, פעיל, רב-פעמי).
 *
 * שימוש: node scripts/switchToCoupon5.mjs          (ריצה אמיתית)
 *        node scripts/switchToCoupon5.mjs --dry    (הדמיה בלבד, בלי כתיבה)
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

// מחיר חדש = (מחיר × 0.85) ÷ 0.95 — עיגול ל-2 ספרות
const FACTOR = 0.85 / 0.95;
const round2 = n => Math.round(n * 100) / 100;
const reprice = n => round2(n * FACTOR);

// ── שלב 1: עדכון מחירי מוצרים ────────────────────────────────────────────────
const snap = await db.collection('products').get();
console.log(`נטענו ${snap.size} מוצרים`);

const backup = [];
let updated = 0, skipped = 0, noPrice = 0;
let batch = db.batch(), inBatch = 0;

for (const doc of snap.docs) {
  const d = doc.data();

  if (d.coupon5Repriced === true) { skipped++; continue; }          // כבר עודכן
  if (typeof d.price !== 'number' || !(d.price > 0)) { noPrice++; continue; }

  const upd = {
    price: reprice(d.price),
    coupon5Repriced: true,
    preCoupon5: { price: d.price },
  };
  if (typeof d.salePrice === 'number' && d.salePrice > 0) {
    upd.salePrice = reprice(d.salePrice);
    upd.preCoupon5.salePrice = d.salePrice;
  }
  if (typeof d.clearanceSalePrice === 'number' && d.clearanceSalePrice > 0) {
    upd.clearanceSalePrice = reprice(d.clearanceSalePrice);
    upd.preCoupon5.clearanceSalePrice = d.clearanceSalePrice;
  }
  // was (מחיר מחוק) — לא נוגעים בכוונה

  backup.push({ id: doc.id, name: d.name ?? '', old: upd.preCoupon5, new: {
    price: upd.price,
    ...(upd.salePrice != null ? { salePrice: upd.salePrice } : {}),
    ...(upd.clearanceSalePrice != null ? { clearanceSalePrice: upd.clearanceSalePrice } : {}),
  }});

  if (!DRY) {
    batch.update(doc.ref, upd);
    if (++inBatch === 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
  }
  updated++;
}
if (!DRY && inBatch > 0) await batch.commit();

const backupPath = resolve(__dirname, 'backup-prices-before-coupon5.json');
writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

console.log(`${DRY ? '[DRY-RUN] ' : ''}✅ מוצרים שעודכנו: ${updated} | דולגו (כבר עודכנו): ${skipped} | בלי מחיר: ${noPrice}`);
console.log(`📦 גיבוי נשמר: ${backupPath}`);

// ── שלב 2: קופונים ───────────────────────────────────────────────────────────
if (!DRY) {
  // ביטול ברכה15 (doc id = הקוד)
  const b15 = await db.collection('coupons').doc('ברכה15').get();
  if (b15.exists) { await b15.ref.update({ active: false }); console.log('🚫 קופון ברכה15 בוטל'); }

  // ביטול CLUB15 (נוצר עם id אקראי — חיפוש לפי שדה code)
  const club15 = await db.collection('coupons').where('code', '==', 'CLUB15').get();
  for (const c of club15.docs) { await c.ref.update({ active: false }); console.log(`🚫 קופון CLUB15 בוטל (id: ${c.id})`); }

  // יצירת/עדכון ברכה5 — doc id = הקוד (כך הקופה מחפשת אותו)
  await db.collection('coupons').doc('ברכה5').set({
    code: 'ברכה5',
    discount: 5,
    type: 'percent',
    active: true,
    singleUse: false,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅ קופון ברכה5 נוצר/עודכן: 5% הנחה, פעיל, רב-פעמי');
} else {
  console.log('[DRY-RUN] שלב הקופונים ידולג — הרץ בלי --dry לביצוע');
}

// ── אימות מתמטי ──────────────────────────────────────────────────────────────
const sample = backup.slice(0, 5);
for (const s of sample) {
  const oldFinal = round2(s.old.price * 0.85);
  const newFinal = round2(s.new.price * 0.95);
  console.log(`בדיקה: ${s.old.price} → ${s.new.price} | סופי ישן (15%-): ₪${oldFinal} | סופי חדש (5%-): ₪${newFinal} | הפרש: ${round2(Math.abs(oldFinal - newFinal))}`);
}

process.exit(0);
