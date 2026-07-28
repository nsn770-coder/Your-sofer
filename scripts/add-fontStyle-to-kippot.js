/**
 * Script לעדכון כל כיפות בFiestore עם fontStyle
 *
 * הרץ עם: node add-fontStyle-to-kippot.js
 * דורש: Firebase Admin SDK (firebase-admin)
 *
 * צעדי הכנה:
 * 1. npm install firebase-admin
 * 2. עדכן את PATH_TO_SERVICE_ACCOUNT
 */

const admin = require('firebase-admin');

// עדכן את הנתיב לקובץ Service Account שלך
const serviceAccount = require('../your-sofer-firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addFontStyleToKippot() {
  try {
    console.log('🔄 מתחיל לעדכן כיפות...');

    // קבל את כל המוצרים שלהם cat === 'כיפות'
    const snapshot = await db
      .collection('products')
      .where('cat', '==', 'כיפות')
      .get();

    console.log(`📊 נמצאו ${snapshot.size} כיפות`);

    if (snapshot.empty) {
      console.log('❌ לא נמצאו כיפות');
      return;
    }

    let updated = 0;
    let skipped = 0;

    // עדכן כל מוצר
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // אם כבר יש fontStyle, דלג
      if (data.fontStyle) {
        console.log(`⏭️  דלג: ${data.name} (כבר יש fontStyle: ${data.fontStyle})`);
        skipped++;
        continue;
      }

      // ברירת מחדל: fontStyle הראשון (font1)
      // או תוכל להוסיף לוגיקה לבחירה כמו בחישוב hash מהשם
      const defaultFont = 'font1';

      await db.collection('products').doc(doc.id).update({
        fontStyle: defaultFont,
      });

      console.log(`✅ עודכן: ${data.name} → ${defaultFont}`);
      updated++;
    }

    console.log(`\n📈 סיכום:`);
    console.log(`   ✅ עודכנו: ${updated}`);
    console.log(`   ⏭️  דלוגו: ${skipped}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

// הרץ את הפונקציה
addFontStyleToKippot();
