/**
 * updateFilterAttributes.mjs
 *
 * 1. RECATEGORIZES products by name keywords
 * 2. ADDS filterAttributes (חומר, צבע, גודל, נוסח, כשרות) from name
 * 3. DRY RUN first — prints summary + 10 samples, then asks y/n
 * 4. Writes in batches of 400, progress every 500 products
 *
 * Run: node scripts/updateFilterAttributes.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Firebase init: serviceAccountKey.json first, fallback to .env.local ───────

function initFirebase() {
  const keyPath = resolve(ROOT, 'serviceAccountKey.json');
  if (existsSync(keyPath)) {
    console.log('🔑 Using serviceAccountKey.json');
    const sa = JSON.parse(readFileSync(keyPath, 'utf8'));
    initializeApp({ credential: cert(sa) });
    return;
  }

  console.log('🔑 serviceAccountKey.json not found — falling back to .env.local');
  try {
    const raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { throw new Error('.env.local also not found — cannot authenticate'); }

  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
  const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

initFirebase();
const db = getFirestore();

// ── Constants ──────────────────────────────────────────────────────────────────

const KEEP_CATS = new Set([
  'מזוזות', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט',
  'כיסוי תפילין', 'סט טלית תפילין', 'יודאיקה', 'בר מצווה',
  'מתנות', 'מגילות', 'ספרי תורה', 'בר מצוה',
]);

const STAM_CATS = new Set([
  'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'סט טלית תפילין',
  'כיסוי תפילין', 'מגילות', 'ספרי תורה',
]);

// ── Recategorization keyword rules ────────────────────────────────────────────

// Patterns that indicate כלי שולחן והגשה
const HOSTING_KW = [
  'כוס', 'ספל', 'צלחת', 'קערה', 'מגש', 'מזלג', 'כף', 'סכין', 'סכום',
  'קפה', 'תה', 'China', 'פורצלן', 'חרסינה', 'דקנטר', 'Bone China',
  'קנקן', 'בקבוק', 'כוסות', 'ספלים', 'קערות', 'מרק', 'New Bone',
  'אספרסו', 'קפסולה', 'שייקר', 'מאג', 'צלחות', 'סט כוסות', 'סט צלחות',
  'קרש חיתוך', 'חבק', 'מפית', 'מגבת מטבח',
];

// Patterns that indicate עיצוב הבית
const DECOR_KW = [
  'מנורה', 'פמוט', 'אגרטל', 'מראה', 'שעון', 'תמונה', 'עציץ',
  'מדף', 'וילון', 'שטיח', 'כרית', 'שמיכה', 'מסגרת', 'פסל',
  'קישוט', 'דקורציה', 'נר', 'מתלה', 'מעמד לכוסות', 'מעמד לסכ',
  'פח ', 'סל כביסה', 'ארגנייזר', 'קופסת', 'קופסא', 'תיבת',
];

// Regex patterns for עיצוב הבית (height/diameter format like h38, D24)
const DECOR_PATTERN = /\bh\d+\b|\bH\d+\b|\bD\d+\b/;

function recategorize(name, currentCat) {
  if (KEEP_CATS.has(currentCat)) return currentCat;

  const n = name;

  // Explicit decor patterns first
  if (DECOR_KW.some(kw => n.includes(kw)) || DECOR_PATTERN.test(n)) {
    // But if it also strongly matches hosting, let hosting win
    const hostingScore = HOSTING_KW.filter(kw => n.includes(kw)).length;
    if (hostingScore >= 2) return 'כלי שולחן והגשה';
    return 'עיצוב הבית';
  }

  if (HOSTING_KW.some(kw => n.includes(kw))) return 'כלי שולחן והגשה';

  // If current cat was one of the two source cats, use a smart default
  if (currentCat === 'הגשה ואירוח') return 'כלי שולחן והגשה';
  if (currentCat === 'עיצוב הבית')  return 'עיצוב הבית';

  return 'יודאיקה';
}

// ── filterAttributes extraction ────────────────────────────────────────────────

function firstMatch(text, rules) {
  for (const { kw, v } of rules) {
    if (kw.some(k => text.includes(k))) return v;
  }
  return null;
}

const MATERIAL_RULES = [
  { v: 'עור מדומה', kw: ['עור מדומה', 'עור מד', 'דמוי עור', 'PU '] },
  { v: 'עור',       kw: ['עור '] },
  { v: 'בד',        kw: ['בד ', 'קורדרוי', 'ברוקד', 'פשתן', 'קטיפה', 'ישמ', 'משי'] },
  { v: 'מתכת',      kw: ['מתכת', 'נירוסטה', 'אלומיניום', 'פלדה', 'ברזל', 'נחושת', 'פליז'] },
  { v: 'זכוכית',    kw: ['זכוכית', 'קריסטל', 'crystal'] },
  { v: 'עץ',        kw: ['עץ '] },
  { v: 'קרמיקה',    kw: ['קרמיקה', 'חרסינה', 'China', 'פורצלן', 'New Bone'] },
  { v: 'אקריל',     kw: ['אקריל', 'אקרילי', 'PMMA'] },
  { v: 'פלסטיק',    kw: ['פלסטיק', 'PVC', 'ABS'] },
  { v: 'כסף',       kw: ['כסף 925', 'סטרלינג'] },
];

const COLOR_RULES = [
  { v: 'שחור',   kw: ['שחור', 'שחורה'] },
  { v: 'לבן',    kw: ['לבן', 'לבנה', 'לבן '] },
  { v: 'זהב',    kw: ['זהב', 'זהובה', 'מוזהב', 'גולד'] },
  { v: 'כסף',    kw: ['כסוף', 'מוכסף', 'סילבר'] },
  { v: 'חום',    kw: ['חום ', 'חומה', 'חום כ', 'חום ע'] },
  { v: 'אפור',   kw: ['אפור', 'אפורה', 'גרניט'] },
  { v: 'ירוק',   kw: ['ירוק', 'ירוקה', 'זית'] },
  { v: 'ורוד',   kw: ['ורוד', 'ורודה', 'פינק', 'רוז'] },
  { v: 'כחול',   kw: ['כחול', 'כחולה', 'נייבי', 'ינשוף'] },
  { v: 'תכלת',   kw: ['תכלת', 'טורקיז'] },
  { v: "בז'",    kw: ["בז'", 'בז ', 'קאמל', 'חאקי', 'בז-'] },
  { v: 'אדום',   kw: ['אדום', 'אדומה'] },
  { v: 'בורדו',  kw: ['בורדו', 'וינו', 'יין'] },
  { v: 'סגול',   kw: ['סגול', 'סגולה', 'לילך'] },
  { v: 'צבעוני', kw: ['צבעוני', 'רב צבעי', 'מולטי'] },
];

const NOSACH_RULES = [
  { v: 'אשכנזי', kw: ['אשכנזי', 'אשכנז'] },
  { v: 'ספרדי',  kw: ['ספרדי', 'ספרד'] },
  { v: 'תימני',  kw: ['תימני', 'תימן'] },
  { v: 'חסידי',  kw: ['חסידי', 'חסיד', "חב\"ד", "חב'ד", 'חבד'] },
];

const KASHRUT_RULES = [
  { v: 'מהדרין', kw: ['מהדרין'] },
  { v: 'מהודר',  kw: ['מהודר', 'מהודרת'] },
];

// Extract first number followed by ס"מ / סמ / מ"מ
function extractSize(name) {
  const m = name.match(/(\d+(?:\.\d+)?)\s*(?:ס[""״]מ|סמ|מ[""״]מ)/);
  return m ? m[1] : null;
}

function buildFilterAttributes(name, cat) {
  const attrs = {};

  const mat = firstMatch(name, MATERIAL_RULES);
  if (mat) attrs['חומר'] = mat;

  const col = firstMatch(name, COLOR_RULES);
  if (col) attrs['צבע'] = col;

  const sz = extractSize(name);
  if (sz) attrs['גודל'] = sz;

  if (STAM_CATS.has(cat)) {
    const nos = firstMatch(name, NOSACH_RULES);
    if (nos) attrs['נוסח'] = nos;

    const ks = firstMatch(name, KASHRUT_RULES);
    if (ks) attrs['כשרות'] = ks;
  }

  return attrs;
}

// ── Prompt helper ──────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 updateFilterAttributes — DRY RUN\n');

  const snap = await db.collection('products').get();
  console.log(`סה"כ מוצרים: ${snap.size}\n`);

  // ── Dry run: compute all changes ──
  const changes = [];   // { ref, id, name, oldCat, newCat, attrs }
  const catChangeSummary = {};   // "oldCat → newCat": count
  const attrKeySummary   = {};   // key: count

  for (const doc of snap.docs) {
    const d    = doc.data();
    const name = d.name ?? '';
    const cat  = d.cat  ?? '';

    const newCat  = recategorize(name, cat);
    const attrs   = buildFilterAttributes(name, newCat);
    const catChanged = newCat !== cat;
    const hasAttrs   = Object.keys(attrs).length > 0;

    if (!catChanged && !hasAttrs) continue;

    changes.push({ ref: doc.ref, id: doc.id, name, oldCat: cat, newCat, attrs, catChanged });

    if (catChanged) {
      const key = `${cat || '—'} → ${newCat}`;
      catChangeSummary[key] = (catChangeSummary[key] ?? 0) + 1;
    }
    for (const k of Object.keys(attrs)) {
      attrKeySummary[k] = (attrKeySummary[k] ?? 0) + 1;
    }
  }

  // ── Print dry-run summary ──
  console.log('═'.repeat(56));
  console.log(`שינויי קטגוריה:`);
  for (const [key, cnt] of Object.entries(catChangeSummary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(40)} ${cnt}`);
  }

  console.log(`\nשינויי filterAttributes:`);
  for (const [key, cnt] of Object.entries(attrKeySummary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(14)} ${cnt}`);
  }

  console.log(`\nסה"כ מוצרים שישתנו: ${changes.length}`);
  console.log('═'.repeat(56));

  // ── 10 sample changes ──
  console.log('\n── 10 דוגמאות ────────────────────────────────────────────');
  const catChanges = changes.filter(c => c.catChanged);
  catChanges.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. "${c.name.slice(0, 55)}"`);
    if (c.catChanged) console.log(`   cat:   ${c.oldCat} → ${c.newCat}`);
    if (Object.keys(c.attrs).length)
      console.log(`   attrs: ${JSON.stringify(c.attrs)}`);
  });

  console.log('\n' + '─'.repeat(56));
  const answer = await prompt('להמשיך ולכתוב ל-Firestore? (y/n): ');
  if (answer.toLowerCase() !== 'y') {
    console.log('❌ בוטל.');
    process.exit(0);
  }

  // ── Write to Firestore ──
  console.log('\n🚀 כותב ל-Firestore...\n');

  const BATCH_SIZE = 400;
  let batch      = db.batch();
  let batchCount = 0;
  let written    = 0;

  for (const c of changes) {
    const update = { filterAttributes: c.attrs };
    if (c.catChanged) {
      update.cat      = c.newCat;
      update.category = c.newCat;
    }
    batch.update(c.ref, update);
    batchCount++;
    written++;

    if (batchCount === BATCH_SIZE) {
      await batch.commit();
      batch      = db.batch();
      batchCount = 0;
    }

    if (written % 500 === 0) {
      console.log(`   📊 ${written}/${changes.length} עודכנו`);
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(`\n✅ סיום! עודכנו ${written} מוצרים.\n`);
  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
