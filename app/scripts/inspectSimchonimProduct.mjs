/**
 * inspectSimchonimProduct.mjs
 *
 * בדיקת מבנה של עמוד מוצר בודד בסימחונים.
 * מדפיס כל מה שאפשר לחלץ — תמונות, תיאור, וריאציות, אופציות, קטגוריות.
 *
 * node app/scripts/inspectSimchonimProduct.mjs
 * node app/scripts/inspectSimchonimProduct.mjs "https://simchonim.co.il/product/..."
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ──
function loadEnv() {
  const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
  const vars = {};
  let key = null, val = [];
  for (const l of raw.split('\n')) {
    const m = l.trimEnd().match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) { if (key) vars[key] = val.join('\n'); key = m[1]; val = [m[2]]; }
    else if (key) val.push(l.trimEnd());
  }
  if (key) vars[key] = val.join('\n');
  return vars;
}

const env = loadEnv();
let pk = env['FIREBASE_PRIVATE_KEY']?.trim();
if (pk?.startsWith('"')) pk = pk.slice(1, -1);
pk = pk?.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: env['FIREBASE_PROJECT_ID'],
    clientEmail: env['FIREBASE_CLIENT_EMAIL'],
    privateKey: pk,
  }),
});
const db = getFirestore();

/** שולף supplier_url אמיתי מ-Firestore (ומדפיס כמה דוגמאות) */
async function pickUrlFromFirestore() {
  const snap = await db.collection('products')
    .where('supplier', '==', 'simchonim')
    .limit(15)
    .get();

  const all = snap.docs.map(d => ({
    name: d.data().name,
    url: d.data().supplier_url,
    sku: d.data().supplier_sku,
  }));

  console.log(`📦 ${snap.size} מוצרי simchonim ב-Firestore. מה נשמר בפועל:\n`);
  all.slice(0, 10).forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.name}`);
    console.log(`      sku: ${u.sku}`);
    console.log(`      url: ${decodeURIComponent(u.url || '(ריק)')}`);
  });
  console.log('');

  // מוצר = /products-catalog/<קטגוריה>/<תת-קטגוריה>/<slug>/ (3+ מקטעים)
  const isProduct = u => {
    if (!u) return false;
    const segs = decodeURIComponent(u)
      .replace(/^https?:\/\/[^/]+/, '')
      .split('/')
      .filter(Boolean);
    return segs[0] === 'products-catalog' && segs.length >= 3;
  };

  const good = all.filter(x => isProduct(x.url));
  console.log(`✓ ${good.length}/${all.length} URLים נראים כקישורי מוצר\n`);
  return good[0]?.url ?? null;
}

function line(char = '─', n = 70) {
  return char.repeat(n);
}

async function main() {
  const url = process.argv[2] || (await pickUrlFromFirestore());

  if (!url) {
    console.error('❌ לא נמצא supplier_url תקין ב-Firestore. העבר URL כפרמטר.');
    process.exit(1);
  }

  console.log(`\n🔍 ${url}\n`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 1500)); // תן ל-JS לסיים

    const data = await page.evaluate(() => {
      const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
      const out = {};

      // ── שם ──
      out.title = txt(document.querySelector('h1, .product_title'));

      // ── מחיר ──
      out.priceText = txt(document.querySelector('.summary .price, .price'));

      // ── מק"ט ──
      out.sku = txt(document.querySelector('.sku, [class*="sku"]'));

      // ── תיאור קצר ──
      out.shortDesc = txt(document.querySelector(
        '.woocommerce-product-details__short-description, .summary [class*="short"]'
      ));

      // ── תיאור מלא ──
      out.fullDesc = txt(document.querySelector(
        '#tab-description, .woocommerce-Tabs-panel--description, [class*="description"]'
      ))?.slice(0, 800);

      // ── קטגוריות / תגיות ──
      out.categories = [...document.querySelectorAll('.posted_in a, [class*="product_cat"] a')]
        .map(a => a.textContent.trim());
      out.tags = [...document.querySelectorAll('.tagged_as a')].map(a => a.textContent.trim());

      // ── פירורי לחם ──
      out.breadcrumb = [...document.querySelectorAll('.woocommerce-breadcrumb a, nav[class*="breadcrumb"] a')]
        .map(a => a.textContent.trim());

      // ── תמונות ──
      const imgs = new Set();
      document.querySelectorAll(
        '.woocommerce-product-gallery img, .flex-control-thumbs img, [class*="gallery"] img'
      ).forEach(img => {
        const src = img.getAttribute('data-large_image') ||
                    img.getAttribute('data-src') ||
                    img.src;
        if (src && !src.startsWith('data:')) imgs.add(src);
      });
      out.images = [...imgs];

      // ── וריאציות: ה-JSON ש-WooCommerce מטמיע ──
      const varForm = document.querySelector('form.variations_form');
      if (varForm) {
        const raw = varForm.getAttribute('data-product_variations');
        if (raw && raw !== 'false') {
          try {
            const parsed = JSON.parse(raw);
            out.variations = parsed.map(v => ({
              id: v.variation_id,
              attributes: v.attributes,
              price: v.display_price,
              regularPrice: v.display_regular_price,
              sku: v.sku,
              image: v.image?.src || v.image?.full_src || null,
              inStock: v.is_in_stock,
            }));
          } catch (e) {
            out.variationsParseError = e.message;
          }
        }
      }

      // ── מאפייני בחירה (dropdowns / swatches) ──
      out.attributes = [];
      document.querySelectorAll('table.variations tr, .variations .value').forEach(row => {
        const label = txt(row.querySelector('th, label'));
        const select = row.querySelector('select');
        const swatches = [...row.querySelectorAll('[class*="swatch"], li[data-value], .term')];

        const entry = { label };
        if (select) {
          entry.type = 'select';
          entry.options = [...select.options]
            .map(o => ({ value: o.value, text: o.textContent.trim() }))
            .filter(o => o.value);
        } else if (swatches.length) {
          entry.type = 'swatch';
          entry.options = swatches.map(s => ({
            value: s.getAttribute('data-value') || s.getAttribute('title'),
            text: s.textContent.trim() || s.getAttribute('title'),
          }));
        }
        if (entry.options?.length) out.attributes.push(entry);
      });

      // ── תוספות / הטבעה: שדות טקסט, checkboxes, addons ──
      out.addons = [];
      document.querySelectorAll(
        '.wc-pao-addon, [class*="addon"], .product-addon, input[type="text"][name*="field"], textarea[name*="field"]'
      ).forEach(el => {
        const label = txt(el.querySelector('label, .wc-pao-addon-name')) ||
                      el.getAttribute('placeholder') ||
                      el.getAttribute('name');
        if (label) {
          out.addons.push({
            label,
            tag: el.tagName.toLowerCase(),
            type: el.getAttribute('type') || null,
            name: el.getAttribute('name') || null,
          });
        }
      });

      // ── כל שדות ה-input בטופס (מציף אופציות נסתרות) ──
      const form = document.querySelector('form.cart, form[class*="cart"]');
      out.formFields = form
        ? [...form.querySelectorAll('input, select, textarea')]
            .map(el => ({
              tag: el.tagName.toLowerCase(),
              type: el.getAttribute('type'),
              name: el.getAttribute('name'),
              placeholder: el.getAttribute('placeholder'),
            }))
            .filter(f => f.name && !['quantity', 'add-to-cart'].includes(f.name))
        : [];

      // ── DUMP: מבנה אזור המוצר (תגית + class + טקסט קצר) ──
      // זה מה שמלמד אותנו את שמות ה-classes האמיתיים בתבנית המותאמת.
      const root =
        document.querySelector('.tm-extra-product-options') ||
        document.querySelector('form.cart') ||
        document.querySelector('div.product') ||
        document.body;

      const outline = [];
      const walk = (el, depth) => {
        if (depth > 12 || outline.length > 400) return;
        for (const child of el.children) {
          const tag = child.tagName.toLowerCase();
          if (['script', 'style', 'svg', 'path', 'noscript'].includes(tag)) continue;

          const cls = (child.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
          const own = [...child.childNodes]
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.replace(/\s+/g, ' ').trim())
            .join(' ')
            .slice(0, 60);

          const attrs = [];
          for (const a of ['type', 'name', 'value', 'data-price', 'data-value', 'href', 'src']) {
            const v = child.getAttribute(a);
            if (v) attrs.push(`${a}="${v.slice(0, 50)}"`);
          }

          outline.push(
            '  '.repeat(depth) +
            `<${tag}${cls ? '.' + cls : ''}${attrs.length ? ' ' + attrs.join(' ') : ''}>` +
            (own ? `  «${own}»` : '')
          );
          walk(child, depth + 1);
        }
      };
      walk(root, 0);
      out.outline = outline;
      out.outlineRoot = root.className || root.tagName;

      // ── TM Extra Product Options: קבוצות אופציות עם תוויות ומחירים ──
      out.epo = [];
      document.querySelectorAll('.tm-extra-product-options .tmcp-field-wrap, .tm-extra-product-options .cpf-element, .tm-epo-field-wrap').forEach(wrap => {
        const label =
          txt(wrap.querySelector('.tm-epo-field-label, .tc-label, label')) ||
          wrap.getAttribute('data-tm-epo-element-label');
        const priceEl = wrap.querySelector('.tc-price, .tm-epo-element-price, [class*="price"]');
        const input = wrap.querySelector('input, select, textarea');
        if (!label && !input) return;
        out.epo.push({
          label: label?.slice(0, 90) || null,
          price: txt(priceEl),
          name: input?.getAttribute('name') || null,
          type: input?.getAttribute('type') || input?.tagName.toLowerCase() || null,
          value: input?.getAttribute('value')?.slice(0, 60) || null,
        });
      });

      // ── סקציות/כותרות של TM EPO (למשל "הטבעת שם", "הטבעת הקדשה") ──
      out.epoSections = [...document.querySelectorAll(
        '.tm-extra-product-options .tm-epo-element-label, .tm-extra-product-options h3, .tm-extra-product-options .tm-section-label, .tm-collapse-wrap'
      )].map(el => txt(el)?.slice(0, 120)).filter(Boolean).slice(0, 40);

      // ── מלאי ──
      out.stock = txt(document.querySelector('.stock, [class*="stock"]'));

      // ── מידות מתוך התיאור ──
      const dimText = txt(document.querySelector('.woocommerce-product-details__short-description')) || '';
      const len = dimText.match(/אורך[:\s]*([\d.]+)/);
      const wid = dimText.match(/רוחב[:\s]*([\d.]+)/);
      out.dimensions = { length: len?.[1] || null, width: wid?.[1] || null };

      // ── כל התמונות בעמוד שמקורן בדומיין (fallback לגלריה) ──
      const anyImgs = new Set();
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('data-large_image') || img.getAttribute('data-src') || img.src;
        if (src && !src.startsWith('data:') && /simchonim|wp-content/.test(src)) anyImgs.add(src);
      });
      out.allImages = [...anyImgs];

      return out;
    });

    // ── הדפסה ──
    console.log(line('═'));
    console.log('שם:      ', data.title);
    console.log('מחיר:    ', data.priceText);
    console.log('מק"ט:    ', data.sku);
    console.log(line('═'));

    console.log('\n📁 קטגוריות:', data.categories?.join(' | ') || '(אין)');
    console.log('🏷️  תגיות:  ', data.tags?.join(' | ') || '(אין)');
    console.log('🧭 breadcrumb:', data.breadcrumb?.join(' > ') || '(אין)');

    console.log(`\n🖼️  תמונות (${data.images?.length || 0}):`);
    (data.images || []).forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

    console.log('\n📝 תיאור קצר:');
    console.log('   ', data.shortDesc || '(אין)');

    console.log('\n📄 תיאור מלא (800 תווים ראשונים):');
    console.log('   ', data.fullDesc || '(אין)');

    console.log(`\n🎨 מאפייני בחירה (${data.attributes?.length || 0}):`);
    (data.attributes || []).forEach(a => {
      console.log(`   ▸ ${a.label} [${a.type}]`);
      (a.options || []).forEach(o => console.log(`       - ${o.text} (${o.value})`));
    });

    console.log(`\n🔀 וריאציות (${data.variations?.length || 0}):`);
    if (data.variationsParseError) {
      console.log('   ⚠️  parse error:', data.variationsParseError);
    }
    (data.variations || []).slice(0, 8).forEach(v => {
      console.log(`   ▸ ${JSON.stringify(v.attributes)}`);
      console.log(`       ₪${v.price} | sku=${v.sku || '-'} | stock=${v.inStock}`);
      if (v.image) console.log(`       img: ${v.image}`);
    });
    if ((data.variations?.length || 0) > 8) {
      console.log(`   ... ועוד ${data.variations.length - 8}`);
    }

    console.log(`\n➕ תוספות/אופציות (${data.addons?.length || 0}):`);
    (data.addons || []).forEach(a =>
      console.log(`   ▸ ${a.label} <${a.tag}${a.type ? ' type=' + a.type : ''}> name=${a.name}`)
    );

    console.log(`\n🧾 שדות טופס העגלה (${data.formFields?.length || 0}):`);
    (data.formFields || []).forEach(f =>
      console.log(`   ▸ <${f.tag}${f.type ? ' type=' + f.type : ''}> name=${f.name}${f.placeholder ? ' ph="' + f.placeholder + '"' : ''}`)
    );

    console.log(`\n📦 מלאי: ${data.stock || '(לא נמצא)'}`);
    console.log(`📐 מידות: אורך=${data.dimensions?.length || '-'} רוחב=${data.dimensions?.width || '-'}`);

    console.log(`\n🗂️  סקציות TM EPO (${data.epoSections?.length || 0}):`);
    (data.epoSections || []).forEach(s => console.log(`   ▸ ${s}`));

    console.log(`\n⚙️  שדות TM EPO (${data.epo?.length || 0}):`);
    (data.epo || []).slice(0, 60).forEach(e =>
      console.log(`   ▸ ${e.label || '(ללא תווית)'} | ${e.price || '-'} | ${e.type} | ${e.name}${e.value ? ' = ' + e.value : ''}`)
    );
    if ((data.epo?.length || 0) > 60) console.log(`   ... ועוד ${data.epo.length - 60}`);

    console.log(`\n🖼️  כל התמונות בעמוד (${data.allImages?.length || 0}):`);
    (data.allImages || []).slice(0, 15).forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

    console.log('\n' + line('═'));
    console.log(`🌳 מבנה DOM של אזור המוצר  (root: ${data.outlineRoot})`);
    console.log(line('═'));
    (data.outline || []).forEach(l => console.log(l));
    console.log(line('═'));
  } catch (err) {
    console.error('❌', err.message);
  } finally {
    await browser.close();
  }
}

main();
