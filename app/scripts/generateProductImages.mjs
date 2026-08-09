// generateProductImages.mjs
// עובר על קטגוריות נבחרות, מריץ את ה-Art Director פר מוצר,
// מייצר תמונה אחת ב-Gemini, מעלה ל-Cloudinary, ושומר ל-Firestore.
//
// הרצה:
//   node app/scripts/generateProductImages.mjs --dry     ← רק פרומטים, בלי תמונות (מומלץ קודם!)
//   node app/scripts/generateProductImages.mjs           ← מלא: פרומט + תמונה + Cloudinary
//   node app/scripts/generateProductImages.mjs --cat="כיפות" --limit=300
//   node app/scripts/generateProductImages.mjs --missing --since=2026-08-09 --limit=20
//                                                ← רק מוצרים בלי תמונת AI, החדשים קודם
//
// תלויות: @google/generative-ai, cloudinary, firebase-admin

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
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
  // ── כיפות — הוצאו מהפייפליין (08/2026) ────────────────────────────────
  // רקמה היא פרט בתדר גבוה, והמודל מפרש אותה מחדש כמעט תמיד: משושה במקום
  // מלבן, ספירלה במקום פיתול. הלקוח מקבל מוצר שנראה אחרת מהתמונה.
  // כיפות מטופלות ב-aiMediaPipeline.mjs, שהפרומפט שלו שמרני בהרבה.
  // { field: 'cat', value: 'כיפות', limit: 300 },
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
const VERIFY_EXISTING = args.includes('--verify-existing'); // בדוק תמונות AI קיימות מול המקור; ייצר מחדש רק את הלא-תואמות
const ALL = args.includes('--all');     // כל האתר — מתעלם מ-CATEGORY_QUOTAS
// --missing: כל מוצר שאין לו תמונת AI כלל, החדשים קודם. זה המצב הנכון
// לעבודה שוטפת — הוא לא נוגע במה שכבר נוצר ולא תלוי במכסות הקטגוריות.
const MISSING = args.includes('--missing');
// --since=YYYY-MM-DD: רק מוצרים שנוצרו מהתאריך הזה ואילך (למשל היבוא של היום)
const sinceArg = args.find((a) => a.startsWith('--since='))?.split('=')[1];
const catArg = args.find((a) => a.startsWith('--cat='))?.split('=')[1];
const fieldArg = args.find((a) => a.startsWith('--field='))?.split('=')[1] || 'category';
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];

// סת"ם כתוב-יד ומגילות — תמונות AI לא רלוונטיות. מדולג במצב --all (בכל שדה: cat/category/subcategory).
const SKIP_VALUES = new Set(['קלפי מזוזה', 'קלפי תפילין', 'קלף מזוזה', 'קלף תפילין', 'מגילות']);

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
// מודל ראייה זול לאימות — משווה מקור מול תוצאה
const verifyModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// 9 ולא 8 (08/2026): בציון 8 עברו תמונות עם שינויי צורה ברקמה ובעיטור,
// שנראו סבירות למודל אבל שגויות ללקוח. עדיף לוותר על תמונה מאשר להטעות.
const MATCH_THRESHOLD  = 9; // ציון התאמה מינימלי (0–10) לאישור תמונה
const MAX_GEN_ATTEMPTS = 3; // נסיונות יצירה לכל מוצר לפני ויתור

// ─── אימות: האם התמונה שנוצרה מציגה בדיוק את אותו מוצר? ─────
async function verifyProductMatch(srcPart, genBase64) {
  const verifyPrompt = `Image 1 is the ORIGINAL product photo. Image 2 is an AI-generated marketing photo of the same product.
Compare ONLY the product itself (ignore background, surface, lighting, angle, crop).
Check: shape, proportions, colors, materials, texture, embroidery/engraving, lettering, patterns, hardware (zippers, clasps, handles), and decorative details.
Return ONLY JSON, no markdown:
{"score": <integer 0-10, 10 = identical product>, "differences": "<short concrete list of product differences, empty string if none>"}`;
  const result = await verifyModel.generateContent([
    srcPart,
    { inlineData: { mimeType: 'image/png', data: genBase64 } },
    { text: verifyPrompt },
  ]);
  const raw = result.response.text().replace(/```json|```/g, '').trim();
  try {
    const j = JSON.parse(raw);
    return { score: Number(j.score) || 0, differences: String(j.differences || '') };
  } catch {
    return { score: 0, differences: 'verification response was not valid JSON' };
  }
}

