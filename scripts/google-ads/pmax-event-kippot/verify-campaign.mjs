/**
 * verify-campaign.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * הוכחה שהקמפיין שנוצר מפרסם אך ורק מוצרי "כיפות לאירועים".
 * שואל את Google Ads אילו מוצרים משויכים בפועל לקמפיין (shopping_product),
 * ומשווה לרשימת האתר.
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/verify-campaign.mjs
 *   node scripts/google-ads/pmax-event-kippot/verify-campaign.mjs --campaign-id 123456789
 */

import { getAdsCustomer, readJson, saveJson, header, line, digits } from './lib.mjs';
import { CUSTOM_LABEL_INDEX, CUSTOM_LABEL_VALUE, CAMPAIGN_NAME } from './config.mjs';

const g = (o, p, d = null) => p.split('.').reduce((x, k) => (x ?? {})[k], o) ?? d;
const argId = (() => { const i = process.argv.indexOf('--campaign-id'); return i > -1 ? process.argv[i + 1] : null; })();

async function main() {
  header('✔️  verify-campaign — הוכחת תקינות רשימת המוצרים');

  const site = readJson('event-kippot-products.json');
  if (!site) { console.error('❌ חסר out/event-kippot-products.json'); process.exit(1); }
  const siteSet = new Set(site.offerIdsInFeed);

  const { customer } = await getAdsCustomer();
  const cid = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);

  let campaignId = argId ?? readJson('created-campaign.json')?.campaignId;
  if (!campaignId) {
    const [c] = await customer.query(`
      SELECT campaign.id, campaign.name FROM campaign
      WHERE campaign.name = '${CAMPAIGN_NAME.replace(/'/g, "\\'")}' AND campaign.status != 'REMOVED'
    `);
    campaignId = c ? String(g(c, 'campaign.id')) : null;
  }
  if (!campaignId) { console.error(`❌ לא נמצא קמפיין "${CAMPAIGN_NAME}"`); process.exit(1); }

  const [camp] = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type,
           campaign.advertising_channel_type, campaign.shopping_setting.merchant_id,
           campaign.maximize_conversion_value.target_roas,
           campaign_budget.amount_micros
    FROM campaign WHERE campaign.id = ${campaignId}
  `);
  console.log(`קמפיין:   ${g(camp, 'campaign.name')} [${campaignId}]`);
  console.log(`סטטוס:    ${g(camp, 'campaign.status')}`);
  console.log(`ערוץ:     ${g(camp, 'campaign.advertising_channel_type')}`);
  console.log(`בידינג:   ${g(camp, 'campaign.bidding_strategy_type')} · tROAS=${g(camp, 'campaign.maximize_conversion_value.target_roas') ?? '—'}`);
  console.log(`תקציב:    ₪${(Number(g(camp, 'campaign_budget.amount_micros', 0)) / 1e6).toFixed(2)}/יום`);
  console.log(`Merchant: ${g(camp, 'campaign.shopping_setting.merchant_id')}`);

  if (g(camp, 'campaign.status') !== 'PAUSED') {
    console.log(`\n⚠️  שים לב: הקמפיין אינו PAUSED.`);
  }

  // ── Listing group ──────────────────────────────────────────────────────────
  console.log(`\n${line()}\nLISTING GROUP\n${line()}`);
  const filters = await customer.query(`
    SELECT asset_group_listing_group_filter.id,
           asset_group_listing_group_filter.type,
           asset_group_listing_group_filter.listing_source,
           asset_group_listing_group_filter.case_value.product_custom_attribute.index,
           asset_group_listing_group_filter.case_value.product_custom_attribute.value,
           asset_group.name
    FROM asset_group_listing_group_filter
    WHERE asset_group.campaign = 'customers/${cid}/campaigns/${campaignId}'
  `);
  let included = 0, excluded = 0;
  for (const f of filters) {
    const t = g(f, 'asset_group_listing_group_filter.type');
    if (t === 'UNIT_INCLUDED') included++;
    if (t === 'UNIT_EXCLUDED') excluded++;
    console.log(`  ${t.padEnd(15)} index=${g(f, 'asset_group_listing_group_filter.case_value.product_custom_attribute.index') ?? '—'} ` +
                `value=${g(f, 'asset_group_listing_group_filter.case_value.product_custom_attribute.value') ?? '(אחר)'}`);
  }
  console.log(`\n  UNIT_INCLUDED: ${included} · UNIT_EXCLUDED: ${excluded}`);

  // ── מוצרים בפועל ───────────────────────────────────────────────────────────
  console.log(`\n${line()}\nמוצרים המשויכים לקמפיין בפועל\n${line()}`);
  const prods = await customer.query(`
    SELECT shopping_product.item_id, shopping_product.title,
           shopping_product.custom_attribute${CUSTOM_LABEL_INDEX},
           shopping_product.status, shopping_product.campaign
    FROM shopping_product
    WHERE shopping_product.campaign = 'customers/${cid}/campaigns/${campaignId}'
  `);
  const ids = prods.map(p => g(p, 'shopping_product.item_id'));
  const extra   = ids.filter(id => !siteSet.has(id));
  const missing = [...siteSet].filter(id => !ids.includes(id));

  console.log(`מוצרים בקמפיין:                 ${ids.length}`);
  console.log(`מוצרים בפילטר האתר (כשירים):    ${siteSet.size}`);
  console.log(`EXTRA PRODUCTS = ${extra.length}`);
  console.log(`MISSING PRODUCTS = ${missing.length}`);

  if (extra.length) {
    console.log(`\n🛑 מוצרים מיותרים בקמפיין:`);
    for (const id of extra) {
      const p = prods.find(x => g(x, 'shopping_product.item_id') === id);
      console.log(`   • ${id}  ${g(p, 'shopping_product.title', '').slice(0, 50)}`);
    }
  }
  if (missing.length) {
    console.log(`\n⚠️  מוצרים מהאתר שעדיין לא נכנסו (בד"כ עיכוב סנכרון מרצ'נט):`);
    for (const id of missing.slice(0, 30)) {
      const p = site.products.find(x => x.offerId === id);
      console.log(`   • ${id}  ${(p?.name ?? '').slice(0, 50)}`);
    }
    if (missing.length > 30) console.log(`   ... ועוד ${missing.length - 30}`);
  }

  saveJson('verify-report.json', {
    generatedAt: new Date().toISOString(),
    campaignId, status: g(camp, 'campaign.status'),
    listingGroup: { included, excluded },
    productsInCampaign: ids.length, siteEligible: siteSet.size,
    extra, missing, pass: extra.length === 0,
  });

  console.log(`\n${extra.length === 0 ? '✅ אין מוצרים מיותרים.' : '❌ יש מוצרים מיותרים — לא להפעיל את הקמפיין.'}`);
  process.exit(extra.length === 0 ? 0 : 1);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
