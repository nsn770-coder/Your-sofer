#!/usr/bin/env node

/**
 * סקריפט להוספת תמונות לפי SKU
 *
 * שימוש:
 * node scripts/add-images-by-sku.js
 *
 * צריך לעדכן את SKU_IMAGES object עם:
 * SKU -> מערך של URLs של תמונות מהספק
 */

const https = require('https');

const PROJECT_ID = 'your-sofer';
const API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

// עדכן את זה עם SKUs של גופיות ציצית ותמונות הספק
const SKU_IMAGES = {
  'UK65097': [
    'https://www.israel-judaica.com/images/products/uk65097_1.jpg',
    'https://www.israel-judaica.com/images/products/uk65097_2.jpg',
    'https://www.israel-judaica.com/images/products/uk65097_3.jpg',
  ],
  // הוסף עוד SKUs כאן
};

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://firestore.googleapis.com${path}`);
    url.searchParams.set('key', API_KEY);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function findProductBySku(sku) {
  console.log(`  🔍 חיפוש SKU ${sku}...`);

  try {
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/products`;
    const response = await makeRequest('GET', path);

    if (!response.documents) {
      console.log(`  ❌ לא נמצאו מוצרים`);
      return null;
    }

    const product = response.documents.find(doc => {
      const fields = doc.fields || {};
      return fields.sku?.stringValue === sku;
    });

    if (!product) {
      console.log(`  ❌ לא נמצא מוצר עם SKU ${sku}`);
      return null;
    }

    return {
      id: product.name.split('/').pop(),
      path: product.name,
      data: product.fields
    };
  } catch (error) {
    console.error(`  ❌ שגיאה בחיפוש: ${error.message}`);
    return null;
  }
}

async function updateProductImages(productPath, images) {
  try {
    const updateMask = [];
    const updateData = {};

    const fields = ['imgUrl', 'imgUrl2', 'imgUrl3'];
    fields.forEach((field, idx) => {
      if (images[idx]) {
        updateData[field] = { stringValue: images[idx] };
        updateMask.push(field);
      }
    });

    if (updateMask.length === 0) {
      console.log(`  ℹ️  אין תמונות להוסיף`);
      return false;
    }

    const body = {
      fields: updateData,
      mask: { fieldPaths: updateMask }
    };

    const maskString = updateMask.map(f => `updateMask.fieldPaths=${f}`).join('&');
    const path = `/v1/${productPath}?${maskString}`;

    const response = await makeRequest('PATCH', path, body);

    if (response.error) {
      console.error(`  ❌ שגיאה API: ${response.error.message}`);
      return false;
    }

    console.log(`  ✅ עודכנו: ${updateMask.join(', ')}`);
    return true;
  } catch (error) {
    console.error(`  ❌ שגיאה בעדכון: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 התחלת הוספת תמונות לפי SKU\n');

  if (Object.keys(SKU_IMAGES).length === 0) {
    console.error('❌ אין SKUs בהגדרה');
    console.error('עדכן את SKU_IMAGES בקובץ זה');
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const [sku, images] of Object.entries(SKU_IMAGES)) {
    console.log(`\n📦 עיבוד SKU: ${sku}`);

    const product = await findProductBySku(sku);
    if (!product) {
      skipped++;
      continue;
    }

    const success = await updateProductImages(product.path, images);
    if (success) {
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n\n📊 סיכום:`);
  console.log(`  ✅ עודכנו: ${updated}`);
  console.log(`  ⏭️  דלגו: ${skipped}`);
  console.log(`  📋 סה"כ: ${Object.keys(SKU_IMAGES).length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('❌ שגיאה:', error.message);
  process.exit(1);
});
