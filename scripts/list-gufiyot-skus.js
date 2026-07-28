#!/usr/bin/env node

/**
 * סקריפט לשליפת כל ה-SKUs של מוצרי גופיות ציצית
 *
 * שימוש:
 * GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json node scripts/list-gufiyot-skus.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function listSKUs() {
  console.log('🔍 משלוף SKUs של גופיות ציצית...\n');

  try {
    const snapshot = await db.collection('products')
      .where('category', '==', 'gufiyot-tzitzit')
      .get();

    if (snapshot.empty) {
      console.log('⚠️  לא נמצאו מוצרים');
      process.exit(0);
    }

    console.log(`✅ נמצאו ${snapshot.size} מוצרים:\n`);

    const skus = {};
    snapshot.forEach(doc => {
      const { sku, name, imgUrl, imgUrl2, imgUrl3 } = doc.data();
      const hasImages = imgUrl || imgUrl2 || imgUrl3;

      console.log(`📦 ${name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   SKU: ${sku || '❌ אין SKU'}`);
      console.log(`   תמונות: ${hasImages ? '✅' : '❌'}`);
      console.log('');

      if (sku) {
        skus[sku] = {
          id: doc.id,
          name,
          hasImages
        };
      }
    });

    // שמור רשימה של SKUs
    const skuList = Object.keys(skus);
    fs.writeFileSync(
      './scripts/gufiyot-skus.json',
      JSON.stringify({ skus, list: skuList }, null, 2)
    );

    console.log(`\n📄 נשמרה רשימת SKUs ב-scripts/gufiyot-skus.json`);
    console.log(`\n🎯 סה"כ SKUs: ${skuList.length}`);
    console.log(`📸 בלי תמונות: ${skuList.filter(s => !skus[s].hasImages).length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

listSKUs();
