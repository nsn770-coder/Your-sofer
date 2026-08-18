/**
 * תרגום שמות ותיאורי מוצרים ל-5 שפות, ישירות ב-Firestore.
 *
 * הרצה:
 *   node scripts/translateProducts.mjs --limit 10 --dry     # תצוגה מקדימה, לא כותב
 *   node scripts/translateProducts.mjs --limit 50           # 50 מוצרים אמיתיים
 *   node scripts/translateProducts.mjs                      # הכול
 *   node scripts/translateProducts.mjs --force              # גם מוצרים שכבר תורגמו
 *
 * ⚠️ הסקריפט לא נוגע בשדות המקוריים (name / desc / description). הוא כותב
 *    אך ורק את translations.<locale>. מקור האמת נשאר עברית.
 *
 * ניתן להרצה חוזרת: מוצר שכבר יש לו translations.en.name מדולג, כך שאפשר
 * לעצור באמצע (Ctrl+C) ולהמשיך מאוחר יותר בלי לשלם פעמיים.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── קונפיגורציה ──────────────────────────────────────────────────────────────
const LOCALES = ['en', 'fr', 'es', 'ru'];
const LOCALE_NAMES = { en: 'English', fr: 'French', es: 'Spanish', ru: 'Russian' };
const BATCH_SIZE = 12;          // מוצרים לכל קריאת API
const MAX_RETRIES = 3;
const PAUSE_MS = 500;           // המתנה בין באצ'ים — עדין על מכסת ה-API
/**
 * רשימת מודלים לפי סדר עדיפות. גוגל מוציאה דגמים משימוש בלי התראה
 * (gemini-2.0-flash הוצא ב-08/2026 והפיל את הריצה הראשונה), ולכן הסקריפט
 * מנסה את הבא בתור על 404 במקום ליפול. המודל שנבחר מודפס בתחילת הריצה.
 */
const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];
let activeModel = null;

// ── ארגומנטים ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : Infinity;

// ── סביבה ────────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local');
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}
const env = loadEnv();
const GEMINI_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.error('✖ חסר GEMINI_API_KEY ב-.env.local');
  process.exit(1);
}

// ── Firebase Admin ───────────────────────────────────────────────────────────
const keyFile = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
initializeApp({ credential: cert(JSON.parse(readFileSync(keyFile, 'utf8'))) });
const db = getFirestore();

