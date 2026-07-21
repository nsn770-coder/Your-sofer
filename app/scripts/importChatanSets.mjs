/**
 * importChatanSets.mjs — ייבוא מארזי חתנים מהספק rikmat.com (Shopify).
 *
 * Usage:
 *   node app/scripts/importChatanSets.mjs             ← dry-run (מציג מה ייווצר)
 *   node app/scripts/importChatanSets.mjs --execute   ← מעלה תמונות לקלאודינרי ויוצר מוצרים
 *
 * לכל מוצר: שם, מחיר, תיאור + טבלת מידות (מהווריאנטים), עד 3 תמונות.
 * קטגוריה: תיקי טלית ותפילין | תת-קטגוריה: מארז לחתנים
 * הגנה מכפילויות: מוצר עם אותו שם שכבר קיים — מדולג.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const __dir   = dirname(fileURLToPath(import.meta.url));
const EXECUTE = process.argv.includes('--execute');

const keyPath = resolve(__dir, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
}
const db = getFirestore();

const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload';
const UPLOAD_PRESET = 'yoursofer_upload';

const PRODUCT_URLS = [
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%99%D7%95%D7%A7%D7%A8%D7%AA%D7%99-%D7%A6%D7%91%D7%A2-%D7%91%D7%96-%D7%99%D7%91%D7%A8%D7%9B%D7%9A-copy-1',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%99%D7%95%D7%A7%D7%A8%D7%AA%D7%99-%D7%A6%D7%91%D7%A2-%D7%91%D7%96-%D7%94%D7%A8%D7%99%D7%A0%D7%99-%D7%9E%D7%A7%D7%A9%D7%A8-copy-1',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%99%D7%95%D7%A7%D7%A8%D7%AA%D7%99-%D7%A6%D7%91%D7%A2-%D7%91%D7%96-%D7%99%D7%91%D7%A8%D7%9B%D7%9A-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%A9%D7%95%D7%99%D7%AA%D7%99-%D7%94-%D7%93%D7%9E%D7%95%D7%99-%D7%A2%D7%95%D7%A8-%D7%90%D7%A4%D7%95%D7%A8-%D7%9B%D7%94%D7%94-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%94%D7%90%D7%A9-%D7%A9%D7%9C%D7%99-%D7%A7%D7%98%D7%99%D7%A4%D7%94-%D7%91%D7%96-%D7%91%D7%94%D7%99%D7%A8-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%AA%D7%99%D7%A7%D7%95%D7%9F-%D7%94%D7%9B%D7%9C%D7%9C%D7%99-%D7%93%D7%9E%D7%95%D7%99-%D7%A2%D7%95%D7%A8-%D7%91%D7%96-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%94%D7%90%D7%A9-%D7%A9%D7%9C%D7%99-%D7%A7%D7%98%D7%99%D7%A4%D7%94-%D7%97%D7%95%D7%9D-%D7%9B%D7%94%D7%94-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%A9%D7%95%D7%99%D7%AA%D7%99-%D7%94-%D7%A7%D7%98%D7%99%D7%A4%D7%94-%D7%97%D7%95%D7%9D-%D7%9B%D7%94%D7%94-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
  'https://rikmat.com/products/%D7%9E%D7%90%D7%A8%D7%96-%D7%9C%D7%97%D7%AA%D7%9F-%D7%91%D7%A8%D7%9B%D7%AA-%D7%9B%D7%94%D7%A0%D7%99%D7%9D-%D7%A7%D7%98%D7%99%D7%A4%D7%94-%D7%91%D7%96-%D7%91%D7%94%D7%99%D7%A8-%D7%9B%D7%99%D7%A1%D7%95%D7%99%D7%99%D7%9D-%D7%95%D7%98%D7%9C%D7%99%D7%AA-%D7%A6%D7%9E%D7%A8-premium-copy',
];

// ── המרת body_html לטקסט קריא ────────────────────────────────────────────────
function htmlToText(html) {
  return (html || '')
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<\s*(td|th)[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── העלאת תמונה לקלאודינרי (מוריד בייטים ומעלה כ-multipart) ──────────────────
async function uploadToCloudinary(imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`image fetch ${imgRes.status}`);
  const blob = await imgRes.blob();
  const fd = new FormData();
  fd.append('file', blob, 'product.jpg');
  fd.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_UPLOAD, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error('cloudinary upload failed: ' + JSON.stringify(data).slice(0, 200));
  return data.secure_url;
}

async function run() {
  // מוצרים קיימים — הגנה מכפילויות לפי שם
  const existingSnap = await db.collection('products')
    .where('subCategory', '==', 'מארז לחתנים').get();
  const existingNames = new Set(existingSnap.docs.map(d => (d.data().name || '').trim()));

  let created = 0, skipped = 0, failed = 0;

  for (const url of PRODUCT_URLS) {
    try {
      const res = await fetch(url + '.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { product } = await res.json();

      const name = (product.title || '').trim();
      if (!name) throw new Error('no title');
      if (existingNames.has(name)) {
        console.log(`⏭️  קיים כבר — מדלג: ${name}`);
        skipped++;
        continue;
      }

      const price = Math.round(Number(product.variants?.[0]?.price || 0));
      const sizes = (product.options || [])
        .flatMap(o => (o.values || []).map(v => `• ${v}`));
      const desc =
        htmlToText(product.body_html) +
        (sizes.length ? `\n\nטבלת מידות:\n${sizes.join('\n')}\n\nציינו את המידה הרצויה בהערות להזמנה.` : '');

      const imgs = (product.images || []).slice(0, 3).map(i => i.src);
      console.log(`\n📦 ${name} — ₪${price} · ${imgs.length} תמונות · ${sizes.length} מידות`);

      if (!EXECUTE) continue;

      const uploaded = [];
      for (const src of imgs) {
        try { uploaded.push(await uploadToCloudinary(src)); }
        catch (e) { console.log(`   ⚠️ תמונה נכשלה: ${e.message}`); }
      }
      if (uploaded.length === 0) throw new Error('אף תמונה לא הועלתה');

      const data = {
        name,
        price,
        desc,
        cat: 'תיקי טלית ותפילין',
        category: 'תיקי טלית ותפילין',
        subCategory: 'מארז לחתנים',
        days: '7-10',
        imgUrl: uploaded[0],
        ...(uploaded[1] ? { imgUrl2: uploaded[1] } : {}),
        ...(uploaded[2] ? { imgUrl3: uploaded[2] } : {}),
        sku: null,
        source: 'rikmat',
        sourceUrl: url,
        status: 'active', // נדרש לאינדקס החיפוש (Algolia)
        stockVisible: false,
        outOfStock: false,
        priority: 60,
        createdAt: FieldValue.serverTimestamp(),
      };
      const ref = await db.collection('products').add(data);
      console.log(`   ✅ נוצר: ${ref.id}`);
      existingNames.add(name);
      created++;
    } catch (e) {
      console.error(`   ❌ נכשל (${url.slice(0, 60)}...): ${e.message}`);
      failed++;
    }
  }

  console.log(`\nסיכום: נוצרו ${created} · דולגו ${skipped} · נכשלו ${failed}`);
  if (!EXECUTE) console.log('\nDRY-RUN בלבד. להרצה בפועל: node app/scripts/importChatanSets.mjs --execute');
  if (EXECUTE && created > 0) console.log('אל תשכח: node scripts/syncAlgolia.mjs לעדכון החיפוש.');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
