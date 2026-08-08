/**
 * scrapeSkuImages.mjs
 * Tries to find images for our SKUs directly from israel-judaica
 */

const SKUS = [
  'UK50636', 'UK59857', 'UK59870', 'UK59254', 'UK86041', 'UK59166', 'UK85733',
  'UK67950', 'UK59876', 'UK41046', 'UK41047', 'UK83441', 'UK86402', 'UK40873',
  'UK40886', 'UK41021', 'UK41045', 'UK41012', 'UK24767', 'UK83395', 'UK55852',
  'UK59653', 'UK24870', 'UK24871', 'UK24940', 'UK24941', 'UK24942', 'UK24943',
  'UK24944', 'UK24945', 'UK24946', 'UK24928', 'UK24875', 'UK24877', 'UK24880',
  'UK24881', 'UK24882', 'UK24883', 'UK24872', 'UK24874', 'UK24884', 'UK24886',
  'UK24873', 'UK24876', 'UK24878', 'UK24879', 'UK24885', 'UK57333', 'UK59488',
  'UK59854', 'UK59855', 'UK59325', 'UK59327', 'UK67961', 'UK67963', 'UK68007',
  'UK67955', 'UK67956', 'UK67953', 'UK67954', 'UK68008', 'UK68009', 'UK68010',
  'UK68011', 'UK68012', 'UK68013', 'UK67979', 'UK67980', 'UK67981', 'UK67982',
  'UK67983', 'UK67984', 'UK67934', 'UK67935', 'UK67936', 'UK67962', 'UK68001',
  'UK68005', 'UK68006', 'UK68086', 'UK68087', 'UK68088', 'UK68089', 'UK12411',
  'UK12424', 'UK12429', 'UK12430', 'UK12414', 'UK12422', 'UK12513', 'UK12533',
  'UK12473', 'UK12474', 'UK12479', 'UK12500', 'UK12415', 'UK12475', 'UK12476',
  'UK12502', 'UK12403', 'UK12504', 'UK12510', 'UK12521', 'UK12410', 'UK12507',
  'UK12512', 'UK12531', 'UK40901', 'UK41014', 'UK86403',
];

const BASE_URL = 'https://www.israel-judaica.com';

async function fetchImageForSku(sku) {
  try {
    // Try direct image path (common for this site)
    const imageUrls = [
      `${BASE_URL}/big/${sku}.jpg`,
      `${BASE_URL}/webp/${sku}.jpg`,
      `${BASE_URL}/images/products/${sku}.jpg`,
    ];

    for (const url of imageUrls) {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          return url;
        }
      } catch (e) {
        // try next
      }
    }

    // Try fetching product page and extracting image
    const pageUrl = `${BASE_URL}/index.php?option=com_art&view=product&sku=${encodeURIComponent(sku)}&lang=he`;
    const pageRes = await fetch(pageUrl);

    if (pageRes.ok) {
      const html = await pageRes.text();

      // Look for image_url in page HTML
      const match = html.match(/image_url["\']?\s*:\s*["\']([^"\']+)/);
      if (match) return match[1];

      const match2 = html.match(/img[^>]+src=["\']([^"\']*\/big\/[^"\']+)/);
      if (match2) return match2[1];
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log(`🔍 Searching for images of ${SKUS.length} SKUs...\n`);

  const results = {};
  let found = 0;

  for (let i = 0; i < SKUS.length; i++) {
    const sku = SKUS[i];
    const image = await fetchImageForSku(sku);

    if (image) {
      results[sku] = image;
      console.log(`✅ [${i + 1}/${SKUS.length}] ${sku}: ${image}`);
      found++;
    } else {
      console.log(`❌ [${i + 1}/${SKUS.length}] ${sku}: NOT FOUND`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Found ${found}/${SKUS.length} images\n`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
