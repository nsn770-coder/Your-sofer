/**
 * recoverSKUsFromPaldinox.mjs
 *
 * For each of the 308 no-SKU Paldinox products (Group A from the OOS
 * diagnosis), attempts to recover the WooCommerce SKU.
 *
 * Strategy (per product):
 *   1. Name-match against paldinox_products.json
 *      a. Exact match  (normalised name)
 *      b. Fuzzy match  (Dice word-token similarity ≥ 0.80)
 *   2. If name-match found → use that productUrl to confirm; otherwise fall
 *      back to the sourceUrl already in our record (which is already the live
 *      Paldinox product page).
 *   3. Fetch the product page and extract the SKU from:
 *      a. JSON-LD schema  ("sku" field in Product schema)
 *      b. WooCommerce HTML  <span class="sku">
 *      c. URL slug prefix   (e.g. "X5923C" from a URL like /product/X5923C-name/)
 *
 * READ-ONLY — does not touch Firestore.
 *
 * Output:
 *   app/scripts/stock-reports/recover-skus-paldinox-2026-06-03.csv
 *
 * Usage:  node app/scripts/recoverSKUsFromPaldinox.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = join(__dirname, 'stock-reports');
const TODAY      = '2026-06-03';

const A_CSV_PATH  = join(REPORT_DIR, `diagnosis-${TODAY}-A-no-sku.csv`);
const PAL_JSON    = join(__dirname, 'paldinox_products.json');
const OUT_CSV     = join(REPORT_DIR, `recover-skus-paldinox-${TODAY}.csv`);

const UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const DELAY = 700; // ms between page fetches — polite crawl rate
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Parse the simple CSV produced by analyzeOutOfStock ─────────────────────
function parseCSV(text) {
  const lines = text.split('\n').filter(Boolean);
  const header = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj  = {};
    header.forEach((h, i) => { obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"'); });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current  = '';
  let inQuote  = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

// ─── Name normalisation ──────────────────────────────────────────────────────
function normName(s) {
  return (s || '')
    .replace(/["""'']/g, '')
    .replace(/[–—-]/g, ' ')
    .replace(/[^א-תa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ─── Dice coefficient on word tokens ────────────────────────────────────────
function diceWords(a, b) {
  const ta = new Set(a.split(' ').filter(Boolean));
  const tb = new Set(b.split(' ').filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common++;
  return (2 * common) / (ta.size + tb.size);
}

// ─── Build name-lookup index from paldinox_products.json ───────────────────
function buildPaldinoxIndex(palList) {
  return palList.map(p => ({
    name:       p.name || '',
    normName:   normName(p.name || ''),
    productUrl: p.productUrl || '',
    source:     'paldinox_products.json',
  }));
}

// ─── Match our product against the Paldinox catalogue by name ───────────────
function matchByName(ourNorm, palIndex) {
  // 1. Exact
  for (const entry of palIndex) {
    if (entry.normName === ourNorm) {
      return { ...entry, confidence: 'exact', score: 1.0 };
    }
  }
  // 2. Fuzzy ≥ 0.80
  let best = null;
  let bestScore = 0;
  for (const entry of palIndex) {
    const score = diceWords(ourNorm, entry.normName);
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (best && bestScore >= 0.80) {
    return { ...best, confidence: 'fuzzy', score: bestScore };
  }
  return null;
}

// ─── Fetch product page and extract SKU ─────────────────────────────────────
async function fetchSKU(url) {
  let html;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' },
    });
    if (!res.ok) return { sku: null, method: `HTTP_${res.status}` };
    html = await res.text();
  } catch (e) {
    return { sku: null, method: `fetch_error:${e.message.slice(0, 40)}` };
  }

  // 1. JSON-LD Product schema  {"@type":"Product", "sku": "X5923C"}
  const ldMatch = html.match(/"@type"\s*:\s*"Product"[^}]*"sku"\s*:\s*"([^"]+)"/s)
               || html.match(/"sku"\s*:\s*"([^"]+)"[^}]*"@type"\s*:\s*"Product"/s);
  if (ldMatch && ldMatch[1].trim()) {
    return { sku: ldMatch[1].trim(), method: 'json-ld' };
  }

  // 2. WooCommerce <span class="sku">
  const spanMatch = html.match(/<span\s+class="sku"[^>]*>([^<]+)<\/span>/i);
  if (spanMatch && spanMatch[1].trim()) {
    return { sku: spanMatch[1].trim(), method: 'html-sku-span' };
  }

  // 3. WooCommerce product_id / SKU in page data
  const skuData = html.match(/"sku":"([^"]+)"/);
  if (skuData && skuData[1].trim()) {
    return { sku: skuData[1].trim(), method: 'json-sku-field' };
  }

  // 4. Extract leading alphanumeric code from URL slug
  //    e.g. /product/X5923C-product-name/ → "X5923C"
  //    e.g. /product/h38-31-name/         → "h38-31"
  const slug = decodeURIComponent(url.split('/product/')[1] || '').replace(/\/$/, '').split('/')[0];
  // A "SKU-like" prefix: starts with letters+digits, not a Hebrew word
  const slugCode = slug.match(/^([A-Za-z][A-Za-z0-9\-]{1,20})(?:[-א-ת]|$)/);
  if (slugCode && !/^[א-ת]/.test(slugCode[1])) {
    return { sku: slugCode[1], method: 'url-slug' };
  }

  return { sku: null, method: 'not_found' };
}

// ─── CSV writer ──────────────────────────────────────────────────────────────
function toCSV(rows, fields) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [fields.join(','), ...rows.map(r => fields.map(f => esc(r[f])).join(','))].join('\n');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load our 308 products
  if (!existsSync(A_CSV_PATH)) { console.error(`❌ Not found: ${A_CSV_PATH}`); process.exit(1); }
  const products = parseCSV(readFileSync(A_CSV_PATH, 'utf-8'));
  console.log(`\n📂 Loaded ${products.length} Group-A products`);

  // 2. Load Paldinox name catalogue
  let palIndex = [];
  if (existsSync(PAL_JSON)) {
    const palList = JSON.parse(readFileSync(PAL_JSON, 'utf-8'));
    palIndex = buildPaldinoxIndex(palList);
    console.log(`📚 Paldinox catalogue: ${palIndex.length} products`);
  } else {
    console.log('⚠️  paldinox_products.json not found — skipping name-match, using sourceUrl only');
  }

  // 3. Process each product
  const results = [];
  let countExact = 0, countFuzzy = 0, countNotFound = 0;
  let skuFound = 0, skuMissing = 0;

  for (let i = 0; i < products.length; i++) {
    const p       = products[i];
    const ourNorm = normName(p.name);

    // Name match
    const match = palIndex.length ? matchByName(ourNorm, palIndex) : null;

    // Choose URL to fetch:  matched productUrl > sourceUrl
    const fetchUrl = match?.productUrl || p.sourceUrl || null;

    process.stdout.write(`[${String(i + 1).padStart(3)}/${products.length}] `);

    let paldinoxSku  = null;
    let skuMethod    = 'skipped';
    let matchedName  = match?.name  || '';
    let matchConf    = match?.confidence || (fetchUrl ? 'url_only' : 'not_found');
    let matchScore   = match ? match.score.toFixed(2) : '';

    if (fetchUrl) {
      const { sku, method } = await fetchSKU(fetchUrl);
      paldinoxSku = sku;
      skuMethod   = method;
      if (sku) skuFound++; else skuMissing++;
      process.stdout.write(`${matchConf.padEnd(9)} SKU=${sku ?? 'n/a'} (${method}) — ${p.name?.slice(0, 45)}\n`);
      await sleep(DELAY);
    } else {
      skuMissing++;
      process.stdout.write(`no_url — ${p.name?.slice(0, 50)}\n`);
    }

    if (matchConf === 'exact')  countExact++;
    else if (matchConf === 'fuzzy') countFuzzy++;
    else countNotFound++;

    results.push({
      doc_id:           p.docId,
      our_name:         p.name,
      paldinox_name:    matchedName,
      match_confidence: matchConf,
      match_score:      matchScore,
      paldinox_sku:     paldinoxSku ?? '',
      sku_method:       skuMethod,
      source_url:       p.sourceUrl,
      cat:              p.cat,
      price:            p.price,
    });
  }

  // 4. Write CSV
  const fields = [
    'doc_id','our_name','paldinox_name','match_confidence','match_score',
    'paldinox_sku','sku_method','source_url','cat','price',
  ];
  writeFileSync(OUT_CSV, toCSV(results, fields), 'utf-8');

  // 5. Summary
  const withSku = results.filter(r => r.paldinox_sku);
  const byCat   = {};
  const byMethod= {};
  for (const r of withSku) {
    byCat[r.cat]        = (byCat[r.cat]        || 0) + 1;
    byMethod[r.sku_method] = (byMethod[r.sku_method] || 0) + 1;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📋 SUMMARY — Paldinox SKU Recovery');
  console.log('═'.repeat(60));
  console.log(`מוצרים שנותחו               : ${products.length}`);
  console.log('─── Name matching ───────────────────────────────────────');
  console.log(`  Exact match               : ${countExact}`);
  console.log(`  Fuzzy match (≥0.80)       : ${countFuzzy}`);
  console.log(`  No name match (URL only)  : ${products.length - countExact - countFuzzy}`);
  console.log('─── SKU extraction ──────────────────────────────────────');
  console.log(`  ✓ SKU נמצא                : ${skuFound}`);
  console.log(`  ✗ SKU לא נמצא            : ${skuMissing}`);
  if (Object.keys(byMethod).length) {
    console.log('  Methods used:');
    for (const [m, n] of Object.entries(byMethod)) console.log(`     ${m}: ${n}`);
  }
  if (Object.keys(byCat).length) {
    console.log('─── With SKU by category ────────────────────────────────');
    Object.entries(byCat).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log(`  ${c}: ${n}`));
  }
  console.log('═'.repeat(60));
  console.log(`\n📁 קובץ: ${OUT_CSV}`);
  console.log('\n⚠️  תזכורת: לא בוצעו שינויים ב-Firestore.');

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