// ─── אימות תמונת AI קיימת מול המקור (למצב --verify-existing) ─────
// מחזיר {score, differences} או null אם ההורדה נכשלה.
async function verifyExistingImage(product) {
  try {
    const srcUrl = resolveSourceImage(product);
    if (!srcUrl) return null;
    const [srcResp, genResp] = await Promise.all([fetch(srcUrl), fetch(product.aiLifestyleImage)]);
    if (!srcResp.ok || !genResp.ok) return null;
    const srcMime = srcResp.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const srcPart = { inlineData: { mimeType: srcMime, data: Buffer.from(await srcResp.arrayBuffer()).toString('base64') } };
    const genB64 = Buffer.from(await genResp.arrayBuffer()).toString('base64');
    return await verifyProductMatch(srcPart, genB64);
  } catch {
    return null;
  }
}

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
  const srcPart = { inlineData: { mimeType, data: buf.toString('base64') } };

  // לולאת יצירה + אימות: תמונה שלא עוברת אימות התאמה לא נשמרת לעולם.
  let lastDifferences = '';
  for (let attempt = 1; attempt <= MAX_GEN_ATTEMPTS; attempt++) {
    let attemptPrompt = prompt;
    if (lastDifferences) {
      attemptPrompt += `

CRITICAL — A PREVIOUS ATTEMPT CHANGED THE PRODUCT. These details were WRONG and must match the reference image exactly this time:
${lastDifferences}
Treat the product in the reference image as a locked, unchangeable physical object. Only the environment may be created.`;
    }

    const result = await imageModel.generateContent([srcPart, { text: attemptPrompt }]);
    const imgPart = result.response.candidates?.[0]?.content?.parts?.find(
      (p) => p.inlineData
    );
    if (!imgPart) throw new Error('Gemini לא החזיר תמונה');

    const { score, differences } = await verifyProductMatch(srcPart, imgPart.inlineData.data);
    if (score >= MATCH_THRESHOLD) {
      const dataUri = `data:image/png;base64,${imgPart.inlineData.data}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: 'yoursofer/ai-lifestyle',
        upload_preset: 'yoursofer_upload',
        public_id: `ai_${product.id}`,
        overwrite: true,
      });
      if (attempt > 1) console.log(`   🔁 עבר אימות בניסיון ${attempt} (ציון ${score}/10)`);
      return { url: upload.secure_url, score, attempts: attempt };
    }

    lastDifferences = differences;
    console.warn(`   ⚠️ ניסיון ${attempt}/${MAX_GEN_ATTEMPTS}: ציון התאמה ${score}/10 — ${differences.slice(0, 150)}`);
  }

  const err = new Error(`המוצר בתמונה לא תואם למקור אחרי ${MAX_GEN_ATTEMPTS} ניסיונות: ${lastDifferences.slice(0, 200)}`);
  err.isMismatch = true;
  throw err;
}

// ─── עיבוד מוצר בודד ───────────────────────────────────────
async function processProduct(db, product, i, total) {
  const label = `[${i + 1}/${total}] ${product.title || product.name || product.id}`;
  try {
    // resume — דילוג על מוצר שכבר עבר עיבוד (אלא אם --force). חוסך קריאות Gemini/Cloudinary.
    // שדה קיים אך ריק ('') = האדמין מחק את התמונה ידנית — לא לייצר מחדש.
    if (!DRY_RUN && !FORCE && product.aiLifestyleImage !== undefined) {
      const wasDeleted = !product.aiLifestyleImage;
      if (wasDeleted || !VERIFY_EXISTING) {
        console.log(`⏭️  ${label} — ${wasDeleted ? 'נמחק ידנית באדמין' : 'כבר קיים'}, מדלג`);
        return { ok: true, skipped: true };
      }
      // --verify-existing: בדוק את התמונה הקיימת; אם תואמת — דלג, אחרת ייצר מחדש
      const check = await verifyExistingImage(product);
      if (check && check.score >= MATCH_THRESHOLD) {
        await db.collection('products').doc(product.id).update({ aiMatchScore: check.score });
        console.log(`✔️  ${label} — תמונה קיימת תואמת (${check.score}/10), מדלג`);
        return { ok: true, skipped: true };
      }
      console.warn(`🔄 ${label} — תמונה קיימת לא תואמת (${check ? check.score + '/10 — ' + check.differences.slice(0, 120) : 'בדיקה נכשלה'}), מייצר מחדש`);
    }

    const { profile, prompt } = await buildImagePrompt(product);

    if (DRY_RUN) {
      console.log(`\n─── ${label} ───`);
      console.log('surface:', profile.chosenSurface, '| interior:', profile.chosenInterior);
      console.log(prompt.slice(0, 400) + '…');
      return { ok: true, dry: true };
    }

    const { url, score, attempts } = await generateAndUpload(product, prompt);
    await db.collection('products').doc(product.id).update({
      aiLifestyleImage: url,
      aiProfile: profile,          // הפרופיל נשמר — לא צריך לנתח שוב
      aiImageGeneratedAt: new Date().toISOString(),
      aiMatchScore: score,         // ציון אימות ההתאמה למקור (0–10)
    });
    // הקישור לעמוד המוצר, לא רק ל-Cloudinary — כדי שאפשר יהיה להשוות
    // את התמונה שנוצרה מול הצילום האמיתי בלי לחפש את המוצר באדמין.
    console.log(`✅ ${label} (התאמה ${score}/10, ${attempts} נסיונות)`);
    console.log(`   🔗 מוצר:  https://your-sofer.com/product/${product.id}`);
    console.log(`   🖼  תמונה: ${url}`);
    return { ok: true };
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`);
    // תמונה קיימת שנמצאה לא-תואמת וגם היצירה מחדש נכשלה — מסירים אותה מהאתר.
    // ('' = לא ייווצר מחדש אוטומטית; מופיע בדוח ה-mismatches לטיפול ידני)
    if (!DRY_RUN && err.isMismatch && product.aiLifestyleImage) {
      try {
        await db.collection('products').doc(product.id).update({ aiLifestyleImage: '' });
        console.warn('   🗑 התמונה הלא-תואמת הוסרה מהמוצר');
      } catch {}
    }
    return { ok: false, error: err.message, mismatch: !!err.isMismatch, id: product.id, name: product.title || product.name || '' };
  }
}

// ─── main ──────────────────────────────────────────────────
async function main() {
  const db = getAdminDb();

  console.log(DRY_RUN ? '🌵 DRY RUN — רק פרומטים\n' : '🎨 מצב מלא — פרומט + תמונה + Cloudinary\n');
  console.log('Visual DNA:', VISUAL_DNA.brand, '|', VISUAL_DNA.palette, '\n');

  let done = 0, failed = 0, skipped = 0, processed = 0;
  const mismatches = []; // מוצרים שנפסלו באימות ההתאמה — לדוח בסוף

  // עיבוד רשימת מוצרים עם דיווח התקדמות ו-throttle
  async function runList(products, header) {
    console.log(`\n════ ${header} — ${products.length} מוצרים ════`);
    for (let i = 0; i < products.length; i++) {
      const r = await processProduct(db, products[i], i, products.length);
      if (r.skipped) skipped++;
      else if (r.ok) done++;
      else {
        failed++;
        if (r.mismatch) mismatches.push({ id: r.id, name: r.name, error: r.error });
      }
      processed++;

      // דיווח התקדמות כל 50 מוצרים
      if (processed % 50 === 0) {
        console.log(`\n📊 התקדמות: ${processed} מעובדים | ✅ ${done} הצלחות | ⏭️ ${skipped} דילוגים | ❌ ${failed} כשלונות\n`);
      }

      // throttle קל כדי לא לחטוף rate-limit מ-Gemini (לא לאחר דילוג)
      if (!DRY_RUN && !r.skipped) await new Promise((res) => setTimeout(res, 1500));
    }
  }

  if (MISSING) {
    // createdAt מגיע כ-Timestamp של Firestore ברוב המוצרים, אבל בייבוא ישן
    // הוא נשמר כמחרוזת ISO. שתי הצורות חייבות להיות מטופלות, אחרת מוצרי
    // הייבוא הישן יקבלו 0 ויקפצו לראש הרשימה במקום לסופה.
    const ms = (v) => {
      if (!v) return 0;
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (typeof v === 'string') return Date.parse(v) || 0;
      if (v._seconds) return v._seconds * 1000;
      return 0;
    };
    const sinceMs = sinceArg ? Date.parse(sinceArg) : null;

    console.log('📦 מצב --missing: טוען את כל המוצרים מ-Firestore...');
    const snap = await db.collection('products').get();
    let products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !SKIP_VALUES.has(p.cat) && !SKIP_VALUES.has(p.category) && !SKIP_VALUES.has(p.subcategory))
      .filter((p) => resolveSourceImage(p)) // בלי תמונת מקור אין מה לשמר
      // '' = נמחק ידנית באדמין. נכלל רק עם --force, כדי שמחיקה ידנית
      // לא תבוטל בהרצה הבאה.
      .filter((p) => (FORCE ? !p.aiLifestyleImage : p.aiLifestyleImage === undefined));

    const before = products.length;
    if (sinceMs) products = products.filter((p) => ms(p.createdAt) >= sinceMs);
    // --missing יחד עם --cat: לצמצם לקטגוריה אחת. שימושי לבדיקת קטגוריה
    // בעייתית לפני שמריצים על הכל.
    if (catArg) products = products.filter((p) => p[fieldArg] === catArg);

    products.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)); // החדשים קודם
    if (limitArg) products = products.slice(0, Number(limitArg));

    console.log(`ללא תמונת AI: ${before}${sinceMs ? ` | מתוכם מ-${sinceArg} ואילך: ${products.length}` : ''}`);
    if (FORCE) console.log('⚠️  --force: נכללות גם תמונות שנמחקו ידנית באדמין.');

    // --count: רק ספירה. הרצה מלאה היא שעות ארוכות וקריאות API בתשלום,
    // ולכן חייבת להיות דרך לראות את הגודל בלי להתחיל.
    if (args.includes('--count')) {
      const byCat = products.reduce((a, p) => {
        const k = p.cat || p.category || '— ללא קטגוריה';
        a[k] = (a[k] || 0) + 1;
        return a;
      }, {});
      console.log('\n══ פילוח לפי קטגוריה ══');
      for (const [k, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(n).padStart(5)}  ${k}`);
      }
      const est = products.length * 20;
      console.log(`\nסה"כ ${products.length} מוצרים | הערכת זמן: ~${Math.round(est / 3600)} שעות (כ-20 שניות למוצר)`);
      process.exit(0);
    }
    await runList(products, sinceArg ? `ללא תמונת AI מ-${sinceArg}` : 'ללא תמונת AI (החדשים קודם)');
  } else if (ALL) {
    // כל האתר — מתעלם ממכסות. מדלג על קלף/מגילות ועל מוצרים בלי תמונת מקור.
    console.log('📦 מצב --all: טוען את כל המוצרים מ-Firestore...');
    const snap = await db.collection('products').get();
    const products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => !SKIP_VALUES.has(p.cat) && !SKIP_VALUES.has(p.category) && !SKIP_VALUES.has(p.subcategory))
      .filter((p) => resolveSourceImage(p)); // חייב תמונת מקור, אחרת אין מה לשמר
    console.log(`נמצאו ${products.length} מוצרים רלוונטיים (אחרי דילוג קלף/מגילות/בלי-תמונה).`);
    await runList(products, 'כל האתר');
  } else {
    // אם הועבר --cat, מריצים רק עליו (עם --field אופציונלי, ברירת מחדל 'category')
    const quotas = catArg
      ? [{ field: fieldArg, value: catArg, limit: Number(limitArg) || 50 }]
      : CATEGORY_QUOTAS;
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
      await runList(products, `${field}="${value}" (חדשים)`);
    }
  }

  console.log(`\n═══════════════════════════`);
  console.log(`סיום. סה"כ מעובדים: ${processed} | הצלחות: ${done} | דילוגים: ${skipped} | כשלונות: ${failed}`);
  if (mismatches.length) {
    const reportPath = resolve(__dirname, './output/ai-image-mismatches.json');
    mkdirSync(resolve(__dirname, './output'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: mismatches.length, mismatches }, null, 2));
    console.log(`⚠️ ${mismatches.length} מוצרים נפסלו באימות התאמה — דוח: ${reportPath}`);
  }
  if (!DRY_RUN) console.log('זכור: npm run algolia:sync אם צריך לרענן אינדקס.');
}

main().catch((e) => { console.error(e); process.exit(1); });
