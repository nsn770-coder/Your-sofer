/**
 * auditExtraImages.mjs
 * Read-only audit — no Firestore writes.
 * Finds products with 5 or more images across all image fields.
 * Output: app/scripts/output/extra_images_audit.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

const IMG_FIELDS = ['imgUrl', 'image_url', 'img1', 'img2', 'img3', 'imgUrl2', 'imgUrl3', 'imgUrl4', 'imgUrl5'];

function collectUrls(product) {
  const urls = [];
  for (const field of IMG_FIELDS) {
    const val = product[field];
    if (val && typeof val === 'string' && val.trim()) {
      urls.push({ field, url: val.trim() });
    }
  }
  return urls;
}

async function run() {
  console.log('🔍 טוען את כל המוצרים מ-Firestore...');
  const snap = await getDocs(collection(db, 'products'));
  const allDocs = [];
  snap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));
  console.log(`📦 נטענו ${allDocs.length} מוצרים סה"כ\n`);

  const withFivePlus = [];

  for (const p of allDocs) {
    const urls = collectUrls(p);
    if (urls.length >= 5) {
      withFivePlus.push({
        id: p.id,
        name: p.name || '(ללא שם)',
        cat: p.cat || p.category || '',
        productUrl: `https://your-sofer.com/product/${p.id}`,
        imageCount: urls.length,
        images: urls,
      });
    }
  }

  withFivePlus.sort((a, b) => b.imageCount - a.imageCount);

  // Console: first 10
  console.log('════════════════════════════════════════════════════');
  console.log(`📸 מוצרים עם 5+ תמונות: ${withFivePlus.length} סה"כ`);
  console.log('════════════════════════════════════════════════════\n');

  const preview = withFivePlus.slice(0, 10);
  for (let i = 0; i < preview.length; i++) {
    const p = preview[i];
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   קטגוריה:  ${p.cat || '—'}`);
    console.log(`   Firestore ID: ${p.id}`);
    console.log(`   דף מוצר:  ${p.productUrl}`);
    console.log(`   תמונות (${p.imageCount}):`);
    p.images.forEach((img, idx) => {
      console.log(`     ${idx + 1}. [${img.field}] ${img.url}`);
    });
    console.log();
  }

  // Save full results
  const outDir = resolve(__dir, 'output');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'extra_images_audit.json');
  writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalProducts: allDocs.length,
    productsWithFivePlusImages: withFivePlus.length,
    products: withFivePlus,
  }, null, 2), 'utf-8');

  console.log('════════════════════════════════════════════════════');
  console.log(`✅ דוח מלא נשמר: app/scripts/output/extra_images_audit.json`);

  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
