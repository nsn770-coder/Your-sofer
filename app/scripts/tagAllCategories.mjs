// tagAllCategories.mjs
// Tags ALL products across the site with styleTags using Claude API.
// Skips products that already have a styleTag set.
//
// Usage:
//   node app/scripts/tagAllCategories.mjs --test   (calls Claude, no Firestore writes)
//   node app/scripts/tagAllCategories.mjs           (live writes)

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

// ── Anthropic config ──────────────────────────────────────────────────────────
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY missing from .env.local');
  process.exit(1);
}

const TEST        = process.argv.includes('--test');
const CONCURRENCY = 2;          // 50 RPM limit → 2 concurrent keeps us ~30 RPM
const MIN_GAP_MS  = 1400;       // minimum ms between Claude calls per slot

console.log(TEST
  ? '🧪 Test mode — Claude will be called, but no writes to Firestore\n'
  : '🚀 Live mode — writing styleTag to Firestore\n'
);

// ── Style definitions per category group ──────────────────────────────────────
const STYLE_DEFS = {
  'מזוזות': {
    validTags: ['Modern', 'Heritage', 'Wood', 'Crystal'],
    definitions: {
      Modern:   'פולירסין, פלסטיק, אקרילי, קריסטל, art deco, geometric',
      Heritage: 'כסף, פיוטר, ברונזה, עץ זית, חריטה, מסורתי',
      Wood:     'עץ, במבוק, טבעי',
      Crystal:  'זכוכית, קריסטל שקוף',
    },
  },
  'כיפות': {
    validTags: ['Knitted', 'Velvet', 'Leather', 'Modern'],
    definitions: {
      Knitted: 'סרוגה, צמר, טריקו',
      Velvet:  'קטיפה, פאה',
      Leather: 'עור, זמש',
      Modern:  'סוויד, כותנה, מודרני',
    },
  },
  'כלי שולחן והגשה': {
    validTags: ['Modern', 'Classic', 'Crystal', 'Wood'],
    definitions: {
      Modern:  'זכוכית, אקרילי, פולירסין, שיש, geometric',
      Classic: 'כסף, ניקל, מוזהב, חריטה',
      Crystal: 'קריסטל, שקוף',
      Wood:    'עץ, במבוק',
    },
  },
  'עיצוב הבית': {
    validTags: ['Modern', 'Classic', 'Natural'],
    definitions: {
      Modern:  'מתכת, ברזל, industrial',
      Classic: 'כסף, זהב, מסורתי',
      Natural: 'עץ, קרמיקה, אבן',
    },
  },
  'יודאיקה': {
    validTags: ['Modern', 'Heritage', 'Steel'],
    definitions: {
      Modern:   'אקרילי, פולירסין, צבעוני',
      Heritage: 'כסף, ניקל, חריטה מסורתית',
      Steel:    'נירוסטה, מתכת מינימליסטי',
    },
  },
};

