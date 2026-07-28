#!/usr/bin/env node

const https = require('https');

const PROJECT_ID = 'your-sofer';
const API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

function fetchFirestore(pageToken = null) {
  return new Promise((resolve, reject) => {
    let query = 'pageSize=100';
    if (pageToken) query += `&pageToken=${pageToken}`;

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

async function showCategories() {
  console.log('🔍 סריקת כל הקטגוריות...\n');

  try {
    const response = await fetchFirestore();

    if (!response.documents) {
      console.log('❌ אין documents');
      process.exit(1);
    }

    const categories = {};
    const subCategories = {};

    response.documents.forEach(doc => {
      const fields = doc.fields || {};
      const cat = fields.category?.stringValue || fields.cat?.stringValue || '(אין)';
      const subCat = fields.subCategory?.stringValue || '(אין)';
      const name = fields.name?.stringValue || '';

      // סביב קטגוריות
      if (!categories[cat]) categories[cat] = 0;
      categories[cat]++;

      // סביב תת-קטגוריות
      const key = `${cat} > ${subCat}`;
      if (!subCategories[key]) subCategories[key] = [];
      subCategories[key].push({
        name: name.substring(0, 40),
        sku: fields.sku?.stringValue || '(אין)'
      });
    });

    console.log('📊 קטגוריות ראשיות:\n');
    Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} מוצרים`);
      });

    console.log('\n\n📚 קטגוריות עם תת-קטגוריות:\n');
    Object.entries(subCategories)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 15)
      .forEach(([path, products]) => {
        console.log(`  ${path}: ${products.length} מוצרים`);
        if (products.length <= 3) {
          products.forEach(p => {
            console.log(`     - ${p.name} (${p.sku})`);
          });
        }
      });

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    process.exit(1);
  }
}

showCategories();
