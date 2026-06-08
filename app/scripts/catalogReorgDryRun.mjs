/**
 * catalogReorgDryRun.mjs
 *
 * DRY-RUN בלבד — לא כותב כלום ל-Firestore.
 *
 * מטרה: בניית מבנה קטלוג לפי מבנה ניווט Art Judaica (מכון הקודש),
 * שיוך מוצרים קיימים, זיהוי בעיות, וסיכום לפני ביצוע.
 *
 * Usage: node app/scripts/catalogReorgDryRun.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({ apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I', projectId: 'your-sofer' });
const db  = getFirestore(app);

// ─── מבנה קטלוג מטרה (לפי Art Judaica) ─────────────────────────────────────
// כל רשומה: { newCat, newSubCat, displayOrder }
// כל פונקציית match מקבלת { cat, subCategory, name, supplier } ומחזירה true/false

const CATALOG = [
  // ═══════════════════════════════════════════════════════
  //  1. בתי מזוזה
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'בתי מזוזה',
    displayOrder: 1,
    subcats: [
      { sub: 'מזוזות מתכת',    order: 1, match: p => p.cat === 'בתי מזוזה' && p.subCategory === 'מזוזות מתכת' },
      { sub: 'מזוזות פולימר',  order: 2, match: p => p.cat === 'בתי מזוזה' && p.subCategory === 'מזוזות פולימר' },
      { sub: 'מזוזות זכוכית',  order: 3, match: p => p.cat === 'בתי מזוזה' && p.subCategory === 'מזוזות זכוכית' },
      { sub: 'מזוזות עץ',      order: 4, match: p => p.cat === 'בתי מזוזה' && p.subCategory === 'מזוזות עץ' },
      { sub: 'מזוזות אבן',     order: 5, match: p => p.cat === 'בתי מזוזה' && ['מזוזות אבן','מזוזות מרמור'].includes(p.subCategory) },
      { sub: 'מזוזות פלסטיק',  order: 6, match: p => p.cat === 'בתי מזוזה' && p.subCategory === 'מזוזות פלסטיק' },
      { sub: 'מזוזות מיוחדות', order: 7, match: p => p.cat === 'בתי מזוזה' && ['מזוזות אפוקסי','מזוזות ציפוי','מזוזות כותל','מזוזות קריסטל','מזוזות אמייל','מזוזות art deco'].includes(p.subCategory) },
      { sub: 'מזוזות ללא תת-קטגוריה', order: 8, match: p => p.cat === 'בתי מזוזה' && !p.subCategory },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  2. תפילין קומפלט
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'תפילין קומפלט',
    displayOrder: 2,
    subcats: [
      { sub: 'תפילין קומפלט', order: 1, match: p => p.cat === 'תפילין קומפלט' },
      { sub: 'קלפי תפילין',   order: 2, match: p => p.cat === 'קלפי תפילין' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  3. כיסויי טלית ותפילין (Art Judaica: "כיסויים לטלית ותפילין")
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'כיסויי טלית ותפילין',
    displayOrder: 3,
    subcats: [
      { sub: 'סטים עור מדומה', order: 1, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים עור מדומה' },
      { sub: 'סטים פיו',       order: 2, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים פיו' },
      { sub: 'סטים בד',        order: 3, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים בד' },
      { sub: 'סטים קטיפה',     order: 4, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים קטיפה' },
      { sub: 'סטים קורדרוי',   order: 5, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים קורדרוי' },
      { sub: 'סטים ארוג',      order: 6, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים ארוג' },
      { sub: 'סטים רקמה',      order: 7, match: p => p.cat === 'סט טלית תפילין' && p.subCategory === 'סטים רקמה' },
      { sub: 'תיקים',          order: 8, match: p => p.cat === 'סט טלית תפילין' && ['תיקים','תיקי עור מדומה','תיקים טרמי','בתי תפילין'].includes(p.subCategory) },
      { sub: 'תיקי טלית ותפילין', order: 9, match: p => p.cat === 'תיקי טלית ותפילין' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  4. טליתות וציציות
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'טליתות',
    displayOrder: 4,
    subcats: [
      { sub: 'טלית חתן',       order: 1, match: p => (p.cat === 'טליתות וציציות' && p.subCategory === 'טליתות חתן') || (p.cat === 'טליתות וציציות' && /חתן|חתונה/.test(p.subCategory)) },
      { sub: 'טלית לילדים',    order: 2, match: p => p.cat === 'טליתות וציציות' && /ילד/.test(p.subCategory) },
      { sub: 'ציציות',         order: 3, match: p => p.cat === 'טליתות וציציות' && /ציצ|גופי/.test(p.subCategory) },
      { sub: 'טליתות כלליות',  order: 4, match: p => p.cat === 'טליתות וציציות' && !p.subCategory },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  5. מגילות
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'מגילות',
    displayOrder: 5,
    subcats: [
      { sub: 'מגילת אסתר',    order: 1, match: p => p.cat === 'מגילות' && p.subCategory === 'מגילת אסתר' },
      { sub: 'מגילות כלליות', order: 2, match: p => p.cat === 'מגילות' && !p.subCategory },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  6. ספרי תורה
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'ספרי תורה',
    displayOrder: 6,
    subcats: [
      { sub: 'ספרי תורה',         order: 1, match: p => p.cat === 'ספרי תורה' },
      { sub: 'מוצרי ספר תורה',   order: 2, match: p => p.cat === 'מוצרי בית כנסת' && /ספר|תורה|פרוכת|פרוכות|רימ|אצבע/.test(p.subCategory + p.name) },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  7. כיפות
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'כיפות',
    displayOrder: 7,
    subcats: [
      { sub: 'כיפות סרוגות',    order: 1, match: p => p.cat === 'כיפות' && p.subCategory === 'כיפות סרוגות' },
      { sub: 'כיפות מיוחדות',   order: 2, match: p => p.cat === 'כיפות' && p.subCategory === 'כיפות מיוחדות' },
      { sub: 'כיפות סאטן',      order: 3, match: p => p.cat === 'כיפות' && /(סאטן|אירוע|הדפסה)/.test(p.subCategory + p.name) },
      { sub: 'כיפות עור',       order: 4, match: p => p.cat === 'כיפות' && /עור|ז.מש|ג.מש/.test(p.subCategory + p.name) },
      { sub: 'כיפות קטיפה',     order: 5, match: p => p.cat === 'כיפות' && /קטיפ/.test(p.subCategory + p.name) },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  8. קלפי מזוזה
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'קלפי מזוזה',
    displayOrder: 8,
    subcats: [
      { sub: 'קלפי מזוזה', order: 1, match: p => p.cat === 'קלפי מזוזה' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  9. שבת
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'שבת',
    displayOrder: 9,
    subcats: [
      { sub: 'פמוטים',          order: 1, match: p => p.cat === 'שבת' && p.subCategory === 'פמוטים' },
      { sub: 'כיסויי חלה',     order: 2, match: p => p.cat === 'שבת' && p.subCategory === 'כיסויי חלה' },
      { sub: 'קרשי חלה',        order: 3, match: p => p.cat === 'שבת' && p.subCategory === 'קרשי חלה' },
      { sub: 'כוסות קידוש',    order: 4, match: p => p.cat === 'שבת' && p.subCategory === 'כוסות קידוש' },
      { sub: 'מלחיות',          order: 5, match: p => p.cat === 'שבת' && p.subCategory === 'מלחיות' },
      { sub: 'כיסויי פלטה',    order: 6, match: p => p.cat === 'שבת' && p.subCategory === 'כיסויי פלטה' },
      { sub: 'הפרשת חלה',      order: 7, match: p => p.cat === 'שבת' && p.subCategory === 'הפרשת חלה' },
      { sub: 'שבת כלליות',     order: 8, match: p => p.cat === 'שבת' && !p.subCategory },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  10. יודאיקה
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'יודאיקה',
    displayOrder: 10,
    subcats: [
      { sub: 'נטילת ידיים',    order: 1, match: p => p.cat === 'יודאיקה' && p.subCategory === 'נטילת ידיים' },
      { sub: 'ברכונים',        order: 2, match: p => p.cat === 'יודאיקה' && p.subCategory === 'ברכונים' },
      { sub: 'הבדלה',          order: 3, match: p => p.cat === 'יודאיקה' && p.subCategory === 'הבדלה' },
      { sub: 'חנוכה',          order: 4, match: p => p.cat === 'יודאיקה' && ['חנוכה','חנוכיות'].includes(p.subCategory) },
      { sub: 'פסח',            order: 5, match: p => p.cat === 'יודאיקה' && p.subCategory === 'פסח' },
      { sub: 'פורים',          order: 6, match: p => p.cat === 'יודאיקה' && p.subCategory === 'פורים' },
      { sub: 'סוכות',          order: 7, match: p => p.cat === 'יודאיקה' && p.subCategory === 'סוכות' },
      { sub: 'ראש השנה',       order: 8, match: p => p.cat === 'יודאיקה' && p.subCategory === 'ראש השנה' },
      { sub: 'קופות צדקה',    order: 9, match: p => p.cat === 'יודאיקה' && p.subCategory === 'קופות צדקה' },
      { sub: 'חמסות וסגולות',  order: 10, match: p => p.cat === 'יודאיקה' && p.subCategory === 'חמסות וסגולות' },
      { sub: 'מחזיקי מפתחות', order: 11, match: p => p.cat === 'יודאיקה' && p.subCategory === 'מחזיקי מפתחות' },
      { sub: 'דמויות חסידים', order: 12, match: p => p.cat === 'יודאיקה' && p.subCategory === 'דמויות חסידים' },
      { sub: 'יודאיקה כללי',  order: 13, match: p => p.cat === 'יודאיקה' && ['יודאיקה כללי','סטים ומארזים','עטים','מגנטים'].includes(p.subCategory) },
      { sub: 'יודאיקה ללא תת-קטגוריה', order: 14, match: p => p.cat === 'יודאיקה' && !p.subCategory },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  11. מתנות ואירועים
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'מתנות',
    displayOrder: 11,
    subcats: [
      { sub: 'מתנות לאורחים',      order: 1, match: p => p.cat === 'מתנות' },
      { sub: 'ספרים עם הקדשה',     order: 2, match: p => p.cat === 'ספרי קודש וסידורים' && /הקדשה/.test(p.name) },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  12. בר מצווה
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'בר מצווה',
    displayOrder: 12,
    subcats: [
      { sub: 'סטים לבר מצווה',     order: 1, match: p => p.cat === 'בר מצווה' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  13. ספרי קודש וסידורים
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'ספרי קודש וסידורים',
    displayOrder: 13,
    subcats: [
      { sub: 'סידורים ותהילים', order: 1, match: p => p.cat === 'ספרי קודש וסידורים' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  14. מוצרי בית כנסת
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'מוצרי בית כנסת',
    displayOrder: 14,
    subcats: [
      { sub: 'מוצרי בית כנסת', order: 1, match: p => p.cat === 'מוצרי בית כנסת' },
    ]
  },

  // ═══════════════════════════════════════════════════════
  //  15. תכשיטים
  // ═══════════════════════════════════════════════════════
  {
    newCat: 'תכשיטים',
    displayOrder: 15,
    subcats: [
      { sub: 'תכשיטים', order: 1, match: p => p.cat === 'תכשיטים' },
    ]
  },
];

// קטגוריות שיוסתרו/יסומנו לבדיקה (לא ממופות לעיל)
const FLAGGED_CATS = [
  'כלי שולחן והגשה',   // ~1,689 מוצרים - לא בניווט Art Judaica
  'עיצוב הבית',         // ~828 מוצרים - לא בניווט Art Judaica
];

// ─── Load Products ────────────────────────────────────────────────────────────

console.log('⏳ טוען מוצרים מ-Firestore...\n');
const snap = await getDocs(collection(db, 'products'));

const products = [];
snap.forEach(doc => {
  const d = doc.data();
  products.push({
    id: doc.id,
    name: (d.name || '').slice(0, 60),
    cat: d.cat || d.category || '',
    subCategory: d.subCategory || '',
    supplier: d.supplier || '',
    hidden: !!d.hidden,
    status: d.status || '',
    price: d.price || 0,
    imgUrl: d.imgUrl || d.image_url || '',
  });
});

console.log(`סה"כ מוצרים בטעינה: ${products.length}`);

// ─── Run Mapping ──────────────────────────────────────────────────────────────

const mapped = [];       // { id, name, from: {cat,sub}, to: {cat,sub,order} }
const unmapped = [];     // products not matched by any rule
const flaggedOut = [];   // products in FLAGGED_CATS (to review for hiding)
const alreadyHidden = products.filter(p => p.hidden);
const noCategory = products.filter(p => !p.cat && !p.hidden);

const activeProducts = products.filter(p => !p.hidden);

for (const p of activeProducts) {
  // Check if flagged cat
  if (FLAGGED_CATS.includes(p.cat)) {
    flaggedOut.push(p);
    continue;
  }

  let matched = false;
  for (const catDef of CATALOG) {
    for (const subDef of catDef.subcats) {
      if (subDef.match(p)) {
        const changed = (p.cat !== catDef.newCat || p.subCategory !== subDef.sub);
        mapped.push({
          id: p.id,
          name: p.name,
          supplier: p.supplier,
          from: { cat: p.cat, sub: p.subCategory },
          to:   { cat: catDef.newCat, sub: subDef.sub, order: catDef.displayOrder },
          changed,
        });
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  if (!matched) {
    unmapped.push(p);
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const changed    = mapped.filter(m => m.changed);
const unchanged  = mapped.filter(m => !m.changed);

console.log('\n' + '═'.repeat(65));
console.log('📊 DRY-RUN SUMMARY — מבנה קטלוג לפי Art Judaica');
console.log('═'.repeat(65));

console.log(`\n✅ ממופים נכון (ללא שינוי):   ${unchanged.length}`);
console.log(`🔄 ממופים עם שינוי cat/subCat: ${changed.length}`);
console.log(`⚠️  לא ממופים (יתומים):         ${unmapped.length}`);
console.log(`🔶 לסקירה (קטגוריות מחוץ ל-AJ): ${flaggedOut.length}`);
console.log(`👁️  כבר מוסתרים:                ${alreadyHidden.length}`);
console.log(`🚫 ללא קטגוריה (פעילים):        ${noCategory.length}`);

// ─── By New Category ─────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(65));
console.log('📂 פירוט לפי קטגוריה מטרה:\n');

for (const catDef of CATALOG) {
  const catMapped = mapped.filter(m => m.to.cat === catDef.newCat);
  if (!catMapped.length) continue;
  console.log(`  [${catDef.displayOrder}] ${catDef.newCat} — ${catMapped.length} מוצרים`);
  const bySub = {};
  catMapped.forEach(m => { bySub[m.to.sub] = (bySub[m.to.sub] || 0) + 1; });
  Object.entries(bySub).sort((a,b)=>b[1]-a[1]).forEach(([sub,c]) => {
    console.log(`       • ${sub}: ${c}`);
  });
}

// ─── Changed products (sample) ────────────────────────────────────────────────

if (changed.length) {
  console.log('\n' + '─'.repeat(65));
  console.log(`🔄 דוגמה מהשינויים (${Math.min(changed.length, 20)} ראשונים):\n`);
  changed.slice(0, 20).forEach(m => {
    console.log(`  "${m.name}"`);
    console.log(`    ${m.from.cat} / ${m.from.sub || '-'} → ${m.to.cat} / ${m.to.sub}`);
  });
}

// ─── Unmapped ────────────────────────────────────────────────────────────────

if (unmapped.length) {
  console.log('\n' + '─'.repeat(65));
  console.log(`⚠️  יתומים — לא ממופים (${unmapped.length}):\n`);
  const unmapByCat = {};
  unmapped.forEach(p => {
    const k = `${p.cat || '(none)'} / ${p.subCategory || '-'}`;
    if (!unmapByCat[k]) unmapByCat[k] = [];
    unmapByCat[k].push(p);
  });
  Object.entries(unmapByCat).sort((a,b)=>b[1].length-a[1].length).forEach(([k,ps]) => {
    console.log(`  ${k}: ${ps.length} מוצרים`);
    ps.slice(0, 2).forEach(p => console.log(`    - ${p.id}: ${p.name}`));
  });
}

// ─── Flagged out ─────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(65));
console.log(`🔶 קטגוריות מחוץ ל-Art Judaica (${flaggedOut.length} מוצרים) — ממתינים להחלטה:\n`);
const flagByCat = {};
flaggedOut.forEach(p => {
  const k = `${p.cat} / ${p.subCategory || '-'}`;
  flagByCat[k] = (flagByCat[k] || 0) + 1;
});
Object.entries(flagByCat).sort((a,b)=>b[1]-a[1]).slice(0, 30).forEach(([k,c]) => {
  console.log(`  ${k}: ${c}`);
});

// ─── Products to hide (no image + flagged) ───────────────────────────────────

const noImage = [...unmapped, ...flaggedOut].filter(p => !p.imgUrl);
console.log('\n' + '─'.repeat(65));
console.log(`🖼️  מוצרים ללא תמונה (בין היתומים+מסומנים): ${noImage.length}`);
noImage.slice(0, 10).forEach(p => console.log(`  ${p.id}: [${p.cat}/${p.subCategory}] ${p.name}`));

// ─── Action plan ─────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(65));
console.log('📋 תוכנית פעולה מוצעת (ממתינה לאישורך):\n');
console.log(`  1. עדכן cat/subCategory ל-${changed.length} מוצרים ממופים עם שינוי`);
console.log(`  2. ${unmapped.length} יתומים — יסומנו לבדיקה (הסתרה זמנית)`);
console.log(`  3. ${flaggedOut.length} מוצרים מקטגוריות חוץ-AJ — להחלטה:`);
console.log(`     אפשרות א': השאר כמות (אין שינוי בקטגוריה)`);
console.log(`     אפשרות ב': הסתר (hidden=true) עד החלטה`);
console.log(`     אפשרות ג': מחק (בלתי הפיך!)`);
console.log(`  4. עדכן constants/categories.ts בהתאם לקטגוריות החדשות`);
console.log(`  5. עדכן NAV_ITEMS לפי סדר Art Judaica`);

console.log('\n✅ DRY-RUN הסתיים — לא נכתב שום דבר ל-Firestore');
console.log('   המתן לאישורך לפני ביצוע.');
process.exit(0);
