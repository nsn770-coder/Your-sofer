/**
 * create-pmax-campaign.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * יוצר קמפיין Performance Max חדש (PAUSED) שמפרסם אך ורק את מוצרי
 * "כיפות לאירועים", לפי סימון custom_label_1 = event_kippot במרצ'נט.
 *
 * ⚠️ הסקריפט לא נוגע בשום קמפיין קיים. הוא יוצר ישויות חדשות בלבד.
 * ⚠️ ברירת המחדל היא --dry-run. ליצירה בפועל צריך --create במפורש.
 * ⚠️ הקמפיין נוצר תמיד ב-PAUSED. אין דגל שמפעיל אותו.
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs              ← dry-run
 *   node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs --dry-run
 *   node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs --create
 *
 * דגלים נוספים:
 *   --skip-url-exclusions   לא להוסיף החרגות עמודי נחיתה
 *   --with-negatives        להוסיף גם את מילות המפתח השליליות המוצעות
 *   --skip-validation       לדלג על בדיקת המוצרים (לא מומלץ)
 */

import { getAdsCustomer, readJson, saveJson, header, line, digits } from './lib.mjs';
import * as CFG from './config.mjs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ARGS   = process.argv.slice(2);
const CREATE = ARGS.includes('--create');
const DRY    = !CREATE;                       // ברירת מחדל: dry-run
const SKIP_URL_EXCL = ARGS.includes('--skip-url-exclusions');
const WITH_NEG      = ARGS.includes('--with-negatives');
const SKIP_VALID    = ARGS.includes('--skip-validation');

// ── עזרים ────────────────────────────────────────────────────────────────────
let tmp = 0;
const T = () => --tmp;                        // -1, -2, -3 ...
const rn = (cid, kind, id) => `customers/${cid}/${kind}/${id}`;

function fail(msg) { console.error(`\n🛑 ${msg}`); process.exit(1); }

