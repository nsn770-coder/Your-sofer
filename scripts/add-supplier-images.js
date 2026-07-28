/**
 * סקריפט להוספת תמונות מהספק (israel-judaica.com) לFirestore
 *
 * שימוש:
 * node scripts/add-supplier-images.js
 *
 * הנח:
 * 1. יש לך Firestore Admin credentials
 * 2. יש לך mapping בין SKU של YourSofer לבין קודי מוצרים של הספק
 * 3. התמונות של הספק בנוסחה קבועה: https://www.israel-judaica.com/images/products/[CODE].jpg
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, '../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ לא נמצא קובץ Firestore credentials ב:', serviceAccountPath);
  console.error('❌ הגדר FIREBASE_SERVICE_ACCOUNT_PATH או העתק את קובץ הcredentials');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'your-sofer',
});

const db = admin.firestore();

/**
 * Mapping בין SKU של YourSofer לבין קודי מוצרים של הספק
 * עדכן זה לפי הנתונים שלך
 */
const SKU_MAPPING = {
  // דוגמה:
  // 'UK65097': '12345', // SKU של YourSofer -> קוד בספק
  // 'UK65098': '12346',
};

/**
 * קבל תמונות מהספק עבור קוד מוצר
 */
async function getSupplierImages(supplierCode) {
  try {
    const baseUrl = `https://www.israel-judaica.com/images/products/${supplierCode}`;
    const images = [];

    // נסה URL ראשוני
    const response = await fetch(`${baseUrl}.jpg`);
    if (response.ok) {
      images.push(response.url);
    }

    // נסה וריאציות (תמונה 1, 2, 3)
    for (let i = 2; i <= 5; i++) {
      const variantUrl = `${baseUrl}_${i}.jpg`;
      const variantResponse = await fetch(variantUrl);
      if (variantResponse.ok) {
        images.push(variantResponse.url);
      }
    }

    return images;
  } catch (error) {
    console.error(`⚠️  שגיאה בהשלוף תמונות לקוד ${supplierCode}:`, error.message);
    return [];
  }
}

/**
 * הוסף תמונות ל-Firestore
 */
async function addSupplierImages() {
  console.log('🔄 מתחיל להוספת תמונות מהספק...\n');

  let updatedCount = 0;
  let skippedCount = 0;

  for (const [sku, supplierCode] of Object.entries(SKU_MAPPING)) {
    try {
      console.log(`📦 עיבוד ${sku} (קוד ספק: ${supplierCode})...`);

      // מצא מוצר ב-Firestore לפי SKU
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('sku', '==', sku));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(`  ⚠️  לא נמצא מוצר עם SKU ${sku}`);
        skippedCount++;
        continue;
      }

      const doc = snapshot.docs[0];
      const productData = doc.data();

      // השלוף תמונות מהספק
      const supplierImages = await getSupplierImages(supplierCode);

      if (supplierImages.length === 0) {
        console.log(`  ⚠️  לא נמצאו תמונות לקוד ספק ${supplierCode}`);
        skippedCount++;
        continue;
      }

      // הוסף תמונות ל-Firestore (לא החלף קיימות, רק הוסף)
      const updateData = {};

      // הוסף תמונות בשדות ריקים
      if (!productData.imgUrl && supplierImages[0]) {
        updateData.imgUrl = supplierImages[0];
      }
      if (!productData.imgUrl2 && supplierImages[1]) {
        updateData.imgUrl2 = supplierImages[1];
      }
      if (!productData.imgUrl3 && supplierImages[2]) {
        updateData.imgUrl3 = supplierImages[2];
      }

      if (Object.keys(updateData).length === 0) {
        console.log(`  ℹ️  יש כבר תמונות, דלגתי`);
        skippedCount++;
        continue;
      }

      // עדכן ב-Firestore
      await doc.ref.update(updateData);
      console.log(`  ✅ עודכן: ${Object.keys(updateData).join(', ')}`);
      updatedCount++;

    } catch (error) {
      console.error(`  ❌ שגיאה: ${error.message}`);
      skippedCount++;
    }
  }

  console.log(`\n📊 סיכום:`);
  console.log(`  ✅ עודכנו: ${updatedCount}`);
  console.log(`  ⏭️  דלגו: ${skippedCount}`);
  console.log(`  📋 סה"כ: ${Object.keys(SKU_MAPPING).length}`);

  process.exit(0);
}

// השתמש ב-require כדי לייבא Firestore functions
const { collection, query, where, getDocs } = require('firebase-admin/firestore');

addSupplierImages().catch(error => {
  console.error('❌ שגיאה:', error);
  process.exit(1);
});
