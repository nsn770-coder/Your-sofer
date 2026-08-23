/**
 * discover-products.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * מקור האמת של הקמפיין: מפיק את רשימת המוצרים שמופיעים בפילטר
 *   /category/כיפות?filter=כיפות לאירועים
 * ישירות מ-Firestore, לפי אותה לוגיקה בדיוק שבה משתמש עמוד הקטגוריה
 * (isEventKippah ב-CategoryClient.tsx).
 *
 * פלט:  out/event-kippot-products.json
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/discover-products.mjs
 *   node scripts/google-ads/pmax-event-kippot/discover-products.mjs --csv
 *
 * הסקריפט קורא בלבד. הוא לא כותב שום דבר ל-Firestore.
 */

import { getDb, isEventKippah, feedEligibility, saveJson, header, line, EVENT_CAT, OUT_DIR } from './lib.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const WANT_CSV = process.argv.includes('--csv');

async function main() {
  header('🧿 discover-products — כיפות לאירועים (קריאה בלבד)');

  const db = getDb();
  const snap = await db.collection('products').where('cat', '==', EVENT_CAT).get();
  console.log(`📥 cat="${EVENT_CAT}" → ${snap.size} מוצרים בקטגוריה\n`);

  const products = [];
  const rejected = { notEvent: 0, souvenirScroll: 0, hidden: 0 };

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!isEventKippah(d)) {
      if (d.hidden === true) rejected.hidden++;
      else if (d.eventScrollSection) rejected.souvenirScroll++;
      else rejected.notEvent++;
      continue;
    }
    const reasons = [];
    if (d.subCategory === 'כיפות לאירועים') reasons.push('subCategory');
    if (d.isEventKippot === true)  reasons.push('isEventKippot');
    if (d.isEventProduct === true) reasons.push('isEventProduct');
    if (d.eventsOnly === true)     reasons.push('eventsOnly');

    const feed = feedEligibility(d);
    products.push({
      id:          doc.id,          // = g:id בפיד = Merchant Center offer id
      offerId:     doc.id,
      sku:         d.sku ?? null,
      name:        d.name ?? '',
      price:       typeof d.price === 'number' ? d.price : Number(d.price) || 0,
      subCategory: d.subCategory ?? null,
      link:        `https://your-sofer.com/product/${doc.id}`,
      image:       d.imgUrl ?? d.image_url ?? d.img1 ?? null,
      images:      [d.imgUrl ?? d.image_url ?? d.img1, d.imgUrl2 ?? d.img2, d.imgUrl3 ?? d.img3, d.imgUrl4]
                     .filter(u => typeof u === 'string' && u.trim()),
      matchReasons: reasons,
      inFeed:      feed.eligible,
      feedBlockers: feed.reasons,
    });
  }

  products.sort((a, b) => a.id.localeCompare(b.id));

  const notInFeed = products.filter(p => !p.inFeed);
  const noImage   = products.filter(p => p.images.length === 0);

  console.log(`✅ נמצאו ${products.length} מוצרי "כיפות לאירועים"\n`);
  console.log(line());
  for (const p of products) {
    const flag = p.inFeed ? ' ' : '⚠️';
    console.log(`${flag} [${p.id}] ${(p.sku ?? '—').padEnd(10)} ₪${String(p.price).padStart(6)}  ${p.name.slice(0, 46)}`);
    console.log(`      subCategory: ${p.subCategory ?? '(ריק)'} · זיהוי: ${p.matchReasons.join(', ')}`);
  }
  console.log(line());

  console.log(`\n📊 סיכום`);
  console.log(`   מוצרים בפילטר:               ${products.length}`);
  console.log(`   מהם ייכנסו לפיד המרצ'נט:      ${products.length - notInFeed.length}`);
  console.log(`   לא ייכנסו לפיד:               ${notInFeed.length}`);
  console.log(`   ללא תמונה:                    ${noImage.length}`);
  console.log(`\n   מוצרי כיפות שלא בפילטר:      ${rejected.notEvent}`);
  console.log(`   מזכרות בסקרולי אירועים:       ${rejected.souvenirScroll}`);
  console.log(`   מוסתרים (hidden):             ${rejected.hidden}`);

  if (notInFeed.length) {
    console.log(`\n⚠️  מוצרים שלא יופיעו ב-Merchant Center ולכן לא יפורסמו:`);
    for (const p of notInFeed) console.log(`   • [${p.id}] ${p.name.slice(0, 40)} — ${p.feedBlockers.join(', ')}`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'Firestore products where cat="כיפות" + isEventKippah()',
    filterUrl: 'https://your-sofer.com/category/%D7%9B%D7%99%D7%A4%D7%95%D7%AA?filter=%D7%9B%D7%99%D7%A4%D7%95%D7%AA%20%D7%9C%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D',
    categoryTotal: snap.size,
    count: products.length,
    countInFeed: products.length - notInFeed.length,
    offerIds: products.map(p => p.offerId),
    offerIdsInFeed: products.filter(p => p.inFeed).map(p => p.offerId),
    products,
  };
  const p = saveJson('event-kippot-products.json', out);
  console.log(`\n💾 נשמר: ${p}`);

  if (WANT_CSV) {
    mkdirSync(OUT_DIR, { recursive: true });
    const csv = ['offer_id,sku,name,price,subCategory,in_feed,link']
      .concat(products.map(x =>
        [x.offerId, x.sku ?? '', `"${(x.name ?? '').replace(/"/g, '""')}"`, x.price, x.subCategory ?? '', x.inFeed, x.link].join(',')
      )).join('\n');
    const cp = resolve(OUT_DIR, 'event-kippot-products.csv');
    writeFileSync(cp, '﻿' + csv, 'utf8');
    console.log(`💾 נשמר: ${cp}`);
  }

  process.exit(0);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
