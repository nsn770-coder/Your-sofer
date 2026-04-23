// analyzeNoSubCategory.mjs
// קורא את כל המוצרים ללא subCategory, מקבץ לפי cat ומנתח מילות מפתח בשמות

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const snap = await db.collection('products').get();

// קבץ לפי cat → מוצרים ללא subCategory
const bycat = {};
let totalNoSub = 0;

for (const d of snap.docs) {
  const p = d.data();
  if (p.subCategory) continue; // יש כבר subCategory — דלג
  totalNoSub++;
  const cat = p.cat || '(ללא קטגוריה)';
  if (!bycat[cat]) bycat[cat] = [];
  bycat[cat].push(p.name || '(ללא שם)');
}

console.log(`\n📦 סה"כ מוצרים ללא subCategory: ${totalNoSub}\n`);
console.log('='.repeat(60));

// עבור כל קטגוריה — ספור מילות מפתח
for (const [cat, names] of Object.entries(bycat).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`\n📂 ${cat} (${names.length} מוצרים ללא subCategory)`);
  console.log('-'.repeat(50));

  // ספור bigrams / מילים נפוצות
  const wordCount = {};
  for (const name of names) {
    // הסר מספרים, ס"מ, קוד מוצר ושמור מילים עבריות בלבד (≥2 תווים)
    const words = name
      .replace(/[A-Za-z0-9"'*\/\\.\-_,|()[\]{}]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2);

    const seen = new Set();
    for (const w of words) {
      if (!seen.has(w)) {
        wordCount[w] = (wordCount[w] || 0) + 1;
        seen.add(w);
      }
    }
  }

  // מיין לפי שכיחות, הצג רק מילים שמופיעות ב-2+ מוצרים
  const top = Object.entries(wordCount)
    .filter(([w, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  if (top.length === 0) {
    // הדפס את כל השמות אם מעט מוצרים
    names.forEach(n => console.log(`  • ${n}`));
  } else {
    console.log('  מילות מפתח נפוצות:');
    top.forEach(([w, c]) => console.log(`    "${w}" — ${c} מוצרים`));
    console.log(`\n  דוגמת שמות (עד 10):`);
    names.slice(0, 10).forEach(n => console.log(`  • ${n}`));
    if (names.length > 10) console.log(`  ... ועוד ${names.length - 10} מוצרים`);
  }
}

console.log('\n' + '='.repeat(60));
process.exit(0);
