#!/usr/bin/env node

/**
 * סקריפט לשליפת כל ה-SKUs של מוצרי גופיות ציצית
 * משתמש ב-Firebase REST API (לא דורש credentials)
 *
 * שימוש:
 * node scripts/list-gufiyot-skus-rest.js
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

async function listSKUs() {
  console.log('🔍 משלוף SKUs של גופיות ציצית דרך REST API...\n');

  try {
    // שליפת כל המוצרים בקטגוריה gufiyot-tzitzit
    const response = await fetchFirestore(
      'pageSize=1000&orderBy.field.path=name'
    );

    if (!response.documents || response.documents.length === 0) {
      console.log('⚠️  לא נמצאו מוצרים');
      process.exit(0);
    }

    console.log(`✅ נמצאו ${response.documents.length} מוצרים\n`);

    const gufiyotProducts = [];

    response.documents.forEach(doc => {
      const fields = doc.fields || {};
      const category = fields.category?.stringValue || fields.cat?.stringValue || '';
      const subCategory = fields.subCategory?.stringValue || '';

      // סנן לפי קטגוריה
      if (category === 'gufiyot-tzitzit' || subCategory === 'gufiyot-tzitzit') {
        const product = {
          id: doc.name.split('/').pop(),
          name: fields.name?.stringValue || '(ללא שם)',
          sku: fields.sku?.stringValue || null,
          category,
          subCategory,
          imgUrl: fields.imgUrl?.stringValue || null,
          imgUrl2: fields.imgUrl2?.stringValue || null,
          imgUrl3: fields.imgUrl3?.stringValue || null,
        };

        gufiyotProducts.push(product);

        const hasImages = product.imgUrl || product.imgUrl2 || product.imgUrl3;
        console.log(`📦 ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   SKU: ${product.sku || '❌ אין SKU'}`);
        console.log(`   תמונות: ${hasImages ? '✅' : '❌'}`);
        console.log('');
      }
    });

    if (gufiyotProducts.length === 0) {
      console.log('⚠️  לא נמצאו מוצרים בקטגוריה gufiyot-tzitzit');
      process.exit(0);
    }

    // שמור רשימה של SKUs
    const skuData = {};
    gufiyotProducts.forEach(p => {
      if (p.sku) {
        skuData[p.sku] = {
          id: p.id,
          name: p.name,
          hasImages: p.imgUrl || p.imgUrl2 || p.imgUrl3
        };
      }
    });

    fs.writeFileSync(
      './scripts/gufiyot-data.json',
      JSON.stringify({
        products: gufiyotProducts,
        skus: skuData,
        skuList: Object.keys(skuData)
      }, null, 2)
    );

    console.log(`\n📄 נשמרה רשימה ב-scripts/gufiyot-data.json`);
    console.log(`\n🎯 סה"כ מוצרים בקטגוריה: ${gufiyotProducts.length}`);
    console.log(`🏷️  סה"כ SKUs: ${Object.keys(skuData).length}`);
    console.log(`📸 ללא תמונות: ${Object.values(skuData).filter(s => !s.hasImages).length}`);

    // הדפס מוצרים ללא תמונות
    const noImages = Object.entries(skuData).filter(([_, v]) => !v.hasImages);
    if (noImages.length > 0) {
      console.log(`\n⚠️  מוצרים ללא תמונות:`);
      noImages.forEach(([sku, data]) => {
        console.log(`   ${sku} - ${data.name}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    process.exit(1);
  }
}

listSKUs();
