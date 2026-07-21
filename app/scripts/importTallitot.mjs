/**
 * importTallitot.mjs — ייבוא טליתות מקטלוג הספק (mofet) + תמונות מגוגל דרייב.
 *
 * Usage:
 *   node app/scripts/importTallitot.mjs             ← dry-run (סורק ומציג, לא נוגע)
 *   node app/scripts/importTallitot.mjs --execute   ← מעלה תמונות ויוצר מוצרים
 *
 * מבנה: מוצר לכל דגם×צבע. בתוך המוצר — וריאציית "מידה" עם תוספת מחיר.
 * מחירים: מחיר ספק × 2. מחיר הבסיס = המידה הזולה; שאר המידות כתוספת.
 * תמונות: תיקיית דרייב ציבורית → תיקיית דגם → תיקיית צבע → עד 3 תמונות.
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
const DRIVE_ROOT = '1F4CRQAVpkwjI90mBtr-hvRgcAeVsmDld';
const MARKUP = 2; // מכפיל על מחיר הספק

// ── קטלוג: דגמים, מידות (מחיר ספק), צבעים ────────────────────────────────────
const DIMS = { 45: '110×160', 50: '120×170', 55: '130×185', 60: '140×185', 70: '150×185', 80: '170×190' };
// folderName = החלק העברי המדויק של שם התיקייה בדרייב (התאמה מדויקת —
// כדי ש"למנצח רשת לבן" לא ייתפס בטעות כ"למנצח", ו"הללויה" כן ייתפס כדגם הללוי-ה)
const MODELS = [
  { folderName: 'הללויה', name: 'הללוי-ה', sizes: { 50: 350, 60: 380, 70: 400 } },
  { folderName: 'שיר',    name: 'שיר',     sizes: { 50: 249, 60: 283 } },
  { folderName: 'הלל',    name: 'הלל',     sizes: { 50: 261, 55: 271, 60: 294, 70: 318 } },
  { folderName: 'מוסף',   name: 'מוסף',    sizes: { 55: 260, 60: 283, 70: 306, 80: 340 } },
  { folderName: 'ישתבח',  name: 'ישתבח',   sizes: { 50: 226, 55: 236, 60: 259, 70: 283, 80: 326 } },
  { folderName: 'למנצח',  name: 'למנצח',   sizes: { 45: 216, 50: 226, 55: 236, 60: 259, 70: 283, 80: 326 } },
];

// ── סריקת תיקיית דרייב ציבורית (embeddedfolderview — לא דורש הרשאות) ─────────
async function listDriveFolder(folderId) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${folderId}#list`);
  if (!res.ok) throw new Error(`drive folder ${folderId}: HTTP ${res.status}`);
  const html = await res.text();
  const entries = [];
  // כל פריט: <div class="flip-entry" id="entry-<ID>" ... <div class="flip-entry-title"><NAME></div>
  const re = /id="entry-([-\w]+)"[\s\S]*?flip-entry-title">([^<]*)</g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const title = m[2].trim();
    const isFolder = html.includes(`drive.google.com/drive/folders/${id}`) ||
                     new RegExp(`entry-${id}"[\\s\\S]{0,600}?folders/${id}`).test(html);
    entries.push({ id, title, isFolder });
  }
  return entries;
}

function hebrewPart(title) {
  // "אפור - Gray" → "אפור" ; "הלל - Hallel" → "הלל"
  return title.split(/\s*[-–]\s*/)[0].trim();
}