// ── Firestore cat → style group ───────────────────────────────────────────────
const CAT_TO_GROUP = {
  // Specific categories
  'מזוזות':             'מזוזות',
  'כיפות':              'כיפות',
  'כלי שולחן והגשה':   'כלי שולחן והגשה',
  'הגשה ואירוח':        'כלי שולחן והגשה',
  'עיצוב הבית':         'עיצוב הבית',
  // Judaica catch-all
  'יודאיקה':            'יודאיקה',
  'יודאיקה כללי':       'יודאיקה',
  'נטילת ידיים':        'יודאיקה',
  'שבת':               'יודאיקה',
  'חגים':              'יודאיקה',
  'חנוכה':             'יודאיקה',
  'פסח':               'יודאיקה',
  'סטים ומארזים':      'יודאיקה',
  'מתנות':             'יודאיקה',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function resolveGroup(data) {
  if (data.cat       && CAT_TO_GROUP[data.cat])         return CAT_TO_GROUP[data.cat];
  if (data.subCategory && CAT_TO_GROUP[data.subCategory]) return CAT_TO_GROUP[data.subCategory];
  return null;
}

// ── Claude API call ───────────────────────────────────────────────────────────
async function callClaude(data, group) {
  // Enforce minimum gap so we stay well under the 50 RPM org limit
  await sleep(MIN_GAP_MS);
  const { name, desc, description, color, material, filterAttributes } = data;
  const styleDef = STYLE_DEFS[group];

  const descText     = desc || description || '';
  const colorText    = color || filterAttributes?.['צבע']  || 'unknown';
  const materialText = material || filterAttributes?.['חומר'] || 'unknown';

  const tagLines = styleDef.validTags
    .map(t => `- ${t}: ${styleDef.definitions[t]}`)
    .join('\n');

  const prompt =
`Classify this Judaica product (category: ${group}) into one or more style tags.

Style tags for this category:
${tagLines}

Product name: ${name}
Description: ${descText || 'N/A'}
Color: ${colorText}
Material: ${materialText}

Return ONLY a JSON array of matching tags from: ${JSON.stringify(styleDef.validTags)}
Example: ["Modern"] or ["Modern", "Heritage"]`;

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
      // API often returns retry-after: 1, which is misleading — use real backoff
      const headerSecs = parseInt(res.headers.get('retry-after') || '0', 10);
      const retryAfter = Math.max(headerSecs, attempt * 20);
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

  const json = await res.json();
  const text = json.content?.[0]?.text?.trim() ?? '';

  const match = text.match(/\[.*?\]/s);
  if (!match) throw new Error(`Unexpected response: ${text}`);

  const parsed = JSON.parse(match[0].replace(/'/g, '"'));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`Empty array: ${text}`);

  const valid = parsed.filter(t => styleDef.validTags.includes(t));
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

// ── Fetch all products ────────────────────────────────────────────────────────
console.log('🔍 Fetching all products from Firestore...');
const snap    = await db.collection('products').get();
const allDocs = snap.docs;
console.log(`📦 Total products in DB: ${allDocs.length}`);

const alreadyTagged = allDocs.filter(d => {
  const st = d.data().styleTag;
  return Array.isArray(st) && st.length > 0;
});

const candidates = allDocs.filter(d => {
  const data = d.data();
  const st   = data.styleTag;
  if (Array.isArray(st) && st.length > 0) return false; // already tagged
  return resolveGroup(data) !== null;                    // has matching category
});

const skippedAlreadyTagged = alreadyTagged.length;
const skippedNoCategory    = allDocs.length - candidates.length - skippedAlreadyTagged;

console.log(`✅ Already tagged (skipped): ${skippedAlreadyTagged}`);
console.log(`⚠️  No matching category (skipped): ${skippedNoCategory}`);
console.log(`🎯 To process: ${candidates.length}\n`);

if (candidates.length === 0) {
  console.log('Nothing to process.');
  process.exit(0);
}

// Breakdown by category group
const byGroup = {};
for (const doc of candidates) {
  const g = resolveGroup(doc.data());
  byGroup[g] = (byGroup[g] || 0) + 1;
}
console.log('📊 Breakdown by category group:');
for (const [g, count] of Object.entries(byGroup)) {
  console.log(`   ${g}: ${count} products`);
}
console.log('');

// ── Process ───────────────────────────────────────────────────────────────────
let saved = 0, failed = 0, processed = 0;
const results = [];

await withConcurrency(candidates, CONCURRENCY, async (docSnap) => {
  const data  = docSnap.data();
  const { name, cat } = data;
  const group = resolveGroup(data);

  let tags;
  try {
    tags = await callClaude(data, group);
  } catch (e) {
    processed++;
    console.log(`❌ [${processed}/${candidates.length}] [${cat}] ${name}\n   ${e.message}`);
    results.push({ id: docSnap.id, name, cat, styleTag: 'ERROR', error: e.message });
    failed++;
    return;
  }

  processed++;
  console.log(`✅ [${processed}/${candidates.length}] [${cat}] ${name} → ${JSON.stringify(tags)}`);
  results.push({ id: docSnap.id, name, cat, styleTag: tags });

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

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('📊 Final Summary:\n');
console.log('Category           | Name                                    | StyleTag');
console.log('────────────────── | ─────────────────────────────────────── | ──────────────────────────');
for (const r of results) {
  const cat  = (r.cat || '').slice(0, 18).padEnd(18);
  const nm   = (r.name || '').slice(0, 39).padEnd(39);
  const tags = r.error ? `ERROR: ${r.error.slice(0, 30)}` : JSON.stringify(r.styleTag);
  console.log(`${cat} | ${nm} | ${tags}`);
}
console.log('──────────────────────────────────────────────────────────────────────');
console.log(`✅ Saved:    ${saved}${TEST ? ' (test mode — no writes)' : ''}`);
console.log(`❌ Failed:   ${failed}`);
console.log(`⏭️  Skipped (already tagged):     ${skippedAlreadyTagged}`);
console.log(`⏭️  Skipped (no category match):  ${skippedNoCategory}`);

if (TEST) console.log('\n🧪 Test run complete. Remove --test to write to Firestore.');
process.exit(0);
