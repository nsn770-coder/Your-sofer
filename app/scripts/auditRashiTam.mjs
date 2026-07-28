/**
 * READ-ONLY — מזהה מוצרי רש"י ור"ת בקטגוריה "סט טלית תפילין"
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

// Normalize: strip nikud, gershayim variants, spaces → lowercase for matching
function norm(s) {
  return s
    .replace(/[ְ-ׇ]/g, '')   // strip nikud
    .replace(/[״"]/g, '"')              // normalize gershayim
    .replace(/[׳']/g, "'")             // normalize geresh
    .toLowerCase();
}

const RASHI_PATTERNS = [
  /רש"י/,       // standard
  /רש״י/,       // gershayim variant
  /רשי/,        // missing geresh
];

const TAM_PATTERNS = [
  /ר"ת/,
  /ר״ת/,
  /\bרת\b/,     // standalone
];

const COMBO_PATTERNS = [
  /רש.?י.{0,5}ר.?ת/,   // rashi + tam with anything in between
  /רשיתם/,
  /רש.יתם/,
  /תם.{0,5}רש/,          // reversed order
];

function classify(name) {
  const n = norm(name);
  const hasRashi = RASHI_PATTERNS.some(p => p.test(n));
  const hasTam   = TAM_PATTERNS.some(p => p.test(n));
  const hasCombo = COMBO_PATTERNS.some(p => p.test(n));
  if (hasCombo) return 'רש"י+ר"ת (צירוף)';
  if (hasRashi && hasTam) return 'רש"י+ר"ת (שניהם)';
  if (hasRashi) return 'רש"י בלבד';
  if (hasTam)   return 'ר"ת בלבד';
  return null;
}

console.log('סורק קטגוריה "סט טלית תפילין"...\n');

const snap = await getDocs(
  query(collection(db, 'products'), where('cat', '==', 'סט טלית תפילין'))
);
console.log(`סה"כ מוצרים בקטגוריה: ${snap.size}\n`);

const found = [];
const allNames = [];   // כל השמות — לזיהוי ידני

snap.forEach(d => {
  const p    = d.data();
  const name = p.name ?? '';
  allNames.push({ id: d.id, name });
  const label = classify(name);
  if (label) found.push({ id: d.id, name, label });
});

// ── טבלה: מוצרים שזוהו ──
console.log('══════════════════════════════════════════════════════════════════');
console.log(`מוצרי רש"י/ר"ת שזוהו: ${found.length} מתוך ${snap.size}`);
console.log('══════════════════════════════════════════════════════════════════');
found.forEach(({ id, name, label }) => {
  console.log(`[${id}]`);
  console.log(`  שם: ${name}`);
  console.log(`  זיהוי: ${label}`);
  console.log();
});

// ── כל השמות (לסקירה ידנית של שגיאות כתיב לא-צפויות) ──
console.log('══════════════════════════════════════════════════════════════════');
console.log('כל שמות המוצרים בקטגוריה (לסקירה ידנית):');
console.log('══════════════════════════════════════════════════════════════════');
allNames.forEach(({ id, name }) => console.log(`  [${id.slice(0,8)}…]  ${name}`));

console.log('\n⚠️  הסקריפט לא שינה שום דבר.');
process.exit(0);
