/**
 * validate-merchant-products.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * משווה שלוש רשימות:
 *   A. האתר      — out/event-kippot-products.json  (discover-products.mjs)
 *   B. הפיד      — https://your-sofer.com/api/google-feed, פריטים עם
 *                  custom_label_1 = event_kippot
 *   C. המרצ'נט   — shopping_product בחשבון Google Ads, custom_attribute1 = event_kippot
 *                  (נדרש חיבור Google Ads; אפשר לדלג עם --no-ads)
 *
 * מטרה:  EXTRA PRODUCTS = 0
 * יוצא עם קוד 1 אם נמצא מוצר בקמפיין/בסימון שאינו ברשימת האתר.
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/validate-merchant-products.mjs
 *   node scripts/google-ads/pmax-event-kippot/validate-merchant-products.mjs --no-ads
 */

import { readJson, saveJson, header, line, getAdsCustomer, digits } from './lib.mjs';
import { FEED_URL, CUSTOM_LABEL_INDEX, CUSTOM_LABEL_VALUE } from './config.mjs';

const SKIP_ADS = process.argv.includes('--no-ads');

// ── פרסור מינימלי של הפיד (בלי תלות חיצונית) ────────────────────────────────
function parseFeed(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  const pick = (block, tag) => {
    const r = new RegExp(`<g:${tag}>([\\s\\S]*?)</g:${tag}>`);
    const x = block.match(r);
    return x ? x[1].trim() : null;
  };
  while ((m = re.exec(xml))) {
    const b = m[1];
    items.push({
      id:    pick(b, 'id'),
      title: pick(b, 'title'),
      label: pick(b, `custom_label_${CUSTOM_LABEL_INDEX}`),
      productType: pick(b, 'product_type'),
      link:  pick(b, 'link'),
      image: pick(b, 'image_link'),
      price: pick(b, 'price'),
      availability: pick(b, 'availability'),
    });
  }
  return items;
}

async function fetchMerchantFromAds() {
  const { customer } = await getAdsCustomer();
  const field = `custom_attribute${CUSTOM_LABEL_INDEX}`;
  const rows = await customer.query(`
    SELECT
      shopping_product.item_id,
      shopping_product.title,
      shopping_product.merchant_center_id,
      shopping_product.status,
      shopping_product.availability,
      shopping_product.${field}
    FROM shopping_product
    WHERE shopping_product.${field} = '${CUSTOM_LABEL_VALUE}'
  `);
  return rows.map(r => ({
    id: r.shopping_product.item_id,
    title: r.shopping_product.title,
    merchantId: r.shopping_product.merchant_center_id,
    status: r.shopping_product.status,
    availability: r.shopping_product.availability,
  }));
}

function diff(aIds, bIds) {
  const A = new Set(aIds), B = new Set(bIds);
  return {
    missing: [...A].filter(x => !B.has(x)),   // באתר אבל לא בצד השני
    extra:   [...B].filter(x => !A.has(x)),   // בצד השני אבל לא באתר  ← אסור
  };
}

