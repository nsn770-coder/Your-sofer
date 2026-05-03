/**
 * imageAudit.mjs
 * Read-only audit — no Firestore writes.
 * Checks image counts and duplicate URLs per product.
 * Output: app/scripts/image-audit.json
 */

import { writeFileSync } from 'fs';
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

const IMG_FIELDS = ['imgUrl', 'imgUrl2', 'imgUrl3', 'imgUrl4', 'imgUrl5', 'imgUrl6'];

function collectUrls(product) {
  const urls = [];

  for (const field of IMG_FIELDS) {
    const val = product[field];
    if (val && typeof val === 'string' && val.trim()) {
      urls.push({ field, url: val.trim() });
    }
  }

  // Also check any array field named "images"
  if (Array.isArray(product.images)) {
    product.images.forEach((url, i) => {
      if (url && typeof url === 'string' && url.trim()) {
        urls.push({ field: `images[${i}]`, url: url.trim() });
      }
    });
  }

  return urls;
}

function findDuplicates(urlEntries) {
  const seen = new Map();
  for (const entry of urlEntries) {
    const list = seen.get(entry.url) || [];
    list.push(entry.field);
    seen.set(entry.url, list);
  }
  const dupes = [];
  for (const [url, fields] of seen) {
    if (fields.length > 1) dupes.push({ url, fields });
  }
  return dupes;
}

async function run() {
  console.log('🔍 טוען מוצרים פעילים מ-Firestore...');
  const snap = await getDocs(collection(db, 'products'));
  const allDocs = [];
  snap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));

  const active = allDocs.filter(p => p.status === 'active');
  console.log(`✅ נמצאו ${active.length} מוצרים פעילים (מתוך ${allDocs.length} סה"כ)\n`);

  const countBuckets = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
  const withDuplicates = [];
  const moreThanThree = [];
  let totalExtraImages = 0;

  for (const p of active) {
    const urlEntries = collectUrls(p);
    const count = urlEntries.length;

    // Bucket by count
    if (count <= 6) {
      countBuckets[count] = (countBuckets[count] || 0) + 1;
    } else {
      countBuckets['7+'] = (countBuckets['7+'] || 0) + 1;
    }

    // Detect duplicates
    const dupes = findDuplicates(urlEntries);
    if (dupes.length > 0) {
      const extraFromDupes = dupes.reduce((sum, d) => sum + d.fields.length - 1, 0);
      totalExtraImages += extraFromDupes;
      withDuplicates.push({
        id: p.id,
        name: p.name || '(ללא שם)',
        cat: p.cat || p.category || '',
        totalImages: count,
        duplicates: dupes,
        extraCount: extraFromDupes,
      });
    }

    // Flag products with more than 3 images
    if (count > 3) {
      moreThanThree.push({
        id: p.id,
        name: p.name || '(ללא שם)',
        cat: p.cat || p.category || '',
        totalImages: count,
        fields: urlEntries.map(e => e.field),
      });
    }
  }

  // Sort: most duplicates first
  withDuplicates.sort((a, b) => b.extraCount - a.extraCount);
  moreThanThree.sort((a, b) => b.totalImages - a.totalImages);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalActive: active.length,
      imageCounts: countBuckets,
      productsWithDuplicates: withDuplicates.length,
      productsWithMoreThan3Images: moreThanThree.length,
      totalExtraDuplicateImages: totalExtraImages,
    },
    productsWithDuplicates: withDuplicates,
    productsWithMoreThan3Images: moreThanThree,
  };

  const outPath = resolve(__dir, 'image-audit.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  // ── Console report ────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════');
  console.log('📋 דוח ביקורת תמונות מוצרים');
  console.log('════════════════════════════════════════');
  console.log(`סה"כ מוצרים פעילים: ${active.length}`);
  console.log('\n📊 התפלגות מספר תמונות למוצר:');
  for (const [k, v] of Object.entries(countBuckets)) {
    if (v > 0) console.log(`   ${k} תמונות: ${v} מוצרים`);
  }

  console.log('────────────────────────────────────────');
  console.log(`🔁 מוצרים עם תמונות כפולות:    ${withDuplicates.length}`);
  console.log(`📦 מוצרים עם יותר מ-3 תמונות:  ${moreThanThree.length}`);
  console.log(`🗑️  סה"כ תמונות עודפות (כפולות): ${totalExtraImages}`);

  if (withDuplicates.length > 0) {
    console.log('\n⚠️  דוגמאות מוצרים עם כפולות:');
    for (const p of withDuplicates.slice(0, 5)) {
      console.log(`\n  ${p.name} (${p.cat})`);
      for (const d of p.duplicates) {
        console.log(`    כפול בשדות: ${d.fields.join(', ')}`);
        console.log(`    URL: ${d.url.substring(0, 80)}...`);
      }
    }
  }

  if (moreThanThree.length > 0) {
    console.log('\n📦 מוצרים עם יותר מ-3 תמונות (ראשונים):');
    for (const p of moreThanThree.slice(0, 10)) {
      console.log(`   ${p.name} — ${p.totalImages} תמונות (${p.fields.join(', ')})`);
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log('📁 הדוח נשמר ב: app/scripts/image-audit.json');

  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
