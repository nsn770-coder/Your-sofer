// aiMediaPipeline.mjs
// סוכן — עורך תמונות מוצר קיימות דרך gpt-image-1
// הרצה: node app/scripts/aiMediaPipeline.mjs
// אפשר להגביל: node app/scripts/aiMediaPipeline.mjs --limit=3

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ Firebase ══
const firebaseConfig = {
  apiKey: "AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I",
  authDomain: "your-sofer.firebaseapp.com",
  projectId: "your-sofer",
  storageBucket: "your-sofer.firebasestorage.app",
  messagingSenderId: "7710397068",
  appId: "1:7710397068:web:3c9880f24871efd4d661a9"
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ══ הגדרות ══
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';const CLOUDINARY_PRESET = 'yoursofer_upload';

const SATAM_CATEGORIES = ['מזוזות', 'תפילין', 'סת"ם', 'ספרי תורה', 'מגילות', 'קלפים'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══ הורד תמונה כ-base64 ══
async function downloadImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`לא ניתן להוריד תמונה: ${url}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { base64, contentType };
}

// ══ ערוך תמונה עם gpt-image-1 ══
async function editImageWithGPT(imageBase64, contentType, prompt) {
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image', blob, 'product.jpg');
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'שגיאת gpt-image-1');
  }

  const data = await response.json();
  return data.data[0].b64_json;
}

// ══ העלה base64 ל-Cloudinary ══
async function uploadBase64ToCloudinary(base64, productId, type) {
  const formData = new FormData();
  formData.append('file', `data:image/png;base64,${base64}`);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', `yoursofer/${productId}`);
  formData.append('public_id', `${productId}_${type}_${Date.now()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`שגיאת Cloudinary: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ══ עבד מוצר אחד ══
async function processProduct(product) {
  const isSatam = SATAM_CATEGORIES.includes(product.cat);
  const imgUrl = product.imgUrl || product.image_url;

  console.log(`\n📦 ${product.name?.substring(0, 50)}`);
  console.log(`   קטגוריה: ${product.cat} ${isSatam ? '(safe mode)' : ''}`);

  let imageBase64, contentType;
  try {
    ({ base64: imageBase64, contentType } = await downloadImageAsBase64(imgUrl));
    console.log('   📥 תמונה הורדה בהצלחה');
  } catch (e) {
    console.error('   ❌ לא ניתן להוריד תמונה:', e.message);
    return {};
  }

  const updates = {};

  // ══ תמונת סטודיו ══
  try {
    console.log('   🎨 יוצר תמונת סטודיו...');
    const studioPrompt = `Use the attached image as the exact product reference.

OUTPUT FORMAT (CRITICAL):
- Square aspect ratio (1:1)
- The product must maintain its ORIGINAL aspect ratio (DO NOT stretch or squash)
- Scale the product proportionally to fit within the frame
- Add natural margins (padding) around the product if needed
- Do NOT crop the product to fill the frame
- The product must be fully visible from top to bottom
- Center the product in the frame
- Use empty background space if needed to preserve proportions
- Optimized for e-commerce thumbnail display

STRICT PRODUCT PRESERVATION (ABSOLUTE RULE):
The product must remain 100% identical:
- Same materials, colors, textures, finish (matte/glossy)
- Same proportions, dimensions, and structure
- Same edges, curves, and physical build
- Preserve ALL details exactly as in the original image
Do NOT: Redesign / Stylize / Enhance / Replace materials / Modify proportions in any way

REAL-WORLD SCALE & PROPORTIONS (CRITICAL):
- Maintain real-life dimensions exactly
- Preserve correct thickness, length, and volume
- No exaggeration or "AI improvement"
- The product must feel physically accurate and manufacturable

ENGRAVING / LETTERING (CRITICAL - TREAT AS VISUAL PATTERN):
Treat all Hebrew letters as pure visual design elements - NOT as readable text.
- The engraving must be replicated EXACTLY as a visual pattern
- Preserve the exact shapes, curves, spacing, and layout
- Maintain the same depth, shadows, and material integration
IMPORTANT:
- Do NOT attempt to read, interpret, or recreate the letters
- Do NOT generate new Hebrew characters
- Do NOT "fix" or "improve" the text
Instead:
- Copy the engraving as if it were abstract geometric artwork
- Treat it like a texture or sculpted pattern on the surface
- Focus on: Form / Depth (engraving relief) / Light interaction (shadows inside grooves)
- Avoid: Any typographic reconstruction / Any language-based generation / Any change in structure
- The engraving must look like a direct visual copy from the reference image
- Preserve exact micro-details from the reference image

PROFESSIONAL STUDIO LIGHTING (HIGH-END E-COMMERCE):
- Strong directional key light from 45° angle
- Soft fill light to gently balance shadows
- Reveal material texture, highlight edges and depth, enhance engraving visibility
- Avoid: flat front lighting / overexposed highlights / washed-out colors

PHYSICAL REALISM:
- Maintain natural structure and weight
- Preserve micro-texture and surface detail
- Keep realistic edges (not overly smooth)
- Avoid: plastic AI look / over-smoothing / perfect symmetry

COMPOSITION (E-COMMERCE OPTIMIZED):
- Slight natural angle (not perfectly flat)
- Centered composition with subtle depth
- Clean spacing around the product
- Product fully visible and dominant

FOCUS & SHARPNESS:
- Ultra-sharp focus on: engraving/surface pattern, material texture, edges and details
- Background slightly soft (natural depth of field)

BACKGROUND:
- Clean white or soft light grey (#f5f5f5)
- Minimal, premium look
- Soft natural shadow under the product

CAMERA STYLE:
- Real photography (NOT CGI)
- Shot as if with DSLR or iPhone 16 Pro Max
- Natural depth, no artificial sharpening, no filters

FINAL GOAL: The exact product the customer will receive. True scale, material, and texture. Premium, trustworthy product photography.`;

    const resultBase64 = await editImageWithGPT(imageBase64, contentType, studioPrompt);
    const cloudinaryUrl = await uploadBase64ToCloudinary(resultBase64, product.id, 'studio');
    updates.imgUrl2 = cloudinaryUrl;
    console.log('   ✅ סטודיו הועלה');
    await sleep(3000);
  } catch (e) {
    console.error('   ❌ שגיאה בסטודיו:', e.message);
  }

  // ══ תמונת לייפסטייל ══
  try {
    console.log('   🧑 יוצר תמונת לייפסטייל...');
    const lifestylePrompt = isSatam
      ? `Use the attached image as the exact product reference. Create a realistic lifestyle image.

OUTPUT FORMAT (CRITICAL):
- Square aspect ratio (1:1)
- The product must maintain its ORIGINAL aspect ratio (DO NOT stretch or squash)
- Scale the product proportionally to fit within the frame
- Add natural margins (padding) if needed
- Do NOT crop any part of the product
- The product must be fully visible and centered
- Optimized for e-commerce thumbnail display

PRODUCT (ABSOLUTE PRESERVATION):
The product must remain EXACTLY the same:
- Same materials, colors, textures, finish
- Same proportions, dimensions, and structure
- Same edges, curves, and physical build
- Preserve ALL details exactly as in the original image
Do NOT: Redesign / Stylize / Enhance / Replace materials / Modify proportions in any way

ENGRAVING / LETTERING (CRITICAL - TREAT AS VISUAL PATTERN):
Treat all Hebrew letters as pure visual design elements - NOT as readable text.
- The engraving must be replicated EXACTLY as a visual pattern
- Preserve exact shapes, spacing, alignment, and layout
- Maintain depth, shadows, and integration into the material
IMPORTANT:
- Do NOT read or interpret the text
- Do NOT generate new Hebrew characters
- Do NOT "fix" or improve letters
Instead:
- Copy the engraving as abstract geometric artwork
- Treat it like a sculpted surface pattern
- The engraving must look like a direct visual copy from the reference image
- Preserve exact micro-details from the reference image

SCENE:
Show this mezuzah mounted on a wooden door frame of a Jewish home, slightly angled, at realistic scale.
Warm indoor lighting. No people in the image.

LIGHTING:
Natural daylight, soft warm tone, realistic shadows. Sharp focus on the product, slight background blur.

STYLE:
Calm, meaningful, spiritual. Authentic moment. Premium, clean, minimal aesthetic. Real photography, NOT CGI.`

      : `Use the attached image as the exact product reference. Create a realistic lifestyle image.

OUTPUT FORMAT (CRITICAL):
- Square aspect ratio (1:1)
- The product must maintain its ORIGINAL aspect ratio (DO NOT stretch or squash)
- Scale the product proportionally to fit within the frame
- Add natural margins (padding) if needed
- Do NOT crop any part of the product
- The product must be fully visible and centered
- Optimized for e-commerce thumbnail display

PRODUCT (ABSOLUTE PRESERVATION):
The product must remain EXACTLY the same:
- Same materials, colors, textures, finish
- Same proportions, dimensions, and structure
- Same edges, curves, and physical build
- Preserve ALL details exactly as in the original image
Do NOT: Redesign / Stylize / Enhance / Replace materials / Modify proportions in any way

ENGRAVING / LETTERING (CRITICAL - TREAT AS VISUAL PATTERN):
Treat all Hebrew letters as pure visual design elements - NOT as readable text.
- The engraving must be replicated EXACTLY as a visual pattern
- Preserve exact shapes, spacing, alignment, and layout
- Maintain depth, shadows, and integration into the material
IMPORTANT:
- Do NOT read or interpret the text
- Do NOT generate new Hebrew characters
- Do NOT "fix" or improve letters
Instead:
- Copy the engraving as abstract geometric artwork
- Treat it like a sculpted surface pattern
- The engraving must look like a direct visual copy from the reference image
- Preserve exact micro-details from the reference image

SIZE & HAND INTERACTION (EXTREMELY IMPORTANT):
The interaction must reflect REAL-WORLD scale:
- If the product is small (e.g. mezuzah): hold delicately between fingers (thumb + index or middle). Fingers must NOT wrap around it like a large object.
- If medium: hold naturally with one hand
- If large/heavy: use both hands or show natural tension
Rules: Grip must match real size and weight. No oversized hands relative to product. No unnatural finger bending. No "floating" product.

PERSON:
Jewish male. Clean, elegant, authentic look. Wearing a white shirt. Optional subtle kippah.
Natural skin texture (not overly smooth). Realistic proportions (no AI distortion).

POSE (ANTI-AI STAGING RULE):
- Natural, candid moment (NOT posed like an ad)
- The person is interacting with the product naturally
- Slight imperfection in pose is GOOD (more real)
Avoid: Perfect symmetry / Overly centered hands / "Showing product to camera" pose

COMPOSITION WITH PERSON:
- Product must remain the PRIMARY focus
- Face can be partially visible or softly out of focus
- Hands + product are the visual center
- Maintain correct scale between hand and product
- Do NOT enlarge product artificially

BACKGROUND (choose one):
Soft neutral home interior OR subtle Jerusalem stone wall / Western Wall vibe (not touristy).
Background must NOT distract from product.

LIGHTING:
Natural daylight. Soft, warm tone. Light should enhance material texture, engraving depth, natural skin tones.
Avoid: harsh flash / flat lighting / overexposure

FOCUS:
Ultra-sharp focus on product and hand interaction. Slight background blur (depth of field).

PHYSICAL REALISM:
Real weight and gravity must be visible. Product must sit naturally in hand. Maintain micro-textures and imperfections.
Avoid: plastic AI look / over-smoothing / unrealistic perfection

CAMERA STYLE:
Real photography (NOT CGI). Shot as if with DSLR or high-end smartphone. Natural depth. No filters. No artificial sharpening.

FINAL GOAL: Create an authentic, emotional, real-life moment while preserving absolute product accuracy for e-commerce.`;

    const resultBase64 = await editImageWithGPT(imageBase64, contentType, lifestylePrompt);
    const cloudinaryUrl = await uploadBase64ToCloudinary(resultBase64, product.id, 'lifestyle');
    updates.imgUrl3 = cloudinaryUrl;
    console.log('   ✅ לייפסטייל הועלה');
    await sleep(3000);
  } catch (e) {
    console.error('   ❌ שגיאה בלייפסטייל:', e.message);
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'products', product.id), updates);
    console.log('   💾 מוצר עודכן ב-Firestore');
  }

  return updates;
}

// ══ תוכנית ראשית ══
async function runPipeline() {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  console.log('🚀 AI Media Pipeline (gpt-image-1) מתחיל...');
  if (limit) console.log(`📊 מוגבל ל-${limit} מוצרים`);

const q = query(collection(db, 'products'), where('status', '==', 'active'), where('cat', '==', 'יודאיקה'));
  const snap = await getDocs(q);

  let products = [];
  snap.forEach(d => {
    const p = { id: d.id, ...d.data() };
    if ((p.imgUrl || p.image_url) && !p.imgUrl2) {
      products.push(p);
    }
  });

  if (limit) products = products.slice(0, limit);
  console.log(`📦 ${products.length} מוצרים לעיבוד\n`);

  if (products.length === 0) {
    console.log('✅ אין מוצרים לעיבוד — כולם כבר עודכנו!');
    process.exit(0);
  }

  let success = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    console.log(`\n[${i + 1}/${products.length}]`);
    try {
      await processProduct(products[i]);
      success++;
    } catch (e) {
      console.error(`❌ שגיאה כללית:`, e.message);
      failed++;
    }
    if (i < products.length - 1) await sleep(4000);
  }

  console.log('\n══════════════════════');
  console.log('🎉 Pipeline הושלם!');
  console.log(`✅ הצליחו: ${success}`);
  console.log(`❌ נכשלו: ${failed}`);
  process.exit(0);
}

runPipeline().catch(e => { console.error(e); process.exit(1); });
