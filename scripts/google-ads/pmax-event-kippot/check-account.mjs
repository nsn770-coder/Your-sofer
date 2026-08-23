/**
 * check-account.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * ביקורת קריאה-בלבד של חשבון Google Ads לפני יצירת הקמפיין.
 * לא משנה, לא מוחק ולא משהה שום דבר.
 *
 * מציג:
 *   • פרטי החשבון (ID, מטבע, אזור זמן)
 *   • Merchant Center מקושרים
 *   • כל ה-Conversion Actions: קטגוריה, סטטוס, primary/secondary, value settings
 *   • יעדי המרה בחשבון (customer_conversion_goal — מה biddable)
 *   • הקמפיינים הקיימים (כדי לוודא שלא נוגעים בהם)
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/check-account.mjs
 */

import { getAdsCustomer, saveJson, header, line } from './lib.mjs';

const g = (o, path, d = null) => path.split('.').reduce((x, k) => (x ?? {})[k], o) ?? d;

async function main() {
  header('🔍 check-account — ביקורת קריאה-בלבד');

  const { customer } = await getAdsCustomer();

  // ── חשבון ──────────────────────────────────────────────────────────────────
  const [cust] = await customer.query(`
    SELECT customer.id, customer.descriptive_name, customer.currency_code,
           customer.time_zone, customer.manager, customer.test_account
    FROM customer LIMIT 1
  `);
  console.log(`חשבון:      ${g(cust, 'customer.descriptive_name')} (${g(cust, 'customer.id')})`);
  console.log(`מטבע:       ${g(cust, 'customer.currency_code')}`);
  console.log(`אזור זמן:   ${g(cust, 'customer.time_zone')}`);
  console.log(`חשבון בדיקה: ${g(cust, 'customer.test_account') ? 'כן' : 'לא'}`);
  if (g(cust, 'customer.currency_code') !== 'ILS') {
    console.log(`⚠️  מטבע החשבון אינו ILS — התקציב ב-DAILY_BUDGET_ILS ייחשב במטבע החשבון.`);
  }

  // ── Merchant Center ────────────────────────────────────────────────────────
  console.log(`\n${line()}\nMERCHANT CENTER\n${line()}`);
  let merchantIds = [];
  try {
    const links = await customer.query(`
      SELECT product_link.product_link_id, product_link.type,
             product_link.merchant_center.merchant_center_id
      FROM product_link
    `);
    for (const l of links) {
      const id = g(l, 'product_link.merchant_center.merchant_center_id');
      if (id) merchantIds.push(String(id));
      console.log(`  • type=${g(l, 'product_link.type')} merchant_center_id=${id ?? '—'}`);
    }
    if (!links.length) console.log('  (אין קישורי product_link — ייתכן שהקישור ישן/דרך merchant_center_link)');
  } catch (e) {
    console.log(`  ⚠️  ${e.message}`);
  }

  // מזהי מרצ'נט שנצפים בפועל במוצרים
  try {
    const [row] = await customer.query(`
      SELECT shopping_product.merchant_center_id, shopping_product.feed_label,
             shopping_product.language_code
      FROM shopping_product LIMIT 1
    `);
    if (row) {
      console.log(`  נצפה במוצרים: merchant_center_id=${g(row, 'shopping_product.merchant_center_id')} ` +
                  `feed_label=${g(row, 'shopping_product.feed_label')} ` +
                  `language=${g(row, 'shopping_product.language_code')}`);
      const mid = String(g(row, 'shopping_product.merchant_center_id'));
      if (mid && !merchantIds.includes(mid)) merchantIds.push(mid);
    }
  } catch { /* ייתכן שאין הרשאה ל-shopping_product */ }

  // ── Conversion Actions ─────────────────────────────────────────────────────
  console.log(`\n${line()}\nCONVERSION ACTIONS\n${line()}`);
  const actions = await customer.query(`
    SELECT conversion_action.id, conversion_action.name, conversion_action.status,
           conversion_action.type, conversion_action.category,
           conversion_action.primary_for_goal,
           conversion_action.include_in_conversions_metric,
           conversion_action.counting_type,
           conversion_action.value_settings.default_value,
           conversion_action.value_settings.default_currency_code,
           conversion_action.value_settings.always_use_default_value,
           conversion_action.origin
    FROM conversion_action
    ORDER BY conversion_action.category
  `);
  const rows = actions.map(a => ({
    id: g(a, 'conversion_action.id'),
    name: g(a, 'conversion_action.name'),
    status: g(a, 'conversion_action.status'),
    type: g(a, 'conversion_action.type'),
    category: g(a, 'conversion_action.category'),
    origin: g(a, 'conversion_action.origin'),
    primary: g(a, 'conversion_action.primary_for_goal'),
    inConversions: g(a, 'conversion_action.include_in_conversions_metric'),
    countingType: g(a, 'conversion_action.counting_type'),
    defaultValue: g(a, 'conversion_action.value_settings.default_value'),
    defaultCurrency: g(a, 'conversion_action.value_settings.default_currency_code'),
    alwaysDefault: g(a, 'conversion_action.value_settings.always_use_default_value'),
  }));
  for (const r of rows) {
    const mark = r.category === 'PURCHASE' ? '🛒' : '  ';
    console.log(`${mark} [${r.id}] ${r.name}`);
    console.log(`      category=${r.category} status=${r.status} type=${r.type} origin=${r.origin}`);
    console.log(`      primary_for_goal=${r.primary} include_in_conversions=${r.inConversions} counting=${r.countingType}`);
    console.log(`      value: default=${r.defaultValue ?? '—'} currency=${r.defaultCurrency ?? '—'} ` +
                `always_use_default=${r.alwaysDefault}`);
  }

  const purchases = rows.filter(r => r.category === 'PURCHASE' && r.status === 'ENABLED');
  console.log(`\nסיכום המרות רכישה פעילות: ${purchases.length}`);
  for (const p of purchases) {
    const problems = [];
    if (p.alwaysDefault) problems.push('always_use_default_value=true — הערך שנשלח מהאתר מתעלמים ממנו');
    if (!p.inConversions) problems.push('לא נכלל בעמודת Conversions — לא ישמש לבידינג');
    if (!p.primary) problems.push('לא primary — לא ישמש לאופטימיזציה');
    if (p.defaultCurrency && p.defaultCurrency !== 'ILS') problems.push(`מטבע ברירת מחדל ${p.defaultCurrency} ולא ILS`);
    console.log(`  • ${p.name}: ${problems.length ? '⚠️  ' + problems.join(' | ') : '✅ נראה תקין'}`);
  }
  if (!purchases.length) {
    console.log(`  🛑 אין Conversion Action פעיל בקטגוריית PURCHASE — אין על מה לבצע אופטימיזציית ערך.`);
  }

  // ── יעדי המרה ברמת החשבון ──────────────────────────────────────────────────
  console.log(`\n${line()}\nACCOUNT CONVERSION GOALS (primary = biddable)\n${line()}`);
  try {
    const goals = await customer.query(`
      SELECT customer_conversion_goal.category, customer_conversion_goal.origin,
             customer_conversion_goal.biddable
      FROM customer_conversion_goal
    `);
    for (const gg of goals) {
      const biddable = g(gg, 'customer_conversion_goal.biddable');
      if (biddable) console.log(`  ✅ ${g(gg, 'customer_conversion_goal.category')} / ${g(gg, 'customer_conversion_goal.origin')} — biddable (Primary)`);
    }
    const nonBiddable = goals.filter(x => !g(x, 'customer_conversion_goal.biddable')).length;
    console.log(`  (ועוד ${nonBiddable} יעדים לא-biddable = Secondary)`);
  } catch (e) { console.log(`  ⚠️  ${e.message}`); }

  // ── קמפיינים קיימים ────────────────────────────────────────────────────────
  console.log(`\n${line()}\nקמפיינים קיימים (לא נוגעים בהם!)\n${line()}`);
  const camps = await customer.query(`
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.advertising_channel_type, campaign.bidding_strategy_type,
           campaign_budget.amount_micros,
           campaign.shopping_setting.merchant_id
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
  `);
  for (const c of camps) {
    console.log(`  • [${g(c, 'campaign.id')}] ${g(c, 'campaign.name')}`);
    console.log(`      ${g(c, 'campaign.advertising_channel_type')} · ${g(c, 'campaign.status')} · ` +
                `bidding=${g(c, 'campaign.bidding_strategy_type')} · ` +
                `budget=${(Number(g(c, 'campaign_budget.amount_micros', 0)) / 1e6).toFixed(2)}/יום · ` +
                `merchant=${g(c, 'campaign.shopping_setting.merchant_id') ?? '—'}`);
  }

  saveJson('account-audit.json', {
    generatedAt: new Date().toISOString(),
    customerId: String(g(cust, 'customer.id')),
    currency: g(cust, 'customer.currency_code'),
    timeZone: g(cust, 'customer.time_zone'),
    merchantIds,
    conversionActions: rows,
    campaigns: camps.map(c => ({
      id: String(g(c, 'campaign.id')),
      name: g(c, 'campaign.name'),
      status: g(c, 'campaign.status'),
      channel: g(c, 'campaign.advertising_channel_type'),
      bidding: g(c, 'campaign.bidding_strategy_type'),
    })),
  });
  console.log(`\n💾 נשמר: out/account-audit.json`);
  console.log(`\nℹ️  אם GOOGLE_MERCHANT_ID לא מוגדר ב-.env.local, השתמש באחד מ: ${merchantIds.join(', ') || '(לא נמצא)'}`);
  process.exit(0);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
