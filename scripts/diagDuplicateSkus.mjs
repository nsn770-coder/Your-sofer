/**
 * diagDuplicateSkus.mjs
 *
 * שלב 1 — פירוט מלא של SKU ספציפי (UK81978 כברירת מחדל, ניתן לשנות)
 * שלב 2 — סריקה מלאה של קולקציית products וזיהוי כל ה-SKUs הכפולים
 *
 * פלט: דוח בקונסול + קובץ duplicates-report.json
 * לא מוחק שום דבר.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_SKU = process.argv[2] ?? 'UK81978';

// ── env ───────────────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
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

// ── helpers ───────────────────────────────────────────────────────────────────
function ts(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString().slice(0, 19).replace('T', ' ');
  if (val.seconds) return new Date(val.seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
  return String(val);
}

function countImages(d) {
  const imgs = d.images ?? d.imageUrls ?? d.imgUrls ?? [];
  const single = d.imgUrl ?? d.image_url ?? null;
  return imgs.length + (single ? 1 : 0);
}

function hasVideo(d) { return !!(d.videoUrl ?? d.video_url); }

// ── load orders (לספירת הזמנות מקושרות) ──────────────────────────────────────
console.log('טוען הזמנות...');
const ordersSnap = await db.collection('orders').get();
// productId → count of orders referencing it
const orderCount = new Map();
for (const order of ordersSnap.docs) {
  const items = order.data().items ?? [];
  const seenInOrder = new Set();
  for (const item of items) {
    const pid = item.productId ?? item.id;
    if (pid && !seenInOrder.has(pid)) {
      orderCount.set(pid, (orderCount.get(pid) ?? 0) + 1);
      seenInOrder.add(pid);
    }
  }
}
console.log(`  סה"כ ${ordersSnap.size} הזמנות, ${orderCount.size} מוצרים ייחודיים מוזכרים.\n`);

// ── load all products ─────────────────────────────────────────────────────────
console.log('טוען מוצרים...');
const prodSnap = await db.collection('products').get();
console.log(`  סה"כ ${prodSnap.size} מסמכים.\n`);

// ── STEP 1 — פירוט SKU ספציפי ─────────────────────────────────────────────────
const sep = '═'.repeat(60);
console.log(sep);
console.log(`  שלב 1 — פירוט כל הגרסאות של SKU: ${TARGET_SKU}`);
console.log(sep);

const targetDocs = prodSnap.docs.filter(d => {
  const sku = (d.data().sku ?? d.data().SKU ?? '').trim();
  return sku.toUpperCase() === TARGET_SKU.toUpperCase();
});

if (targetDocs.length === 0) {
  console.log(`  לא נמצאו מסמכים עם sku="${TARGET_SKU}".`);
} else {
  console.log(`  נמצאו ${targetDocs.length} מסמכים:\n`);
  for (const doc of targetDocs) {
    const d = doc.data();
    const orders = orderCount.get(doc.id) ?? 0;
    console.log(`  ▸ Document ID : ${doc.id}`);
    console.log(`    name        : ${d.name ?? '—'}`);
    console.log(`    price       : ₪${d.price ?? '—'}`);
    console.log(`    soferBase   : ₪${d.soferBasePrice ?? d.basePrice ?? '—'}`);
    console.log(`    inStock     : ${d.inStock ?? '—'}`);
    console.log(`    hidden      : ${d.hidden ?? false}`);
    console.log(`    תמונות      : ${countImages(d)}   videoUrl: ${hasVideo(d) ? 'כן' : 'לא'}`);
    console.log(`    createdAt   : ${ts(d.createdAt) ?? '—'}`);
    console.log(`    הזמנות      : ${orders}`);
    const extras = [];
    if (d.cat)         extras.push(`cat="${d.cat}"`);
    if (d.subCategory) extras.push(`sub="${d.subCategory}"`);
    if (d.supplier)    extras.push(`supplier="${d.supplier}"`);
    if (extras.length) console.log(`    נוסף         : ${extras.join(', ')}`);
    console.log('');
  }

  // ── ניתוח הבדלים ─────────────────────────────────────────────────────────
  if (targetDocs.length >= 2) {
    console.log(`  ── ניתוח הבדלים בין העותקים ──`);
    const fields = ['name','price','soferBasePrice','basePrice','inStock','hidden',
                    'cat','subCategory','supplier','desc','imgUrl','image_url',
                    'videoUrl','video_url'];
    const allData = targetDocs.map(d => ({ id: d.id, ...d.data() }));

    for (const field of fields) {
      const vals = allData.map(d => JSON.stringify(d[field] ?? null));
      const unique = new Set(vals);
      if (unique.size > 1) {
        console.log(`  ⚠  ${field}:`);
        for (const d of allData) {
          console.log(`       ${d.id}: ${JSON.stringify(d[field] ?? null)}`);
        }
      }
    }

    // בדוק עותק images/imageUrls
    const imgField = allData.map(d =>
      JSON.stringify(d.images ?? d.imageUrls ?? d.imgUrls ?? [])
    );
    if (new Set(imgField).size > 1) {
      console.log(`  ⚠  images (array):`);
      for (let i = 0; i < allData.length; i++) {
        const imgs = allData[i].images ?? allData[i].imageUrls ?? allData[i].imgUrls ?? [];
        console.log(`       ${allData[i].id}: ${imgs.length} תמונות → [${imgs.slice(0,2).join(', ')}${imgs.length>2?'...':''}]`);
      }
    }

    console.log('');
    console.log(`  ── ניחוש סיבת הכפילות ──`);
    const suppliers = [...new Set(allData.map(d => d.supplier ?? 'לא מוגדר'))];
    if (suppliers.length > 1) {
      console.log(`  ייתכן שיובא פעמיים מספקים שונים: ${suppliers.join(' / ')}`);
    } else {
      const created = allData.map(d => ts(d.createdAt) ?? 'לא ידוע');
      if (new Set(created).size > 1) {
        console.log(`  אותו ספק, תאריכי ייבוא שונים: ${created.join(' / ')} — כנראה יובא שוב בייבוא מאוחר.`);
      } else {
        console.log(`  ספקים/תאריכים זהים — כנראה רצו שני ייבואים באותו זמן (race condition).`);
      }
    }
    console.log('');
  }
}

// ── STEP 2 — סריקה מלאה ───────────────────────────────────────────────────────
console.log(sep);
console.log('  שלב 2 — סריקה מלאה של כל ה-SKUs הכפולים');
console.log(sep + '\n');

// קיבוץ לפי SKU (מנרמל)
const bySku = new Map();
for (const doc of prodSnap.docs) {
  const d = doc.data();
  const sku = (d.sku ?? d.SKU ?? '').trim();
  if (!sku) continue;
  const key = sku.toUpperCase();
  if (!bySku.has(key)) bySku.set(key, []);
  bySku.get(key).push({ id: doc.id, data: d });
}

// רק כפולים
const duplicates = [...bySku.entries()]
  .filter(([, docs]) => docs.length > 1)
  .sort((a, b) => b[1].length - a[1].length); // מהכי הרבה עותקים

const totalDuplicateSkus  = duplicates.length;
const totalExtraDocs      = duplicates.reduce((s, [, docs]) => s + docs.length - 1, 0);

console.log(`  SKUs כפולים     : ${totalDuplicateSkus}`);
console.log(`  מסמכים עודפים   : ${totalExtraDocs}  (כלומר ${totalExtraDocs} מסמכים שאפשר למחוק)`);
console.log('');

// בנה דוח JSON
const report = {
  generatedAt: new Date().toISOString(),
  totalDuplicateSkus,
  totalExtraDocs,
  duplicates: [],
};

for (const [sku, docs] of duplicates) {
  const entry = {
    sku,
    copyCount: docs.length,
    copies: [],
  };

  for (const { id, data: d } of docs) {
    entry.copies.push({
      documentId:     id,
      name:           d.name ?? null,
      price:          d.price ?? null,
      soferBasePrice: d.soferBasePrice ?? d.basePrice ?? null,
      inStock:        d.inStock ?? null,
      hidden:         d.hidden ?? false,
      hasImages:      countImages(d) > 0,
      imageCount:     countImages(d),
      hasVideo:       hasVideo(d),
      createdAt:      ts(d.createdAt),
      ordersLinked:   orderCount.get(id) ?? 0,
      cat:            d.cat ?? null,
      subCategory:    d.subCategory ?? null,
      supplier:       d.supplier ?? null,
    });
  }

  // מיון עותקים — הכי מקושר לפני
  entry.copies.sort((a, b) => b.ordersLinked - a.ordersLinked || b.imageCount - a.imageCount);
  report.duplicates.push(entry);
}

// הדפס סיכום בקונסול
console.log('── רשימת SKUs כפולים (מסודרת לפי מספר עותקים) ──\n');
for (const entry of report.duplicates) {
  const ordersTotal = entry.copies.reduce((s, c) => s + c.ordersLinked, 0);
  console.log(`  SKU: ${entry.sku}  (${entry.copyCount} עותקים, ${ordersTotal} הזמנות בסה"כ)`);
  for (const c of entry.copies) {
    const flags = [];
    if (c.ordersLinked > 0) flags.push(`🔗${c.ordersLinked} הזמנות`);
    if (c.hasImages)        flags.push(`📷${c.imageCount}`);
    if (c.hasVideo)         flags.push('🎬');
    if (c.hidden)           flags.push('hidden');
    console.log(`    ${c.documentId}  createdAt=${c.createdAt ?? '—'}  ${flags.join('  ') || '—'}`);
  }
  console.log('');
}

// שמור לקובץ
const outPath = resolve(__dirname, '../duplicates-report.json');
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log(sep);
console.log(`  דוח נשמר: ${outPath}`);
console.log(sep);

process.exit(0);
