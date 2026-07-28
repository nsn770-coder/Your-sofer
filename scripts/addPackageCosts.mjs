/**
 * addPackageCosts.mjs
 * Adds cost/revenue/inventory fields to scripts/supplier_pack_sizes_sample.json
 * using unit prices from scripts/supplier_prices.json. No network access.
 *
 * Note: supplier_prices.json is keyed by SKU (e.g. "UK51563"), not by the
 * numeric productCode — matching is done on `sku`.
 *
 * Run:
 *   node scripts/addPackageCosts.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAMPLE_PATH = resolve(__dirname, 'supplier_pack_sizes_sample.json');
const PRICES_PATH = resolve(__dirname, 'supplier_prices.json');

const sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8'));
const prices = JSON.parse(readFileSync(PRICES_PATH, 'utf8'));

let included = 0;
let excluded = 0;

for (const p of sample) {
  const unitPrice = prices[p.sku] ?? null;

  if (unitPrice == null) {
    p.unitPrice = null;
    p.packageCost = null;
    p.sellPrice = null;
    p.revenueOneUnit = null;
    p.unitsLeft = null;
    p.leftoverInventoryCost = null;
    p.cashFlow = null;
    excluded++;
    continue;
  }

  const packageCost = unitPrice * p.packSize;
  const sellPrice = unitPrice * 2;
  const revenueOneUnit = sellPrice;
  const unitsLeft = p.packSize - 1;
  const leftoverInventoryCost = unitPrice * unitsLeft;
  const cashFlow = revenueOneUnit - packageCost;

  p.unitPrice = unitPrice;
  p.packageCost = packageCost;
  p.sellPrice = sellPrice;
  p.revenueOneUnit = revenueOneUnit;
  p.unitsLeft = unitsLeft;
  p.leftoverInventoryCost = leftoverInventoryCost;
  p.cashFlow = cashFlow;
  included++;
}

writeFileSync(SAMPLE_PATH, JSON.stringify(sample, null, 2), 'utf8');

// ── summary ──────────────────────────────────────────────────────────────────
const withPrice = sample.filter((p) => p.unitPrice != null);
const totalSpent = withPrice.reduce((s, p) => s + p.packageCost, 0);
const totalRevenue = withPrice.reduce((s, p) => s + p.revenueOneUnit, 0);
const totalLeftover = withPrice.reduce((s, p) => s + p.leftoverInventoryCost, 0);
const netCashFlow = totalRevenue - totalSpent;

console.log('\n💰 סיכום כולל למדגם:\n');
console.log(`   מוצרים שנכללו (יש מחיר):    ${included}`);
console.log(`   מוצרים שהושמטו (אין מחיר):  ${excluded}`);
console.log(`   סך הוצאה (קניית חבילות):    ₪${totalSpent.toFixed(2)}`);
console.log(`   סך הכנסה (מכירת יחידה אחת): ₪${totalRevenue.toFixed(2)}`);
console.log(`   תזרים נטו:                  ₪${netCashFlow.toFixed(2)}`);
console.log(`   עלות מלאי שנשאר:            ₪${totalLeftover.toFixed(2)}`);

const bySubCat = {};
for (const p of withPrice) {
  (bySubCat[p.subCategory] ??= []).push(p);
}

const rows = Object.entries(bySubCat).map(([subCat, items]) => ({
  'תת-קטגוריה': subCat,
  "מס' מוצרים": items.length,
  'סך הוצאה': `₪${items.reduce((s, p) => s + p.packageCost, 0).toFixed(2)}`,
  'סך הכנסה': `₪${items.reduce((s, p) => s + p.revenueOneUnit, 0).toFixed(2)}`,
  'עלות מלאי שנשאר': `₪${items.reduce((s, p) => s + p.leftoverInventoryCost, 0).toFixed(2)}`,
}));

console.log('\n📊 פירוט פר תת-קטגוריה:\n');
console.table(rows);
