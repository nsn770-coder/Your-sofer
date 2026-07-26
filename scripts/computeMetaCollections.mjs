/**
 * computeMetaCollections.mjs
 * B5/B6 — builds the advertising-collections SNAPSHOT for the Meta feed.
 *
 * Reads config/meta-collections.json, selects products per collection, and
 * saves ONE snapshot doc to Firestore: feedConfig/metaCollectionsSnapshot.
 * The feed route reads ONLY the snapshot — so random / newest / best-selling
 * never change per request (B6 determinism). Recompute only by running this.
 *
 * Notes:
 * - best-selling depends on salesCount/orderCount written by the manual
 *   scripts/updateBestSellers.mjs — run that first if it's stale.
 * - Products carrying bundleComponentCodes are excluded by default (B7).
 * - A product matched by several collections gets the FIRST one (config order).
 *
 * Usage: node scripts/computeMetaCollections.mjs        (writes snapshot)
 *        node scripts/computeMetaCollections.mjs --test (dry run, no write)
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const CONFIG_PATH = resolve(__dirname, '../config/meta-collections.json');

// Deterministic PRNG for method "random" — same seed → same selection.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function toNum(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function run() {
  const testMode = process.argv.includes('--test');
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const excludeBundlesDefault = config.excludeBundles !== false;

  console.log('📥 שולף מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`📦 נמצאו ${snap.size} מוצרים`);

  // Same visibility gate as the feed: active, not hidden, has name+price+image.
  const products = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (d.hidden === true) return;
    if (d.status && d.status !== 'active') return;
    const price = toNum(d.price) ?? 0;
    if (!d.name || price <= 0) return;
    const img = d.imgUrl ?? d.image_url ?? d.img1;
    if (!img) return;
    products.push({
      id: doc.id,
      price,
      name: d.name ?? '',
      cat: d.cat ?? d.category ?? '',
      subCategory: d.subCategory ?? '',
      createdAt: d.createdAt?.seconds ?? 0,
      sales: toNum(d.salesCount) ?? toNum(d.orderCount) ?? 0,
      isBundle: Array.isArray(d.bundleComponentCodes) && d.bundleComponentCodes.length > 0,
    });
  });
  console.log(`✅ עוברים את שער הפיד: ${products.length}`);

  const assignments = {}; // productId → collection name (first match wins)
  const summary = [];

  for (const col of config.collections ?? []) {
    const excludeBundles = col.includeBundles === true ? false : excludeBundlesDefault;
    let pool = products.filter(p => {
      if (assignments[p.id]) return false;              // first match wins
      if (excludeBundles && p.isBundle) return false;   // B7
      if (col.cat && p.cat !== col.cat) return false;
      if (col.subCategory && p.subCategory !== col.subCategory) return false;
      // keyword: substring match on cat + subCategory + product name —
      // for cross-category collections (e.g. בר מצווה spread across cats)
      if (col.keyword && !`${p.cat} ${p.subCategory} ${p.name}`.includes(col.keyword)) return false;
      if (col.minPrice != null && p.price < col.minPrice) return false;
      if (col.maxPrice != null && p.price > col.maxPrice) return false;
      return true;
    });

    const limit = col.limit ?? 50;
    switch (col.method) {
      case 'all':
        break; // keep everything that matched the filters
      case 'manual':
        pool = (col.ids ?? []).map(id => pool.find(p => p.id === id)).filter(Boolean);
        break;
      case 'lowest-price':
        pool.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
        pool = pool.slice(0, limit);
        break;
      case 'highest-price':
        pool.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
        pool = pool.slice(0, limit);
        break;
      case 'newest':
        pool.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
        pool = pool.slice(0, limit);
        break;
      case 'best-selling':
        pool.sort((a, b) => b.sales - a.sales || a.id.localeCompare(b.id));
        pool = pool.slice(0, limit);
        break;
      case 'random': {
        const rand = mulberry32(hashString(String(col.seed ?? col.name)));
        // Fisher–Yates with the seeded PRNG — deterministic for a given seed
        const arr = [...pool].sort((a, b) => a.id.localeCompare(b.id));
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        pool = arr.slice(0, limit);
        break;
      }
      default:
        console.warn(`⚠️ שיטה לא מוכרת "${col.method}" בקולקציה "${col.name}" — מדלג`);
        pool = [];
    }

    for (const p of pool) assignments[p.id] = col.name;
    summary.push({ name: col.name, method: col.method, count: pool.length });
  }

  console.log('\n══════════ קולקציות ══════════');
  summary.forEach(s => console.log(`  ${s.name} (${s.method}): ${s.count} מוצרים`));
  console.log(`  סה"כ מוצרים משויכים: ${Object.keys(assignments).length}`);

  if (testMode) {
    console.log('\n🧪 מצב בדיקה — הסנפשוט לא נכתב.');
    process.exit(0);
  }

  await db.collection('feedConfig').doc('metaCollectionsSnapshot').set({
    computedAt: new Date().toISOString(),
    config: { excludeBundles: excludeBundlesDefault, collections: config.collections ?? [] },
    summary,
    assignments,
  });
  console.log('\n✅ סנפשוט נשמר: feedConfig/metaCollectionsSnapshot');
  console.log('   הפיד יקרא את custom_label_4 מהסנפשוט הזה בלבד.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
