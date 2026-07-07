// generateProductImages.mjs
// עובר על קטגוריות נבחרות, מריץ את ה-Art Director פר מוצר,
// מייצר תמונה אחת ב-Gemini, מעלה ל-Cloudinary, ושומר ל-Firestore.
//
// הרצה:
//   node app/scripts/generateProductImages.mjs --dry     ← רק פרומטים, בלי תמונות (מומלץ קודם!)
//   node app/scripts/generateProductImages.mjs           ← מלא: פרומט + תמונה + Cloudinary
//   node app/scripts/generateProductImages.mjs --cat="כיפות" --limit=300
//
// תלויות: @google/generative-ai, cloudinary, firebase-admin

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── טעינת .env.local אוטומטית (חייב לרוץ לפני ה-import של artDirector) ─────
// artDirector.mjs קורא את process.env.GEMINI_API_KEY בזמן ה-import, לכן
// אנחנו טוענים את הסביבה קודם ואז מייבאים אותו דינמית מטה.
(function loadEnvLocal() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  let key = null, val = [], multiline = false;
  for (const line of content.split('\n')) {
    if (!multiline && line.includes('=')) {
      const i = line.indexOf('=');
      key = line.slice(0, i).trim();
      const rest = line.slice(i + 1);
      if (rest.includes('-----BEGIN')) { multiline = true; val = [rest]; }
      else { if (key && !process.env[key]) process.env[key] = rest.trim().replace(/^["']|["']$/g, ''); }
    } else if (multiline) {
      val.push(line);
      if (line.includes('-----END')) {
        if (key && !process.env[key]) process.env[key] = val.join('\n').trim().replace(/^["']|["']$/g, '');
        multiline = false; key = null; val = [];
      }
    }
  }
})();

// ה-Art Director מיובא דינמית — אחרי שהסביבה נטענה
const { buildImagePrompt, VISUAL_DNA } = await import('./artDirector.mjs');

// ─── Firebase Admin (Service Account — הדפוס הקיים בשאר הסקריפטים) ─────────
const SA_PATH = resolve(__dirname, './serviceAccount.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
function getAdminDb() { return getFirestore(); }

// ─── קונפיג ────────────────────────────────────────────────
// ערכים אמיתיים מ-Firestore (case sensitive!) — נשלפו חי מ-5,960 מוצרים.
// הטקסונומיה לא עקבית: השדה הגרנולרי האמיתי הוא לרוב `cat` או `subcategory`,
// לא `category`. לכן לכל שורה יש `field` (ברירת מחדל 'category') + `value`.
// המכסות: 300 למשפחת טלית, 300 לתפילין, 300 לכיפות, 50 לכל שאר קבוצה רלוונטית.
// ה-limit הוא תקרה — קבוצה קטנה תעובד לפי מה שקיים. מוצר שנתפס ביותר משורה
// אחת יעובד פעם אחת בלבד (dedup לפי id).
// לא נכללות (סת"ם כתוב יד / קטלוג גנרי): קלפי מזוזה, קלפי תפילין, קלף מזוזה,
// קלף תפילין, מגילות, וכן cat גנריים 'יודאיקה'/'שבת' (הפריטים המשמעותיים שלהם
// נכנסים דרך תת-הקטגוריות הספציפיות מטה).
const CATEGORY_QUOTAS = [
  // ── כיפות — 300 (750 בפועל) ──
  { field: 'cat', value: 'כיפות', limit: 300 },
  // ── טלית ("כיסויי טלית") — 300 ──
  { field: 'cat', value: 'סט טלית תפילין', limit: 300 },    // 326
  { field: 'cat', value: 'תיקי טלית ותפילין', limit: 300 }, // 75
  // ── תפילין — 300 (5 בפועל; תפילין נמכרים ברובם בתוך הסטים) ──
  { field: 'cat', value: 'תפילין קומפלט', limit: 300 },     // 5
  // ── 50 מכל שאר קבוצה רלוונטית ──
  { field: 'cat',         value: 'בתי מזוזה', limit: 50 },          // 465
  { field: 'cat',         value: 'חגים', limit: 50 },              // 461
  { field: 'subcategory', value: 'נטילת ידיים', limit: 50 },        // 195
  { field: 'subcategory', value: 'פמוטים', limit: 50 },            // 150
  { field: 'subcategory', value: 'מצתים ומלחיות', limit: 50 },     // 92
  { field: 'cat',         value: 'מוצרי בית כנסת', limit: 50 },     // 66
  { field: 'subcategory', value: 'קופות צדקה', limit: 50 },         // 59
  { field: 'subcategory', value: 'תכשיטים', limit: 50 },           // 47
  { field: 'cat',         value: 'ספרי קודש וסידורים', limit: 50 }, // 43
  { field: 'subcategory', value: 'סידורים ותהילים', limit: 50 },   // 38
  { field: 'cat',         value: 'טליתות וציציות', limit: 50 },     // 33
  { field: 'subcategory', value: 'הפרשת חלה', limit: 50 },         // 26
  { field: 'subcategory', value: 'עטים', limit: 50 },              // 10
  { field: 'cat',         value: 'מתנות', limit: 50 },             // 10
  { field: 'cat',         value: 'ספרי תורה', limit: 50 },         // 9
  { field: 'category',    value: 'בר מצווה', limit: 50 },          // 9
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry');
const FORCE = args.includes('--force'); // בלי דילוג — מרנדר גם מוצרים שכבר יש להם תמונת AI
const catArg = args.find((a) => a.startsWith('--cat='))?.split('=')[1];
const fieldArg = args.find((a) => a.startsWith('--field='))?.split('=')[1] || 'category';
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];

cloudinary.config({
  cloud_name: 'dyxzq3ucy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// מודל יצירת תמונה
const imageModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-image',
});

// שדות התמונה בסכימה של YourSofer: imgUrl (string) ו-images (array). לא imageUrl/image.
function resolveSourceImage(product) {
  return (
    product.imgUrl ||
    (Array.isArray(product.images) ? product.images[0] : product.images) ||
    product.imageUrl ||
    product.image ||
    null
  );
}

// ─── יצירת תמונה אחת + העלאה ל-Cloudinary ──────────────────
async function generateAndUpload(product, prompt) {
  // חובה לשלוח את תמונת המוצר המקורית כרפרנס (image-to-image) כדי לשמר זהות מדויקת.
  // בלי רפרנס — Gemini ממציא מוצר ומצייר טקסט מהכותרת. לכן מדלגים במקום להמציא.
  const srcUrl = resolveSourceImage(product);
  if (!srcUrl) throw new Error('אין תמונת מקור (imgUrl/images) — דילוג כדי לא להמציא מוצר');

  const imgResp = await fetch(srcUrl);
  if (!imgResp.ok) throw new Error(`טעינת תמונת מקור נכשלה: HTTP ${imgResp.status}`);
  const mimeType = imgResp.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const buf = Buffer.from(await imgResp.arrayBuffer());

  const parts = [
    { inlineData: { mimeType, data: buf.toString('base64') } },
    { text: prompt },
  ];

  const result = await imageModel.generateContent(parts);
  const imgPart = result.response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData
  );
  if (!imgPart) throw new Error('Gemini לא החזיר תמונה');

  const dataUri = `data:image/png;base64,${imgPart.inlineData.data}`;
  const upload = await cloudinary.uploader.upload(dataUri, {
    folder: 'yoursofer/ai-lifestyle',
    upload_preset: 'yoursofer_upload',
    public_id: `ai_${product.id}`,
    overwrite: true,
  });
  return upload.secure_url;
}

// ─── עיבוד מוצר בודד ───────────────────────────────────────
async function processProduct(db, product, i, total) {
  const label = `[${i + 1}/${total}] ${product.title || product.name || product.id}`;
  try {
    // resume — דילוג על מוצר שכבר עבר עיבוד (אלא אם --force). חוסך קריאות Gemini/Cloudinary.
    if (!DRY_RUN && !FORCE && product.aiLifestyleImage) {
      console.log(`⏭️  ${label} — כבר קיים, מדלג`);
      return { ok: true, skipped: true };
    }

    const { profile, prompt } = await buildImagePrompt(product);

    if (DRY_RUN) {
      console.log(`\n─── ${label} ───`);
      console.log('surface:', profile.chosenSurface, '| interior:', profile.chosenInterior);
      console.log(prompt.slice(0, 400) + '…');
      return { ok: true, dry: true };
    }

    const url = await generateAndUpload(product, prompt);
    await db.collection('products').doc(product.id).update({
      aiLifestyleImage: url,
      aiProfile: profile,          // הפרופיל נשמר — לא צריך לנתח שוב
      aiImageGeneratedAt: new Date().toISOString(),
    });
    console.log(`✅ ${label} → ${url}`);
    return { ok: true };
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── main ──────────────────────────────────────────────────
async function main() {
  const db = getAdminDb();

  // אם הועבר --cat, מריצים רק עליו (עם --field אופציונלי, ברירת מחדל 'category')
  const quotas = catArg
    ? [{ field: fieldArg, value: catArg, limit: Number(limitArg) || 50 }]
    : CATEGORY_QUOTAS;

  console.log(DRY_RUN ? '🌵 DRY RUN — רק פרומטים\n' : '🎨 מצב מלא — פרומט + תמונה + Cloudinary\n');
  console.log('Visual DNA:', VISUAL_DNA.brand, '|', VISUAL_DNA.palette, '\n');

  let done = 0, failed = 0, skipped = 0, processed = 0;
  const seen = new Set(); // dedup — מוצר שנתפס בכמה שורות יעובד פעם אחת בלבד

  for (const { field = 'category', value, limit } of quotas) {
    const snap = await db.collection('products')
      .where(field, '==', value)
      .limit(limit)
      .get();

    const products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !seen.has(p.id));
    products.forEach((p) => seen.add(p.id));
    console.log(`\n════ ${field}="${value}" — ${products.length} מוצרים (חדשים) ════`);

    for (let i = 0; i < products.length; i++) {
      const r = await processProduct(db, products[i], i, products.length);
      if (r.skipped) skipped++;
      else if (r.ok) done++;
      else failed++;
      processed++;

      // דיווח התקדמות כל 50 מוצרים
      if (processed % 50 === 0) {
        console.log(`\n📊 התקדמות: ${processed} מעובדים | ✅ ${done} הצלחות | ⏭️ ${skipped} דילוגים | ❌ ${failed} כשלונות\n`);
      }

      // throttle קל כדי לא לחטוף rate-limit מ-Gemini (לא לאחר דילוג)
      if (!DRY_RUN && !r.skipped) await new Promise((res) => setTimeout(res, 1500));
    }
  }

  console.log(`\n═══════════════════════════`);
  console.log(`סיום. סה"כ מעובדים: ${processed} | הצלחות: ${done} | דילוגים: ${skipped} | כשלונות: ${failed}`);
  if (!DRY_RUN) console.log('זכור: npm run algolia:sync אם צריך לרענן אינדקס.');
}

main().catch((e) => { console.error(e); process.exit(1); });