async function uploadToCloudinary(driveFileId) {
  const url = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  const imgRes = await fetch(url, { redirect: 'follow' });
  if (!imgRes.ok) throw new Error(`image ${driveFileId}: HTTP ${imgRes.status}`);
  const ct = imgRes.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error(`image ${driveFileId}: קובץ לא ציבורי או גדול מדי`);
  const blob = await imgRes.blob();
  const fd = new FormData();
  fd.append('file', blob, 'tallit.jpg');
  fd.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(CLOUDINARY_UPLOAD, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error('cloudinary failed: ' + JSON.stringify(data).slice(0, 150));
  return data.secure_url;
}

function buildProduct(model, colorName, imageUrls) {
  const sizeEntries = Object.entries(model.sizes)
    .map(([size, supplierPrice]) => ({ size: Number(size), supplierPrice, price: supplierPrice * MARKUP }))
    .sort((a, b) => a.price - b.price);
  const base = sizeEntries[0];

  const values = sizeEntries.map(s => `מידה ${s.size} (${DIMS[s.size]} ס"מ)`);
  const surcharges = {};
  for (const s of sizeEntries) {
    const diff = s.price - base.price;
    if (diff > 0) surcharges[`מידה ${s.size} (${DIMS[s.size]} ס"מ)`] = diff;
  }

  const sizeTable = sizeEntries
    .sort((a, b) => a.size - b.size)
    .map(s => `• מידה ${s.size} — ${DIMS[s.size]} ס"מ — ₪${s.price}`)
    .join('\n');

  return {
    name: `טלית צמר דגם ${model.name} — ${colorName}`,
    price: base.price,
    desc:
      `טלית צמר מהודרת דגם ${model.name} בגוון ${colorName}.\n` +
      `טלית איכותית מצמר, מתאימה לשבת, חג ולכל ימות השנה.\n\n` +
      `טבלת מידות ומחירים:\n${sizeTable}\n\n` +
      `בחרו את המידה המתאימה — המחיר מתעדכן לפי הבחירה.`,
    cat: 'טליתות',
    category: 'טליתות',
    subCategory: 'טלית צמר',
    days: '7-10',
    imgUrl: imageUrls[0],
    ...(imageUrls[1] ? { imgUrl2: imageUrls[1] } : {}),
    ...(imageUrls[2] ? { imgUrl3: imageUrls[2] } : {}),
    variantOptions: [{ name: 'מידה', values, ...(Object.keys(surcharges).length ? { surcharges } : {}) }],
    supplierCost: base.supplierPrice,
    sku: null,
    source: 'mofet',
    stockVisible: false,
    outOfStock: false,
    priority: 60,
    createdAt: FieldValue.serverTimestamp(),
  };
}

async function run() {
  const existingSnap = await db.collection('products').where('source', '==', 'mofet').get();
  const existingNames = new Set(existingSnap.docs.map(d => (d.data().name || '').trim()));

  console.log('סורק את תיקיית הדרייב...');
  const modelFolders = (await listDriveFolder(DRIVE_ROOT)).filter(e => e.isFolder);
  console.log(`נמצאו ${modelFolders.length} תיקיות דגמים: ${modelFolders.map(f => f.title).join(' | ')}\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const folder of modelFolders) {
    const heb = hebrewPart(folder.title);
    const model = MODELS.find(m => heb === m.folderName);
    if (!model) { console.log(`⚠️ תיקייה "${folder.title}" — אין לה מחירון בקטלוג, מדלג (אפשר להוסיף בהמשך)`); continue; }

    const colorFolders = (await listDriveFolder(folder.id)).filter(e => e.isFolder);
    if (colorFolders.length === 0) { console.log(`⚠️ לדגם ${model.name} אין תיקיות צבע — מדלג`); continue; }

    for (const colorFolder of colorFolders) {
      const colorName = hebrewPart(colorFolder.title);
      const prodName = `טלית צמר דגם ${model.name} — ${colorName}`;
      try {
        if (existingNames.has(prodName)) { console.log(`⏭️  קיים — מדלג: ${prodName}`); skipped++; continue; }

        const files = (await listDriveFolder(colorFolder.id)).filter(e => !e.isFolder).slice(0, 3);
        const sizes = Object.keys(model.sizes).join('/');
        console.log(`📦 ${prodName} · מידות ${sizes} · ${files.length} תמונות · ₪${Math.min(...Object.values(model.sizes)) * MARKUP}–₪${Math.max(...Object.values(model.sizes)) * MARKUP}`);
        if (files.length === 0) { console.log('   ⚠️ אין תמונות — מדלג'); failed++; continue; }

        if (!EXECUTE) continue;

        const uploaded = [];
        for (const f of files) {
          try { uploaded.push(await uploadToCloudinary(f.id)); }
          catch (e) { console.log(`   ⚠️ תמונה נכשלה: ${e.message}`); }
        }
        if (uploaded.length === 0) throw new Error('אף תמונה לא הועלתה');

        const ref = await db.collection('products').add(buildProduct(model, colorName, uploaded));
        console.log(`   ✅ נוצר: ${ref.id}`);
        existingNames.add(prodName);
        created++;
      } catch (e) {
        console.error(`   ❌ ${prodName}: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\nסיכום: נוצרו ${created} · דולגו ${skipped} · נכשלו/ללא תמונות ${failed}`);
  if (!EXECUTE) console.log('\nDRY-RUN בלבד. להרצה: node app/scripts/importTallitot.mjs --execute');
  if (EXECUTE && created > 0) console.log('אל תשכח: node scripts/syncAlgolia.mjs');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
