// generateDescriptions.mjs
// יצירת תיאורי מוצרים עם Claude (Anthropic API)
// batches: 10 במקביל | delay: שנייה בין batches
//
// מצב בדיקה:   node app/scripts/generateDescriptions.mjs --test [--cat=מזוזות] [--limit=N]
// ריצה אמיתית: node app/scripts/generateDescriptions.mjs [--cat=מזוזות] [--limit=N] [--force]

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── טעינת .env.local ──────────────────────────────────────────────────────────
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

// ── Firebase ──────────────────────────────────────────────────────────────────
const SA = resolve(__dirname, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── CLI ───────────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const TEST  = args.includes('--test');
const FORCE = args.includes('--force');
const LIMIT = (() => { const a = args.find(a => a.startsWith('--limit=')); return a ? +a.split('=')[1] : Infinity; })();
const CAT   = (() => { const a = args.find(a => a.startsWith('--cat='));   return a ? a.split('=')[1] : null; })();

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) { console.error('❌ ANTHROPIC_API_KEY חסר ב-.env.local'); process.exit(1); }

console.log(TEST
  ? `🧪 מצב בדיקה — Claude פועל, ללא כתיבה ל-Firestore${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
  : `🚀 מצב ריצה${FORCE ? ' | --force' : ''}${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
);

const BATCH_SIZE = 10;
const MODEL = 'claude-sonnet-4-6';

const STAM_CATS = new Set(['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'מזוזות']);

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude ${res.status}: ${err?.error?.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? null;
}

// ── בניית פרומפט לפי קטגוריה ─────────────────────────────────────────────────
function buildPrompt(name, cat) {
  const isStam = STAM_CATS.has(cat);
  const context = isStam
    ? 'המוצר הוא פריט סת"ם (קלף/מזוזה/תפילין). התמקד בכשרות, באיכות הסופר, בבדיקה המדוקדקת ובשקיפות של Your Sofer.'
    : 'המוצר הוא יודאיקה. התמקד בעיצוב, איכות החומרים, התאמה כמתנה וחיבור לשורשים יהודיים.';

  return `כתוב תיאור מוצר בעברית ל: ${name} בקטגוריה ${cat}.
${context}
אורך: 2-3 משפטים. טון: חמים ומקצועי. לא להוסיף כותרת, רק את הטקסט עצמו.`;
}

// ── זיהוי מוצרים ללא תיאור ───────────────────────────────────────────────────
const needsDesc = d => {
  const desc = d.data().desc;
  return !desc || typeof desc !== 'string' || desc.trim().length < 20;
};

// ── שליפה ─────────────────────────────────────────────────────────────────────
let query = db.collection('products');
if (CAT) query = query.where('cat', '==', CAT);

const snap = await query.get();
const skippedAlready = snap.docs.filter(d => !needsDesc(d)).length;
let candidates = snap.docs.filter(d => FORCE || needsDesc(d));
if (LIMIT < Infinity) candidates = candidates.slice(0, LIMIT);
else if (TEST) candidates = candidates.slice(0, Math.min(10, candidates.length));

console.log(`📦 סה"כ מוצרים: ${snap.docs.length}`);
console.log(`⏭  כבר יש תיאור: ${skippedAlready}`);
console.log(`🔍 ידרשו עדכון: ${candidates.length}\n`);

if (candidates.length === 0) { console.log('אין מה לעדכן.'); process.exit(0); }

// ── counters ──────────────────────────────────────────────────────────────────
let updated = 0, errors = 0;
const examples = [];

// ── עיבוד ב-batches ───────────────────────────────────────────────────────────
const batches = [];
for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
  batches.push(candidates.slice(i, i + BATCH_SIZE));
}

for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi];
  console.log(`\n⚙️  Batch ${bi + 1}/${batches.length} (${batch.length} מוצרים)...`);

  await Promise.all(batch.map(async (d, localIdx) => {
    const globalIdx = bi * BATCH_SIZE + localIdx + 1;
    const data = d.data();
    const name = data.name || '(ללא שם)';
    const cat  = data.cat  || '';

    let text = null;
    try {
      text = await callClaude(buildPrompt(name, cat));
    } catch (e) {
      console.log(`  ❌ [${globalIdx}/${candidates.length}] ${name} — ${e.message}`);
      errors++;
      return;
    }

    if (!text || text.trim().length < 20) {
      console.log(`  ⚠️  [${globalIdx}/${candidates.length}] ${name} — תגובה ריקה`);
      errors++;
      return;
    }

    const desc = text.trim();
    console.log(`  ✅ [${globalIdx}/${candidates.length}] ${name}`);

    if (examples.length < 3) examples.push({ name, desc });

    if (!TEST) {
      try {
        await d.ref.update({ desc });
        updated++;
      } catch (e) {
        console.log(`     ❌ שגיאת כתיבה: ${e.message}`);
        errors++;
      }
    } else {
      updated++;
    }
  }));

  if (bi < batches.length - 1) {
    await new Promise(r => setTimeout(r, 1000));
  }
}

// ── סיכום ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════`);
console.log(`📊 סיכום:`);
console.log(`   ✅ עודכנו:            ${updated}${TEST ? ' (בדיקה בלבד)' : ''}`);
console.log(`   ⏭  דולגו (יש תיאור): ${skippedAlready}`);
console.log(`   ❌ שגיאות:            ${errors}`);

if (examples.length > 0) {
  console.log('\n══ דוגמאות תיאורים שנוצרו ══════════════════');
  for (const ex of examples) {
    console.log(`\n📦 ${ex.name}`);
    console.log(ex.desc);
    console.log('──────────────────────────────────────────');
  }
}

if (TEST) console.log('\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
process.exit(0);
