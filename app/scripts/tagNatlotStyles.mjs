// tagNatlotStyles.mjs
// Fetches all נטלה products, classifies each into style tags via Claude API,
// then writes styleTag (array) back to Firestore.
//
// Usage:
//   node app/scripts/tagNatlotStyles.mjs --test   (no writes)
//   node app/scripts/tagNatlotStyles.mjs           (live writes)

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
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

// ── Config ────────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY missing from .env.local');
  process.exit(1);
}

const TEST        = process.argv.includes('--test');
const CONCURRENCY = 2;
const VALID_TAGS  = ['Modern', 'Heritage', 'Steel'];

console.log(TEST
  ? '🧪 Test mode — Claude will be called, but no writes to Firestore\n'
  : '🚀 Live mode — writing styleTag to Firestore\n'
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(name, color, material) {
  const prompt =
`Classify this Judaica washing cup (נטלה) into one or more of these style tags:
- Modern: acrylic, colorful gradients, polyrsin, marble patterns
- Heritage: silver, nickel, engravings, traditional decorations, stones
- Steel: stainless steel (נירוסטה), enamel, minimalist, brushed metal

Product name: ${name}
Color: ${color || 'unknown'}
Material: ${material || 'unknown'}

Return ONLY a JSON array of matching tags from: ['Modern', 'Heritage', 'Steel']
Example: ['Modern'] or ['Steel', 'Heritage']`;

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
        max_tokens: 64,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10) || attempt * 15;
      console.log(`   ⏳ Rate limited — waiting ${retryAfter}s (attempt ${attempt}/4)...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    break;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() ?? '';

  // Parse JSON array from response (normalize single quotes → double quotes)
  const match = text.match(/\[.*?\]/s);
  if (!match) throw new Error(`Unexpected response: ${text}`);
  const parsed = JSON.parse(match[0].replace(/'/g, '"'));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`Empty array: ${text}`);

  // Validate tags
  const valid = parsed.filter(t => VALID_TAGS.includes(t));
  if (valid.length === 0) throw new Error(`No valid tags in: ${JSON.stringify(parsed)}`);
  return valid;
}

// ── Concurrency helper ────────────────────────────────────────────────────────
async function withConcurrency(items, limit, fn) {
  const executing = new Set();
  for (const item of items) {
    const p = fn(item).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

// ── Fetch matching products ───────────────────────────────────────────────────
console.log('🔍 Fetching all products from Firestore...');
const snap = await db.collection('products').get();

const KEYWORDS = ['נטלה', 'נטילת', 'נטלות'];
const candidates = snap.docs.filter(d => {
  const name = (d.data().name || '').trim();
  return KEYWORDS.some(k => name.includes(k));
});

console.log(`📦 Found ${candidates.length} matching products\n`);
if (candidates.length === 0) { console.log('Nothing to process.'); process.exit(0); }

// ── Process ───────────────────────────────────────────────────────────────────
let saved = 0, failed = 0;
const results = [];

await withConcurrency(candidates, CONCURRENCY, async (docSnap) => {
  const { name, color, material } = docSnap.data();
  let tags;
  try {
    tags = await callClaude(name, color, material);
  } catch (e) {
    console.log(`❌ ${name}\n   ${e.message}`);
    results.push({ id: docSnap.id, name, styleTag: 'ERROR', error: e.message });
    failed++;
    return;
  }

  console.log(`✅ ${name} → ${JSON.stringify(tags)}`);
  results.push({ id: docSnap.id, name, styleTag: tags });

  if (!TEST) {
    try {
      await docSnap.ref.update({ styleTag: tags });
      saved++;
    } catch (e) {
      console.log(`   ❌ Write failed: ${e.message}`);
      failed++;
    }
  } else {
    saved++;
  }
});

// ── Summary table ─────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('📊 Summary:\n');
console.log('ID                          | Name                                              | styleTag');
console.log('─────────────────────────── | ─────────────────────────────────────────────── | ─────────────');
for (const r of results) {
  const id   = r.id.padEnd(27);
  const nm   = (r.name || '').slice(0, 47).padEnd(47);
  const tags = r.error ? `ERROR: ${r.error.slice(0, 40)}` : JSON.stringify(r.styleTag);
  console.log(`${id} | ${nm} | ${tags}`);
}
console.log('──────────────────────────────────────────────────────────────────────');
console.log(`✅ Saved: ${saved}${TEST ? ' (test mode — no writes)' : ''}`);
console.log(`❌ Failed: ${failed}`);

if (TEST) console.log('\n🧪 Test run complete. Remove --test to write to Firestore.');
process.exit(0);
