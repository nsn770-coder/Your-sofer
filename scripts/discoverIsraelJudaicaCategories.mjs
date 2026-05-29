/**
 * discoverIsraelJudaicaCategories.mjs
 * Discovers all category codes + Hebrew names from israel-judaica.com.
 *
 * Strategy (tries in order):
 *   1. API endpoint guesses (task=category.getAll / getCategories)
 *   2. Parse HTML navigation of the main category page for
 *      links matching view=category&code=<N>
 *
 * Saves to scripts/israel-judaica-categories.json
 * Run: node scripts/discoverIsraelJudaicaCategories.mjs
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL  = 'https://www.israel-judaica.com';
const LANG      = 'he';
const OUTPUT    = join(__dirname, 'israel-judaica-categories.json');

const HEADERS = {
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
};

// ── Attempt 1: guessed API endpoints ─────────────────────────────────────────
async function tryApiEndpoint(task) {
  try {
    const url = `${BASE_URL}/index.php?option=com_art&task=${task}&lang=${LANG}`;
    console.log(`  Trying API: ${task} …`);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const text = await res.text();
    // Must be JSON
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) return null;
    const json = JSON.parse(text);
    // Expect an array or object with category entries
    const arr = Array.isArray(json) ? json : (json.categories || json.data || json.items || null);
    if (!arr || !arr.length) return null;
    console.log(`  ✅ API hit on task=${task} — ${arr.length} entries`);
    return arr;
  } catch {
    return null;
  }
}

// ── Attempt 2: parse HTML navigation ─────────────────────────────────────────
async function parseHtmlCategories() {
  // Try the main page + known category/shop pages where the nav is likely rendered
  const pagesToTry = [
    `${BASE_URL}/?lang=${LANG}`,
    `${BASE_URL}/index.php?option=com_art&view=category&code=1126&Itemid=423&lang=${LANG}`,
    `${BASE_URL}/index.php?option=com_art&lang=${LANG}`,
  ];

  for (const pageUrl of pagesToTry) {
    console.log(`  Fetching HTML: ${pageUrl}`);
    try {
      const res = await fetch(pageUrl, { headers: HEADERS });
      if (!res.ok) { console.log(`    → HTTP ${res.status}`); continue; }
      const html = await res.text();

      // Find all links: ?option=com_art&view=category&code=<digits>
      // Also handle reversed param order
      const codePattern = /[?&]code=(\d+)[^"'\s]*/g;
      const labelPattern = /view=category[^"']+"[^>]*>([^<]{2,80})</g;

      // Extract via a more targeted regex that captures code + surrounding anchor text
      // Pattern: href="...code=NNN..." >LABEL</a>
      const anchorRe = /href="[^"]*option=com_art[^"]*view=category[^"]*code=(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      const found = new Map();
      let m;
      while ((m = anchorRe.exec(html)) !== null) {
        const code  = m[1];
        const label = m[2].replace(/<[^>]+>/g, '').trim(); // strip inner tags
        if (code && label && label.length > 0 && label.length < 80) {
          found.set(code, label);
        }
      }

      // Also catch reversed param order: view=category&code= vs code=NNN&view=category
      const anchorRe2 = /href="[^"]*option=com_art[^"]*code=(\d+)[^"]*view=category[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = anchorRe2.exec(html)) !== null) {
        const code  = m[1];
        const label = m[2].replace(/<[^>]+>/g, '').trim();
        if (code && label && label.length > 0 && label.length < 80 && !found.has(code)) {
          found.set(code, label);
        }
      }

      if (found.size > 0) {
        console.log(`  ✅ Found ${found.size} categories in HTML from: ${pageUrl}`);
        return [...found.entries()].map(([code, label]) => ({ code, label }));
      }
      console.log(`    → No category links found in this page`);
    } catch (e) {
      console.log(`    → Error: ${e.message}`);
    }
  }
  return [];
}

// ── Attempt 3: known codes from the sample URL + probe neighbours ─────────────
// The sample URL uses code=1126. Paldinox-style sites often have sequential IDs.
// We probe a range around known codes to find valid ones.
async function probeCodeRange(knownCodes, range = 30) {
  console.log(`\n  Probing code range around known values: ${knownCodes.join(', ')} ± ${range}`);
  const toProbe = new Set();
  for (const k of knownCodes) {
    const n = parseInt(k, 10);
    for (let d = -range; d <= range; d++) toProbe.add(n + d);
  }

  const valid = [];
  for (const code of [...toProbe].sort((a, b) => a - b)) {
    try {
      const body = new URLSearchParams({
        category: String(code), filterChoices: '[]',
        limit: '1', offset: '0', sortValue: '', sortDirection: '', note: '', search_term: '',
      });
      const res = await fetch(
        `${BASE_URL}/index.php?option=com_art&task=category.getProducts`,
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...HEADERS }, body: body.toString() }
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (json.status && json.products && Object.keys(json.products).length > 0) {
        valid.push({ code: String(code), label: `קטגוריה ${code}` });
        process.stdout.write(`    ✓ code ${code} has products\n`);
      }
    } catch { /* skip */ }
    await new Promise(r => setTimeout(r, 80));
  }
  return valid;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 Discovering israel-judaica.com categories\n');

  let categories = [];

  // 1. API guesses
  console.log('── Step 1: trying API endpoints ──');
  for (const task of ['category.getAll', 'category.getCategories', 'categories.getAll', 'menu.getCategories']) {
    const result = await tryApiEndpoint(task);
    if (result) {
      categories = result.map(c => ({ code: String(c.code || c.id || c.category_id), label: c.name_he || c.name || c.label || String(c.code) }));
      break;
    }
  }

  // 2. HTML nav parse
  if (categories.length === 0) {
    console.log('\n── Step 2: parsing HTML navigation ──');
    categories = await parseHtmlCategories();
  }

  // 3. Code-range probe (always adds to what we have, using known codes as anchors)
  const knownCodes = ['1126', '1138', '1147', ...categories.map(c => c.code)];
  console.log('\n── Step 3: probing code range ──');
  const probed = await probeCodeRange([...new Set(knownCodes)].slice(0, 5), 40);

  // Merge: probe results fill gaps, but don't overwrite HTML-sourced labels
  const merged = new Map(categories.map(c => [c.code, c]));
  for (const p of probed) {
    if (!merged.has(p.code)) merged.set(p.code, p);
  }
  categories = [...merged.values()].sort((a, b) => parseInt(a.code) - parseInt(b.code));

  if (categories.length === 0) {
    console.log('\n⚠️  No categories discovered automatically. Manual copy needed.');
    console.log('    Open https://www.israel-judaica.com/?lang=he in a browser,');
    console.log('    find category links like ?code=NNNN, and fill in israel-judaica-categories.json manually.');
  } else {
    writeFileSync(OUTPUT, JSON.stringify(categories, null, 2), 'utf8');
    console.log(`\n✅ Saved ${categories.length} categories → ${OUTPUT}\n`);
    console.log('Categories found:');
    categories.forEach(c => console.log(`  code ${c.code}  →  ${c.label}`));
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
