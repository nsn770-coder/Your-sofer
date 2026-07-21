// generateTallitotDesigns.mjs
// יוצר תמונת עיצוב מיוחדת לכל מוצר טלית (source=mofet) מ-2 תמונות המוצר + פרומט,
// באמצעות Gemini image, מעלה לקלאודינרי ומטמיע באתר.
//
// הרצה:
//   node app/scripts/generateTallitotDesigns.mjs --dry            ← רשימת מוצרים בלבד
//   node app/scripts/generateTallitotDesigns.mjs --limit=2        ← נסיון על 2 מוצרים (מומלץ קודם!)
//   node app/scripts/generateTallitotDesigns.mjs                  ← כל הטליתות
//   node app/scripts/generateTallitotDesigns.mjs --force          ← יצירה מחדש גם אם כבר קיימת
//
// הטמעה: התמונה החדשה הופכת לתמונה הראשית (imgUrl),
// והתמונות המקוריות זזות ל-imgUrl2 / imgUrl3.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════════════════════════════════
// הפרומט לעיצוב — תבנית עם משתני מוצר שמוחלפים בזמן ריצה
// ═══════════════════════════════════════════════════════════════════════════
function buildPrompt(p) {
  return DESIGN_PROMPT_TEMPLATE
    .replaceAll('{{PRODUCT_URL}}', `https://your-sofer.com/product/${p.id}`)
    .replaceAll('{{PRODUCT_TITLE}}', p.name || '')
    .replaceAll('{{PRODUCT_SLUG}}', p.id)
    .replaceAll('{{IMAGE_1}}', '(attached as first inline image)')
    .replaceAll('{{IMAGE_2}}', '(attached as second inline image)');
}

const DESIGN_PROMPT_TEMPLATE = `
You are an expert e-commerce automation agent, product-reference analyst, textile reconstruction specialist, and photorealistic image-generation director. Your task is to process the given tallit product page and generate one professional lifestyle image for the product. The generated image must show a realistic adult man wearing the exact tallit shown in the first two product images, set in a natural Israeli desert landscape. The tallit must be reconstructed from the source images with uncompromising product accuracy. Do not create a generic tallit, do not redesign the product, and do not add traditional elements unless clearly visible in the source images.
==================================================
INPUT VARIABLES
==================================================
Product URL: {{PRODUCT_URL}}
Product title: {{PRODUCT_TITLE}}
First product image: {{IMAGE_1}}
Second product image: {{IMAGE_2}}
Product slug: {{PRODUCT_SLUG}}
==================================================
EXECUTION WORKFLOW
==================================================
1. Retrieve and treat the two source images as two views of the exact same product.
2. Use Image 1 to analyze overall construction, dimensions, stripe placement/direction, draping, edge shape, tzitzit placement, and proportions.
3. Use Image 2 to analyze fabric weave, texture, stripe colors, thickness, spacing, fine details, and edge finishing.
4. Perform mandatory pre-generation analysis (determine flat fabric map, stripe orientation, and whether horizontal/crosswise stripes exist).
5. Mentally reconstruct the tallit as a flat rectangular fabric design before placing it on the human subject.
6. Generate one photorealistic desert lifestyle image using the reconstructed tallit.
7. Validate the result against the source-of-truth rules and rejection checklist.
8. If any check fails, discard and regenerate (up to 5 attempts).
9. Output the final WebP image with the specified file naming convention, placing it after the original product images without modifying or deleting them.
==================================================
SOURCE-OF-TRUTH & STRICT RESTRICTIONS
==================================================
- The first two product images are the **only** source of truth.
- Do not rely on general knowledge of Jewish prayer shawls, cultural assumptions, or AI-invented details.
- When a detail is unclear, use the simplest product structure supported by the source images.
- Never invent stripes, borders, colors, atarah, embroidery, symbols, text, or decorative elements.
- **LOGO, WATERMARK & TEXT REMOVAL:** Completely strip out any company logos (including "Mofet"), watermarks, Hebrew/English letters, numbers, signatures, sparkle icons, or 4-point stars found in the source images. The final image must contain zero text, branding, or graphic overlays.
==================================================
STRIPE-ORIENTATION RULES (CRITICAL)
==================================================
- Determine internally: Are horizontal or crosswise stripes visible in the source product? (YES or NO).
- **LENGTHWISE STRIPES ONLY RULE:** If the source images show lengthwise stripes only, every colored stripe must run exclusively in the long direction of the tallit fabric. They must descend continuously from the head/shoulders toward the lower edges, leaving center-front areas plain if they are plain in the references.
- **ABSOLUTE PROHIBITION:** No horizontal chest bands, abdomen stripes, waist bands, lower-bottom borders, grid patterns, plaid patterns, or connecting stripe groups unless explicitly present in the source photos. Product accuracy overrides pose and composition.
==================================================
HUMAN SUBJECT & STYLING
==================================================
- **Subject:** Original synthetic adult male, aged 30-45, dignified, authentic appearance, natural skin texture, realistic eyes, natural hair/facial hair, calm and respectful expression. Must not resemble any real public figure.
- **Attire:** Clean white buttoned shirt, simple understated kippah.
- **Draping:** Naturally draped over the head and shoulders, falling down both sides. The face, eyes, nose, and mouth must remain fully visible. Do not wrap or fold the tallit in a way that creates false horizontal patterns.
==================================================
DESERT ENVIRONMENT & LIGHTING
==================================================
- **Environment:** Natural Israeli desert landscape inspired by the Judean Desert or the Negev (dry hills, natural rock formations, sand/stone tones, open sky, softly blurred background). No pyramids, camels, modern buildings, roads, or artificial studio props.
- **Lighting:** Natural soft lighting during early morning or shortly before sunset (warm, balanced, detailed). The white fabric must remain neutral white (no artificial yellow, orange, or beige color casts).
==================================================
COMPOSITION & PHOTOGRAPHIC STYLE
==================================================
- **Aspect Ratio:** Vertical 4:5.
- **Resolution:** 2048 x 2560 pixels or higher.
- **Framing:** Person shown from approximately knees upward or full-body view; tallit occupies 60-75% of visual area; eye-level camera position, slight three-quarter angle.
- **Style:** High-end commercial lifestyle photograph taken with a professional full-frame camera and a natural 50mm or 85mm lens. Realistic optical depth of field, detailed textile rendering, and accurate exposure. Avoid CGI, 3D rendering, or illustrated appearance.
==================================================
MANDATORY QUALITY CONTROL & REJECTION CONDITIONS
==================================================
Immediately reject and regenerate the image if any of the following occur:
- An invented horizontal or crosswise stripe/band appears.
- Stripe direction does not match the source images.
- Logos, watermarks, text, or decorative icons appear.
- Plain fabric areas are incorrectly decorated.
- Tzitzit are floating, distorted, or duplicated unnaturally.
- Human anatomy (face, hands, proportions) is distorted.
- The image looks illustrated, rendered, or fake.
==================================================
NEGATIVE PROMPT
==================================================
horizontal stripes, horizontal bands, crosswise stripes, transverse stripes, traditional tallit horizontal bands, prayer shawl chest bands, chest stripes, stomach stripes, abdomen stripes, waist stripes, horizontal hem decoration, horizontal bottom border, connected stripe groups, ladder pattern, grid pattern, plaid pattern, checkered pattern, rectangular stripe pattern, generic tallit design, invented prayer shawl design, additional stripes, missing stripes, incorrect stripe direction, rotated stripe design, changed stripe color, decorated plain fabric, invented atarah, invented embroidery, Hebrew text, English text, letters, numbers, typography, company logo, Mofet logo, watermark, brand name, website name, copyright symbol, signature, graphic overlay, sparkle icon, four-point star, Gemini generation symbol, decorative corner mark, random characters, tefillin, second tallit, scarf, costume, duplicated tzitzit, floating tzitzit, disconnected tzitzit, extra limbs, extra fingers, missing fingers, distorted hands, distorted face, asymmetrical eyes, artificial face, plastic skin, wax-like skin, illustration, painting, CGI, 3D render, fantasy desert, pyramids, camels, tents, modern buildings, roads, cars, crowds, yellow color cast, orange tallit, overexposed white fabric, extreme HDR, excessive cinematic grading.
==================================================
FINAL PRIORITY ORDER
==================================================
1. Exact product-design accuracy.
2. Correct physical fabric-map reconstruction & stripe direction.
3. Complete removal of logos, watermarks, text, and symbols.
4. Accurate fabric texture, color, and proportions.
5. Realistic tallit draping, tzitzit, and natural human subject in an Israeli desert environment.
`.trim();
// ═══════════════════════════════════════════════════════════════════════════

