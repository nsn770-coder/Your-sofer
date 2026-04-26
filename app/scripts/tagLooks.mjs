// tagLooks.mjs
// Groups products into "fashion looks" by color + material similarity using Claude.
//
// Two-phase approach per category:
//   Phase 1 — Claude defines N named looks from a product sample (≤300 products)
//   Phase 2 — Claude assigns every product in the category to one of those looks
//             in chunks of CHUNK_SIZE (handles large categories like כלי שולחן והגשה)
//
// Firestore writes:
//   • products.lookTag          ← the Hebrew look name (e.g. "שחור וזהב")
//   • curations/{cat}_look_{slug} ← one doc per look, with productCount
//
// Usage:
//   node app/scripts/tagLooks.mjs --test    (calls Claude, no Firestore writes)
//   node app/scripts/tagLooks.mjs            (live writes)
//   node app/scripts/tagLooks.mjs --cat=מזוזות          (single category)
//   node app/scripts/tagLooks.mjs --retag   (re-assign even already-tagged products)

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp }       from 'firebase-admin/firestore';
import { fileURLToPath }                 from 'url';
import { dirname, resolve }              from 'path';
import { readFileSync, existsSync }      from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
(function loadEnv() {
  const p = resolve(__dirname, '../../.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k) process.env[k] = v;
  }
})();

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA = resolve(__dirname, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── Anthropic config ──────────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY missing from .env.local');
  process.exit(1);
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
const TEST  = process.argv.includes('--test');
const RETAG = process.argv.includes('--retag');
const CAT_ARG = (process.argv.find(a => a.startsWith('--cat=')) ?? '').slice(6) || null;

const SAMPLE_SIZE = 300;   // products sent in Phase 1 to define looks
const CHUNK_SIZE  = 100;   // products per Phase 2 assignment call
const GAP_MS      = 1600;  // min ms between Claude calls (≈37 RPM, well under 50 RPM limit)

console.log(TEST
  ? '🧪 Test mode — Claude will be called, but no writes to Firestore\n'
  : '🚀 Live mode — writing lookTag + curations to Firestore\n'
);

// ── Category targets ──────────────────────────────────────────────────────────
const ALL_CATEGORIES = [
  { name: 'כלי שולחן והגשה', targetLooks: '6-8' },
  { name: 'עיצוב הבית',       targetLooks: '5-6' },
  { name: 'מזוזות',            targetLooks: '4-5' },
  { name: 'יודאיקה',           targetLooks: '3-4' },
  { name: 'כיפות',             targetLooks: '3-4' },
];

const CATEGORIES = CAT_ARG
  ? ALL_CATEGORIES.filter(c => c.name === CAT_ARG)
  : ALL_CATEGORIES;

if (CATEGORIES.length === 0) {
  console.error(`❌ Unknown --cat value: "${CAT_ARG}"`);
  console.error(`   Valid: ${ALL_CATEGORIES.map(c => c.name).join(', ')}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function productToLine(p) {
  const color    = p.color    || p.filterAttributes?.['צבע']  || '';
  const material = p.material || p.filterAttributes?.['חומר'] || '';
  const name     = (p.name || '').replace(/\|/g, ' '); // pipe is our delimiter
  return `${p.id}|${name}|${color}|${material}`;
}

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens) {
  await sleep(GAP_MS);
  let res;
  for (let attempt = 1; attempt <= 4; attempt++) {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (res.status === 429) {
      const headerSecs = parseInt(res.headers.get('retry-after') || '0', 10);
      const wait       = Math.max(headerSecs, attempt * 20);
      console.log(`   ⏳ Rate limited — waiting ${wait}s (attempt ${attempt}/4)...`);
      await sleep(wait * 1000);
      continue;
    }
    break;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message ?? JSON.stringify(err)}`);
  }
  const json = await res.json();
  return json.content?.[0]?.text?.trim() ?? '';
}

