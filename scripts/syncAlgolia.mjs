/**
 * Syncs Firestore products + categories to Algolia.
 * Run: node scripts/syncAlgolia.mjs
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
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
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

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

const algoliaAppId    = process.env.ALGOLIA_APP_ID    ?? '';
const algoliaAdminKey = process.env.ALGOLIA_ADMIN_KEY ?? '';

if (!algoliaAppId || !algoliaAdminKey) {
  console.error('❌ חסר ALGOLIA_APP_ID או ALGOLIA_ADMIN_KEY ב-.env.local');
  process.exit(1);
}

const client = algoliasearch(algoliaAppId, algoliaAdminKey);

async function syncProducts() {
  console.log('\n📦 קורא מוצרים מ-Firestore...');
  const snap = await db.collection('products').get();
  console.log(`   סה"כ מסמכים: ${snap.size}`);

  const records = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    records.push({
      objectID:    doc.id,
      id:          doc.id,
      name:        d.name        || '',
      sku:         d.sku         || '',
      price:       d.price       ?? null,
      cat:         d.cat         || d.category    || '',
      subCategory: d.subCategory || d.subcategory || '',
      image:       d.imgUrl      || d.image_url   || '',
      description: (d.desc || d.description || '').slice(0, 500),
      styleTag:    Array.isArray(d.styleTag) ? d.styleTag : [],
      lookTag:     d.lookTag     || '',
      collection:  d.collection  || '',
      soferName:   d.soferName   || '',
    });
  }

  console.log(`   מוצרים פעילים: ${records.length}`);
  if (records.length === 0) { console.log('   ⚠️ אין מוצרים להעלות.'); return; }

  console.log('   שולח ל-Algolia index "products"...');
  await client.saveObjects({ indexName: 'products', objects: records });
  console.log(`   ✅ הועלו ${records.length} records`);

  console.log('   מגדיר settings ל-index "products"...');
  await client.setSettings({
    indexName: 'products',
    indexSettings: {
      searchableAttributes: ['name', 'cat', 'subCategory', 'sku', 'styleTag', 'lookTag', 'collection', 'description'],
      attributesForFaceting: ['cat', 'subCategory'],
      queryLanguages:        ['he'],
      indexLanguages:        ['he'],
      ignorePlurals:         true,
      removeWordsIfNoResults: 'allOptional',
      minWordSizefor1Typo:   3,
      minWordSizefor2Typos:  6,
    },
  });
  console.log('   ✅ Settings עודכנו');
}

async function syncCategories() {
  console.log('\n🗂️ קורא קטגוריות מ-Firestore...');
  const snap = await db.collection('categories').get();
  console.log(`   סה"כ מסמכים: ${snap.size}`);

  const records = snap.docs.map(doc => {
    const d = doc.data();
    return {
      objectID:    doc.id,
      name:        doc.id,
      displayName: d.displayName || d.name || doc.id,
      slug:        d.slug        || '',
      priority:    d.priority    ?? 99,
    };
  });

  console.log('   שולח ל-Algolia index "categories"...');
  await client.saveObjects({ indexName: 'categories', objects: records });
  console.log(`   ✅ הועלו ${records.length} records`);

  console.log('   מגדיר settings ל-index "categories"...');
  await client.setSettings({
    indexName: 'categories',
    indexSettings: {
      searchableAttributes: ['name', 'displayName'],
      queryLanguages:       ['he'],
      indexLanguages:       ['he'],
    },
  });
  console.log('   ✅ Settings עודכנו');
}

async function main() {
  console.log('\n🚀 Algolia sync — Your Sofer\n');
  await syncProducts();
  await syncCategories();
  console.log('\n✅ סנכרון הושלם!\n');
  process.exit(0);
}

main().catch((err) => { console.error('❌ Sync failed:', err); process.exit(1); });
