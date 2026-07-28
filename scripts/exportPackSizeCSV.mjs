/**
 * exportPackSizeCSV.mjs
 * Exports scripts/supplier_pack_sizes_sample.json to two CSVs:
 *   - scripts/pack_size_by_subcategory.csv  (one row per sub-category, sorted by spend desc)
 *   - scripts/pack_size_full.csv            (one row per product)
 *
 * Run:
 *   node scripts/exportPackSizeCSV.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAMPLE_PATH    = resolve(__dirname, 'supplier_pack_sizes_sample.json');
const SUBCAT_CSV     = resolve(__dirname, 'pack_size_by_subcategory.csv');
const FULL_CSV       = resolve(__dirname, 'pack_size_full.csv');

const sample = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8'));

function csvField(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => csvField(row[h])).join(','));
  return '﻿' + lines.join('\n') + '\n';
}

// ── per sub-category aggregation ─────────────────────────────────────────────
const bySubCat = {};
for (const p of sample) {
  (bySubCat[p.subCategory] ??= []).push(p);
}

const subCatRows = Object.entries(bySubCat).map(([subCategory, items]) => {
  const priced = items.filter((p) => p.unitPrice != null);

  const packSizeCounts = {};
  for (const p of items) packSizeCounts[p.packSize] = (packSizeCounts[p.packSize] || 0) + 1;
  const mostCommonPackSize = Object.entries(packSizeCounts).sort((a, b) => b[1] - a[1])[0][0];

  const totalSpent   = priced.reduce((s, p) => s + p.packageCost, 0);
  const totalRevenue = priced.reduce((s, p) => s + p.revenueOneUnit, 0);
  const totalLeftover = priced.reduce((s, p) => s + p.leftoverInventoryCost, 0);

  return {
    subCategory,
    'מספר מוצרים (עם מחיר)': priced.length,
    'סך הוצאה': totalSpent.toFixed(2),
    'סך הכנסה': totalRevenue.toFixed(2),
    'תזרים נטו': (totalRevenue - totalSpent).toFixed(2),
    'עלות מלאי שנשאר': totalLeftover.toFixed(2),
    'גודל אריזה נפוץ': mostCommonPackSize,
    _sortKey: totalSpent,
  };
}).sort((a, b) => b._sortKey - a._sortKey);

const subCatHeaders = [
  'subCategory', 'מספר מוצרים (עם מחיר)', 'סך הוצאה', 'סך הכנסה',
  'תזרים נטו', 'עלות מלאי שנשאר', 'גודל אריזה נפוץ',
];
writeFileSync(SUBCAT_CSV, toCsv(subCatRows, subCatHeaders), 'utf8');

// ── full per-product CSV ─────────────────────────────────────────────────────
const fullHeaders = [
  'sku', 'name', 'subCategory', 'unitPrice', 'packSize', 'packageCost',
  'sellPrice', 'unitsLeft', 'leftoverInventoryCost', 'cashFlow',
];
writeFileSync(FULL_CSV, toCsv(sample, fullHeaders), 'utf8');

console.log(`✅ נשמר: ${SUBCAT_CSV} (${subCatRows.length} תתי-קטגוריות)`);
console.log(`✅ נשמר: ${FULL_CSV} (${sample.length} מוצרים)\n`);

// ── print the sub-category table in full ────────────────────────────────────
console.log(subCatHeaders.join(' | '));
for (const r of subCatRows) {
  console.log(subCatHeaders.map((h) => r[h]).join(' | '));
}
