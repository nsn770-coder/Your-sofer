// analyzeShabbatProducts.mjs
// READ-ONLY analysis — does NOT modify any data.
// Groups all products by type and recommends which belong in "שבתות וחגים".

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Product type definitions ──────────────────────────────────────────────────
// Each type has: label, keywords (match against name), catMatch (optional cat filter), recommendation

const PRODUCT_TYPES = [
  { type: 'פמוטים',             keywords: ['פמוט', 'פמוטים', 'מנורה', 'נר שבת', 'נרות שבת'],           rec: 'yes' },
  { type: 'מגשי חלה',           keywords: ['מגש חלה', 'מגשי חלה', 'לוח חלה', 'קרש חלה'],               rec: 'yes' },
  { type: 'כיסויי חלה',          keywords: ['כיסוי חלה', 'כיסויי חלה', 'מפה לחלה'],                    rec: 'yes' },
  { type: 'מלחיות',              keywords: ['מלחיה', 'מלחיות', 'כלי מלח'],                               rec: 'yes' },
  { type: 'גביעי קידוש',         keywords: ['גביע קידוש', 'גביעי קידוש', 'כוס קידוש', 'כוסות קידוש', 'גביע'],  rec: 'yes' },
  { type: 'סט הבדלה',            keywords: ['הבדלה', 'סט הבדלה'],                                        rec: 'yes' },
  { type: 'נטלות',               keywords: ['נטלה', 'נטלות', 'ידיים', 'נטילת ידיים'],                    rec: 'yes' },
  { type: 'חנוכיות',             keywords: ['חנוכיה', 'חנוכיות', 'מנורת חנוכה'],                         rec: 'yes' },
  { type: 'מוצרי פסח',           keywords: ['פסח', 'קערת פסח', 'קערות פסח', 'מצה', 'סדר פסח', 'אפיקומן'], rec: 'yes' },
  { type: 'בשמים',               keywords: ['בשמים', 'קופסת בשמים', 'בשמים לבדלה'],                      rec: 'yes' },
  { type: 'קנדלייקס / נרות',     keywords: ['נר', 'נרות', 'מנורה', 'פנס'],                               rec: 'maybe' },
  { type: 'כלי שולחן והגשה',     keywords: ['מגש', 'קערה', 'צלחת', 'כוס', 'ספל', 'קנקן', 'בקבוק', 'מערכת', 'כלי אוכל', 'סט שולחן'], rec: 'maybe' },
  { type: 'עיצוב שבת / חג',      keywords: ['שבת', 'חג', 'ברכת הבית', 'ברכה', 'מזל טוב', 'לחיים'],      rec: 'yes' },
  { type: 'מתנות',               keywords: ['מתנה', 'מארז', 'סט מתנה', 'ערכת מתנה'],                     rec: 'maybe' },
  { type: 'מוצרי חנוכה',         keywords: ['חנוכה', 'סביבון', 'לביבה'],                                 rec: 'yes' },
  { type: 'טליתות ותפילין',       keywords: ['טלית', 'תפילין', 'ציצית'],                                  rec: 'no' },
  { type: 'מזוזות',              keywords: ['מזוזה', 'מזוזות', 'קלף'],                                   rec: 'no' },
  { type: 'ספרי קודש',           keywords: ['סידור', 'ספר תורה', 'מגילה', 'תנ"ך', 'ספר'],               rec: 'no' },
  { type: 'תיקים וכיסויים',       keywords: ['תיק', 'כיסוי תפילין', 'כיסוי טלית'],                        rec: 'no' },
];

function classifyProduct(name, cat, subCategory) {
  const text = `${name || ''} ${cat || ''} ${subCategory || ''}`.toLowerCase();
  for (const pt of PRODUCT_TYPES) {
    for (const kw of pt.keywords) {
      if (text.includes(kw.toLowerCase())) return pt;
    }
  }
  return { type: `אחר (${cat || 'ללא קטגוריה'})`, rec: '—' };
}

// ── Fetch all products ────────────────────────────────────────────────────────
console.log('\n🔍 מביא מוצרים מ-Firestore (קריאה בלבד)...\n');
const snap = await db.collection('products').get();
console.log(`📦 סה"כ מוצרים: ${snap.size}\n`);

const groups = {};

for (const d of snap.docs) {
  const p = d.data();
  if (p.hidden === true || p.status === 'inactive') continue;

  const pt = classifyProduct(p.name, p.cat, p.subCategory);
  if (!groups[pt.type]) {
    groups[pt.type] = { count: 0, examples: [], cats: new Set(), subCats: new Set(), rec: pt.rec };
  }
  const g = groups[pt.type];
  g.count++;
  if (g.examples.length < 5) g.examples.push(p.name || '(ללא שם)');
  if (p.cat) g.cats.add(p.cat);
  if (p.subCategory) g.subCats.add(p.subCategory);
}

// ── Sort: yes → maybe → no → — ───────────────────────────────────────────────
const recOrder = { yes: 0, maybe: 1, no: 2, '—': 3 };
const sorted = Object.entries(groups).sort((a, b) => {
  const ro = (recOrder[a[1].rec] ?? 3) - (recOrder[b[1].rec] ?? 3);
  if (ro !== 0) return ro;
  return b[1].count - a[1].count;
});

// ── Print report ──────────────────────────────────────────────────────────────
const COL = { type: 28, count: 7, cats: 30, sub: 28, rec: 8 };
const line = '─'.repeat(115);

console.log('='.repeat(115));
console.log(' ניתוח מוצרים — המלצה לקטגוריה "שבתות וחגים"');
console.log('='.repeat(115));
console.log(
  'סוג מוצר'.padEnd(COL.type) +
  'כמות'.padEnd(COL.count) +
  'cat נוכחי'.padEnd(COL.cats) +
  'subCategory'.padEnd(COL.sub) +
  'המלצה'
);
console.log(line);

for (const [type, g] of sorted) {
  const rec = g.rec === 'yes' ? '✅ yes' : g.rec === 'maybe' ? '🟡 maybe' : g.rec === 'no' ? '❌ no' : '— ';
  console.log(
    type.slice(0, COL.type - 1).padEnd(COL.type) +
    String(g.count).padEnd(COL.count) +
    [...g.cats].join(', ').slice(0, COL.cats - 1).padEnd(COL.cats) +
    ([...g.subCats].join(', ') || '—').slice(0, COL.sub - 1).padEnd(COL.sub) +
    rec
  );
  for (const ex of g.examples) {
    console.log('  • ' + ex);
  }
  console.log(line);
}

// ── Summary ───────────────────────────────────────────────────────────────────
const yesCount  = sorted.filter(([,g]) => g.rec === 'yes').reduce((s,[,g]) => s + g.count, 0);
const maybeCount= sorted.filter(([,g]) => g.rec === 'maybe').reduce((s,[,g]) => s + g.count, 0);
const noCount   = sorted.filter(([,g]) => g.rec === 'no').reduce((s,[,g]) => s + g.count, 0);

console.log('\n📊 סיכום:');
console.log(`  ✅ ממולץ לשבתות וחגים:  ${yesCount} מוצרים`);
console.log(`  🟡 אולי:                 ${maybeCount} מוצרים`);
console.log(`  ❌ לא מתאים:             ${noCount} מוצרים`);
console.log('\n⚠️  הסקריפט לא שינה שום דבר ב-Firestore.');
console.log('='.repeat(115));

process.exit(0);
