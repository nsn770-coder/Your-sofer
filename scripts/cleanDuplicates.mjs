/**
 * cleanDuplicates.mjs
 *
 * שלב A — UK81978: מיזוג וידאו + מחיקת הכפל
 * שלב B — 854 כפילויות ללא הזמנות: מיזוג וידאו היכן צריך + מחיקה + syncAlgolia
 * שלב C — 5 SKUs עם הזמנות (חוץ מ-UK18866): מחיקת המפסיד + Algolia
 * שלב D — UK18866: הצגה בלבד, ללא מחיקה
 *
 * לא מוחק שום דבר ללא תיעוד ובדיקה קודמת.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { algoliasearch } from 'algoliasearch';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ───────────────────────────────────────────────────────────────────────
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
  if (!appId || !key) { console.warn('⚠️  Algolia לא מוגדר — מדלג על מחיקות Algolia בודדות'); return null; }
  return algoliasearch(appId, key);
})();

// ── helpers ───────────────────────────────────────────────────────────────────
const sep  = '═'.repeat(66);
const sep2 = '─'.repeat(66);

function ts(val) {
  if (!val) return '—';
  if (val.toDate)  return val.toDate().toISOString().slice(0,19).replace('T',' ');
  if (val.seconds) return new Date(val.seconds*1000).toISOString().slice(0,19).replace('T',' ');
  return String(val);
}

function videoFields(d) {
  const fields = {};
  if (d.videoUrl   != null) fields.videoUrl   = d.videoUrl;
  if (d.video_url  != null) fields.video_url  = d.video_url;
  if (d.videoThumb != null) fields.videoThumb = d.videoThumb;
  return fields; // {} אם אין וידאו
}

function hasVideo(d)  { return !!(d.videoUrl ?? d.video_url); }
function imgCount(d)  {
  const arr = d.images ?? d.imageUrls ?? d.imgUrls ?? [];
  return arr.length + (d.imgUrl ?? d.image_url ? 1 : 0);
}

async function deleteFromAlgolia(objectID) {
  if (!algoliaClient) return;
  try {
    await algoliaClient.deleteObject({ indexName: 'products', objectID });
    console.log(`    Algolia ✅ נמחק: ${objectID}`);
  } catch (e) {
    console.warn(`    Algolia ⚠️  נכשל (${objectID}): ${e.message}`);
  }
}

// ── load report ───────────────────────────────────────────────────────────────
const reportPath = resolve(__dirname, '../duplicates-report.json');
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

// ── load orders map (לוודא שום עותק-עם-הזמנות נמחק בשלב B) ────────────────
console.log('טוען הזמנות (בטיחות)...');
const ordersSnap = await db.collection('orders').get();
const orderCount = new Map();
for (const order of ordersSnap.docs) {
  for (const item of (order.data().items ?? [])) {
    const pid = item.productId ?? item.id;
    if (pid) orderCount.set(pid, (orderCount.get(pid) ?? 0) + 1);
  }
}
console.log(`  ${ordersSnap.size} הזמנות, ${orderCount.size} מוצרים ייחודיים.\n`);

// ═══════════════════════════════════════════════════════════════════════════════
// שלב A — UK81978
// ═══════════════════════════════════════════════════════════════════════════════
console.log(sep);
console.log('  שלב A — UK81978: מיזוג וידאו + מחיקת העותק הכפול');
console.log(sep + '\n');

const WINNER_A = '1xA7Deq5uR7z99k36tLH';  // עם ההזמנה — נשמר
const LOSER_A  = 'vVslkVmbY14Ag7KZGlZf';  // עם הוידאו — נמחק

// 1. קרא וידאו מהעותק שנמחק
const loserADoc  = await db.collection('products').doc(LOSER_A).get();
const loserAData = loserADoc.data();
if (!loserADoc.exists) throw new Error(`LOSER_A לא נמצא ב-Firestore: ${LOSER_A}`);

const vidFields = videoFields(loserAData);
console.log(`  שדות וידאו שנמצאו ב-${LOSER_A}:`);
for (const [k,v] of Object.entries(vidFields)) console.log(`    ${k}: ${v}`);
if (Object.keys(vidFields).length === 0) throw new Error('לא נמצאו שדות וידאו בעותק המפסיד — בדוק ידנית');

// 2. עדכן את המנצח עם שדות הוידאו בלבד
const winnerARef = db.collection('products').doc(WINNER_A);
const winnerBefore = (await winnerARef.get()).data();
console.log(`\n  videoUrl לפני המיזוג ב-${WINNER_A}: ${winnerBefore.videoUrl ?? 'null'}`);

await winnerARef.update(vidFields);

// 3. אמת
const winnerAfter = (await winnerARef.get()).data();
console.log(`  videoUrl אחרי המיזוג  ב-${WINNER_A}: ${winnerAfter.videoUrl ?? 'null'}`);
if (!hasVideo(winnerAfter)) throw new Error('מיזוג הוידאו נכשל — videoUrl עדיין null');
console.log(`  ✅ מיזוג וידאו הצליח`);

// 4. מחק מ-Firestore
await db.collection('products').doc(LOSER_A).delete();
console.log(`  ✅ Firestore: נמחק ${LOSER_A}`);

// 5. מחק מ-Algolia
await deleteFromAlgolia(LOSER_A);

console.log(`\n  סיכום שלב A:`);
console.log(`    נשמר  : ${WINNER_A}  (עם הזמנה + וידאו לאחר מיזוג)`);
console.log(`    נמחק  : ${LOSER_A}   (Firestore + Algolia)`);
console.log(`    videoUrl: ${winnerAfter.videoUrl}`);
console.log('\n' + sep + '\n');

// ═══════════════════════════════════════════════════════════════════════════════
// שלב B — 854 כפילויות ללא הזמנות
// ═══════════════════════════════════════════════════════════════════════════════
console.log(sep);
console.log('  שלב B — כפילויות ללא הזמנות: מיזוג וידאו + מחיקה');
console.log(sep + '\n');

// SKUs עם הזמנות שכבר טופלו/ידועים — דולגים עליהם
const SKIP_SKUS = new Set(['UK81978','UK42278','UK66283','UK41805','UK40002','UK65587','UK18866']);

// זוגות ללא הזמנות
const noOrderPairs = report.duplicates.filter(entry => {
  if (SKIP_SKUS.has(entry.sku)) return false;
  return entry.copies.every(c => (orderCount.get(c.documentId) ?? 0) === 0);
});

console.log(`  זוגות ללא הזמנות לטיפול: ${noOrderPairs.length}\n`);

// בחירת מנצח
function pickWinner(copies) {
  // עותקים עם וידאו קודם
  const withVideo    = copies.filter(c => c.hasVideo);
  const withoutVideo = copies.filter(c => !c.hasVideo);
  const pool = withVideo.length > 0 ? withVideo : copies;

  // מתוך ה-pool — inStock > 0
  const withStock = pool.filter(c => typeof c.inStock === 'number' && c.inStock > 0);
  const pool2 = withStock.length > 0 ? withStock : pool;

  // יותר תמונות
  const maxImg = Math.max(...pool2.map(c => c.imageCount));
  const pool3  = pool2.filter(c => c.imageCount === maxImg);

  // הישן ביותר
  pool3.sort((a,b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
    return ta - tb;
  });
  return pool3[0];
}

const planB = [];
let videoMergesB = 0;

for (const entry of noOrderPairs) {
  const copies = entry.copies;
  if (copies.length !== 2) continue; // רק זוגות

  const winner = pickWinner(copies);
  const loser  = copies.find(c => c.documentId !== winner.documentId);

  // בדוק שאף אחד לא מקושר להזמנה (בטיחות כפולה)
  const loserOrders  = orderCount.get(loser.documentId) ?? 0;
  const winnerOrders = orderCount.get(winner.documentId) ?? 0;
  if (loserOrders > 0 || winnerOrders > 0) {
    console.warn(`  ⛔ SKU ${entry.sku}: עדיין יש הזמנות — מדלג!`);
    continue;
  }

  // האם צריך מיזוג וידאו?
  const needVideoMerge = loser.hasVideo && !winner.hasVideo;
  if (needVideoMerge) videoMergesB++;

  planB.push({ sku: entry.sku, winner, loser, needVideoMerge });
}

// גיבוי IDs למחיקה
const backupB = {
  generatedAt: new Date().toISOString(),
  stage: 'B',
  total: planB.length,
  videoMerges: videoMergesB,
  deletions: planB.map(p => ({
    sku:         p.sku,
    deletedId:   p.loser.documentId,
    keptId:      p.winner.documentId,
    videoMerged: p.needVideoMerge,
  })),
};
const backupPath = resolve(__dirname, '../deleted-ids-backup.json');
writeFileSync(backupPath, JSON.stringify(backupB, null, 2), 'utf8');
console.log(`  גיבוי IDs נשמר: ${backupPath}  (${planB.length} מחיקות)\n`);

// ביצוע מיזוגי וידאו
if (videoMergesB > 0) {
  console.log(`  מבצע ${videoMergesB} מיזוגי וידאו לפני המחיקה...`);
  for (const p of planB.filter(x => x.needVideoMerge)) {
    const loserDoc  = await db.collection('products').doc(p.loser.documentId).get();
    const loserData = loserDoc.data();
    const vf = videoFields(loserData);
    if (Object.keys(vf).length > 0) {
      await db.collection('products').doc(p.winner.documentId).update(vf);
      console.log(`    ✅ מוזג וידאו  SKU ${p.sku}: ${p.loser.documentId} → ${p.winner.documentId}`);
    }
  }
  console.log('');
}

// מחיקה מ-Firestore (batches של 400)
const idsToDelete = planB.map(p => p.loser.documentId);
console.log(`  מוחק ${idsToDelete.length} מסמכים מ-Firestore...`);
let deletedB = 0;
for (let i = 0; i < idsToDelete.length; i += 400) {
  const batch = db.batch();
  for (const id of idsToDelete.slice(i, i + 400)) {
    batch.delete(db.collection('products').doc(id));
  }
  await batch.commit();
  deletedB += Math.min(400, idsToDelete.length - i);
  process.stdout.write(`\r    נמחקו ${deletedB}/${idsToDelete.length}...`);
}
console.log(`\n  ✅ Firestore: נמחקו ${deletedB} מסמכים\n`);

// ── לוג מפורט (עד 20 שורות לדוגמה, כל ה-video merges) ────────────────────────
console.log(sep2);
console.log('  לוג מייצג (video merges + 10 דוגמאות):\n');
const toLog = [
  ...planB.filter(p => p.needVideoMerge),
  ...planB.filter(p => !p.needVideoMerge).slice(0, 10),
];
for (const p of toLog) {
  const vm = p.needVideoMerge ? '  [מוזג וידאו]' : '';
  console.log(`  SKU ${p.sku}${vm}`);
  console.log(`    שמור : ${p.winner.documentId}  created=${p.winner.createdAt}`);
  console.log(`    מחוק : ${p.loser.documentId}   created=${p.loser.createdAt}`);
}
console.log(sep2 + '\n');

// syncAlgolia — replaceAllObjects (מסיר אוטומטית את כל המחוקים)
console.log('  מריץ syncAlgolia (replaceAllObjects)...');
if (algoliaClient) {
  const allProdsSnap = await db.collection('products').get();
  const records = [];
  for (const doc of allProdsSnap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    const inStockRaw = d.inStock;
    const outOfStock = d.outOfStock === true;
    const inStock = !outOfStock && (inStockRaw === true || (typeof inStockRaw === 'number' && inStockRaw > 0));
    const createdAt = d.createdAt?.seconds ?? 0;
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
      soferName: d.soferName || '', inStock, createdAt,
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
  console.log('  ⚠️  Algolia לא מוגדר — לא בוצע sync\n');
}

console.log(`  סיכום שלב B:`);
console.log(`    כפילויות שטופלו  : ${planB.length}`);
console.log(`    מחיקות Firestore : ${deletedB}`);
console.log(`    מיזוגי וידאו     : ${videoMergesB}`);
console.log(`    גיבוי IDs        : ${backupPath}`);
console.log('\n' + sep + '\n');

// ═══════════════════════════════════════════════════════════════════════════════
// שלב C — 5 SKUs עם הזמנות (לא UK18866)
// ═══════════════════════════════════════════════════════════════════════════════
console.log(sep);
console.log('  שלב C — 5 SKUs עם הזמנות (ללא UK18866)');
console.log(sep + '\n');

const C_SKUS = ['UK42278','UK66283','UK41805','UK40002','UK65587'];
const cResults = [];

for (const sku of C_SKUS) {
  const entry = report.duplicates.find(d => d.sku === sku);
  if (!entry) { console.warn(`  ⚠️  ${sku} לא נמצא בדוח`); continue; }

  // רענן מספר הזמנות מ-Firestore (לאחר שלב B לא השתנה אבל נוודא)
  const copies = entry.copies.map(c => ({
    ...c,
    ordersLinked: orderCount.get(c.documentId) ?? 0,
  }));

  const winner = copies.reduce((a,b) => a.ordersLinked >= b.ordersLinked ? a : b);
  const loser  = copies.find(c => c.documentId !== winner.documentId);

  // בדיקת בטיחות — המפסיד גם עם הזמנות?
  if (loser.ordersLinked > 0) {
    console.warn(`  ⛔ SKU ${sku}: גם למפסיד יש ${loser.ordersLinked} הזמנות — מדלג! דרוש טיפול ידני.`);
    cResults.push({ sku, skipped: true, reason: 'גם למפסיד יש הזמנות' });
    continue;
  }

  // מיזוג וידאו אם צריך
  let videoMergedC = false;
  if (loser.hasVideo && !winner.hasVideo) {
    const loserDoc  = await db.collection('products').doc(loser.documentId).get();
    const loserData = loserDoc.data();
    const vf = videoFields(loserData);
    if (Object.keys(vf).length > 0) {
      await db.collection('products').doc(winner.documentId).update(vf);
      videoMergedC = true;
      console.log(`  ✅ מוזג וידאו  SKU ${sku}: ${loser.documentId} → ${winner.documentId}`);
    }
  }

  // מחק מ-Firestore
  await db.collection('products').doc(loser.documentId).delete();
  console.log(`  ✅ Firestore: נמחק ${loser.documentId}  (SKU ${sku})`);

  // מחק מ-Algolia
  await deleteFromAlgolia(loser.documentId);

  cResults.push({ sku, winner: winner.documentId, loser: loser.documentId, winnerOrders: winner.ordersLinked, videoMerged: videoMergedC });
}

// טבלת סיכום שלב C
console.log(`\n  טבלת סיכום שלב C:\n`);
console.log(`  ${'SKU'.padEnd(10)} ${'נשמר (document ID)'.padEnd(24)} ${'נמחק (document ID)'.padEnd(24)} ${'הזמנות'.padEnd(8)} וידאו מוזג`);
console.log(`  ${'-'.repeat(88)}`);
for (const r of cResults) {
  if (r.skipped) {
    console.log(`  ${r.sku.padEnd(10)} ⛔ דולג — ${r.reason}`);
  } else {
    console.log(`  ${r.sku.padEnd(10)} ${r.winner.padEnd(24)} ${r.loser.padEnd(24)} ${String(r.winnerOrders).padEnd(8)} ${r.videoMerged ? 'כן' : 'לא'}`);
  }
}
console.log('\n' + sep + '\n');

// ═══════════════════════════════════════════════════════════════════════════════
// שלב D — UK18866: הצגה בלבד, ללא מחיקה
// ═══════════════════════════════════════════════════════════════════════════════
console.log(sep);
console.log('  שלב D — UK18866: הצגת שני העותקים (ללא מחיקה)');
console.log(sep + '\n');

const entry18866 = report.duplicates.find(d => d.sku === 'UK18866');
const [copyA_d, copyB_d] = entry18866.copies.sort((a,b) => {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
  return ta - tb;
});

// קרא שני העותקים מ-Firestore לנתונים מלאים
const docA18 = await db.collection('products').doc(copyA_d.documentId).get();
const docB18 = await db.collection('products').doc(copyB_d.documentId).get();
const dA18   = docA18.data() ?? {};
const dB18   = docB18.data() ?? {};

const fieldsToShow = [
  'name','price','soferBasePrice','basePrice','inStock','outOfStock',
  'hidden','status','cat','subCategory','supplier','desc',
  'imgUrl','image_url','videoUrl','video_url','createdAt',
];

console.log(`  ${'שדה'.padEnd(20)} ${'עותק ישן (אפריל 2026)'.padEnd(38)} ${'עותק חדש (מאי 2026)'.padEnd(38)}`);
console.log(`  ${copyA_d.documentId.padEnd(20)} ${''.padEnd(38)} ${''.padEnd(38)}`);
console.log(`  ${'-'.repeat(96)}`);

for (const f of fieldsToShow) {
  let vA = dA18[f] ?? null;
  let vB = dB18[f] ?? null;
  if (f === 'createdAt') { vA = ts(vA); vB = ts(vB); }
  else if (f === 'desc')  { vA = vA ? `${String(vA).slice(0,30)}...` : null; vB = vB ? `${String(vB).slice(0,30)}...` : null; }
  const sA = String(vA ?? '—').slice(0,36);
  const sB = String(vB ?? '—').slice(0,36);
  const diff = JSON.stringify(vA) !== JSON.stringify(vB) ? ' ⚠️' : '';
  console.log(`  ${f.padEnd(20)} ${sA.padEnd(38)} ${sB.padEnd(38)}${diff}`);
}

console.log(`\n  הזמנות:`);
console.log(`    ${copyA_d.documentId}: ${orderCount.get(copyA_d.documentId) ?? 0}`);
console.log(`    ${copyB_d.documentId}: ${orderCount.get(copyB_d.documentId) ?? 0}`);

// images array
const imgsA = dA18.images ?? dA18.imageUrls ?? dA18.imgUrls ?? [];
const imgsB = dB18.images ?? dB18.imageUrls ?? dB18.imgUrls ?? [];
console.log(`\n  images array:`);
console.log(`    ${copyA_d.documentId}: ${imgsA.length} תמונות`);
console.log(`    ${copyB_d.documentId}: ${imgsB.length} תמונות`);

console.log(`\n  ⚠️  UK18866 — לא בוצעה שום פעולה. ממתין להחלטה ידנית.\n`);
console.log(sep);
console.log('  הסתיים: שלבים A, B, C בוצעו. D הוצג בלבד.');
console.log(sep);

process.exit(0);