async function main() {
  header(`🚀 create-pmax-campaign — ${DRY ? '🧪 DRY RUN (validate_only)' : '🔴 CREATE'}`);

  // ── 1. תקציב ובידינג — חייבים להיות מוגדרים במפורש ────────────────────────
  if (!CFG.DAILY_BUDGET_ILS || !(CFG.DAILY_BUDGET_ILS > 0)) {
    fail('DAILY_BUDGET_ILS לא מוגדר. הוסף אותו ל-.env.local. הסקריפט לא מנחש תקציב.');
  }
  if (CFG.TARGET_ROAS !== null && !(CFG.TARGET_ROAS > 0)) {
    fail('TARGET_ROAS מוגדר אך אינו מספר חיובי (2.5 = 250%).');
  }
  const merchantId = digits(process.env.GOOGLE_MERCHANT_ID);
  if (!merchantId) fail('GOOGLE_MERCHANT_ID לא מוגדר. הרץ check-account.mjs כדי לאתר אותו.');

  // ── 2. אימות מוצרים לפני הכול ──────────────────────────────────────────────
  if (!SKIP_VALID) {
    console.log('▶ מריץ validate-merchant-products.mjs...\n');
    try {
      execFileSync(process.execPath, [resolve(__dirname, 'validate-merchant-products.mjs')], { stdio: 'inherit' });
    } catch {
      fail('אימות המוצרים נכשל — לא ממשיכים ליצירת הקמפיין.');
    }
    console.log('');
  }

  const site   = readJson('event-kippot-products.json') ?? fail('חסר out/event-kippot-products.json');
  const assets = readJson('image-assets.json');
  if (!assets) fail('חסר out/image-assets.json — הרץ collect-assets.mjs');

  // ── 3. בדיקת מינימום נכסים של PMax ────────────────────────────────────────
  const gaps = [];
  if (CFG.HEADLINES.length < 3)      gaps.push('נדרשות לפחות 3 כותרות קצרות');
  if (CFG.LONG_HEADLINES.length < 1) gaps.push('נדרשת לפחות כותרת ארוכה אחת');
  if (CFG.DESCRIPTIONS.length < 2)   gaps.push('נדרשים לפחות 2 תיאורים');
  if (!assets.logo)                              gaps.push('נדרש נכס LOGO ביחס 1:1');
  if ((assets.images.MARKETING_IMAGE ?? []).length < 1)        gaps.push('נדרשת לפחות תמונת landscape 1.91:1');
  if ((assets.images.SQUARE_MARKETING_IMAGE ?? []).length < 1) gaps.push('נדרשת לפחות תמונה ריבועית 1:1');
  if (gaps.length) {
    console.log('⚠️  חוסרים בנכסים:');
    for (const g of gaps) console.log(`   • ${g}`);
    if (!DRY) fail('לא יוצרים קמפיין עם נכסים חסרים. השלם אותם ונסה שוב.');
  }

  const { customer } = await getAdsCustomer();
  const cid = digits(process.env.GOOGLE_ADS_CUSTOMER_ID);

  // ── 4. שם ייחודי — לא דורסים קמפיין קיים ──────────────────────────────────
  const existing = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status FROM campaign
    WHERE campaign.name = '${CFG.CAMPAIGN_NAME.replace(/'/g, "\\'")}' AND campaign.status != 'REMOVED'
  `);
  if (existing.length) {
    fail(`כבר קיים קמפיין בשם "${CFG.CAMPAIGN_NAME}" (id ${existing[0].campaign.id}). ` +
         `הסקריפט לא נוגע בקמפיינים קיימים — שנה CAMPAIGN_NAME ב-config.mjs.`);
  }

  // ── 5. הורדת התמונות ───────────────────────────────────────────────────────
  const imageBlobs = [];
  const wanted = [
    ...(assets.logo ? [{ ...assets.logo, field: 'LOGO', name: 'YourSofer Logo 1x1' }] : []),
    ...['MARKETING_IMAGE', 'SQUARE_MARKETING_IMAGE', 'PORTRAIT_MARKETING_IMAGE'].flatMap(f =>
      (assets.images[f] ?? []).map((im, i) => ({ ...im, field: f, name: `EventKippot ${f} ${i + 1}` }))),
  ];
  console.log(`\n▶ מוריד ${wanted.length} תמונות...`);
  for (const w of wanted) {
    const r = await fetch(w.url);
    if (!r.ok) { console.log(`   ✗ ${w.field}: HTTP ${r.status}`); continue; }
    imageBlobs.push({ ...w, data: Buffer.from(await r.arrayBuffer()) });
  }
  console.log(`   ✓ הורדו ${imageBlobs.length} תמונות`);

  // ── 6. בניית פעולות ה-mutate ──────────────────────────────────────────────
  const ops = [];

  const budgetRN = rn(cid, 'campaignBudgets', T());
  ops.push({
    entity: 'campaign_budget', operation: 'create',
    resource: {
      resource_name: budgetRN,
      name: `${CFG.BUDGET_NAME} ${Date.now()}`,
      amount_micros: Math.round(CFG.DAILY_BUDGET_ILS * 1e6),
      delivery_method: 'STANDARD',
      explicitly_shared: false,          // תקציב ייעודי לקמפיין הזה בלבד
    },
  });

  const campaignRN = rn(cid, 'campaigns', T());
  const campaign = {
    resource_name: campaignRN,
    name: CFG.CAMPAIGN_NAME,
    status: 'PAUSED',                                   // ← תמיד
    advertising_channel_type: 'PERFORMANCE_MAX',
    campaign_budget: budgetRN,
    // Maximize Conversion Value; עם target_roas אם הוגדר, אחרת בלי יעד
    maximize_conversion_value: CFG.TARGET_ROAS ? { target_roas: CFG.TARGET_ROAS } : {},
    shopping_setting: {
      merchant_id: Number(merchantId),
      ...(process.env.GOOGLE_MERCHANT_FEED_LABEL ? { feed_label: process.env.GOOGLE_MERCHANT_FEED_LABEL } : {}),
    },
    // Final URL Expansion: החל מ-API v22 השדה url_expansion_opt_out הוסר,
    // והשליטה עברה ל-asset automation. OPTED_OUT = בלי הרחבת עמודי נחיתה.
    asset_automation_settings: [{
      asset_automation_type: 'FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION',
      asset_automation_status: 'OPTED_OUT',
    }],
    url_custom_parameters: [],
  };
  ops.push({ entity: 'campaign', operation: 'create', resource: campaign });

  // מיקוד גיאוגרפי ושפה
  for (const geo of CFG.GEO_TARGET_CONSTANTS) {
    ops.push({
      entity: 'campaign_criterion', operation: 'create',
      resource: { campaign: campaignRN, location: { geo_target_constant: `geoTargetConstants/${geo}` } },
    });
  }
  for (const lang of CFG.LANGUAGE_CONSTANTS) {
    ops.push({
      entity: 'campaign_criterion', operation: 'create',
      resource: { campaign: campaignRN, language: { language_constant: `languageConstants/${lang}` } },
    });
  }

  // ── נכסי טקסט ──────────────────────────────────────────────────────────────
  const assetGroupRN = rn(cid, 'assetGroups', T());
  const textAssets = [
    ...CFG.HEADLINES.map(t      => ({ text: t, field: 'HEADLINE' })),
    ...CFG.LONG_HEADLINES.map(t => ({ text: t, field: 'LONG_HEADLINE' })),
    ...CFG.DESCRIPTIONS.map(t   => ({ text: t, field: 'DESCRIPTION' })),
    { text: CFG.BUSINESS_NAME, field: 'BUSINESS_NAME' },
  ];
  const linkOps = [];
  for (const ta of textAssets) {
    const aRN = rn(cid, 'assets', T());
    ops.push({ entity: 'asset', operation: 'create', resource: { resource_name: aRN, text_asset: { text: ta.text } } });
    linkOps.push({ asset: aRN, field_type: ta.field });
  }
  for (const im of imageBlobs) {
    const aRN = rn(cid, 'assets', T());
    ops.push({
      entity: 'asset', operation: 'create',
      resource: { resource_name: aRN, name: im.name, image_asset: { data: im.data } },
    });
    linkOps.push({ asset: aRN, field_type: im.field });
  }

  // ── Asset Group ────────────────────────────────────────────────────────────
  ops.push({
    entity: 'asset_group', operation: 'create',
    resource: {
      resource_name: assetGroupRN,
      campaign: campaignRN,
      name: CFG.ASSET_GROUP_NAME,
      final_urls: [CFG.FINAL_URL],
      final_mobile_urls: [CFG.FINAL_URL],
      status: 'ENABLED',       // הקמפיין עצמו PAUSED — שום דבר לא רץ
    },
  });
  for (const l of linkOps) {
    ops.push({
      entity: 'asset_group_asset', operation: 'create',
      resource: { asset_group: assetGroupRN, asset: l.asset, field_type: l.field_type },
    });
  }

  // ── Search Themes ──────────────────────────────────────────────────────────
  const themes = CFG.SEARCH_THEMES.slice(0, 25).filter(t => [...t].length <= 80);
  for (const t of themes) {
    ops.push({
      entity: 'asset_group_signal', operation: 'create',
      resource: { asset_group: assetGroupRN, search_theme: { text: t } },
    });
  }

  // ── Listing Group: רק custom_label_1 = event_kippot ───────────────────────
  const INDEX = `INDEX${CFG.CUSTOM_LABEL_INDEX}`;
  const rootRN = rn(cid, 'assetGroupListingGroupFilters', T());
  ops.push({
    entity: 'asset_group_listing_group_filter', operation: 'create',
    resource: {
      resource_name: rootRN,
      asset_group: assetGroupRN,
      type: 'SUBDIVISION',
      listing_source: 'SHOPPING',
    },
  });
  ops.push({
    entity: 'asset_group_listing_group_filter', operation: 'create',
    resource: {
      asset_group: assetGroupRN,
      type: 'UNIT_INCLUDED',
      listing_source: 'SHOPPING',
      parent_listing_group_filter: rootRN,
      case_value: { product_custom_attribute: { index: INDEX, value: CFG.CUSTOM_LABEL_VALUE } },
    },
  });
  ops.push({
    entity: 'asset_group_listing_group_filter', operation: 'create',
    resource: {
      asset_group: assetGroupRN,
      type: 'UNIT_EXCLUDED',                 // ← כל השאר: מוחרג
      listing_source: 'SHOPPING',
      parent_listing_group_filter: rootRN,
      case_value: { product_custom_attribute: { index: INDEX } },   // "אחר"
    },
  });

  // ── 7. סיכום לפני שליחה ────────────────────────────────────────────────────
  console.log(`\n${line()}\nתוכנית הקמפיין\n${line()}`);
  console.log(`Customer ID:        ${cid}`);
  console.log(`Merchant Center ID: ${merchantId}`);
  console.log(`שם קמפיין:          ${CFG.CAMPAIGN_NAME}`);
  console.log(`סטטוס:              PAUSED`);
  console.log(`ערוץ:               PERFORMANCE_MAX`);
  console.log(`תקציב יומי:         ₪${CFG.DAILY_BUDGET_ILS}`);
  console.log(`בידינג:             Maximize Conversion Value${CFG.TARGET_ROAS ? ` · Target ROAS ${CFG.TARGET_ROAS} (${CFG.TARGET_ROAS * 100}%)` : ' (ללא יעד ROAS)'}`);
  console.log(`מיקום:              Israel (${CFG.GEO_TARGET_CONSTANTS.join(', ')})`);
  console.log(`שפה:                Hebrew (${CFG.LANGUAGE_CONSTANTS.join(', ')})`);
  console.log(`Final URL:          ${CFG.FINAL_URL}`);
  console.log(`Final URL Expansion: OPTED_OUT`);
  console.log(`Asset Group:        ${CFG.ASSET_GROUP_NAME}`);
  console.log(`  כותרות קצרות:     ${CFG.HEADLINES.length}`);
  console.log(`  כותרות ארוכות:    ${CFG.LONG_HEADLINES.length}`);
  console.log(`  תיאורים:          ${CFG.DESCRIPTIONS.length}`);
  console.log(`  תמונות:           ${imageBlobs.filter(i => i.field !== 'LOGO').length} + לוגו ${imageBlobs.some(i => i.field === 'LOGO') ? '✓' : '✗'}`);
  console.log(`  Search Themes:    ${themes.length}`);
  console.log(`Listing Group:      custom_label_${CFG.CUSTOM_LABEL_INDEX} = "${CFG.CUSTOM_LABEL_VALUE}" → INCLUDED`);
  console.log(`                    כל השאר → EXCLUDED`);
  console.log(`מוצרים צפויים:      ${site.offerIdsInFeed.length}`);
  console.log(`סה"כ פעולות API:    ${ops.length}`);

  // ── 8. שליחה ───────────────────────────────────────────────────────────────
  console.log(`\n▶ שולח mutate (validate_only=${DRY})...`);
  let response;
  try {
    response = await customer.mutateResources(ops, {
      validate_only: DRY,
      partial_failure: false,
      response_content_type: 'RESOURCE_NAME_ONLY',
    });
  } catch (e) {
    console.error(`\n❌ ה-API החזיר שגיאה:`);
    const errs = e?.errors ?? e?.failure?.errors ?? [];
    if (errs.length) for (const er of errs) console.error(`   • ${er.message} ${JSON.stringify(er.location ?? {})}`);
    else console.error(`   ${e.message}`);
    process.exit(1);
  }

  if (DRY) {
    console.log(`\n✅ DRY RUN עבר בהצלחה — Google אישר את כל ${ops.length} הפעולות.`);
    console.log(`   שום דבר לא נוצר. ליצירה בפועל:`);
    console.log(`   node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs --create\n`);
    saveJson('dry-run-plan.json', { generatedAt: new Date().toISOString(), operations: ops.length, campaign: CFG.CAMPAIGN_NAME });
    process.exit(0);
  }

  const created = (response.results ?? []).map(r => r.resource_name);
  const campaignResource = created.find(r => /\/campaigns\/\d+$/.test(r));
  const campaignId = campaignResource?.split('/').pop();
  console.log(`\n✅ נוצר. Campaign ID: ${campaignId}`);
  console.log(`   סטטוס: PAUSED — לא מוציא כסף.`);

  // ── 9. החרגות עמודי נחיתה (mutate נפרד, לא מסכן את הקמפיין) ───────────────
  if (!SKIP_URL_EXCL && campaignResource) {
    const exclOps = CFG.EXCLUDED_URL_FRAGMENTS.map(frag => ({
      entity: 'campaign_criterion', operation: 'create',
      resource: {
        campaign: campaignResource,
        negative: true,
        webpage: {
          criterion_name: `exclude ${frag}`,
          conditions: [{ operand: 'URL', operator: 'CONTAINS', argument: frag }],
        },
      },
    }));
    try {
      await customer.mutateResources(exclOps, { partial_failure: true });
      console.log(`   ✓ נוספו ${exclOps.length} החרגות עמודי נחיתה.`);
    } catch (e) {
      console.log(`   ⚠️  לא ניתן להוסיף החרגות עמודי נחיתה: ${e.message}`);
      console.log(`      אפשר להוסיף ידנית: Campaign → Settings → URL exclusions.`);
    }
  }

  // ── 10. מילות מפתח שליליות (רק עם --with-negatives) ───────────────────────
  if (WITH_NEG && campaignResource) {
    const negOps = CFG.SUGGESTED_NEGATIVES.map(kw => ({
      entity: 'campaign_criterion', operation: 'create',
      resource: { campaign: campaignResource, negative: true, keyword: { text: kw, match_type: 'PHRASE' } },
    }));
    try {
      await customer.mutateResources(negOps, { partial_failure: true });
      console.log(`   ✓ נוספו ${negOps.length} מילות מפתח שליליות.`);
    } catch (e) { console.log(`   ⚠️  מילות מפתח שליליות: ${e.message}`); }
  } else {
    console.log(`   ℹ️  מילות מפתח שליליות לא נוספו (הרץ עם --with-negatives אם תרצה).`);
  }

  saveJson('created-campaign.json', {
    createdAt: new Date().toISOString(),
    customerId: cid, merchantId,
    campaignId, campaignResource,
    name: CFG.CAMPAIGN_NAME, status: 'PAUSED',
    dailyBudgetIls: CFG.DAILY_BUDGET_ILS, targetRoas: CFG.TARGET_ROAS,
    customLabel: `custom_label_${CFG.CUSTOM_LABEL_INDEX}=${CFG.CUSTOM_LABEL_VALUE}`,
    expectedProducts: site.offerIdsInFeed.length,
    resourceNames: created,
  });
  console.log(`\n💾 נשמר: out/created-campaign.json`);
  console.log(`\nהצעד הבא: הרץ verify-campaign.mjs כדי לוודא אילו מוצרים נכנסו בפועל.`);
  process.exit(0);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