// ── ההנחיה למודל ─────────────────────────────────────────────────────────────
// שני הכללים הראשונים הם הקריטיים: בלעדיהם המודל "מתרגם" מונחי סת"ם
// למילים כלליות ומאבד את המשמעות ההלכתית, או ממציא טענות כשרות שלא נכתבו.
const SYSTEM_RULES = `You translate Judaica / STaM (Torah scribal) product listings from Hebrew.

CRITICAL RULES:
1. TRANSLITERATE, never translate, Hebrew religious and scribal terms. Use EXACTLY these forms
   every time — consistency across the catalogue matters more than elegance:
   מהודר → Mehudar · מהדרין → Mehadrin · הידור → Hidur · כשר לכתחילה → Kosher Lechatchila ·
   סת"ם → STaM · מזוזה → Mezuzah · תפילין → Tefillin · קלף → Klaf · טלית → Tallit ·
   כיפה → Kippah · ברכון → Bencher · סופר סת"ם → Sofer STaM · מגיה → Magiha ·
   נטלה → Netilat Yadayim cup · עטרה → Atarah · הבדלה → Havdalah · קידוש → Kiddush
   ⚠️ THE FORMS ABOVE ARE THE ENGLISH SPELLINGS. For Russian you MUST re-transliterate every
   one of them into Cyrillic — never paste a Latin word into a Russian sentence.
   Мехудар · Мехадрин · СТаМ · мезуза · тфилин · клаф · талит · кипа · нетилат ядаим ·
   атара · Авдала · Кидуш · Ашкеназ · Сфарад · Хабад · Тейман · Эдот а-Мизрах ·
   Биркат а-Мазон
   WRONG: "Мехудар акриловый Netilat Yadayim cup"
   RIGHT: "Мехудар акриловая чаша для нетилат ядаим"
   The same applies to brand and model names: transliterate them into Cyrillic too.

1a. NUSACH NAMES ARE NOT INTERCHANGEABLE. Each is a distinct liturgical rite; substituting one
   for another sends the customer the wrong product. Use exactly:
   אשכנז → Ashkenaz · ספרד → Sepharad · ספרדי → Sephardi · חב"ד → Chabad ·
   תימני → Teimani · עדות המזרח → Edot HaMizrach
   NEVER render עדות המזרח as "Sephardic" — they are different rites.

2. NEVER add, strengthen or invent kashrut/quality claims. Translate only what the Hebrew says.
   If the Hebrew does not claim certification, the translation must not either.

2a. NEVER invent a specific verse, blessing or word that is not in the Hebrew source.
   If the Hebrew says only "ברכה" (a blessing), write "blessing" — do NOT substitute a concrete
   verse such as "יברכך". Do not complete or guess truncated Hebrew text; translate what is there.
   Do not add an occasion the Hebrew never mentions: "פמוטי קריסטל" is crystal candlesticks,
   NOT "candlesticks for Yom Kippur / Shabbat". Add nothing the source does not state.
3. NEVER map a Hebrew word onto a similar-sounding Latin brand name. If a Hebrew word looks
   like a foreign brand but you are not certain it IS that brand, transliterate it literally.
   Example: "קרטיסייה" is NOT "Cartier" — write "Kartisiya".
   Inventing a trademark that is not in the Hebrew is a serious error.
4. Hebrew text printed ON the product and wrapped in quotes (verses, blessings, words like
   "ויברכך" / "ברכת הבית" / "ש") must be KEPT IN HEBREW inside the quotes, exactly as written.
   It is a physical design element on the item, not prose to translate — and ad-hoc
   transliteration of liturgical Hebrew produces garbled, wrong results.
   Correct: gold "ויברכך" print   ·   Wrong: gold "V'varvhecha" print
5. Keep numbers, sizes, SKUs, real Latin brand names and measurements exactly as-is (12 ס"מ → 12 cm).
6. Product names: concise and natural for an online store, not literal word-for-word.
7. Descriptions: keep the same meaning and roughly the same length. Plain text, no markdown.
8. If a field is empty in Hebrew, return an empty string for it.`;

function buildPrompt(items) {
  const list = items.map((p, i) => (
    `### ${i}\nNAME: ${p.name || ''}\nDESC: ${(p.desc || '').slice(0, 1200)}`
  )).join('\n\n');

  return `${SYSTEM_RULES}

Translate the ${items.length} products below into: ${LOCALES.map(l => LOCALE_NAMES[l]).join(', ')}.

Return ONLY a JSON array, one object per product, in the same order, shaped exactly:
[{"i":0,"en":{"name":"","description":""},"fr":{...},"es":{...},"ar":{...},"ru":{...}}]

PRODUCTS:
${list}`;
}