function extractJSON(text) {
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const source   = stripped.startsWith('{') ? stripped : text;
  const match    = source.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON object in response:\n${text.slice(0, 400)}`);
  return JSON.parse(match[0]);
}

// ── Phase 1: Define looks ─────────────────────────────────────────────────────
async function defineLooks(catName, targetLooks, products) {
  const sample = products.slice(0, SAMPLE_SIZE);
  const lines  = sample.map(productToLine).join('\n');

  const prompt =
`You are a fashion merchandiser for a premium Judaica store.
Below are up to ${sample.length} products from the "${catName}" category.
Format: id|name|color|material

${lines}

Group these products into exactly ${targetLooks} visually cohesive "fashion looks" based on shared color and material themes.
Each look should have a clear, evocative Hebrew name that describes its color/material identity
(e.g. "שחור וזהב", "לבן ושנהב", "כסף קלאסי", "עץ טבעי", "כחול ים").

Rules:
- Use ONLY color/material themes, not product type
- Every look name must be distinct
- Names should be 2-4 Hebrew words

Return ONLY a JSON object, no explanation:
{
  "looks": [
    { "name": "שחור וזהב", "nameEn": "Black and Gold" },
    { "name": "לבן ושנהב", "nameEn": "White and Ivory" }
  ]
}`;

  const text   = await callClaude(prompt, 512);
  const parsed = extractJSON(text);

  if (!Array.isArray(parsed.looks) || parsed.looks.length === 0)
    throw new Error(`Empty looks array in: ${text}`);

  return parsed.looks; // [{ name: string, nameEn: string }]
}

// ── Phase 2: Assign one chunk of products to looks ────────────────────────────
async function assignChunk(catName, looks, chunk, chunkNum, totalChunks) {
  const lookList = looks.map(l => `"${l.name}"`).join(', ');
  const lines    = chunk.map(productToLine).join('\n');

  const prompt =
`You are a fashion merchandiser for a premium Judaica store.
Assign each product to the single best-matching fashion look.

Available looks: ${lookList}

Products from "${catName}" (format: id|name|color|material):
${lines}

Rules:
- Assign based on color and material similarity to the look name
- Use ONLY the look names listed above, spelled exactly
- Every product must receive exactly one look

Return ONLY a JSON object, no explanation:
{ "assignments": { "PRODUCT_ID": "look name", ... } }`;

  // Hebrew look names tokenise as ~15 tokens each; 150 products × 40 = 6000 tokens min.
  // Always use haiku's hard max (8192) for assignment calls to prevent truncation.
  const maxTokens = 8192;

  const text   = await callClaude(prompt, maxTokens);
  const parsed = extractJSON(text);

  if (!parsed.assignments || typeof parsed.assignments !== 'object')
    throw new Error(`Bad assignments object in: ${text.slice(0, 300)}`);

  // Validate — only accept known look names
  const validNames = new Set(looks.map(l => l.name));
  const clean = {};
  for (const [id, lookName] of Object.entries(parsed.assignments)) {
    if (validNames.has(lookName)) {
      clean[id] = lookName;
    } else {
      // Try case-insensitive match
      const found = [...validNames].find(n => n.toLowerCase() === String(lookName).toLowerCase());
      if (found) clean[id] = found;
      // else drop — will show up in unassigned count
    }
  }
  return clean;
}

// ── Process one category ──────────────────────────────────────────────────────
async function processCategory({ name: catName, targetLooks }) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`📂 ${catName}  (target: ${targetLooks} looks)`);
  console.log('═'.repeat(64));

  // Fetch products
  const snap = await db.collection('products').where('cat', '==', catName).get();
  let products = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));

  if (products.length === 0) {
    console.log('   ⚠️  No products found — skipping');
    return;
  }

  if (!RETAG) {
    const already = products.filter(p => p.lookTag).length;
    if (already > 0) {
      console.log(`   ⏩ ${already} already have lookTag — skipping (use --retag to reassign)`);
      products = products.filter(p => !p.lookTag);
      if (products.length === 0) { console.log('   ✅ All products already tagged'); return; }
    }
  }

  console.log(`   📦 ${products.length} products to process`);

  // ── Phase 1: Define looks ──────────────────────────────────────────────────
  console.log(`\n   🎨 Phase 1 — Defining looks (sample: ${Math.min(products.length, SAMPLE_SIZE)})...`);
  let looks;
  try {
    looks = await defineLooks(catName, targetLooks, products);
    console.log(`   ✅ ${looks.length} looks defined:`);
    looks.forEach((l, i) => console.log(`      ${i + 1}. ${l.name} (${l.nameEn})`));
  } catch (e) {
    console.log(`   ❌ Phase 1 failed: ${e.message}`);
    return;
  }

  // ── Phase 2: Assign all products in chunks ────────────────────────────────
  const chunks = [];
  for (let i = 0; i < products.length; i += CHUNK_SIZE)
    chunks.push(products.slice(i, i + CHUNK_SIZE));

  console.log(`\n   🏷️  Phase 2 — Assigning ${products.length} products (${chunks.length} chunks of ≤${CHUNK_SIZE})...`);

  const allAssignments = {}; // productId → lookName
  let chunkErrors = 0;

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    process.stdout.write(`      Chunk ${ci + 1}/${chunks.length} (${chunk.length} products)... `);
    try {
      const result = await assignChunk(catName, looks, chunk, ci + 1, chunks.length);
      Object.assign(allAssignments, result);
      console.log(`✅ ${Object.keys(result).length}/${chunk.length} assigned`);
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 80)}`);
      chunkErrors++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const lookCounts = {};
  for (const lookName of Object.values(allAssignments))
    lookCounts[lookName] = (lookCounts[lookName] || 0) + 1;

  const totalAssigned   = Object.keys(allAssignments).length;
  const totalUnassigned = products.length - totalAssigned;

  console.log(`\n   📊 Results:`);
  const maxNameLen = Math.max(...looks.map(l => l.name.length));
  for (const l of looks) {
    const count = lookCounts[l.name] || 0;
    const bar   = '█'.repeat(Math.round(count / Math.max(...Object.values(lookCounts), 1) * 20));
    console.log(`      ${l.name.padEnd(maxNameLen + 2)} ${String(count).padStart(4)}  ${bar}`);
  }
  console.log(`\n   ✅ Assigned: ${totalAssigned}  ❌ Unassigned: ${totalUnassigned}  ⚠️  Chunk errors: ${chunkErrors}`);

  if (TEST) {
    console.log('\n   🧪 Test mode — skipping Firestore writes');
    return;
  }

  // ── Write lookTag to products (batched) ───────────────────────────────────
  console.log('\n   💾 Writing lookTag to products...');
  const WRITE_BATCH = 400;
  const entries     = Object.entries(allAssignments);
  const productById = Object.fromEntries(products.map(p => [p.id, p.ref]));
  let written = 0, writeErrors = 0;

  for (let i = 0; i < entries.length; i += WRITE_BATCH) {
    const batch = db.batch();
    for (const [id, lookName] of entries.slice(i, i + WRITE_BATCH)) {
      const ref = productById[id];
      if (ref) batch.update(ref, { lookTag: lookName });
    }
    try {
      await batch.commit();
      written += Math.min(WRITE_BATCH, entries.length - i);
    } catch (e) {
      console.log(`      ❌ Batch write error: ${e.message}`);
      writeErrors++;
    }
  }
  console.log(`   ✅ ${written} products updated  (${writeErrors} batch errors)`);

  // ── Upsert curation docs per look ─────────────────────────────────────────
  console.log('   📝 Upserting curation documents...');
  for (const look of looks) {
    const docId = `${catName}_look_${slugify(look.nameEn)}`;
    const data  = {
      category:       catName,
      activeTag:      'lookTag',
      lookName:       look.name,
      lookNameEn:     look.nameEn,
      bannerTitle:    look.name,
      bannerImageUrl: '',
      productCount:   lookCounts[look.name] || 0,
      updatedAt:      Timestamp.now(),
    };
    try {
      await db.collection('curations').doc(docId).set(data, { merge: true });
      console.log(`      ✅ curations/${docId}  (${data.productCount} products)`);
    } catch (e) {
      console.log(`      ❌ Failed to write curations/${docId}: ${e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`📋 Categories to process: ${CATEGORIES.map(c => c.name).join(', ')}\n`);

for (const cat of CATEGORIES) {
  await processCategory(cat);
}

console.log('\n\n' + '═'.repeat(64));
console.log('✅ All categories processed.');
console.log('═'.repeat(64));
process.exit(0);
