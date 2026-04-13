/**
 * Fetches all bar-mitzvah products from rikmat.com via Shopify products.json API
 * and imports them to Firestore "products" collection.
 *
 * Run: node scripts/import-bar-mitzvah.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp,
} from 'firebase/firestore';

// ─── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  authDomain: 'your-sofer.firebaseapp.com',
  projectId: 'your-sofer',
  storageBucket: 'your-sofer.firebasestorage.app',
  messagingSenderId: '7710397068',
  appId: '1:7710397068:web:3c9880f24871efd4d661a9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORY = 'בר מצווה';
const BAR_MITZVAH_KEYWORDS = ['בר מצווה', 'בר מצוה', 'בר-מצווה'];
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; product-importer/1.0)' };

// ─── Step 1: Fetch ALL products via paginated products.json API ───────────────
async function fetchAllProducts() {
  const all = [];
  let page = 1;

  while (true) {
    const url = `https://rikmat.com/products.json?limit=250&page=${page}`;
    process.stdout.write(`  📄 Page ${page}... `);

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) { console.log(`HTTP ${res.status} — stopping`); break; }

    const json = await res.json();
    const products = json.products ?? [];
    console.log(`${products.length} products`);

    if (products.length === 0) break;
    all.push(...products);
    if (products.length < 250) break; // last page
    page++;
    await new Promise(r => setTimeout(r, 200));
  }

  return all;
}

// ─── Step 2: Filter bar mitzvah products ─────────────────────────────────────
function isBarMitzvah(product) {
  const text = `${product.title} ${(product.tags || []).join(' ')}`.toLowerCase();
  return BAR_MITZVAH_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

// ─── Step 3: Transform Shopify product to our schema ─────────────────────────
function transform(p) {
  const variant = p.variants?.[0];
  const priceStr = variant?.price ?? '0';
  const price = Math.round(parseFloat(priceStr));

  const imgSrc = p.images?.[0]?.src ?? '';
  const imageUrl = imgSrc.startsWith('//') ? `https:${imgSrc}` : imgSrc;

  const description = (p.body_html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    name: p.title ?? '',
    price,
    category: CATEGORY,
    cat: CATEGORY,
    imgUrl: imageUrl,
    image_url: imageUrl,
    description,
    status: 'active',
    sourceUrl: `https://rikmat.com/products/${p.handle}`,
    vendor: p.vendor ?? 'rikmat',
    createdAt: serverTimestamp(),
  };
}

// ─── Step 4: Check for duplicates ────────────────────────────────────────────
async function alreadyExists(sourceUrl) {
  const snap = await getDocs(
    query(collection(db, 'products'), where('sourceUrl', '==', sourceUrl))
  );
  return !snap.empty;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📥 Fetching all products from rikmat.com...\n');
  const allProducts = await fetchAllProducts();
  console.log(`\n🗂  Total products on site: ${allProducts.length}`);

  const barMitzvah = allProducts.filter(isBarMitzvah);
  console.log(`🎯 Bar mitzvah products found: ${barMitzvah.length}\n`);

  if (barMitzvah.length === 0) {
    console.error('❌ No bar mitzvah products matched. Check keywords.');
    process.exit(1);
  }

  // Preview
  console.log('─── Preview ──────────────────────────────────────────────');
  barMitzvah.forEach((p, i) => {
    const price = Math.round(parseFloat(p.variants?.[0]?.price ?? '0'));
    console.log(`${String(i + 1).padStart(2)}. ${p.title} — ₪${price}`);
  });
  console.log('─────────────────────────────────────────────────────────\n');

  // Import
  console.log('🔥 Importing to Firestore...\n');
  let added = 0;
  let skipped = 0;

  for (const shopifyProduct of barMitzvah) {
    const product = transform(shopifyProduct);
    const exists = await alreadyExists(product.sourceUrl);

    if (exists) {
      console.log(`  ⏭  Already exists: ${product.name}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, 'products'), product);
    console.log(`  ✅ Imported: ${product.name} — ₪${product.price}`);
    added++;
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\n🎉 Done!  Added: ${added}  |  Skipped (already in DB): ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
