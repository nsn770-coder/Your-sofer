// aiMediaPipeline.mjs
// סוכן — יוצר תמונת "customer review" למוצרים
//
// ══ אפשרות 1 — Gemini via Service Account (ללא OAuth, לא פג) ══
// node app/scripts/aiMediaPipeline.mjs --provider=gemini --limit=50
//
// ══ אפשרות 2 — OpenAI ══
// OPENAI_API_KEY=sk-xxx node app/scripts/aiMediaPipeline.mjs --provider=openai --limit=50
//
// אפשרויות נוספות:
// --test         מצב בדיקה (2 מוצרים, ללא כתיבה ל-Firestore)
// --limit=N      הגבלת כמות מוצרים לכל קטגוריה
// --cat=קטגוריה  קטגוריה ספציפית בלבד

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ טען .env.local אוטומטית אם משתנים חסרים ══
(function loadEnvLocal() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) process.env[key] = val;
  }
})();

// ══ Firebase Admin SDK ══
const SA_PATH = resolve(__dirname, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

// ══ הגדרות ══
const OPENAI_API_KEY     = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY || '';
const CLOUDINARY_CLOUD   = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';
const CLOUDINARY_PRESET  = 'yoursofer_upload';

// ══ Gemini AI Studio ══
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ══ קטגוריות ══
const CATEGORIES = ['יודאיקה', 'מתנות', 'שבת וחגים', 'סט טלית תפילין', 'מזוזות', 'כיסוי תפילין', 'בר מצווה', 'מגילות', 'ספרי תורה', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'כלי שולחן והגשה', 'עיצוב הבית'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══ Lock file ══
const LOCK_FILE = resolve(__dirname, '../../.pipeline.lock');

function isPidAlive(pid) {
  try {
    // signal 0 — לא שולח אות אמיתי, רק בודק אם הפרוצס קיים
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const storedPid = (() => { try { return parseInt(readFileSync(LOCK_FILE, 'utf8').trim(), 10); } catch { return NaN; } })();
    if (!isNaN(storedPid) && isPidAlive(storedPid)) {
      console.error(`❌ Pipeline כבר רץ (PID ${storedPid}). עצור אותו קודם: kill -9 ${storedPid}`);
      process.exit(1);
    }
    // PID מת — הקובץ שרידי מהרצה קודמת, מנקים
    console.log(`⚠️  נמצא lock file שרידי (PID ${storedPid} מת) — מנקה אוטומטית`);
    try { unlinkSync(LOCK_FILE); } catch {}
  }
  writeFileSync(LOCK_FILE, String(process.pid));
  console.log(`🔒 Lock acquired (PID ${process.pid})`);
  process.on('exit', releaseLock);
  process.on('SIGINT', () => { releaseLock(); process.exit(130); });
  process.on('SIGTERM', () => { releaseLock(); process.exit(143); });
}

function releaseLock() {
  try { if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE); } catch {}
}

// ══ קבל Access Token מ-Service Account (לא פג לעולם) ══
async function getServiceAccountToken() {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));

  // יצירת JWT
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  // חתימה עם RSA private key
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(sa.private_key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  // החלף JWT ב-Access Token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Service Account auth נכשל: ${err.error_description || res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ══ Cache token (מתחדש אוטומטית כל שעה) ══
let _tokenCache = null;
let _tokenExpiry = 0;

async function getToken() {
  const now = Date.now();
  if (_tokenCache && now < _tokenExpiry - 60000) return _tokenCache;
  console.log('   🔑 מחדש Access Token...');
  _tokenCache = await getServiceAccountToken();
  _tokenExpiry = now + 3600000; // שעה
  return _tokenCache;
}

// ══ פרומטים — 3 סוגי תמונות ══

const PROMPT_LIFESTYLE = `Create a realistic customer-style photo of this exact product in a clean, modern home interior.
PRODUCT ACCURACY (ABSOLUTE PRIORITY):
Use the reference image as the strict and exact source of truth.
The product must remain 100% identical: same shape, proportions, scale, materials, colors, texture, finish, engravings, and all details.
Do NOT: redesign, enhance, stylize, clean imperfections, improve materials, change reflections, or alter proportions in any way.
The product must look exactly like the original, including small imperfections.
SCENE:
Place the product naturally on a simple wooden table, marble surface, or clean modern shelf.
BACKGROUND: soft blur, neutral environment, no visual storytelling.
STRICT NEGATIVE: no candles, no Judaica objects, no fabrics, no extra objects, no people, no text/logos.
LIGHTING: natural daylight, neutral.
Final result: clean, realistic, high-quality customer photo focused entirely on the product.`;

const PROMPT_STUDIO = `Create a professional studio product photo of this exact product on a clean background.
PRODUCT ACCURACY (ABSOLUTE PRIORITY):
Use the reference image as the strict source of truth.
The product must remain 100% identical in every detail.
Do NOT: redesign or enhance, change materials or reflections, modify proportions, smooth textures.
STUDIO SETUP:
Pure white or very light neutral background.
Seamless background (infinite studio look).
No environment or furniture.
LIGHTING:
Strong, clean studio lighting.
Balanced soft shadows under the product.
Sharp edges and high clarity.
No warm tones. No dramatic cinematic light.
COMPOSITION:
Centered product. Full product visible.
Straight angle or slight professional angle. High sharpness.
STRICT NEGATIVE: no props, no decorations, no people, no text/logos, no background elements.
Final result: clean, high-end eCommerce studio image.`;

// קטגוריות שבהן תוצג אישה
const FEMALE_CATS = new Set(['עיצוב הבית', 'כלי שולחן והגשה']);

function buildHumanPrompt(product) {
  const isFemale = FEMALE_CATS.has(product.cat);

  const personBlock = isFemale
    ? `A single Jewish woman in her late 20s to early 30s — no men.
Attractive, modest, natural appearance. Dark or warm-toned hair, light makeup. Dressed modestly and elegantly.
She must look like a real human being photographed with a camera — NOT like a CGI or AI-generated character.
Skin has natural texture, pores, slight imperfections. Eyes are realistic with natural catchlights.
Relaxed, confident posture. Holding or presenting the product naturally toward the camera.
Warm, genuine expression — not a staged commercial smile.
STRICT NEGATIVE: no men, no children, no candles, no Judaica props in background, no text/logos, no extra products, no plastic or artificial skin appearance.`
    : `A single Jewish man in his 30s — no women.
Attractive, well-groomed, natural appearance. Short beard or light stubble. Wearing a kippah.
He must look like a real human being photographed with a camera — NOT like a CGI or AI-generated character.
Skin has natural texture, pores, slight imperfections. Eyes are realistic with natural catchlights.
Relaxed, confident posture. Holding the product naturally toward the camera with both hands.
Friendly, genuine expression — not a staged commercial smile.
STRICT NEGATIVE: no women, no children, no candles, no Judaica props in background, no text/logos, no extra products, no plastic or artificial skin appearance.`;

  return `A candid, photorealistic photograph of a Jewish person holding this exact product: "${product.name}".
PRODUCT ACCURACY (ABSOLUTE PRIORITY):
The product must remain 100% identical to the reference image.
Do NOT redesign, enhance, modify details, or change text or engravings.
PERSON:
${personBlock}
BACKGROUND: clean modern home interior, softly blurred, no religious objects.
LIGHTING: soft natural window light, warm and flattering, realistic indoor shadows.
COMPOSITION: product clearly visible. Product is main focus. Person supports the product naturally.
REALISM RULES: photograph grain, natural depth of field, real skin texture. Must look like a real photo, not a render.
Final result: a warm, trustworthy, human eCommerce photo that looks like it was taken by a real customer.`;
}

// ══ הורד תמונה כ-base64 ══
async function downloadImageAsBase64(url) {
  // Node 18+ fetch מוגבל ל-20 redirects — השתמש ב-http/https ישירות לעקיפת redirect loops
  const { get: httpsGet } = await import('https');
  const { get: httpGet } = await import('http');

  return new Promise((resolve, reject) => {
    function doGet(targetUrl, redirectsLeft = 10) {
      if (redirectsLeft <= 0) return reject(new Error(`redirect loop: ${targetUrl}`));
      const getter = targetUrl.startsWith('https') ? httpsGet : httpGet;
      getter(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000 }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, targetUrl).href;
          res.resume();
          return doGet(next, redirectsLeft - 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`לא ניתן להוריד תמונה (${res.statusCode}): ${targetUrl}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          const contentType = res.headers['content-type'] || 'image/jpeg';
          resolve({ base64, contentType });
        });
        res.on('error', reject);
      }).on('error', reject).on('timeout', function() { this.destroy(new Error('timeout')); });
    }
    doGet(url);
  });
}

// ══ Gemini AI Studio — inlineData + generateContent ══
async function generateWithGemini(imageBase64, contentType, prompt) {
  if (!GEMINI_API_KEY) throw new Error('חסר GEMINI_API_KEY');

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { data: imageBase64, mimeType: contentType } },
        { text: prompt },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000); // 2-minute hard timeout
  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    if (part.inlineData?.data) return part.inlineData.data;
  }
  throw new Error('Gemini לא החזיר תמונה');
}

// ══ OpenAI ══
async function generateWithOpenAI(imageBase64, contentType, prompt) {
  const byteCharacters = atob(imageBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });

  const formData = new FormData();
  formData.append('model', 'gpt-image-1');
  formData.append('image[]', blob, 'product.jpg');
  formData.append('prompt', prompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('quality', 'medium');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI: ${err?.error?.message || `HTTP ${res.status}`}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI לא החזיר תמונה');
  return b64;
}

// ══ בקש מ-Cloudinary להוריד URL (Cloudinary מוריד מהשרת שלו — עוקף חסימות IP) ══
async function fetchUrlViaCloudinary(url, productId) {
  const formData = new FormData();
  formData.append('file', url);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', `yoursofer/${productId}`);
  formData.append('public_id', `${productId}_src_${Date.now()}`); // timestamp — ללא התנגשות

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Cloudinary fetch-upload: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ══ מחק תמונת מקור זמנית מ-Cloudinary (באמצעות delete_token — ללא API credentials) ══
async function deleteCloudinaryByToken(deleteToken) {
  if (!deleteToken) return;
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/delete_by_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: deleteToken }),
    });
    if (res.ok) {
      console.log('   🗑  תמונת מקור נמחקה מ-Cloudinary');
    } else {
      console.warn('   ⚠️ מחיקת תמונת מקור נכשלה (לא קריטי):', res.status);
    }
  } catch {
    // לא קריטי — ממשיך בכל מקרה
  }
}

// ══ העלה ל-Cloudinary ══
// type: 'lifestyle' | 'studio' | 'human'
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

  if (!res.ok) throw new Error(`Cloudinary: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ══ יצירת תמונה אחת + העלאה ל-Cloudinary ══
async function generateAndUpload(imageBase64, contentType, prompt, productId, type, provider, testMode) {
  console.log(`   📸 [${type}] יוצר תמונה...`);
  let resultBase64;
  try {
    if (provider === 'gemini') {
      resultBase64 = await generateWithGemini(imageBase64, contentType, prompt);
    } else {
      resultBase64 = await generateWithOpenAI(imageBase64, contentType, prompt);
    }
  } catch (e) {
    console.error(`   ❌ [${type}] יצירה נכשלה: ${e.message}`);
    return null;
  }

  try {
    const url = await uploadBase64ToCloudinary(resultBase64, productId, type);
    console.log(`   ✅ [${type}] הועלה: ${url.substring(0, 70)}...`);
    return url;
  } catch (e) {
    console.error(`   ❌ [${type}] העלאה נכשלה: ${e.message}`);
    return null;
  }
}

// ══ עבד מוצר אחד — יוצר 3 תמונות ══
async function processProduct(product, provider, testMode) {
  const imgUrl = product.imgUrl || product.image_url;
  console.log(`\n📦 ${product.name?.substring(0, 60)}`);
  console.log(`   קטגוריה: ${product.cat} | ספק: ${provider.toUpperCase()}`);

  // בדיקה ראשונה — דלג אם כל 3 כבר קיימות
  if (!testMode) {
    const fresh = await db.collection('products').doc(product.id).get();
    const d = fresh.data() || {};
    if (d.imgUrl2 && d.imgUrl3 && d.imgUrl4) {
      console.log('   ⏭ כל 3 תמונות כבר קיימות — דולג');
      return { skipped: true };
    }
  }

  // ══ הורד תמונת מקור ══
  let imageBase64, contentType;
  try {
    let downloadUrl = imgUrl;
    if (!imgUrl.includes('cloudinary.com')) {
      try {
        console.log('   🔄 מבקש מ-Cloudinary להוריד תמונה...');
        downloadUrl = await fetchUrlViaCloudinary(imgUrl, product.id);
        console.log('   ✅ Cloudinary הוריד:', downloadUrl.substring(0, 60) + '...');
      } catch (cloudErr) {
        console.warn(`   ⚠️ Cloudinary נכשל (${cloudErr.message}) — מנסה ישירות...`);
        downloadUrl = imgUrl;
      }
    }
    ({ base64: imageBase64, contentType } = await downloadImageAsBase64(downloadUrl));
    console.log('   📥 תמונת מקור הורדה');
  } catch (e) {
    console.error('   ❌ הורדה נכשלה:', e.message);
    return {};
  }

  const INTER_IMAGE_DELAY = provider === 'gemini' ? 40000 : 3000;

  // ══ תמונה 1: Lifestyle (imgUrl2) ══
  const lifestyleUrl = await generateAndUpload(
    imageBase64, contentType, PROMPT_LIFESTYLE, product.id, 'lifestyle', provider, testMode
  );
  if (lifestyleUrl && !testMode) {
    await db.collection('products').doc(product.id).update({ imgUrl2: lifestyleUrl });
    console.log('   💾 imgUrl2 נשמר');
  }

  await sleep(INTER_IMAGE_DELAY);

  // ══ תמונה 2: Studio (imgUrl3) ══
  const studioUrl = await generateAndUpload(
    imageBase64, contentType, PROMPT_STUDIO, product.id, 'studio', provider, testMode
  );
  if (studioUrl && !testMode) {
    await db.collection('products').doc(product.id).update({ imgUrl3: studioUrl });
    console.log('   💾 imgUrl3 נשמר');
  }

  await sleep(INTER_IMAGE_DELAY);

  // ══ תמונה 3: Human model (imgUrl4) ══
  const humanUrl = await generateAndUpload(
    imageBase64, contentType, buildHumanPrompt(product), product.id, 'human', provider, testMode
  );
  if (humanUrl && !testMode) {
    await db.collection('products').doc(product.id).update({ imgUrl4: humanUrl });
    console.log('   💾 imgUrl4 נשמר');
  }

  if (testMode) {
    console.log('\n   🧪 תוצאות בדיקה:');
    console.log(`   imgUrl2 (lifestyle): ${lifestyleUrl || '❌ נכשל'}`);
    console.log(`   imgUrl3 (studio):    ${studioUrl   || '❌ נכשל'}`);
    console.log(`   imgUrl4 (human):     ${humanUrl    || '❌ נכשל'}`);
  }

  const success = [lifestyleUrl, studioUrl, humanUrl].filter(Boolean).length;
  console.log(`   📊 ${success}/3 תמונות נוצרו בהצלחה`);

  return { imgUrl2: lifestyleUrl, imgUrl3: studioUrl, imgUrl4: humanUrl };
}

// ══ תוכנית ראשית ══
async function runPipeline() {
  acquireLock();
  const args = process.argv.slice(2);
  const testMode    = args.includes('--test');
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider    = providerArg ? providerArg.split('=')[1] : 'gemini';
  const limitArg    = args.find(a => a.startsWith('--limit='));
  const perCatLimit = testMode ? 1 : (limitArg ? parseInt(limitArg.split('=')[1]) : null);
  const catArg      = args.find(a => a.startsWith('--cat='));
  const categories  = catArg ? [catArg.split('=')[1]] : CATEGORIES;

  if (provider === 'openai' && !OPENAI_API_KEY) {
    console.error('❌ חסר OPENAI_API_KEY');
    process.exit(1);
  }

  console.log(`🚀 AI Media Pipeline מתחיל...`);
  console.log(`🤖 ספק: ${provider.toUpperCase()}`);
  if (provider === 'gemini') console.log(`🔑 Gemini AI Studio — model: ${GEMINI_MODEL}`);
  if (testMode) console.log('🧪 מצב בדיקה — מוצר אחד בלבד, ללא כתיבה ל-Firestore');
  else if (perCatLimit) console.log(`📊 מוגבל ל-${perCatLimit} מוצרים לקטגוריה`);
  console.log(`📂 קטגוריות: ${categories.join(' → ')}\n`);

  // בדיקת אימות לפני תחילת הריצה
  if (provider === 'gemini' && !GEMINI_API_KEY) {
    console.error('❌ חסר GEMINI_API_KEY — הפעל עם: GEMINI_API_KEY=AIza... node ...');
    process.exit(1);
  }

  let totalSuccess = 0, totalFailed = 0;

  for (const cat of categories) {
    console.log(`\n${'═'.repeat(40)}`);
    console.log(`📂 קטגוריה: ${cat}`);
    console.log('═'.repeat(40));

    const snap = await db.collection('products')
      .where('status', '==', 'active')
      .where('cat', '==', cat)
      .get();

    let products = [];
    snap.forEach(d => {
      const p = { ...d.data(), id: d.id };
      // כלול מוצר אם יש לו תמונת מקור וחסרה לו לפחות תמונה אחת מה-3
      if ((p.imgUrl || p.image_url) && !(p.imgUrl2 && p.imgUrl3 && p.imgUrl4)) products.push(p);
    });

    if (perCatLimit) products = products.slice(0, perCatLimit);
    console.log(`📦 ${products.length} מוצרים ממתינים לתמונה`);

    if (products.length === 0) {
      console.log('✅ כולם כבר עודכנו!');
      continue;
    }

    let catSuccess = 0, catFailed = 0;

    for (let i = 0; i < products.length; i++) {
      console.log(`\n[${cat} — ${i + 1}/${products.length}]`);
      try {
        const result = await processProduct(products[i], provider, testMode);
        const count = [result.imgUrl2, result.imgUrl3, result.imgUrl4].filter(Boolean).length;
        if (count > 0) { catSuccess++; totalSuccess++; }
        else if (!result.skipped) { catFailed++; totalFailed++; }
      } catch (e) {
        console.error(`❌ שגיאה כללית:`, e.message);
        catFailed++; totalFailed++;
      }
      // delay בין מוצרים (לא בין התמונות — הוא כבר בתוך processProduct)
      if (i < products.length - 1) await sleep(provider === 'gemini' ? 15000 : 5000);
    }

    console.log(`\n📊 ${cat}: ✅ ${catSuccess} הצליחו, ❌ ${catFailed} נכשלו`);

    const catIdx = categories.indexOf(cat);
    if (catIdx < categories.length - 1) {
      console.log(`⏳ ממתין 10 שניות לקטגוריה הבאה...`);
      await sleep(10000);
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log('🎉 Pipeline הושלם!');
  console.log(`✅ סה״כ הצליחו: ${totalSuccess}`);
  console.log(`❌ סה״כ נכשלו: ${totalFailed}`);
  if (testMode) console.log('🧪 זו הייתה ריצת בדיקה — הפעל ללא --test לריצה מלאה');
  process.exit(0);
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason?.message || reason);
  // Don't exit — let the pipeline continue
});

runPipeline().catch(e => { console.error(e); process.exit(1); });
