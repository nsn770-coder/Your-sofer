#!/usr/bin/env node

/**
 * סקריפט לשליפת SKUs של טליתות וציציות
 */

const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'your-sofer';
const API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

function fetchFirestore(query) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?${query}&key=${API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getSKUs() {
  console.log('🔍 משלוף SKUs של טליתות וציציות...\n');

  try {
    const response = await fetchFirestore('pageSize=100');

    if (!response.documents) {
      console.log('❌ לא קיבלנו documents');
      process.exit(1);
    }

    console.log(`✅ סה"כ ${response.documents.length} מוצרים\n`);

    // סנן לפי קטגוריה טליתות וציציות
    const taliyotProducts = response.documents.filter(doc => {
      const fields = doc.fields || {};
      const cat = fields.category?.stringValue || fields.cat?.stringValue || '';
      const subCat = fields.subCategory?.stringValue || '';

      return cat === 'taliyot-ve-tzitzit' ||
             cat === 'טליתות וציציות' ||
             cat.includes('taliyot') ||
             subCat === 'gufiyot-tzitzit' ||
             subCat === 'גופיות ציצית';
    });

    console.log(`\n📦 מוצרים בקטגוריה טליתות וציציות: ${taliyotProducts.length}\n`);

    const skuList = [];
    taliyotProducts.forEach((doc, idx) => {
      const fields = doc.fields || {};
      const name = fields.name?.stringValue || '(ללא שם)';
      const sku = fields.sku?.stringValue || null;
      const imgUrl = fields.imgUrl?.stringValue || null;
      const imgUrl2 = fields.imgUrl2?.stringValue || null;
      const imgUrl3 = fields.imgUrl3?.stringValue || null;

      console.log(`${idx + 1}. ${name.substring(0, 50)}`);
      console.log(`   SKU: ${sku || '❌ אין'}`);
      console.log(`   תמונות: ${imgUrl ? '✅' : '❌'} ${imgUrl2 ? '✅' : '❌'} ${imgUrl3 ? '✅' : '❌'}`);
      console.log('');

      if (sku) {
        skuList.push({
          sku,
          name,
          id: doc.name.split('/').pop(),
          hasImages: !!(imgUrl || imgUrl2 || imgUrl3)
        });
      }
    });

    // שמור
    fs.writeFileSync(
      './scripts/taliyot-skus.json',
      JSON.stringify(skuList, null, 2)
    );

    console.log(`\n✅ נשמרה רשימה ב-scripts/taliyot-skus.json`);
    console.log(`\n📊 סיכום:`);
    console.log(`   סה"כ SKUs: ${skuList.length}`);
    console.log(`   ללא תמונות: ${skuList.filter(s => !s.hasImages).length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    process.exit(1);
  }
}

getSKUs();
