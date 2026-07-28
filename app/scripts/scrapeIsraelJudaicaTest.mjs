/**
 * scrapeIsraelJudaicaTest.mjs — READ-ONLY feasibility probe
 *
 * Fetches each kippot sub-category from israel-judaica.com (com_art / Joomla),
 * counts products, checks pagination, and extracts sample SKUs.
 * No Firestore writes, no imports.
 *
 * Usage:  node app/scripts/scrapeIsraelJudaicaTest.mjs
 */

import { load } from 'cheerio';

const BASE = 'https://www.israel-judaica.com';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DELAY_MS = 600;

const SUBCATS = [
  { name: 'כיפות מיוחדות',       code: 1147, Itemid: 440 },
  { name: 'סאטן וטריקלין',        code: 1144, Itemid: 441 },
  { name: 'סרוגות',               code: 1143, Itemid: 442 },
  { name: 'סרוגות ד.מ.צ.',       code: 1151, Itemid: 443 },
  { name: 'סרוגות עם רקמה',      code: 1146, Itemid: 445 },
  { name: 'עור',                  code: 1148, Itemid: 446 },
  { name: 'פריק',                 code: 1149, Itemid: 458 },
  { name: 'פריק עבודת יד',       code: 1181, Itemid: 448 },
  { name: 'קטיפה',               code: 1145, Itemid: 449 },
  { name: 'סיכות כיפה',          code: 1150, Itemid: 439 },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      'Referer': BASE,
    },
  });
  return { status: res.status, ok: res.ok, html: res.ok ? await res.text() : '' };
}

function catUrl(code, Itemid) {
  return `${BASE}/index.php?option=com_art&view=category&code=${code}&Itemid=${Itemid}&lang=he`;
}

function parsePage($) {
  // Collect product rows — com_art typically uses <table> or <div> grids
  // Try common selectors
  const productLinks = [];
  const skus = [];

  // Strategy 1: links containing /index.php?option=com_art&view=product
  $('a[href*="view=product"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    productLinks.push(href);

    // Extract SKU from href: &sku=UK12345 or &code=UK12345
    const skuMatch = href.match(/[?&](?:sku|code)=([A-Z0-9]+)/i);
    if (skuMatch) skus.push(skuMatch[1]);
  });

  // Dedupe by href (same product link may appear multiple times: image + text)
  const uniqueLinks = [...new Set(productLinks)];
  const uniqueSkus  = [...new Set(skus)];

  // Last page number from pagination
  let lastPage = 1;
  $('a[href*="limitstart"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/limitstart=(\d+)/);
    if (m) {
      // limitstart is 0-based offset; need items-per-page to compute pages
      // Just track the max limitstart
      const ls = parseInt(m[1], 10);
      if (ls > lastPage) lastPage = ls;
    }
  });
  // Check for explicit page numbers in pagination text
  $('a').each((_, el) => {
    const text = $(el).text().trim();
    const n = parseInt(text, 10);
    if (!isNaN(n) && n > lastPage && n < 200) lastPage = n;
  });

  // Total count shown on page (e.g. "120 מוצרים" or "Displaying 1-24 of 120")
  let totalText = '';
  $('*').each((_, el) => {
    const t = $(el).text();
    if (/\d+.*(?:מוצר|item|result|product)/i.test(t) && t.length < 80) {
      totalText = t.trim().replace(/\s+/g, ' ');
    }
  });

  return { uniqueLinks, uniqueSkus, lastPage, totalText };
}

async function probeSubcat({ name, code, Itemid }) {
  const url = catUrl(code, Itemid);
  console.log(`\n📂 ${name}  (code=${code})`);
  console.log(`   ${url}`);

  const { status, ok, html } = await fetchHtml(url);
  if (!ok) {
    console.log(`   ❌ HTTP ${status}`);
    return { name, code, status, productCount: 0, pages: 0, sampleSkus: [] };
  }

  const $ = load(html);

  // Quick sanity: does it look like a real page?
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  if (bodyText.length < 200) {
    console.log(`   ⚠️  Very short body (${bodyText.length} chars) — possibly JS-only or redirect`);
    console.log(`   Body snippet: ${bodyText.slice(0, 120)}`);
    return { name, code, status, productCount: 0, pages: 0, sampleSkus: [] };
  }

  const { uniqueLinks, uniqueSkus, lastPage, totalText } = parsePage($);

  console.log(`   ✅ HTTP ${status} — body ${bodyText.length} chars`);
  console.log(`   מוצרים בדף: ${uniqueLinks.length} לינקים ייחודיים`);
  console.log(`   דף אחרון שזוהה: ${lastPage}`);
  if (totalText) console.log(`   טקסט ספירה: "${totalText}"`);
  if (uniqueSkus.length) console.log(`   דגום SKUs: ${uniqueSkus.slice(0, 5).join(', ')}`);
  else {
    // Try to find SKU-like patterns in hrefs
    const allHrefs = [];
    $('a[href]').each((_, el) => allHrefs.push($(el).attr('href') || ''));
    const productHrefs = allHrefs.filter(h => h.includes('view=product')).slice(0, 5);
    if (productHrefs.length) {
      console.log(`   דגום URLs מוצר:`);
      productHrefs.forEach(h => console.log(`     ${h}`));
    } else {
      // Show all unique hrefs with "com_art" for investigation
      const artHrefs = allHrefs.filter(h => h.includes('com_art')).slice(0, 5);
      console.log(`   com_art hrefs: ${artHrefs.join(' | ')}`);
    }
  }

  return {
    name, code, status,
    productCount: uniqueLinks.length,
    pages: lastPage,
    sampleSkus: uniqueSkus.slice(0, 3),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('🔍 Israel-Judaica Kippot — היתכנות סריקה\n');
console.log('='.repeat(60));

const results = [];

for (const subcat of SUBCATS) {
  const r = await probeSubcat(subcat);
  results.push(r);
  await sleep(DELAY_MS);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n\n' + '='.repeat(60));
console.log('📊 סיכום תתי-קטגוריות ספק Israel-Judaica\n');
console.log('תת-קטגוריה              | HTTP | מוצרים בדף | דפים | דגום SKU');
console.log('─'.repeat(75));

let totalProducts = 0;
for (const r of results) {
  const name = r.name.padEnd(22);
  const status = String(r.status).padEnd(4);
  const count  = String(r.productCount).padEnd(10);
  const pages  = String(r.pages).padEnd(4);
  const skus   = r.sampleSkus.join(', ') || '—';
  console.log(`${name} | ${status} | ${count} | ${pages} | ${skus}`);
  totalProducts += r.productCount;
}

console.log('─'.repeat(75));
console.log(`סה"כ מוצרים (עמוד 1 בלבד): ${totalProducts}`);
console.log('\n✅ סיום — לא נכתב שום דבר');