async function main() {
  header('🔎 PRODUCT VALIDATION — כיפות לאירועים');

  // ── A. האתר ────────────────────────────────────────────────────────────────
  const site = readJson('event-kippot-products.json');
  if (!site) {
    console.error('❌ חסר out/event-kippot-products.json — הרץ קודם discover-products.mjs');
    process.exit(1);
  }
  const siteIds = site.offerIds;
  console.log(`A. האתר (פילטר "כיפות לאירועים"):  ${siteIds.length} מוצרים`);
  console.log(`   מהם כשירים לפיד:                ${site.offerIdsInFeed.length}`);

  // ── B. הפיד ────────────────────────────────────────────────────────────────
  console.log(`\n📡 מוריד את הפיד: ${FEED_URL}`);
  const res = await fetch(FEED_URL, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) { console.error(`❌ הפיד החזיר ${res.status}`); process.exit(1); }
  const xml = await res.text();
  const feedItems = parseFeed(xml);
  const labeled = feedItems.filter(i => i.label === CUSTOM_LABEL_VALUE);
  console.log(`B. הפיד: ${feedItems.length} פריטים סה"כ, ` +
              `${labeled.length} מסומנים custom_label_${CUSTOM_LABEL_INDEX}="${CUSTOM_LABEL_VALUE}"`);

  const feedDiff = diff(site.offerIdsInFeed, labeled.map(i => i.id));

  // ── C. המרצ'נט דרך Google Ads ──────────────────────────────────────────────
  let mc = null, mcDiff = null;
  if (!SKIP_ADS) {
    try {
      console.log(`\n📡 שולף shopping_product מחשבון Google Ads...`);
      mc = await fetchMerchantFromAds();
      const merchantIds = [...new Set(mc.map(x => x.merchantId).filter(Boolean))];
      console.log(`C. המרצ'נט: ${mc.length} מוצרים מסומנים · Merchant Center ID: ${merchantIds.join(', ') || '—'}`);
      mcDiff = diff(site.offerIdsInFeed, mc.map(x => x.id));
    } catch (e) {
      console.log(`⚠️  לא ניתן לשלוף מ-Google Ads: ${e.message}`);
      console.log(`   (המשך בבדיקת אתר↔פיד בלבד)`);
    }
  } else {
    console.log(`\nC. המרצ'נט: דולג (--no-ads)`);
  }

  // ── דוח ────────────────────────────────────────────────────────────────────
  console.log(`\n${line()}\nPRODUCT VALIDATION\n${line()}`);
  console.log(`מספר המוצרים בעמוד "כיפות לאירועים":     ${siteIds.length}`);
  console.log(`מהם כשירים לפיד (תמונה/מחיר/סטטוס):      ${site.offerIdsInFeed.length}`);
  console.log(`מספר המוצרים שסומנו בפיד:                ${labeled.length}`);
  if (mc) console.log(`מספר המוצרים המסומנים במרצ'נט:           ${mc.length}`);

  const allSame = feedDiff.missing.length === 0 && feedDiff.extra.length === 0 &&
                  (!mcDiff || (mcDiff.missing.length === 0 && mcDiff.extra.length === 0));
  console.log(`האם הרשימות זהות:                        ${allSame ? '✅ כן' : '❌ לא'}`);

  const report = (name, d) => {
    if (!d) return;
    if (d.missing.length) {
      console.log(`\n⚠️  חסרים ב-${name} (${d.missing.length}) — קיימים באתר, לא שם:`);
      for (const id of d.missing) {
        const p = site.products.find(x => x.offerId === id);
        console.log(`   • ${id}  ${p ? p.name.slice(0, 45) : ''}`);
      }
    }
    if (d.extra.length) {
      console.log(`\n🛑 מיותרים ב-${name} (${d.extra.length}) — לא קיימים בפילטר האתר:`);
      for (const id of d.extra) console.log(`   • ${id}`);
    }
  };
  report('פיד', feedDiff);
  report("מרצ'נט", mcDiff);

  const extraTotal = feedDiff.extra.length + (mcDiff?.extra.length ?? 0);
  console.log(`\nEXTRA PRODUCTS = ${extraTotal}`);

  saveJson('validation-report.json', {
    generatedAt: new Date().toISOString(),
    site: { count: siteIds.length, eligible: site.offerIdsInFeed.length },
    feed: { total: feedItems.length, labeled: labeled.length, ...feedDiff },
    merchant: mc ? { count: mc.length, ...mcDiff } : null,
    extraTotal,
    pass: extraTotal === 0,
  });

  if (extraTotal > 0) {
    console.log(`\n❌ ERROR — יש מוצרים מסומנים שאינם בפילטר האתר. עצירה.`);
    process.exit(1);
  }
  console.log(`\n✅ אין מוצרים מיותרים.`);
  if (feedDiff.missing.length) {
    console.log(`ℹ️  יש ${feedDiff.missing.length} מוצרים חסרים — כנראה הפיד עוד לא נפרס. ` +
                `בדוק שוב אחרי deploy של app/api/google-feed/route.ts.`);
  }
  process.exit(0);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
