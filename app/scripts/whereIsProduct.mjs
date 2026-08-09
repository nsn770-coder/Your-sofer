/**
 * whereIsProduct.mjs
 *
 * מאתר מוצר לפי SKU ומדפיס איפה בדיוק הוא נמצא באתר — כולל הכתובת
 * המדויקת של עמוד המוצר ושל הקטגוריה שבה הוא אמור להופיע.
 *
 * Usage: node app/scripts/whereIsProduct.mjs UK12513
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync }                 from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const SITE      = 'https://your-sofer.com';
const sku       = (process.argv[2] || '').trim().toUpperCase();

if (!sku) { console.error('שימוש: node app/scripts/whereIsProduct.mjs UK12513'); process.exit(1); }

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

const isCloudinary = u => typeof u === 'string' && u.includes('cloudinary.com');

(async () => {
  const snap = await db.collection('products').where('sku', '==', sku).limit(5).get();

  if (snap.empty) {
    console.log(`❌ ${sku} — לא קיים בקטלוג כלל.`);
    process.exit(0);
  }

  for (const doc of snap.docs) {
    const p = doc.data();
    console.log(`\n══ ${sku} ══`);
    console.log(`  שם:          ${p.name || '—'}`);
    console.log(`  מזהה:        ${doc.id}`);
    console.log(`  קטגוריה:     ${p.cat || p.category || '— חסרה!'}`);
    console.log(`  תת-קטגוריה:  ${p.subCategory || '—'}`);
    console.log(`  מחיר:        ${p.price ?? '—'}`);
    console.log(`  priority:    ${p.priority ?? '— חסר! לא ייחזר מהשאילתה'}`);
    console.log(`  hidden:      ${p.hidden}`);
    console.log(`  status:      ${p.status || '—'}`);
    console.log(`  תמונה:       ${isCloudinary(p.imgUrl) ? '✓ Cloudinary' : (p.imgUrl ? '⚠️ לא Cloudinary' : '✗ אין')}`);
    console.log(`  מגיע בקרוב:  ${p.comingSoon ? `כן (${p.expectedArrivalDate || '—'})` : 'לא'}`);

    // ── האם הוא באמת יוצג? כל תנאי כאן הוא חוסם בפני עצמו ──
    const blockers = [];
    if (p.priority == null)                    blockers.push('חסר priority — עמודי הקטגוריה מריצים orderBy ולא יחזירו אותו');
    if (p.hidden === true)                     blockers.push('hidden = true');
    if (p.status && p.status !== 'active')     blockers.push(`status = ${p.status}`);
    if (!isCloudinary(p.imgUrl))               blockers.push('אין תמונה תקינה');
    if (!p.cat && !p.category)                 blockers.push('אין קטגוריה');

    console.log('');
    if (blockers.length) {
      console.log('  🚫 לא יוצג באתר:');
      for (const b of blockers) console.log(`     • ${b}`);
    } else {
      console.log('  ✅ אמור להיות גלוי');
    }

    // ── הקישורים ──
    const cat = p.cat || p.category;
    console.log('\n  קישורים:');
    console.log(`    עמוד המוצר:  ${SITE}/product/${doc.id}`);
    if (cat) {
      console.log(`    הקטגוריה:    ${SITE}/category/${encodeURIComponent(cat)}`);
      if (p.subCategory) {
        console.log(`    מסונן:       ${SITE}/category/${encodeURIComponent(cat)}?filter=${encodeURIComponent(p.subCategory)}`);
      }
    }
  }
  process.exit(0);
})();
