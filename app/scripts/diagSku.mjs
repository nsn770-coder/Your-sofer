import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('products').get();
const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

console.log('═'.repeat(70));
console.log('1. סה"כ מוצרים:', docs.length);
console.log('═'.repeat(70));

// 2. SKU breakdown
const ukSkus   = docs.filter(d => /^UK\d+$/.test(d.sku || ''));
const otherSku = docs.filter(d => d.sku && !/^UK\d+$/.test(d.sku));
const noSku    = docs.filter(d => !d.sku);

console.log('\n2. פילוח שדה sku:');
console.log(`  UK{number}  : ${ukSkus.length}`);
console.log(`  פורמט אחר  : ${otherSku.length}`);
console.log(`  חסר / ריק  : ${noSku.length}`);

if (otherSku.length > 0) {
  console.log('\n  5 דוגמאות לפורמט אחר:');
  otherSku.slice(0, 5).forEach(d =>
    console.log(`    id=${d._id}  sku="${d.sku}"  name="${(d.name||'').substring(0,40)}"`)
  );
}
if (noSku.length > 0) {
  console.log('\n  5 דוגמאות ללא sku:');
  noSku.slice(0, 5).forEach(d =>
    console.log(`    id=${d._id}  name="${(d.name||'').substring(0,40)}"`)
  );
}

// 3. 3 sample documents in full
console.log('\n' + '═'.repeat(70));
console.log('3. 3 מסמכים מלאים לדוגמה (UK sku — נבחרו אקראית):');
const sample3 = ukSkus.sort(() => Math.random() - 0.5).slice(0, 3);
for (const d of sample3) {
  console.log('\n--- doc id:', d._id, '---');
  const { _id, ...rest } = d;
  console.log(JSON.stringify(rest, null, 2));
}

// 4. Boolean display fields
console.log('\n' + '═'.repeat(70));
console.log('4. שדות boolean שעשויים לשלוט בהצגת sku:');
const boolFields = ['showSku','displaySku','hideSku','showCode','hideCode','showProductCode','displayCode'];
for (const f of boolFields) {
  const withField = docs.filter(d => d[f] !== undefined);
  if (withField.length > 0) {
    const trueCount  = withField.filter(d => d[f] === true).length;
    const falseCount = withField.filter(d => d[f] === false).length;
    console.log(`  "${f}": ${withField.length} מוצרים (true=${trueCount}, false=${falseCount})`);
    // Of those with field=true (hidden), how many still have sku?
    const hiddenWithSku = withField.filter(d => d[f] === true && d.sku);
    if (hiddenWithSku.length > 0)
      console.log(`    מתוכם עם sku למרות הסתרה: ${hiddenWithSku.length}`);
    // Sample
    withField.slice(0, 2).forEach(d =>
      console.log(`    דוגמה: id=${d._id}  ${f}=${d[f]}  sku="${d.sku||'(empty)'}"`)
    );
  } else {
    console.log(`  "${f}": לא קיים בשום מסמך`);
  }
}

// 5. Alternative supplier code fields
console.log('\n' + '═'.repeat(70));
console.log('5. שדות חלופיים לקוד ספק:');
const altFields = ['productCode','supplierCode','code','barcode','mk','makat','itemno','item_no','product_code'];
for (const f of altFields) {
  const withField = docs.filter(d => d[f] !== undefined && d[f] !== '' && d[f] !== null);
  if (withField.length > 0) {
    const noSkuButHas = withField.filter(d => !d.sku);
    console.log(`  "${f}": ${withField.length} מוצרים (מתוכם ${noSkuButHas.length} ללא sku)`);
    withField.slice(0, 3).forEach(d =>
      console.log(`    id=${d._id}  ${f}="${d[f]}"  sku="${d.sku||'(empty)'}"`)
    );
  } else {
    console.log(`  "${f}": לא קיים בשום מסמך`);
  }
}

// Also scan all field names to catch anything unexpected
console.log('\n  (סריקת כל שמות השדות בכל המסמכים לחיפוש שדה קוד בלתי צפוי)');
const allFieldNames = new Set(docs.flatMap(d => Object.keys(d)));
const codeRelated = [...allFieldNames].filter(f =>
  /code|sku|makat|mk|barcode|supplier|item|product/i.test(f) && !['subCategory','subcategory','category','productType'].includes(f)
);
console.log('  שדות בעלי שם רלוונטי:', codeRelated.join(', '));

process.exit(0);
