/**
 * fixUK18866.mjs
 * PIwZUG2FYDmfwp19ZK4t (keeper, 10 הזמנות) ← sku=UK19149
 * 3vVCHYoqYcUe9ilMgeca (נמחק, sku=UK19149 הנכון)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { algoliasearch } from 'algoliasearch';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
    clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
    privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  })});
}
const db = getFirestore();

const algoliaClient = (() => {
  const appId = process.env.ALGOLIA_APP_ID ?? '';
  const key   = process.env.ALGOLIA_ADMIN_KEY ?? '';
  return appId && key ? algoliasearch(appId, key) : null;
})();

const KEEPER  = 'PIwZUG2FYDmfwp19ZK4t';
const TO_DEL  = '3vVCHYoqYcUe9ilMgeca';
const NEW_SKU = 'UK19149';
const sep     = '═'.repeat(66);

function videoFields(d) {
  const f = {};
  if (d.videoUrl   != null) f.videoUrl   = d.videoUrl;
  if (d.video_url  != null) f.video_url  = d.video_url;
  if (d.videoThumb != null) f.videoThumb = d.videoThumb;
  return f;
}
function hasVideo(d) { return !!(d.videoUrl ?? d.video_url); }

// ── 1. טען שני המסמכים ───────────────────────────────────────────────────────
console.log(sep);
console.log('  fixUK18866 — PIwZUG2FYDmfwp19ZK4t → sku=UK19149');
console.log(sep + '\n');

const keeperDoc = await db.collection('products').doc(KEEPER).get();
const delDoc    = await db.collection('products').doc(TO_DEL).get();
if (!keeperDoc.exists) throw new Error(`KEEPER לא נמצא: ${KEEPER}`);
if (!delDoc.exists)    throw new Error(`TO_DEL לא נמצא: ${TO_DEL}`);

const kd = keeperDoc.data();
const dd = delDoc.data();

console.log('  מסמכים שנטענו:');
console.log(`    keeper  ${KEEPER}: sku=${kd.sku}, name="${kd.name}", videoUrl=${kd.videoUrl ?? 'null'}`);
console.log(`    to_del  ${TO_DEL}: sku=${dd.sku}, name="${dd.name}", videoUrl=${dd.videoUrl ?? 'null'}\n`);

// ── 2. בדיקת בטיחות — האם UK19149 תפוס ע"י מישהו שלישי ────────────────────
console.log('  בדיקת בטיחות: האם UK19149 תפוס ע"י מסמך שלישי...');
const uk19snap = await db.collection('products').where('sku', '==', NEW_SKU).get();
const others = uk19snap.docs.filter(d => d.id !== TO_DEL && d.id !== KEEPER);
if (others.length > 0) {
  console.error(`  ⛔ STOP — UK19149 תפוס ע"י מסמך שלישי:`);
  for (const o of others) console.error(`     ${o.id} | ${o.data().name}`);
  process.exit(1);
}
console.log(`  ✅ UK19149 תפוס רק ע"י ${TO_DEL} (שאנחנו מוחקים) — בטוח להמשיך.\n`);

// ── 3. מיזוג וידאו אם צריך ──────────────────────────────────────────────────
const delVid    = videoFields(dd);
const keeperHasVid = hasVideo(kd);
let videoMerged = false;

console.log('  בדיקת וידאו:');
console.log(`    keeper  videoUrl = ${kd.videoUrl ?? 'null'}`);
console.log(`    to_del  videoUrl = ${dd.videoUrl ?? 'null'}`);

if (Object.keys(delVid).length > 0 && !keeperHasVid) {
  await db.collection('products').doc(KEEPER).update(delVid);
  videoMerged = true;
  console.log(`  ✅ מוזג וידאו ל-keeper:`);
  for (const [k, v] of Object.entries(delVid)) console.log(`     ${k}: ${v}`);
} else if (keeperHasVid) {
  console.log('  ℹ️  ל-keeper כבר יש וידאו — אין צורך במיזוג.');
} else {
  console.log('  ℹ️  ל-to_del אין וידאו — אין מה למזג.');
}
console.log('');

// ── 4. עדכן SKU של keeper ────────────────────────────────────────────────────
const oldSku = kd.sku;
await db.collection('products').doc(KEEPER).update({ sku: NEW_SKU });
const verifyDoc = await db.collection('products').doc(KEEPER).get();
const newSku    = verifyDoc.data().sku;
if (newSku !== NEW_SKU) throw new Error(`עדכון ה-SKU נכשל: ${newSku}`);
console.log(`  ✅ SKU עודכן: ${oldSku} → ${newSku}  (${KEEPER})\n`);

// ── 5. מחק את TO_DEL מ-Firestore ────────────────────────────────────────────
await db.collection('products').doc(TO_DEL).delete();
console.log(`  ✅ Firestore: נמחק ${TO_DEL}\n`);

// ── 6. syncAlgolia ──────────────────────────────────────────────────────────
console.log('  מריץ syncAlgolia...');
if (algoliaClient) {
  const allSnap = await db.collection('products').get();
  const records = [];
  for (const doc of allSnap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    const inStockRaw = d.inStock;
    const outOfStock = d.outOfStock === true;
    const inStock    = !outOfStock && (inStockRaw === true || (typeof inStockRaw === 'number' && inStockRaw > 0));
    records.push({
      objectID: doc.id, id: doc.id,
      name: d.name || '', sku: d.sku || '',
      price: typeof d.price === 'number' ? d.price : 0,
      cat: d.cat || d.category || '',
      subCategory: d.subCategory || d.subcategory || '',
      image: d.imgUrl || d.image_url || '',
      description: (d.desc || d.description || '').slice(0, 500),
      styleTag: Array.isArray(d.styleTag) ? d.styleTag : [],
      lookTag: d.lookTag || '', collection: d.collection || '',
      soferName: d.soferName || '', inStock,
      createdAt: d.createdAt?.seconds ?? 0,
      isBestSeller: d.isBestSeller === true,
      badge: d.badge ?? null,
      was: typeof d.was === 'number' ? d.was : null,
      priority: typeof d.priority === 'number' ? d.priority : 0,
      outOfStock: d.outOfStock === true,
    });
  }
  await algoliaClient.replaceAllObjects({ indexName: 'products', objects: records });
  console.log(`  ✅ Algolia מסונכרן — ${records.length} מוצרים פעילים\n`);
} else {
  console.log('  ⚠️  Algolia לא מוגדר\n');
}

// ── 7. בדיקת הזמנות — ודא שלא נשברו ─────────────────────────────────────────
console.log('  בודק הזמנות מקושרות ל-keeper...');
const ordersSnap = await db.collection('orders').get();
let orderCount = 0;
for (const order of ordersSnap.docs) {
  for (const item of (order.data().items ?? [])) {
    const pid = item.productId ?? item.id;
    if (pid === KEEPER) orderCount++;
  }
}
console.log(`  ✅ הזמנות שמצאתי עם productId=${KEEPER}: ${orderCount}\n`);

// ── סיכום ───────────────────────────────────────────────────────────────────
console.log(sep);
console.log('  סיכום');
console.log(sep);
console.log(`  keeper  : ${KEEPER}`);
console.log(`  SKU     : ${oldSku} → ${NEW_SKU}`);
console.log(`  וידאו   : ${videoMerged ? 'מוזג מ-' + TO_DEL : 'לא נדרש'}`);
console.log(`  נמחק    : ${TO_DEL}  (Firestore)`);
console.log(`  Algolia : מסונכרן (replaceAllObjects)`);
console.log(`  הזמנות  : ${orderCount} הזמנות עדיין מפנות ל-${KEEPER} לפי document ID — לא נשברו`);
console.log(sep);

process.exit(0);
