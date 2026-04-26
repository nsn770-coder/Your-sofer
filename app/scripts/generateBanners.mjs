/**
 * generateBanners.mjs
 * Generates banner images for all curation documents using Gemini.
 *
 * Usage:
 *   node app/scripts/generateBanners.mjs           # all curations missing bannerImageUrl
 *   node app/scripts/generateBanners.mjs --force   # regenerate even if bannerImageUrl exists
 *   node app/scripts/generateBanners.mjs --test    # dry-run, first 2 curations, no writes
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { fileURLToPath }                 from 'url';
import { dirname, resolve }              from 'path';
import { readFileSync, existsSync }      from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ─────────────────────────────────────────────────────────
(function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
})();

// ── Firebase ────────────────────────────────────────────────────────────────
const SA_PATH = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

// ── Config ──────────────────────────────────────────────────────────────────
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY || '';
const CLOUDINARY_CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';
const CLOUDINARY_PRESET = 'yoursofer_upload';
const GEMINI_MODEL      = 'gemini-2.5-flash-image';
const GEMINI_URL        = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const args     = process.argv.slice(2);
const TEST     = args.includes('--test');
const FORCE    = args.includes('--force');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Style rules mapping (lookName → scene description) ──────────────────────
const STYLE_RULES = {
  'שחור וזהב':         'Dark dramatic interior, rich black textures, brushed gold accents, warm candlelight glow, deep shadows',
  'לבן מינימליסטי':    'Bright airy interior, white marble surfaces, soft diffused morning light, clean minimal staging',
  'זכוכית וקריסטל':    'Bright white environment, sparkling glass reflections, crystal-clear highlights, light refraction',
  'זכוכית גבישית':     'Bright white environment, sparkling glass reflections, crystal-clear highlights, light refraction',
  'עץ טבעי':           'Warm organic wood textures, natural daylight, earthy tones, handcrafted artisanal feel',
  'עץ וטבע':           'Warm organic wood textures, natural daylight, earthy tones, handcrafted artisanal feel',
  'כסף וקריסטל':       'Traditional upscale ambiance, polished silver surfaces, dark wood accents, classic Jewish home elegance',
  'אקריל וצבעוני':     'Fresh modern setting, vibrant saturated accents, playful luxury, contemporary lifestyle',
  'זהב ומוזהב':        'Warm opulent gold palette, regal textures, deep jewel tones, velvet and brass details',
  'זהב מעודן':         'Warm opulent gold palette, regal textures, deep jewel tones, velvet and brass details',
  'לבן וכסף':          'Crisp clean white interior, silver metallic accents, elegant simplicity, bright natural light',
  'אפור מודרני':       'Contemporary urban interior, cool grey tones, brushed metal, clean geometric lines',
  'אפור ולבן':         'Contemporary urban interior, cool grey tones, white accents, minimal clean aesthetic',
  'שחור וכסף':         'Dramatic dark interior, sleek silver accents, modern luxury, high contrast staging',
  'שחור מט':           'Dramatic dark matte interior, deep blacks, no reflections, industrial chic luxury',
  'כחול עמוק':         'Rich deep blue palette, navy and midnight tones, sophisticated evening ambiance',
  'כחול וירוק':        'Fresh coastal Mediterranean palette, teal and green accents, natural light',
  'טבעי ורך':          'Soft warm natural tones, organic textures, gentle diffused light, cozy intimate feel',
  'מתכת מבריקה':       'Polished metallic surfaces, industrial elegance, strong studio lighting, chrome reflections',
  'מתכת בגווני עדינים':'Subtle metallic tones, brushed gold and silver, sophisticated understated luxury',
  'חום ועור':          'Rich warm leather textures, cognac and mahogany tones, traditional gentleman study atmosphere',
  'צבעוני וטבעי':      'Vibrant natural palette, fresh organic colors, botanical elements, lively Mediterranean styling',
  'מודרני':            'Clean modern Israeli interior, warm neutrals, contemporary furniture, natural daylight',
  'Modern':             'Clean modern Israeli interior, warm neutrals, contemporary furniture, natural daylight',
  'Heritage':           'Traditional classic ambiance, antique wood furniture, warm amber light, timeless Judaica setting',
  'Steel':              'Sleek stainless steel kitchen, bright studio lighting, minimal modern design',
};

function getStyleDescription(lookName) {
  return STYLE_RULES[lookName] || 'Warm elegant interior, soft natural lighting, luxury Jewish home decor setting';
}

// ── Banner prompt builder ────────────────────────────────────────────────────
function buildBannerPrompt(lookName, category) {
  const styleDesc = getStyleDescription(lookName);
  return `Create a premium collection banner image (1200x400 pixels, wide landscape format) for a luxury Israeli Judaica eCommerce store called "Your Sofer".

Collection name: "${lookName}"
Product category: "${category}"

Scene style: ${styleDesc}

Requirements:
- Photorealistic lifestyle editorial photography style
- Wide banner composition (3:1 ratio — very wide, short height)
- Show 2–4 Judaica products from the category subtly arranged in the scene
- The products should feel naturally placed, not artificially posed
- Luxury magazine editorial quality — like Architectural Digest meets Judaica
- Cohesive, beautifully lit, styled environment that matches the collection mood
- Rich textures and depth of field
- No text, no logos, no watermarks
- No people or faces
- Products should be recognizable as Judaica items (mezuzahs, candlesticks, kiddush cups, etc.) appropriate to the category

Final result: a stunning wide banner image that conveys the "${lookName}" collection aesthetic for the "${category}" category.`;
}

// ── Download image as base64 ─────────────────────────────────────────────────
async function downloadImageAsBase64(url) {
  const { get: httpsGet } = await import('https');
  const { get: httpGet  } = await import('http');

  return new Promise((resolve, reject) => {
    function doGet(targetUrl, redirectsLeft = 10) {
      if (redirectsLeft <= 0) return reject(new Error(`redirect loop: ${targetUrl}`));
      const getter = targetUrl.startsWith('https') ? httpsGet : httpGet;
      getter(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doGet(new URL(res.headers.location, targetUrl).href, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}: ${targetUrl}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({ base64: buf.toString('base64'), contentType: res.headers['content-type'] || 'image/jpeg' });
        });
        res.on('error', reject);
      }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
    }
    doGet(url);
  });
}

// ── Generate with Gemini ─────────────────────────────────────────────────────
async function generateWithGemini(imagesData, prompt) {
  if (!GEMINI_API_KEY) throw new Error('חסר GEMINI_API_KEY ב-.env.local');

  // Build parts: up to 4 product images + the prompt text
  const imageParts = imagesData.map(({ base64, contentType }) => ({
    inlineData: { data: base64, mimeType: contentType },
  }));

  const body = {
    contents: [{
      role: 'user',
      parts: [
        ...imageParts,
        { text: prompt },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150_000); // 2.5-minute timeout
  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini: ${err?.error?.message || `HTTP ${res.status}`}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data;
  }
  throw new Error('Gemini לא החזיר תמונה');
}

// ── Upload base64 to Cloudinary ──────────────────────────────────────────────
async function uploadBannerToCloudinary(base64, curId) {
  const publicId = `banner_${curId.replace(/[^a-zA-Z0-9_\u0590-\u05FF]/g, '_')}_${Date.now()}`;
  const formData = new FormData();
  formData.append('file', `data:image/png;base64,${base64}`);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', 'yoursofer/banners');
  formData.append('public_id', publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body:   formData,
  });

  if (!res.ok) throw new Error(`Cloudinary upload failed: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY לא מוגדר ב-.env.local');
    process.exit(1);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🎨 Banner Generator — ${TEST ? '🧪 TEST MODE (no writes)' : FORCE ? '🔄 FORCE (regenerate all)' : '✨ Normal (skip existing)'}`);
  console.log(`${'─'.repeat(60)}\n`);

  // Load all curations
  const curationSnap = await db.collection('curations').get();
  let curations = curationSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (TEST) curations = curations.slice(0, 2);

  const toProcess = curations.filter(c => FORCE || !c.bannerImageUrl);
  console.log(`📋 ${curations.length} curations total | ${toProcess.length} to process\n`);

  let done = 0, skipped = 0, failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const cur = toProcess[i];
    const lookName  = cur.bannerTitle || cur.activeTag || '';
    const category  = cur.category    || cur.id        || '';

    console.log(`\n[${i + 1}/${toProcess.length}] 🎨 ${lookName} — ${category}`);
    console.log(`   ID: ${cur.id}`);

    if (!lookName) {
      console.log('   ⚠️  SKIP — no bannerTitle or activeTag');
      skipped++; continue;
    }

    // ── 1. Fetch up to 4 products with this lookTag ──
    let productImages = [];
    try {
      const prodSnap = await db.collection('products')
        .where('lookTag', '==', lookName)
        .limit(8)
        .get();

      const candidates = prodSnap.docs
        .map(d => d.data())
        .filter(p => p.imgUrl || p.image_url)
        .slice(0, 4);

      console.log(`   🛍  Found ${prodSnap.size} products with lookTag "${lookName}", using ${candidates.length} images`);

      // ── 2. Download product images as base64 ──
      for (const p of candidates) {
        const imgUrl = p.imgUrl || p.image_url;
        try {
          const { base64, contentType } = await downloadImageAsBase64(imgUrl);
          productImages.push({ base64, contentType });
          process.stdout.write(`   📥 Downloaded: ${imgUrl.slice(0, 70)}...\n`);
        } catch (e) {
          console.log(`   ⚠️  Could not download image: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`   ⚠️  Could not fetch products: ${e.message}`);
    }

    if (productImages.length === 0) {
      console.log('   ⚠️  No product images available — generating without reference images');
      // Fall back to text-only prompt (single placeholder)
    }

    // ── 3. Build prompt ──
    const prompt = buildBannerPrompt(lookName, category);
    console.log(`   📝 Prompt built (${prompt.length} chars)`);

    if (TEST) {
      console.log('   🧪 TEST — would generate and upload banner');
      console.log(`   📝 Prompt preview:\n      ${prompt.split('\n')[0]}`);
      done++; continue;
    }

    // ── 4. Generate with Gemini ──
    let bannerBase64;
    try {
      console.log('   🤖 Generating with Gemini...');

      if (productImages.length > 0) {
        bannerBase64 = await generateWithGemini(productImages, prompt);
      } else {
        // Text-only: send a single descriptive prompt without reference images
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 150_000);
        let res;
        try {
          res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(`Gemini: ${err?.error?.message || `HTTP ${res.status}`}`);
        }
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) { bannerBase64 = part.inlineData.data; break; }
        }
        if (!bannerBase64) throw new Error('Gemini returned no image');
      }

      console.log('   ✅ Image generated');
    } catch (e) {
      console.error(`   ❌ Generation failed: ${e.message}`);
      failed++; await sleep(3000); continue;
    }

    // ── 5. Upload to Cloudinary ──
    let bannerUrl;
    try {
      console.log('   ☁️  Uploading to Cloudinary...');
      bannerUrl = await uploadBannerToCloudinary(bannerBase64, cur.id);
      console.log(`   ✅ Uploaded: ${bannerUrl}`);
    } catch (e) {
      console.error(`   ❌ Cloudinary upload failed: ${e.message}`);
      failed++; await sleep(2000); continue;
    }

    // ── 6. Update Firestore ──
    try {
      await db.collection('curations').doc(cur.id).update({ bannerImageUrl: bannerUrl });
      console.log(`   💾 Saved to Firestore`);
      done++;
    } catch (e) {
      console.error(`   ❌ Firestore update failed: ${e.message}`);
      failed++;
    }

    // Rate limit — Gemini free tier: ~10 RPM
    if (i < toProcess.length - 1) {
      console.log('   ⏳ Waiting 8s (rate limit)...');
      await sleep(8000);
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  if (TEST) {
    console.log(`🧪 Test complete. Would process: ${done} | Would skip: ${skipped}`);
    console.log('Run WITHOUT --test to generate banners.');
  } else {
    console.log(`✅ Done: ${done} | ⏭  Skipped: ${skipped} | ❌ Failed: ${failed}`);
  }
  console.log(`${'─'.repeat(60)}\n`);

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

process.on('unhandledRejection', reason => {
  console.error('❌ unhandledRejection:', reason?.message || reason);
});
