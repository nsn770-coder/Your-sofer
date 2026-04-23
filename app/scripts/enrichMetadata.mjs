// enrichMetadata.mjs
// חילוץ color + material ממוצרים ב-Firestore לפי שם המוצר — ללא API, מהיר
//
// מצב בדיקה:  node app/scripts/enrichMetadata.mjs --test [--cat=מזוזות] [--limit=N]
// ריצה אמיתית: node app/scripts/enrichMetadata.mjs [--cat=מזוזות] [--limit=N] [--force]

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

console.log(TEST
  ? `🧪 מצב בדיקה — ללא כתיבה${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
  : `🚀 מצב ריצה${FORCE ? ' | --force' : ''}${CAT ? ` | cat=${CAT}` : ''}${LIMIT < Infinity ? ` | limit=${LIMIT}` : ''}\n`
);

// ── "קיים" = לא null, לא undefined, לא ריק ─────────────────────────────────
const hasValue = v => v != null && v !== '';

// ── צבעים ─────────────────────────────────────────────────────────────────────
// word-boundary: (?<![א-ת]) מונע התאמה בתוך מילה עברית ארוכה יותר
// זהב — ללא boundary שמאלי כי "מזהב" / "מוזהב" הם תקפים (מצופה זהב)
const COLORS = [
  { value: 'זהב',    test: n => /זהב/.test(n) },
  { value: 'כסף',   test: n => /(?<![א-ת])כסף(?:ות|ת)?(?![א-ת])/.test(n) },
  { value: 'שחור',  test: n => /(?<![א-ת])שחור(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'לבן',   test: n => /(?<![א-ת])לבן(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'אדום',  test: n => /(?<![א-ת])אדום(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'כחול',  test: n => /(?<![א-ת])כחול(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'ירוק',  test: n => /(?<![א-ת])ירוק(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'בז',    test: n => /(?<![א-ת])בז(?![א-ת])/.test(n) },
  { value: 'חום',   test: n => /(?<![א-ת])חום(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'נחושת', test: n => n.includes('נחושת') },
  { value: 'ברונזה',test: n => n.includes('ברונזה') },
  { value: 'שקוף',  test: n => /(?<![א-ת])שקוף(?:ה|ים|ות)?(?![א-ת])/.test(n) },
  { value: 'קרם',   test: n => /(?<![א-ת])קרם(?![א-ת])/.test(n) },
];

// ── חומרים ────────────────────────────────────────────────────────────────────
// includes() — מכסה גם "מ-" prefix: מעץ, ממתכת, מאבן וכו'
const MATERIALS = [
  { value: 'מתכת',      test: n => n.includes('מתכת') },
  { value: 'זכוכית',    test: n => n.includes('זכוכית') },
  { value: 'עץ',        test: n => n.includes('עץ') || n.includes('מעץ') || /עצי\s/.test(n) },
  { value: 'פלסטיק',    test: n => n.includes('פלסטיק') },
  { value: 'קריסטל',    test: n => n.includes('קריסטל') },
  { value: 'קרמיקה',    test: n => n.includes('קרמיקה') },
  { value: 'אלומיניום', test: n => n.includes('אלומיניום') || n.includes('אלומניום') },
  { value: 'נירוסטה',   test: n => n.includes('נירוסטה') },
  { value: 'עור',       test: n => n.includes('עור') || n.includes('מעור') },
  { value: 'בד',        test: n => /(?<![א-ת])בד(?![א-ת])/.test(n) },
  { value: 'קטיפה',     test: n => n.includes('קטיפה') },
  { value: 'פולימר',    test: n => n.includes('פולימר') },
  { value: 'בטון',      test: n => n.includes('בטון') },
  { value: 'אבן',       test: n => n.includes('אבן') || n.includes('מאבן') },
  { value: 'ניקל',      test: n => n.includes('ניקל') },
  { value: 'פליז',      test: n => n.includes('פליז') },
];

// ── שליפה ─────────────────────────────────────────────────────────────────────
let query = db.collection('products');
if (CAT) query = query.where('cat', '==', CAT);

const snap = await query.get();
let docs = snap.docs;
if (TEST) docs = docs.slice(0, 5);
else if (LIMIT < Infinity) docs = docs.slice(0, LIMIT);

console.log(`🔍 בודק ${docs.length} מוצרים...\n`);

// ── עיבוד ─────────────────────────────────────────────────────────────────────
let scanned = 0, updated = 0, skipped = 0, failed = 0;

for (const d of docs) {
  scanned++;
  const data   = d.data();
  const name   = data.name || '';
  const update = {};

  // color
  if (!hasValue(data.color) || FORCE) {
    const match = COLORS.find(c => c.test(name));
    if (match) update.color = match.value;
  }

  // material
  if (!hasValue(data.material) || FORCE) {
    const match = MATERIALS.find(m => m.test(name));
    if (match) update.material = match.value;
  }

  if (Object.keys(update).length === 0) { skipped++; continue; }

  console.log(`📦 ${name}`);
  console.log(`   לפני → color: ${data.color ?? '—'}  | material: ${data.material ?? '—'}`);
  console.log(`   אחרי → color: ${update.color ?? data.color ?? '—'}  | material: ${update.material ?? data.material ?? '—'}`);

  if (!TEST) {
    try {
      await d.ref.update(update);
      updated++;
    } catch (e) {
      console.log(`   ❌ ${e.message}`);
      failed++;
    }
  } else {
    updated++;
  }
}

// ── סיכום ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════`);
console.log(`📊 סיכום:`);
console.log(`   🔍 סרוקים:          ${scanned}`);
console.log(`   ✏️  מעודכנים:        ${updated}${TEST ? ' (בדיקה בלבד)' : ''}`);
console.log(`   ⏭  דולגו (אין שינוי): ${skipped}`);
if (!TEST) console.log(`   ❌ נכשלו:           ${failed}`);

if (TEST) console.log('\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.');
process.exit(0);
