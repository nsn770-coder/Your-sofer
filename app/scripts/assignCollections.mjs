/**
 * assignCollections.mjs
 * Assigns one of 6 collections to every active product based on
 * weighted keyword matching across name, description, and filterAttributes.
 *
 * Scoring weights:
 *   name match      = 3 pts per keyword
 *   desc match      = 2 pts per keyword
 *   attribute match = 1 pt  per keyword
 *
 * All 5 keyword collections are scored normally (יהלום, שוהם, ישפה, ספיר, ברקת).
 * After the winner is determined, one post-processing rule applies:
 *   if winner === 'ברקת' AND product color is gold → reassign to 'תרשיש'
 * This splits ברקת into two by gold color. תרשיש only ever receives products
 * that already qualified for ברקת by keywords AND are gold-colored.
 * Default collection when no keyword winner: ישפה
 *
 * Usage:
 *   node app/scripts/assignCollections.mjs --dry-run   (all products, no writes)
 *   node app/scripts/assignCollections.mjs              (full run, writes collection field)
 *   node app/scripts/assignCollections.mjs --reassign  (overwrite existing collection values)
 */

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
const SA = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN  = process.argv.includes('--dry-run');
const REASSIGN = process.argv.includes('--reassign');

// ── Collection definitions ────────────────────────────────────────────────────
const COLLECTIONS = [
  {
    id: 'יהלום',
    label: 'יהלום (שקוף/מודרני)',
    keywords: [
      'אקרילי', 'זכוכית', 'קריסטל', 'שקוף', 'שקופה', 'אקריל',
      'crystal', 'acrylic', 'glass',
    ],
    colors: ['שקוף', 'לבן', 'כסוף בהיר'],
  },
  {
    id: 'שוהם',
    label: 'שוהם (טבעי/כהה)',
    keywords: [
      'עץ', 'אוניקס', 'אבן', 'במבוק', 'עץ כהה', 'טבעי',
      'wood', 'stone', 'oak',
    ],
    colors: ['שחור', 'אפור כהה', 'חום', 'אדמה', 'כהה'],
  },
  {
    id: 'ישפה',
    label: 'ישפה (אמנותי/צבעוני)',
    keywords: [
      'צבעוני', 'הדפס', 'אמנות', 'ציור', 'רב גוני', 'פסיפס',
      'מגוון', 'צבעים', 'אמנותי',
    ],
    colors: ['צבעוני', 'מגוון', 'רב צבעי'],
  },
  {
    id: 'ספיר',
    label: 'ספיר (מתכתי/קריר)',
    keywords: [
      'אלומיניום', 'מתכת', 'כסף', 'מוכסף', 'נירוסטה', 'מט', 'CNC',
      'מתכתי', 'פלדה', 'steel', 'aluminum', 'metal',
    ],
    colors: ['כסוף', 'כחול', 'מט', 'אפור בהיר', 'ניקל'],
  },
  {
    id: 'ברקת',
    label: 'ברקת (חגיגי/יוקרה)',
    keywords: [
      'אמייל', 'יוקרה', 'חגיגי', 'זהב', 'מוזהב', 'ברק', 'פרמיום',
    ],
    colors: ['ירוק', 'זהב', 'אדום', 'כתום', 'צבעוני חגיגי'],
  },
];

const DEFAULT_COLLECTION = 'ישפה';

// Gold values matched against filterAttributes['צבע'] (or product.color) to
// split ברקת winners: ברקת + gold color → תרשיש.
const GOLD_KEYWORDS = ['זהב', 'מוזהב', 'זהוב'];

function isGoldProduct(product) {
  const colorAttr = (product.filterAttributes?.['צבע'] || product.color || '').toLowerCase();
  return GOLD_KEYWORDS.some(v => colorAttr === v.toLowerCase());
}

// ── Word-boundary matcher ─────────────────────────────────────────────────────
// Multi-word keywords (containing spaces) use plain includes — they can't be
// substrings of a single word. Single-word keywords use a regex that requires
// a non-Hebrew/non-Latin character (or string boundary) on both sides, so
// "מט" won't match inside "מטבח" and "עץ" won't match inside "עצים".
const HEBREW_LETTER = 'א-ת';
const WORD_CHAR     = `[${HEBREW_LETTER}a-z0-9]`;

