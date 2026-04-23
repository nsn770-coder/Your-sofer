// generateDescs.mjs
// יצירת תיאורי מוצרים עם Gemini 2.5 Flash
// concurrency: 3 בו-זמנית | validation: עברית, ≥2 משפטים, לא null
//
// מצב בדיקה:  node app/scripts/generateDescs.mjs --test [--cat=מזוזות] [--limit=N]
// ריצה אמיתית: node app/scripts/generateDescs.mjs [--cat=מזוזות] [--limit=N] [--force]

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
const SA = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── CLI ───────────────────────────────────────────────────────────────────────
const args  = process.argv.slice(2);
const TEST  = args.includes('--test');
const FORCE = args.includes('--force');
const LIMIT = (() => { const a = args.find(a => a.startsWith('--limit=')); return a ? +a.split('=')[1] : Infinity; })();
const CAT   = (() => { const a = args.find(a => a.startsWith('--cat='));   return a ? a.split('=')[1] : null; })();

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error('❌ GEMINI_API_KEY חסר ב-.env.local'); process.exit(1); }

console.log(TEST
  ? `🧪 מצב בדיקה — Gemini פועל, ללא כתיבה ל-Firestore${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
  : `🚀 מצב ריצה${FORCE ? ' | --force' : ''}${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
);

const CONCURRENCY = 3;
const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

// ── "קיים" = לא null, לא undefined, לא ריק ─────────────────────────────────
const hasValue = v => v != null && v !== '';

// ── Gemini API ────────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini ${res.status}: ${err?.error?.message ?? JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateDesc(text) {
  // null / undefined / לא string
  if (!text || typeof text !== 'string') return { ok: false, reason: 'null/undefined' };
  const trimmed = text.trim();
  // קצר מדי
  if (trimmed.length < 40) return { ok: false, reason: `קצר מדי (${trimmed.length} תווים)` };
  // לפחות 2 משפטים — לפי נקודות, קריאה, שאלה, שורה חדשה
  const sentences = trimmed.split(/[.!?]|\r?\n/).filter(s => s.trim().length > 8);
  if (sentences.length < 2) return { ok: false, reason: `משפט אחד בלבד` };
  // לפחות 15 תווים עבריים (מסנן אנגלית / ג'יבריש)
  const hebrewCount = (trimmed.match(/[א-ת]/g) || []).length;
  if (hebrewCount < 15) return { ok: false, reason: `מעט מדי עברית (${hebrewCount} תווים)` };
  return { ok: true };
}

// ── concurrency (sliding-window) ─────────────────────────────────────────────
async function withConcurrency(items, limit, fn) {
  const executing = new Set();
  for (let i = 0; i < items.length; i++) {
    const p = fn(items[i], i).finally(() => executing.delete(p));
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

// ── שליפה ─────────────────────────────────────────────────────────────────────
let query = db.collection('products');
if (CAT) query = query.where('cat', '==', CAT);

const snap = await query.get();
let candidates = snap.docs.filter(d => FORCE || !hasValue(d.data().desc));
if (TEST) candidates = candidates.slice(0, 5);
else if (LIMIT < Infinity) candidates = candidates.slice(0, LIMIT);

console.log(`🔍 נמצאו ${candidates.length} מוצרים ללא תיאור\n`);
if (candidates.length === 0) { console.log('אין מה לעדכן.'); process.exit(0); }

// ── counters ──────────────────────────────────────────────────────────────────
let apiCalls = 0, saved = 0, validationFailed = 0, apiFailed = 0;
const descExamples = [];

// ── עיבוד מקבילי ─────────────────────────────────────────────────────────────
await withConcurrency(candidates, CONCURRENCY, async (d, idx) => {
  const data     = d.data();
  const name     = data.name     || '';
  const material = data.material || '';
  const color    = data.color    || '';
  const cat      = data.cat      || '';

  const prompt =
`כתוב תיאור מוצר בעברית (3–4 משפטים) למוצר יודאיקה:
שם: ${name}
חומר: ${material || 'לא ידוע'}
צבע: ${color || 'לא ידוע'}
קטגוריה: ${cat}
כללים:
- רק לפי המידע הנתון
- לא להמציא פרטים
- טון מקצועי, חם, מכירתי
- לא לחזור על שם המוצר בתחילה
- ללא כותרות`;

  let raw = null;
  try {
    raw = await callGemini(prompt);
    apiCalls++;
  } catch (e) {
    console.log(`❌ [${idx + 1}/${candidates.length}] ${name}`);
    console.log(`   שגיאת Gemini: ${e.message}`);
    apiFailed++;
    return;
  }

  const valid = validateDesc(raw);
  if (!valid.ok) {
    console.log(`⏭  [${idx + 1}/${candidates.length}] ${name} — validation: ${valid.reason}`);
    validationFailed++;
    return;
  }

  const newDesc = raw.trim();
  console.log(`✅ [${idx + 1}/${candidates.length}] ${name}`);

  if (descExamples.length < 3) {
    descExamples.push({ name, newDesc });
  }

  if (!TEST) {
    try {
      await d.ref.update({ desc: newDesc });
      saved++;
    } catch (e) {
      console.log(`   ❌ שגיאת כתיבה: ${e.message}`);
      apiFailed++;
    }
  } else {
    saved++;
  }
});

// ── סיכום ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════`);
console.log(`📊 סיכום:`);
console.log(`   🌐 קריאות Gemini:    ${apiCalls}`);
console.log(`   ✅ נשמרו:            ${saved}${TEST ? ' (בדיקה בלבד)' : ''}`);
console.log(`   ⏭  validation נכשל: ${validationFailed}`);
console.log(`   ❌ שגיאות API:       ${apiFailed}`);

if (descExamples.length > 0) {
  console.log('\n══ דוגמאות תיאורים שנוצרו ══════════════════');
  for (const ex of descExamples) {
    console.log(`\n📦 ${ex.name}`);
    console.log(`${ex.newDesc}`);
    console.log('──────────────────────────────────────────');
  }
}

if (TEST) console.log('\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
process.exit(0);