async function callModel(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    const err = new Error(`Gemini ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

async function callGemini(prompt) {
  // אחרי שנמצא מודל עובד — משתמשים רק בו
  if (activeModel) return callModel(activeModel, prompt);

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const out = await callModel(model, prompt);
      activeModel = model;
      console.log(`\n   🤖 מודל: ${model}`);
      return out;
    } catch (e) {
      lastErr = e;
      // 404 / 400 = המודל לא קיים או לא נתמך → מנסים את הבא
      if (e.status === 404 || e.status === 400) {
        console.warn(`   ↪ ${model} לא זמין, מנסה את הבא`);
        continue;
      }
      throw e; // שגיאה אמיתית (מכסה, רשת) — לא מסתירים אותה מאחורי fallback
    }
  }
  throw lastErr ?? new Error('no usable Gemini model');
}

async function translateBatch(items) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const out = await callGemini(buildPrompt(items));
      if (!Array.isArray(out)) throw new Error('response is not an array');
      return out;
    } catch (e) {
      console.warn(`   ⚠ ניסיון ${attempt}/${MAX_RETRIES} נכשל: ${e.message}`);
      if (attempt === MAX_RETRIES) return null;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── ריצה ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📖 קורא מוצרים מ-Firestore...`);
  const snap = await db.collection('products').get();

  const todo = [];
  let skipped = 0;
  snap.forEach(doc => {
    const d = doc.data();
    if (d.status === 'inactive' || d.hidden === true) return;
    const name = (d.name || '').trim();
    if (!name) return;
    if (!FORCE && d.translations?.en?.name) { skipped++; return; }
    todo.push({ id: doc.id, name, desc: (d.desc || d.description || '').trim() });
  });

  const work = todo.slice(0, LIMIT);
  console.log(`   סה"כ מוצרים: ${snap.size}`);
  console.log(`   כבר מתורגמים (מדולגים): ${skipped}`);
  console.log(`   לתרגום בריצה הזו: ${work.length}${LIMIT !== Infinity ? ` (מוגבל ל-${LIMIT})` : ''}`);
  if (DRY) console.log(`   🔍 מצב DRY — לא ייכתב דבר ל-Firestore`);
  if (!work.length) { console.log('\n✓ אין מה לתרגם.\n'); return; }

  let done = 0, failed = 0;
  const started = Date.now();

  for (let i = 0; i < work.length; i += BATCH_SIZE) {
    const batch = work.slice(i, i + BATCH_SIZE);
    const n = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(work.length / BATCH_SIZE);
    process.stdout.write(`\n[${n}/${total}] מתרגם ${batch.length} מוצרים... `);

    const result = await translateBatch(batch);
    if (!result) { failed += batch.length; console.log('✖ הבאץ׳ נכשל'); continue; }

    const writer = db.batch();
    let wrote = 0;
    for (const row of result) {
      const item = batch[row.i];
      if (!item) continue;
      const translations = {};
      for (const loc of LOCALES) {
        const v = row[loc];
        if (v && typeof v.name === 'string' && v.name.trim()) {
          translations[loc] = { name: v.name.trim(), description: (v.description || '').trim() };
        }
      }
      if (!Object.keys(translations).length) continue;

      if (DRY) {
        console.log(`\n   ${item.name}\n     EN: ${translations.en?.name ?? '—'}\n     FR: ${translations.fr?.name ?? '—'}\n     ES: ${translations.es?.name ?? '—'}\n     RU: ${translations.ru?.name ?? '—'}`);
      } else {
        // merge — לא דורס שדות אחרים על המסמך
        writer.set(db.collection('products').doc(item.id), { translations }, { merge: true });
      }
      wrote++;
    }

    if (!DRY && wrote) await writer.commit();
    done += wrote;
    failed += batch.length - wrote;
    if (!DRY) process.stdout.write(`✓ ${wrote}`);

    const elapsed = (Date.now() - started) / 1000;
    const rate = done / Math.max(elapsed, 1);
    const left = work.length - (i + batch.length);
    if (left > 0 && rate > 0) {
      process.stdout.write(`  ·  נותרו ~${Math.round(left / rate / 60)} דק׳`);
    }
    await sleep(PAUSE_MS);
  }

  console.log(`\n\n${'─'.repeat(50)}`);
  console.log(`✓ תורגמו: ${done}`);
  if (failed) console.log(`✖ נכשלו:  ${failed} (ניתן להריץ שוב — מדלג על מה שכבר תורגם)`);
  console.log(`⏱  זמן: ${Math.round((Date.now() - started) / 1000)} שניות`);
  console.log(`${'─'.repeat(50)}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error('\n✖', e); process.exit(1); });
