/**
 * priceRoundingCollisionReport.mjs
 * Dry run for the whole-shekel price-rounding migration. For every product,
 * computes what price/was/salePrice/clearanceSalePrice WOULD become under
 * Math.round() (same rule as formatPrice()), and flags any product where
 * rounding would collapse the discount relationship:
 *   - round(salePrice)          >= round(price)
 *   - round(clearanceSalePrice) >= round(price)
 *   - round(was)                <= round(price)
 *
 * Read-only — writes nothing to Firestore. Outputs a JSON report of
 * colliding products for manual review, plus a console summary.
 *
 * Usage: node scripts/priceRoundingCollisionReport.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function run() {
  console.log('📥 שולף מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`📦 נמצאו ${snap.size} מוצרים`);

  const collisions = [];
  let checked = 0;
  let cleanCount = 0;

  snap.forEach(doc => {
    const d = doc.data();
    const id = doc.id;

    const price              = toNum(d.price);
    const was                = toNum(d.was);
    const salePrice          = toNum(d.salePrice);
    const clearanceSalePrice = toNum(d.clearanceSalePrice);

    if (price === null) return; // nothing to round against
    checked++;

    const rPrice              = Math.round(price);
    const rWas                = was === null ? null : Math.round(was);
    const rSalePrice          = salePrice === null ? null : Math.round(salePrice);
    const rClearanceSalePrice = clearanceSalePrice === null ? null : Math.round(clearanceSalePrice);

    const reasons = [];
    if (rSalePrice !== null && rSalePrice >= rPrice) {
      reasons.push(`round(salePrice)=${rSalePrice} >= round(price)=${rPrice}`);
    }
    if (rClearanceSalePrice !== null && rClearanceSalePrice >= rPrice) {
      reasons.push(`round(clearanceSalePrice)=${rClearanceSalePrice} >= round(price)=${rPrice}`);
    }
    if (rWas !== null && rWas <= rPrice) {
      reasons.push(`round(was)=${rWas} <= round(price)=${rPrice}`);
    }

    if (reasons.length > 0) {
      collisions.push({
        id,
        name: d.name ?? null,
        sku: d.sku ?? null,
        before: { price, was, salePrice, clearanceSalePrice },
        after:  { price: rPrice, was: rWas, salePrice: rSalePrice, clearanceSalePrice: rClearanceSalePrice },
        reasons,
      });
    } else {
      cleanCount++;
    }
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(__dirname, `price-rounding-collisions-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    rule: 'Math.round() to whole shekel, same as formatPrice()',
    totalProducts: snap.size,
    checked,
    cleanCount,
    collisionCount: collisions.length,
    collisions,
  }, null, 2), 'utf8');

  console.log('\n══════════════════════════════════════');
  console.log(`🔎 נבדקו: ${checked} מוצרים עם price`);
  console.log(`✅ נקיים (בטוחים לכתיבה): ${cleanCount}`);
  console.log(`⚠️  התנגשויות (לא ייכתבו, דורש בדיקה ידנית): ${collisions.length}`);
  console.log(`📄 דוח נשמר: ${outPath}`);
  if (collisions.length > 0) {
    console.log('\nדוגמאות ראשונות:');
    collisions.slice(0, 10).forEach(c => {
      console.log(`  [${c.id}] ${c.name ?? '(no name)'} — ${c.reasons.join(' | ')}`);
    });
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
