/**
 * analyzeOutOfStock.mjs
 *
 * Diagnostic analysis of the 1,027 OUT_OF_STOCK products from the last stock
 * check.  Classifies each product into one of three groups:
 *
 *   A  NO_SKU             — no sku field, or blank/null → false positive
 *   B  SKU_FORMAT_MISMATCH — has a sku, but the format differs from what the
 *                           supplier API returns; after normalization it would
 *                           have matched  → false positive
 *   C  REAL_OUT_OF_STOCK  — has a sku, still not found after normalization
 *                           → genuine out-of-stock candidate
 *
 * To detect format mismatches the script re-fetches the live Israel Judaica
 * SKU catalog and captures TWO formats from each API response:
 *   • keySkus    — the object KEY returned by the AJAX endpoint
 *   • productSkus — the `sku` field *inside* each product object
 * Normalizations tried against both sets:
 *   trim | lowercase | strip leading "UK" | alphanumeric-only
 *
 * READ-ONLY — does not touch Firestore.
 *
 * Usage:  node app/scripts/analyzeOutOfStock.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, 'stock-reports');
const TODAY      = '2026-06-03';          // report date to analyse
const sleep      = ms => new Promise(r => setTimeout(r, ms));

const IJ_BASE = 'https://www.israel-judaica.com';
const IJ_CATEGORIES = [
  '1118','1119','1121','1122','1123','1124','1125','1127','1129',
  '1130','1131','1132','1133','1138','1147','1160','1161','1163',
  '1164','1165','1166','1167','1168','1169','1171','1172','1173',
  '1174','1175','1176','1177','1178','1180','1185','1187','1193',
];

// ─── Normalizations ───────────────────────────────────────────────────────────
function normalizations(raw) {
  if (!raw) return [];
  const s = String(raw);
  const variants = new Set();
  variants.add(s);
  variants.add(s.trim());
  variants.add(s.toLowerCase());
  variants.add(s.trim().toLowerCase());
  variants.add(s.replace(/^UK/i, ''));                      // strip leading UK
  variants.add(s.trim().replace(/^UK/i, ''));
  variants.add(s.replace(/[^a-zA-Z0-9]/g, ''));             // alphanumeric only
  variants.add(s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  variants.add(s.replace(/^UK/i, '').replace(/[^a-zA-Z0-9]/g, '')); // strip UK + alnum
  return [...variants].filter(Boolean);
}

// ─── Re-scan Israel Judaica, collecting BOTH key-SKUs and product.sku values ─
async function fetchIJSkuSets() {
  console.log('\n🔍 Re-scanning Israel Judaica (collecting key + product.sku formats)...');

  const keySkus     = new Set();   // object keys from json.products
  const productSkus = new Set();   // product.sku field inside each product
  let catFailed = 0;

  for (const code of IJ_CATEGORIES) {
    const BATCH = 100;
    let offset  = 0;

    try {
      while (true) {
        const body = new URLSearchParams({
          category:      code,
          filterChoices: '[]',
          limit:         String(BATCH),
          offset:        String(offset),
          sortValue:     '',
          sortDirection: '',
          note:          '',
          search_term:   '',
        });

        const res = await fetch(
          `${IJ_BASE}/index.php?option=com_art&task=category.getProducts`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    body.toString(),
          }
        );

        if (!res.ok) break;
        const json = await res.json();
        if (!json.status) break;

        const products = json.products || {};
        const keys     = Object.keys(products);
        if (keys.length === 0) break;

        for (const [key, product] of Object.entries(products)) {
          keySkus.add(key);                                   // e.g. "15683"
          if (product && product.sku) productSkus.add(String(product.sku)); // e.g. "UK15683"
        }

        if (keys.length < BATCH) break;
        offset += BATCH;
        await sleep(180);
      }

      process.stdout.write(`   [${code}] ✓\n`);
      await sleep(180);
    } catch (e) {
      process.stdout.write(`   [${code}] ⚠️  ${e.message}\n`);
      catFailed++;
    }
  }

  console.log(`   Keys collected : ${keySkus.size}`);
  console.log(`   product.sku set: ${productSkus.size}`);
  if (catFailed) console.log(`   Categories failed: ${catFailed}`);

  // Build a combined "all known supplier representations"
  const allSupplierSkus = new Set([...keySkus, ...productSkus]);
  return { keySkus, productSkus, allSupplierSkus };
}

// ─── Classify one product ────────────────────────────────────────────────────
function classify(product, keySkus, productSkus, allSupplierSkus) {
  const sku = product.sku;

  // Group A — missing / blank SKU
  if (!sku || String(sku).trim() === '') {
    return { group: 'A', reason: 'no_sku', matchedVariant: null, matchedSet: null };
  }

  // Check exact match first (should not happen — already checked in the stock run)
  if (allSupplierSkus.has(String(sku))) {
    return { group: 'IN_STOCK_EXACT', reason: 'exact_match_found', matchedVariant: String(sku), matchedSet: 'combined' };
  }

  // Group B — try normalizations
  for (const variant of normalizations(sku)) {
    if (keySkus.has(variant)) {
      return { group: 'B', reason: 'normalized_match_key', matchedVariant: variant, matchedSet: 'keySkus' };
    }
    if (productSkus.has(variant)) {
      return { group: 'B', reason: 'normalized_match_productSku', matchedVariant: variant, matchedSet: 'productSkus' };
    }
  }

  // Group C — genuinely not found
  return { group: 'C', reason: 'not_found_after_normalization', matchedVariant: null, matchedSet: null };
}

// ─── CSV helper ──────────────────────────────────────────────────────────────
function toCSV(rows, fields) {
  const esc  = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [fields.join(','), ...rows.map(r => fields.map(f => esc(r[f])).join(','))].join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load report
  const reportPath = join(REPORT_DIR, `report-${TODAY}.json`);
  if (!existsSync(reportPath)) {
    console.error(`❌ Report not found: ${reportPath}`);
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf-8'));
  const outOfStock = report.OUT_OF_STOCK;
  console.log(`\n📂 Loaded ${outOfStock.length} OUT_OF_STOCK products from ${reportPath}`);

  // Quick look at supplier distribution
  const bySupplier = {};
  for (const p of outOfStock) {
    bySupplier[p.supplier] = (bySupplier[p.supplier] || 0) + 1;
  }
  console.log('\n   Supplier breakdown:');
  for (const [sup, n] of Object.entries(bySupplier)) console.log(`      ${sup}: ${n}`);

  // 2. Re-scan Israel Judaica to get both SKU formats
  const { keySkus, productSkus, allSupplierSkus } = await fetchIJSkuSets();

  // Print sample of each set so we can see the format difference
  console.log('\n   Sample key SKUs from API    :', [...keySkus].slice(0, 6));
  console.log('   Sample product.sku from API :', [...productSkus].slice(0, 6));
  console.log('   Sample OOS SKUs (ours)      :', outOfStock.slice(0, 6).map(p => p.sku));

  // 3. Classify
  console.log('\n📊 Classifying...');
  const groupA = [];   // NO_SKU
  const groupB = [];   // SKU_FORMAT_MISMATCH
  const groupC = [];   // REAL_OUT_OF_STOCK
  const unexpected = []; // edge case: somehow passed as in-stock now

  for (const product of outOfStock) {
    const result = classify(product, keySkus, productSkus, allSupplierSkus);
    const enriched = {
      ...product,
      diagnosis_group:     result.group,
      diagnosis_reason:    result.reason,
      matched_variant:     result.matchedVariant,
      matched_in_set:      result.matchedSet,
    };

    if (result.group === 'A') groupA.push(enriched);
    else if (result.group === 'B') groupB.push(enriched);
    else if (result.group === 'C') groupC.push(enriched);
    else unexpected.push(enriched);
  }

  // 4. Write CSVs
  const CSV_FIELDS = [
    'docId','sku','name','price','cat','supplier','sourceUrl',
    'diagnosis_group','diagnosis_reason','matched_variant','matched_in_set',
  ];
  const pathA = join(REPORT_DIR, `diagnosis-${TODAY}-A-no-sku.csv`);
  const pathB = join(REPORT_DIR, `diagnosis-${TODAY}-B-format-mismatch.csv`);
  const pathC = join(REPORT_DIR, `diagnosis-${TODAY}-C-real-out-of-stock.csv`);

  writeFileSync(pathA, toCSV(groupA, CSV_FIELDS), 'utf-8');
  writeFileSync(pathB, toCSV(groupB, CSV_FIELDS), 'utf-8');
  writeFileSync(pathC, toCSV(groupC, CSV_FIELDS), 'utf-8');

  // 5. Summary
  const pct = n => `${n} (${((n / outOfStock.length) * 100).toFixed(1)}%)`;
  console.log('\n' + '═'.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`סה"כ OUT_OF_STOCK שנותחו     : ${outOfStock.length}`);
  console.log('─'.repeat(60));
  console.log(`🟡 A — NO_SKU (false positive)             : ${pct(groupA.length)}`);
  console.log(`🟠 B — SKU_FORMAT_MISMATCH (false positive): ${pct(groupB.length)}`);
  console.log(`🔴 C — REAL_OUT_OF_STOCK                   : ${pct(groupC.length)}`);
  if (unexpected.length) console.log(`⚪ unexpected (in-stock now)               : ${unexpected.length}`);
  console.log('═'.repeat(60));

  if (groupB.length > 0) {
    console.log('\n🔍 Group B — top normalization patterns:');
    const reasons = {};
    for (const p of groupB) reasons[p.diagnosis_reason] = (reasons[p.diagnosis_reason] || 0) + 1;
    for (const [r, n] of Object.entries(reasons)) console.log(`   ${r}: ${n}`);

    console.log('\n   Sample B mismatches (stored sku → matched as):');
    groupB.slice(0, 8).forEach(p =>
      console.log(`   ${p.sku}  →  "${p.matched_variant}"  (via ${p.matched_in_set})`)
    );
  }

  if (groupC.length > 0) {
    console.log('\n🔴 Group C — sample genuinely missing SKUs:');
    groupC.slice(0, 8).forEach(p =>
      console.log(`   ${p.sku}  |  ${p.name?.slice(0, 50) || '(no name)'}`)
    );
  }

  console.log('\n📁 קבצי אבחון:');
  console.log(`   A (no sku)        : ${pathA}`);
  console.log(`   B (format mismatch): ${pathB}`);
  console.log(`   C (real OOS)      : ${pathC}`);

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
