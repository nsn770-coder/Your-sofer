/**
 * Batch-syncs all products → aiProductKnowledge collection.
 * Run: node app/scripts/syncAiKnowledge.mjs
 * Requires: app/scripts/serviceAccount.json
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'serviceAccount.json'), 'utf8'),
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Enrichment maps ───────────────────────────────────────────────────────────

const CAT_USE_CASES = {
  'קלפי מזוזה': ['מזוזה', 'קידוש הבית', 'מתנה לחג', 'בית חדש', 'הכנסת מזוזה'],
  'מזוזות': ['מזוזה', 'קידוש הבית', 'מתנה לחג', 'בית חדש', 'הכנסת מזוזה'],
  'תפילין קומפלט': ['תפילין', 'בר מצווה', 'מתנה לבר מצווה', 'תפילה', 'בן מצווה'],
  'מגילות': ['מגילת אסתר', 'פורים', 'מתנה', 'בית כנסת'],
  'ספרי תורה': ['ספר תורה', 'בית כנסת', 'הקמת בית כנסת', 'תרומה'],
  'כיפות': ['כיפה', 'בר מצווה', 'חתונה', 'מתנה', 'אביזרי ראש', 'כיפות לאירוע'],
  'כיפות סרוגות': ['כיפה', 'בר מצווה', 'מתנה', 'סרוגה'],
  'הדפסה על כיפות': ['כיפה', 'הדפסה', 'בר מצווה', 'חתונה', 'מתנה', 'עם לוגו', 'מותאם אישית'],
  'טליתות': ['טלית', 'בר מצווה', 'חתונה', 'תפילה', 'מתנה דתית'],
  'כיסויי חלה': ['הפרשת חלה', 'שבת', 'יום טוב', 'מתנת כלה', 'חתונה', 'מתנה'],
  'פמוטים': ['שבת', 'יום טוב', 'מתנת כלה', 'חתונה', 'מתנה'],
  'תיקי תפילין': ['תפילין', 'בר מצווה', 'מתנה', 'אביזרים', 'בן מצווה'],
  'ערכות הפרשת חלה': ['הפרשת חלה', 'שבת', 'מתנת כלה', 'חתונה', 'מתנה', 'ערכת כלה'],
  'סידורים': ['תפילה', 'סידור', 'מתנה', 'בר מצווה', 'בת מצווה'],
};

const CAT_AUDIENCE = {
  'קלפי מזוזה': ['משפחות', 'דתיים', 'מסורתיים', 'רוכשי בתים'],
  'מזוזות': ['משפחות', 'דתיים', 'מסורתיים'],
  'תפילין קומפלט': ['נערים', 'בני מצווה', 'משפחות', 'מתחזקים', 'גברים'],
  'כיפות': ['גברים', 'ילדים', 'בני מצווה', 'כלות וחתנים', 'ארגוני אירועים'],
  'כיפות סרוגות': ['גברים', 'ילדים', 'בני מצווה'],
  'הדפסה על כיפות': ['ארגוני אירועים', 'בני מצווה', 'חתנים'],
  'טליתות': ['גברים', 'בני מצווה', 'מסורתיים', 'דתיים'],
  'כיסויי חלה': ['נשים', 'כלות', 'משפחות', 'אוהבי שבת'],
  'פמוטים': ['נשים', 'כלות', 'משפחות', 'אוהבי שבת', 'מעצבי בתים'],
  'ערכות הפרשת חלה': ['נשים', 'כלות', 'משפחות'],
};

// ── Builder ───────────────────────────────────────────────────────────────────

function buildKnowledgeDoc(productId, p) {
  const cat = p.cat || p.category || '';
  const isOutOfStock = Boolean(p.outOfStock) || p.stockStatus === 'out_of_stock';
  const stockStatus = isOutOfStock
    ? 'out_of_stock'
    : p.stockStatus === 'low_stock'
    ? 'low_stock'
    : 'in_stock';

  const tags = [
    ...(p.styleTag || []),
    p.lookTag,
    p.collection,
    p.level,
    p.nusach,
    p.subCategory,
  ].filter(Boolean);

  const desc = p.desc || p.description || '';

  return {
    productId,
    name: p.name || '',
    category: cat,
    price: Number(p.price || 0),
    salePrice: p.clearanceSalePrice
      ? Number(p.clearanceSalePrice)
      : p.was
      ? Number(p.was)
      : null,
    description: desc,
    shortDescription: desc.slice(0, 150),
    useCases: CAT_USE_CASES[cat] || [],
    targetAudience: CAT_AUDIENCE[cat] || [],
    tags,
    customizationOptions: null,
    stockStatus,
    productUrl: `https://yoursofer.com/product/${productId}`,
    imageUrl: p.imgUrl || p.image_url || '',
    updatedAt: new Date(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function sync() {
  console.log('🔍 Fetching all products...');
  const snap = await db.collection('products').get();
  console.log(`Found ${snap.size} products`);

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let written = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    const p = docSnap.data();

    // Skip deleted/hidden products
    if (p.status === 'deleted' || p.hidden === true) {
      skipped++;
      continue;
    }

    const knowledgeDoc = buildKnowledgeDoc(docSnap.id, p);
    batch.set(
      db.collection('aiProductKnowledge').doc(docSnap.id),
      knowledgeDoc,
    );
    written++;

    if (written % BATCH_SIZE === 0) {
      await batch.commit();
      console.log(`  ✓ Committed ${written} docs...`);
      batch = db.batch();
    }
  }

  const remaining = written % BATCH_SIZE;
  if (remaining > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Done. Written: ${written} | Skipped: ${skipped}`);
  process.exit(0);
}

sync().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