const DRY   = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const LIMIT = Number((process.argv.find(a => a.startsWith('--limit=')) || '').split('=')[1] || 0) || Infinity;

// ─── env ─────────────────────────────────────────────────────────────────────
(function loadEnvLocal() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) {
      const key = line.slice(0, i).trim();
      if (key && !process.env[key]) process.env[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
})();

const SA_PATH = resolve(__dirname, './serviceAccount.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

cloudinary.config({
  cloud_name: 'dyxzq3ucy',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

async function urlToPart(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return { inlineData: { mimeType: mime, data: Buffer.from(await res.arrayBuffer()).toString('base64') } };
}

async function run() {
  const snap = await db.collection('products').where('source', '==', 'mofet').get();
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`נמצאו ${products.length} מוצרי טליתות\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const p of products) {
    if (done >= LIMIT) break;
    const label = p.name || p.id;
    try {
      if (!FORCE && p.aiLifestyleImage) { console.log(`⏭️  ${label} — כבר יש עיצוב, מדלג`); skipped++; continue; }
      if (!p.imgUrl) { console.log(`⚠️ ${label} — אין תמונה, מדלג`); skipped++; continue; }
      const srcUrls = [p.imgUrl, p.imgUrl2].filter(Boolean);
      console.log(`🎨 ${label} — ${srcUrls.length} תמונות מקור`);
      if (DRY) { done++; continue; }

      const parts = await Promise.all(srcUrls.map(urlToPart));
      const result = await imageModel.generateContent([...parts, { text: buildPrompt(p) }]);
      const imgPart = result.response.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
      if (!imgPart) throw new Error('Gemini לא החזיר תמונה');

      const upload = await cloudinary.uploader.upload(
        `data:image/png;base64,${imgPart.inlineData.data}`,
        { folder: 'yoursofer/tallitot-designs', public_id: `${p.id}-desert-lifestyle`, format: 'webp', overwrite: true }
      );

      // הטמעה: aiLifestyleImage נוסף לגלריית המוצר — המקוריות לא נמחקות ולא משתנות
      await db.collection('products').doc(p.id).update({ aiLifestyleImage: upload.secure_url });
      console.log(`   ✅ ${upload.secure_url}`);
      done++;
    } catch (e) {
      console.error(`   ❌ ${label}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\nסיכום: נוצרו ${done} · דולגו ${skipped} · נכשלו ${failed}`);
  if (!DRY && done > 0) console.log('רענן דף מוצר באתר כדי לראות. (אין צורך ב-deploy)');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
