#!/usr/bin/env node

const https = require('https');

const PROJECT_ID = 'your-sofer';
const API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';

function fetchFirestore(query) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?${query}&key=${API_KEY}`;

    console.log('🌐 הקריאה לAPI:', url.split('&key=')[0]);

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          console.error('❌ שגיאה ב-parse JSON:', e.message);
          console.log('Response:', data.substring(0, 200));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function checkProducts() {
  console.log('🔍 בדיקת מוצרים...\n');

  try {
    const response = await fetchFirestore('pageSize=50');

    if (response.error) {
      console.error('❌ Firebase API error:', response.error.message);
      process.exit(1);
    }

    if (!response.documents) {
      console.log('⚠️  לא קיבלנו documents');
      console.log('Response:', JSON.stringify(response, null, 2).substring(0, 500));
      process.exit(0);
    }

    console.log(`✅ נמצאו ${response.documents.length} מוצרים\n`);

    const categories = {};
    response.documents.slice(0, 20).forEach(doc => {
      const fields = doc.fields || {};
      const category = fields.category?.stringValue || fields.cat?.stringValue || 'אין';
      const name = fields.name?.stringValue || '(ללא שם)';
      const sku = fields.sku?.stringValue || '(אין SKU)';

      if (!categories[category]) categories[category] = 0;
      categories[category]++;

      console.log(`📦 ${name.substring(0, 40)}`);
      console.log(`   Category: ${category}`);
      console.log(`   SKU: ${sku}`);
      console.log('');
    });

    console.log('\n📊 קטגוריות שמצאנו:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} מוצרים`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error.message);
    process.exit(1);
  }
}

checkProducts();
