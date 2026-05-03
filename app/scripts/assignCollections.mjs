/**
 * assignCollections.mjs
 * Assigns one of 5 collections to every active product based on
 * weighted keyword matching across name, description, and filterAttributes.
 *
 * Scoring:
 *   name match      = 3 pts per keyword
 *   desc match      = 2 pts per keyword
 *   attribute match = 1 pt  per keyword
 *
 * Default collection when score = 0: ישפה
 *
 * Usage:
 *   node app/scripts/assignCollections.mjs --dry-run   (20 products, no writes)
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
const SA = resolve(__dirname, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── CLI flags ─────────────────────────────────────────────────────────────────
const DRY_RUN  = process.argv.includes('--dry-run');
const REASSIGN = process.argv.includes('--reassign');
const DRY_LIMIT = 20;

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
  ? `🧪 Dry-run mode — first ${DRY_LIMIT} active products, no Firestore writes\n`
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

const sample = DRY_RUN ? products.slice(0, DRY_LIMIT) : products;
console.log(`🎯 Processing ${sample.length} products\n`);

// ── Process ───────────────────────────────────────────────────────────────────
const results = [];

for (const p of sample) {
  const { collection, score, matchedKeywords, allScores } = scoreProduct(p);
  results.push({
    id:         p.id,
    name:       p.name || '(ללא שם)',
    cat:        p.cat  || p.category || '',
    collection,
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
for (const col of COLLECTIONS) {
  const count   = dist[col.id] || 0;
  const pct     = ((count / results.length) * 100).toFixed(1);
  const bar     = '█'.repeat(Math.round(count / results.length * 30));
  console.log(`   ${col.id.padEnd(6)} ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${bar}`);
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
