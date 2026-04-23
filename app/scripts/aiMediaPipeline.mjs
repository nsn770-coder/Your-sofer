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
const SA_PATH = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
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

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = (() => { try { return readFileSync(LOCK_FILE, 'utf8').trim(); } catch { return '?'; } })();
    console.error(`❌ Pipeline כבר רץ (PID ${pid}). עצור אותו קודם או מחק: ${LOCK_FILE}`);
    process.exit(1);
  }
  writeFileSync(LOCK_FILE, String(process.pid));
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

// ══ פרומט ══
const CUSTOMER_REVIEW_PROMPT = `Create a realistic customer-style photo of this exact product in a clean, modern home interior.
PRODUCT ACCURACY (CRITICAL):
Use the reference image as the strict source of truth.
The product must remain completely identical:
same shape, proportions, materials, colors, texture, finish, engravings, and all design details.
Do not redesign, enhance, or reinterpret the product in any way.
SCENE:
Place the product naturally on a simple wooden table, marble countertop, or clean shelf.
Use a minimal, neutral environment only.
Background should be softly blurred and visually quiet.
STRICT NEGATIVE RULES:
Do NOT include:
- candles or candlelight
- any religious objects or Judaica props
- bookshelves that create a religious atmosphere
- tablecloths or decorative fabrics
- extra products or unrelated objects
- hands, people, packaging
- text, logos, or watermarks
LIGHTING:
Soft natural daylight from a window.
Clean, neutral lighting.
No warm glow, no dramatic shadows, no cinematic lighting.
COMPOSITION:
The product must be the clear main focus.
Fully visible, sharp, and centered or slightly off-center naturally.
The background must not compete with the product.
PRIORITY RULE:
If there is any uncertainty, simplify the scene and remove background elements.
Product accuracy and clarity are more important than atmosphere.
Final result:
Background complexity: very low
Scene density: minimal
A clean, realistic, high-quality customer photo focused entirely on the product.`;

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
async function generateWithGemini(imageBase64, contentType) {
  if (!GEMINI_API_KEY) throw new Error('חסר GEMINI_API_KEY');

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { data: imageBase64, mimeType: contentType } },
        { text: CUSTOMER_REVIEW_PROMPT },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

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
async function generateWithOpenAI(imageBase64, contentType) {
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
  formData.append('prompt', CUSTOMER_REVIEW_PROMPT);
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
async function uploadBase64ToCloudinary(base64, productId) {
  const formData = new FormData();
  formData.append('file', `data:image/png;base64,${base64}`);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', `yoursofer/${productId}`);
  formData.append('public_id', `${productId}_review_${Date.now()}`); // timestamp — ללא התנגשות

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Cloudinary: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ══ עבד מוצר אחד ══
async function processProduct(product, provider, testMode) {
  const imgUrl = product.imgUrl || product.image_url;
  console.log(`\n📦 ${product.name?.substring(0, 50)}`);
  console.log(`   קטגוריה: ${product.cat} | ספק: ${provider.toUpperCase()}`);

  if (!testMode) {
    const fresh = await db.collection('products').doc(product.id).get();
    if (fresh.exists && fresh.data()?.imgUrl2) {
      console.log('   ⏭ כבר עודכן — דולג');
      return {};
    }
  }

  let imageBase64, contentType;
  let srcDeleteToken = null; // נשמור כדי למחוק אחרי עיבוד

  try {
    let downloadUrl = imgUrl;

    // אם ה-URL לא מ-Cloudinary — בקש מ-Cloudinary להוריד בשבילנו (עוקף חסימות IP)
    if (!imgUrl.includes('cloudinary.com')) {
      try {
        console.log('   🔄 מבקש מ-Cloudinary להוריד תמונה...');
        downloadUrl = await fetchUrlViaCloudinary(imgUrl, product.id);
        srcDeleteToken = null; // unsigned preset אינו מחזיר delete_token
        console.log('   ✅ Cloudinary הוריד:', downloadUrl.substring(0, 60) + '...');
      } catch (cloudErr) {
        console.warn(`   ⚠️ Cloudinary upload נכשל (${cloudErr.message}) — מנסה ישירות...`);
        downloadUrl = imgUrl;
      }
    }

    ({ base64: imageBase64, contentType } = await downloadImageAsBase64(downloadUrl));
    console.log('   📥 תמונה הורדה');
  } catch (e) {
    console.error('   ❌ הורדה נכשלה:', e.message);
    await deleteCloudinaryByToken(srcDeleteToken); // ניקוי גם במקרה כשלון
    return {};
  }

  let resultBase64;
  try {
    console.log(`   📸 יוצר תמונה (${provider})...`);
    if (provider === 'gemini') {
      resultBase64 = await generateWithGemini(imageBase64, contentType);
    } else {
      resultBase64 = await generateWithOpenAI(imageBase64, contentType);
    }
  } catch (e) {
    console.error('   ❌ יצירת תמונה נכשלה:', e.message);
    await deleteCloudinaryByToken(srcDeleteToken);
    return {};
  }

  // בדיקה שנייה לפני upload — מגינה אם הפייפליין הופעל מחדש בזמן שה-generation רץ
  if (!testMode) {
    const check2 = await db.collection('products').doc(product.id).get();
    if (check2.exists && check2.data()?.imgUrl2) {
      console.log('   ⏭ עודכן בינתיים — דולג (בדיקה שנייה)');
      await deleteCloudinaryByToken(srcDeleteToken);
      return {};
    }
  }

  try {
    const cloudinaryUrl = await uploadBase64ToCloudinary(resultBase64, product.id);
    console.log('   ✅ הועלה:', cloudinaryUrl);

    // כתוב ל-Firestore מיד אחרי ה-upload — מצמצם חלון כפילויות אם הפייפליין נעצר
    if (!testMode) {
      await db.collection('products').doc(product.id).update({ imgUrl2: cloudinaryUrl });
      console.log('   💾 Firestore עודכן');
    } else {
      console.log('   🧪 (בדיקה) דילוג על Firestore');
    }

    // מחק תמונת מקור זמנית אחרי שה-Firestore עודכן בהצלחה
    await deleteCloudinaryByToken(srcDeleteToken);

    return { imgUrl2: cloudinaryUrl };
  } catch (e) {
    console.error('   ❌ העלאה נכשלה:', e.message);
    await deleteCloudinaryByToken(srcDeleteToken);
    return {};
  }
}

// ══ תוכנית ראשית ══
async function runPipeline() {
  acquireLock();
  const args = process.argv.slice(2);
  const testMode    = args.includes('--test');
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider    = providerArg ? providerArg.split('=')[1] : 'gemini';
  const limitArg    = args.find(a => a.startsWith('--limit='));
  const perCatLimit = testMode ? 2 : (limitArg ? parseInt(limitArg.split('=')[1]) : null);
  const catArg      = args.find(a => a.startsWith('--cat='));
  const categories  = catArg ? [catArg.split('=')[1]] : CATEGORIES;

  if (provider === 'openai' && !OPENAI_API_KEY) {
    console.error('❌ חסר OPENAI_API_KEY');
    process.exit(1);
  }

  console.log(`🚀 AI Media Pipeline מתחיל...`);
  console.log(`🤖 ספק: ${provider.toUpperCase()}`);
  if (provider === 'gemini') console.log(`🔑 Gemini AI Studio — model: ${GEMINI_MODEL}`);
  if (testMode) console.log('🧪 מצב בדיקה — 2 מוצרים לקטגוריה, ללא כתיבה');
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
      if ((p.imgUrl || p.image_url) && !p.imgUrl2) products.push(p);
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
        if (result.imgUrl2) { catSuccess++; totalSuccess++; }
        else { catFailed++; totalFailed++; }
      } catch (e) {
        console.error(`❌ שגיאה כללית:`, e.message);
        catFailed++; totalFailed++;
      }
      // Gemini: 40 שניות בין מוצרים | OpenAI: 5 שניות
      if (i < products.length - 1) await sleep(provider === 'gemini' ? 40000 : 5000);
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

runPipeline().catch(e => { console.error(e); process.exit(1); });