function matchesWord(text, kw) {
  if (kw.includes(' ')) return text.includes(kw);
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<!${WORD_CHAR})${escaped}(?!${WORD_CHAR})`, 'i').test(text);
}

// ── Scoring ───────────────────────────────────────────────────────────────────
// Weights: name = 3, desc = 2, attributes = 1
const W = { name: 3, desc: 2, attr: 1 };

function scoreProduct(product) {
  const name  = (product.name || '').toLowerCase();
  const desc  = (product.desc || product.description || '').toLowerCase();

  // Flatten all filterAttributes values into one string
  const attrs = Object.values(product.filterAttributes ?? {})
    .flat()
    .join(' ')
    .toLowerCase();

  const scores  = {};   // collectionId → total score
  const matched = {};   // collectionId → { name: [...], desc: [...], attr: [...] }

  for (const col of COLLECTIONS) {
    let total = 0;
    const hits = { name: [], desc: [], attr: [] };

    const allKw = [...col.keywords, ...col.colors];

    for (const kw of allKw) {
      const kwLower = kw.toLowerCase();
      if (matchesWord(name,  kwLower)) { total += W.name; hits.name.push(kw); }
      if (matchesWord(desc,  kwLower)) { total += W.desc; hits.desc.push(kw); }
      if (matchesWord(attrs, kwLower)) { total += W.attr; hits.attr.push(kw); }
    }

    scores[col.id]  = total;
    matched[col.id] = hits;
  }

  // Pick highest-scoring collection — must reach minimum threshold
  const MIN_SCORE = 4;
  let bestId    = DEFAULT_COLLECTION;
  let bestScore = 0;
  for (const [id, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestId = id; }
  }
  if (bestScore < MIN_SCORE) { bestId = DEFAULT_COLLECTION; bestScore = 0; }

  return {
    collection:      bestId,
    score:           bestScore,
    matchedKeywords: matched[bestId],
    allScores:       scores,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(DRY_RUN
  ? '🧪 Dry-run mode — ALL active products, no Firestore writes\n'
  : '🚀 Live mode — writing collection field to Firestore\n'
);

console.log('🔍 Fetching active products from Firestore...');
const snap    = await db.collection('products').where('status', '==', 'active').get();
let products  = snap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
console.log(`📦 ${products.length} active products found`);

if (!REASSIGN && !DRY_RUN) {
  const already = products.filter(p => p.collection).length;
  if (already > 0) {
    console.log(`⏩ ${already} already have collection — skipping (use --reassign to overwrite)`);
    products = products.filter(p => !p.collection);
  }
}

if (products.length === 0) {
  console.log('✅ Nothing to process.');
  process.exit(0);
}

const sample = products; // dry-run controls writes, not sample size
console.log(`🎯 Processing ${sample.length} products\n`);

// ── Process ───────────────────────────────────────────────────────────────────
const results = [];

for (const p of sample) {
  const { collection: kwCollection, score, matchedKeywords, allScores } = scoreProduct(p);

  // Post-process: ברקת winners that are gold-colored move to תרשיש.
  // Nothing outside ברקת can ever become תרשיש.
  const finalCollection = (kwCollection === 'ברקת' && isGoldProduct(p))
    ? 'תרשיש'
    : kwCollection;

  results.push({
    id:         p.id,
    name:       p.name || '(ללא שם)',
    cat:        p.cat  || p.category || '',
    collection: finalCollection,
    score,
    matchedKeywords,
    allScores,
    ref:        p.ref,
  });
}

// ── Print dry-run table ───────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════════════════');
console.log('📋 תוצאות סיווג');
console.log('══════════════════════════════════════════════════════════════════════════');

for (const r of results) {
  const isDefault = r.score === 0;
  const indicator = isDefault ? '⚪ (default)' : '✅';
  const allHits = [
    ...r.matchedKeywords.name.map(k => `name:${k}`),
    ...r.matchedKeywords.desc.map(k => `desc:${k}`),
    ...r.matchedKeywords.attr.map(k => `attr:${k}`),
  ];

  console.log(`\n${indicator} ${r.name}`);
  console.log(`   קטגוריה:   ${r.cat}`);
  console.log(`   אוסף:      ${r.collection}  (ניקוד: ${r.score})`);
  if (allHits.length > 0) {
    console.log(`   מילות מפתח: ${allHits.join(', ')}`);
  }
  if (!isDefault) {
    const scoreStr = COLLECTIONS.map(c => `${c.id}=${r.allScores[c.id]}`).join(' | ');
    console.log(`   כל הניקודים: ${scoreStr}`);
  }
}

// ── Collection distribution summary ──────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════════');
console.log('📊 התפלגות לפי אוסף:');
const dist = {};
for (const r of results) dist[r.collection] = (dist[r.collection] || 0) + 1;
// All 6 display IDs — תרשיש is post-assigned from ברקת winners, not scored directly
const DISPLAY_ORDER = ['יהלום', 'ישפה', 'ברקת', 'תרשיש', 'ספיר', 'שוהם'];
for (const id of DISPLAY_ORDER) {
  const count   = dist[id] || 0;
  const pct     = ((count / results.length) * 100).toFixed(1);
  const bar     = '█'.repeat(Math.round(count / results.length * 30));
  console.log(`   ${id.padEnd(6)} ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${bar}`);
}
const defaults = results.filter(r => r.score === 0).length;
console.log(`\n   ⚪ ברירת מחדל (ניקוד 0): ${defaults} מוצרים`);

if (DRY_RUN) {
  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log('🧪 Dry-run complete. Run without --dry-run to write to Firestore.');
  process.exit(0);
}

// ── Firestore write (batched) ─────────────────────────────────────────────────
console.log('\n💾 כותב לFirestore...');
const BATCH_SIZE = 400;
let written = 0, errors = 0;

for (let i = 0; i < results.length; i += BATCH_SIZE) {
  const batch = db.batch();
  for (const r of results.slice(i, i + BATCH_SIZE)) {
    batch.update(r.ref, { collection: r.collection });
  }
  try {
    await batch.commit();
    written += Math.min(BATCH_SIZE, results.length - i);
    process.stdout.write(`\r   ✅ ${written}/${results.length} נכתבו`);
  } catch (e) {
    console.log(`\n   ❌ Batch error: ${e.message}`);
    errors++;
  }
}

console.log(`\n\n══════════════════════════════════════════════════════════════════════════`);
console.log(`✅ עודכנו: ${written} מוצרים`);
if (errors > 0) console.log(`❌ שגיאות batch: ${errors}`);
process.exit(0);
