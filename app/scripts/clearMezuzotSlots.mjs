/**
 * clearMezuzotSlots.mjs
 * TEST: clears imgUrl3 and imgUrl5 on the first 5 מזוזות products
 * (excluding IDs "1" and "14", and hidden products).
 * Source: app/scripts/output/extra_images_audit.json
 * NO MORE than 5 products updated.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));

const SA_PATH = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const data = JSON.parse(readFileSync(resolve(__dir, 'output/extra_images_audit.json'), 'utf-8'));

const targets = data.products
  .filter(p =>
    p.cat === 'מזוזות' &&
    String(p.id) !== '1' &&
    String(p.id) !== '14' &&
    p.hidden !== true
  )
  .slice(0, 5);

console.log(`\n🔧 TEST — עדכון ${targets.length} מוצרי מזוזות בלבד\n`);
console.log('════════════════════════════════════════════════════');

for (const p of targets) {
  const imgUrl3 = p.images.find(i => i.field === 'imgUrl3')?.url ?? '(ריק)';
  const imgUrl5 = p.images.find(i => i.field === 'imgUrl5')?.url ?? '(ריק)';

  console.log(`\n📦 ${p.name}`);
  console.log(`   ID:   ${p.id}`);
  console.log(`   Link: https://your-sofer.com/product/${p.id}`);
  console.log(`   לפני:`);
  console.log(`     imgUrl3: ${imgUrl3}`);
  console.log(`     imgUrl5: ${imgUrl5}`);

  await db.collection('products').doc(String(p.id)).update({
    imgUrl3: '',
    imgUrl5: '',
  });

  console.log(`   אחרי:`);
  console.log(`     imgUrl3: "" (נוקה)`);
  console.log(`     imgUrl5: "" (נוקה)`);
  console.log(`   ✅ עודכן`);
}

console.log('\n════════════════════════════════════════════════════');
console.log(`✅ הושלם — ${targets.length} מוצרים עודכנו (imgUrl3, imgUrl5 → "")`);

process.exit(0);
