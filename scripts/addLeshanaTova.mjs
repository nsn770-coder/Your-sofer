/**
 * addLeshanaTova.mjs — הוספה חד-פעמית של ברכון "לשנה טובה" משמחונים
 * לדף כיפות לאירועים, אזור ברכונים (eventScrollSection: 'birkonim').
 *
 * מקור: https://simchonim.co.il/products-catalog/holidays/tishrei-holidays-holidays/סדר-הסימנים/לשנה-טובה/
 * מחיר: 3.80 ₪ | לפני הנחה: 6.00 ₪ | מק"ט ספק: 998312
 *
 * Usage:
 *   node scripts/addLeshanaTova.mjs             ← DRY-RUN (תצוגה בלבד)
 *   node scripts/addLeshanaTova.mjs --execute   ← יצירה בפועל
 *
 * אחרי --execute: סנכרון אלגוליה מהאדמין (הגדרות אתר → סנכרן חיפוש).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET  = 'yoursofer_upload';

// תוספות שמחונים הקבועות — זהות ל-importSimchonim.mjs
const SIMCHONIM_ADDONS = [
  { id: 'dedication',   label: 'הטבעת הקדשה',                price: 140,  pricing: 'flat',    minQty: 30, requiresText: true },
  { id: 'name-imprint', label: 'הטבעת שם',                   price: 14,   pricing: 'perUnit', requiresText: true },
  { id: 'giftwrap',     label: 'אריזת מתנה (צלופן + סרט)',   price: 4.4,  pricing: 'perUnit' },
];

const PRODUCT = {
  name: 'לשנה טובה — ברכון לראש השנה',
  desc: [
    'סדר הקידוש לליל ראש השנה וסדר הסימנים, מתקפל לשלוש.',
    'עיצוב יפהפה בתוספת הטבעות כסף, כולל ברכת המזון.',
    '',
    'אורך: 20 ס"מ | רוחב: 10 ס"מ',
  ].join('\n'),
  price: 3.8,
  was: 6,
  sku: 'SIM-998312',
  sourceUrl: 'https://simchonim.co.il/products-catalog/holidays/tishrei-holidays-holidays/%d7%a1%d7%93%d7%a8-%d7%94%d7%a1%d7%99%d7%9e%d7%a0%d7%99%d7%9d/%d7%9c%d7%a9%d7%a0%d7%94-%d7%98%d7%95%d7%91%d7%94/',
  supplierProductId: '4337',
  images: [
    'https://simchonim.co.il/wp-content/uploads/2015/08/leshana-tova.jpg',
    'https://simchonim.co.il/wp-content/uploads/2015/08/leshana-tova1.jpg',
    'https://simchonim.co.il/wp-content/uploads/2016/08/wsi-imageoptim-leshana1.jpg',
    'https://simchonim.co.il/wp-content/uploads/2016/08/wsi-imageoptim-leshana2.jpg',
  ],
  variantOptions: [
    { name: 'נוסח', values: ['אשכנזי', 'עדות המזרח - כמנהג הספרדים'] },
  ],
};

// ── Firebase Admin ────────────────────────────────────────────────────────────
const sa = JSON.parse(
  readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
);
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

async function main() {
  // הגנה מכפילות לפי SKU
  const dup = await db.collection('products').where('sku', '==', PRODUCT.sku).get();
  if (!dup.empty) {
    console.log(`⚠️ מוצר עם SKU ${PRODUCT.sku} כבר קיים (${dup.docs[0].id}) — לא נוצר כפול.`);
    return;
  }

  console.log(`${EXECUTE ? '🚀 EXECUTE' : '🔍 DRY-RUN'} — ${PRODUCT.name}`);
  console.log(`   מחיר: ₪${PRODUCT.price} (לפני הנחה ₪${PRODUCT.was}) | SKU: ${PRODUCT.sku}`);
  console.log(`   תמונות: ${PRODUCT.images.length} | סקרול: ברכונים (birkonim)`);
  if (!EXECUTE) { console.log('\nהרץ עם --execute ליצירה בפועל.'); return; }

  const cloudUrls = [];
  for (const src of PRODUCT.images) {
    process.stdout.write(`   ☁️ מעלה תמונה ${cloudUrls.length + 1}/${PRODUCT.images.length} ... `);
    try { cloudUrls.push(await uploadToCloudinary(src)); console.log('✅'); }
    catch (e) { console.log(`⚠️ נכשל (${e.message.slice(0, 60)}) — שומר URL מקורי`); cloudUrls.push(src); }
  }

  const docData = {
    name:               PRODUCT.name,
    desc:               PRODUCT.desc,
    price:              PRODUCT.price,
    was:                PRODUCT.was,
    imgUrl:             cloudUrls[0] ?? '',
    images:             cloudUrls,
    sku:                PRODUCT.sku,
    cat:                'מזכרות לאירועים',
    category:           'מזכרות לאירועים',
    subCategory:        '',
    priority:           50,
    isBestSeller:       false,
    badge:              null,
    status:             'active',
    isEventProduct:     true,
    eventScrollSection: 'birkonim',
    addons:             SIMCHONIM_ADDONS,
    variantOptions:     PRODUCT.variantOptions,
    source:             'simchonim',
    sourceUrl:          PRODUCT.sourceUrl,
    supplierProductId:  PRODUCT.supplierProductId,
    createdAt:          FieldValue.serverTimestamp(),
  };
  if (cloudUrls[1]) docData.imgUrl2 = cloudUrls[1];
  if (cloudUrls[2]) docData.imgUrl3 = cloudUrls[2];
  if (cloudUrls[3]) docData.imgUrl4 = cloudUrls[3];

  const ref = await db.collection('products').add(docData);
  console.log(`\n✅ נוצר בהצלחה: ${ref.id}`);
  console.log('   יופיע בדף כיפות לאירועים → סקרול ברכונים.');
  console.log('   אל תשכח: סנכרון אלגוליה מהאדמין.');
}

main().then(() => process.exit(0)).catch(e => { console.error('❌', e); process.exit(1); });
