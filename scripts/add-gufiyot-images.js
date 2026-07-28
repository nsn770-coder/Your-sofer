#!/usr/bin/env node

/**
 * סקריפט להוספת תמונות גופיות ציצית מהספק (israel-judaica.com)
 *
 * שימוש:
 * GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json node scripts/add-gufiyot-images.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
try {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    console.error('❌ עדיין לא הגדרת GOOGLE_APPLICATION_CREDENTIALS');
    console.error('💡 דוגמה:');
    console.error('   export GOOGLE_APPLICATION_CREDENTIALS="./firebase-admin-key.json"');
    console.error('   node scripts/add-gufiyot-images.js');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  console.error('❌ שגיאה בהגדרת Firebase Admin:', e.message);
  process.exit(1);
}

const db = admin.firestore();

/**
 * Mapping בין SKU לתמונות הספק
 * עדכן זה עם הנתונים שלך
 */
const SKU_TO_SUPPLIER_IMAGES = {
  // דוגמה:
  // 'UK65097': ['https://israel-judaica.com/images/products/1234.jpg', ...],
};

/**
 * מצא כל המוצרים בקטגוריה gufiyot-tzitzit
 */
async function getGufiyotProducts() {
  console.log('🔍 משלוף מוצרים מקטגוריית גופיות ציצית...\n');

  try {
    const snapshot = await db.collection('products')
      .where('category', '==', 'gufiyot-tzitzit')
      .get();

    if (snapshot.empty) {
      console.log('⚠️  לא נמצאו מוצרים בקטגוריה gufiyot-tzitzit');
      return [];
    }

    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ נמצאו ${products.length} מוצרים\n`);
    return products;
  } catch (error) {
    console.error('❌ שגיאה בשליפת מוצרים:', error.message);
    return [];
  }
}

/**
 * הוסף תמונות לכל מוצר
 */
async function addImagesToProducts(products) {
  console.log('📸 מוסיף תמונות...\n');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    const { id, sku, name, imgUrl, imgUrl2, imgUrl3 } = product;

    console.log(`📦 ${name} (SKU: ${sku || 'אין'})`);

    // בדוק אם יש mapping לתמונות הספק
    if (!sku || !SKU_TO_SUPPLIER_IMAGES[sku]) {
      console.log(`  ℹ️  אין mapping לתמונות - דלגתי\n`);
      skippedCount++;
      continue;
    }

    const supplierImages = SKU_TO_SUPPLIER_IMAGES[sku];

    // בנה עדכון (הוסף רק אם חסר)
    const updateData = {};
    if (!imgUrl && supplierImages[0]) {
      updateData.imgUrl = supplierImages[0];
    }
    if (!imgUrl2 && supplierImages[1]) {
      updateData.imgUrl2 = supplierImages[1];
    }
    if (!imgUrl3 && supplierImages[2]) {
      updateData.imgUrl3 = supplierImages[2];
    }

    if (Object.keys(updateData).length === 0) {
      console.log(`  ✔️  יש כבר תמונות - דלגתי\n`);
      skippedCount++;
      continue;
    }

    try {
      await db.collection('products').doc(id).update(updateData);
      console.log(`  ✅ עודכנו: ${Object.keys(updateData).join(', ')}\n`);
      updatedCount++;
    } catch (error) {
      console.error(`  ❌ שגיאה: ${error.message}\n`);
      skippedCount++;
    }
  }

  console.log(`📊 סיכום:`);
  console.log(`  ✅ עודכנו: ${updatedCount}`);
  console.log(`  ⏭️  דלגו: ${skippedCount}`);
  console.log(`  📋 סה"כ: ${products.length}`);
}

/**
 * ראשי
 */
async function main() {
  console.log('🚀 התחלת תהליך הוספת תמונות גופיות ציצית\n');

  // בדוק אם יש mapping
  if (Object.keys(SKU_TO_SUPPLIER_IMAGES).length === 0) {
    console.error('❌ אין mapping בין SKUs לתמונות הספק');
    console.error('💡 עדכן את SKU_TO_SUPPLIER_IMAGES בסקריפט זה');
    console.error('\nדוגמה:');
    console.error(`const SKU_TO_SUPPLIER_IMAGES = {
  'UK65097': [
    'https://israel-judaica.com/images/products/12345.jpg',
    'https://israel-judaica.com/images/products/12345_2.jpg',
    'https://israel-judaica.com/images/products/12345_3.jpg'
  ],
  // ... עוד SKUs
};`);
    process.exit(1);
  }

  const products = await getGufiyotProducts();
  if (products.length === 0) {
    process.exit(1);
  }

  await addImagesToProducts(products);
  process.exit(0);
}

main().catch(error => {
  console.error('❌ שגיאה קריטית:', error);
  process.exit(1);
});
