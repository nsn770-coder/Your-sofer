// aiMediaPipeline.mjs
// סוכן — יוצר תמונת "customer review" למוצרים
//
// ══ אפשרות 1 — Gemini (OAuth token, יש rate limit) ══
// GEMINI_API_KEY=ya29.xxx CLOUDINARY_CLOUD_NAME=dyxzq3ucy node app/scripts/aiMediaPipeline.mjs --provider=gemini --limit=50
//
// ══ אפשרות 2 — OpenAI (API key קבוע, אין rate limit) ══
// CLOUDINARY_CLOUD_NAME=dyxzq3ucy node app/scripts/aiMediaPipeline.mjs --provider=openai --limit=50
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

// ══ Firebase Admin SDK ══
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ══ הגדרות ══
const OPENAI_API_KEY    = process.env.OPENAI_API_KEY || '';
const CLOUDINARY_CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'dyxzq3ucy';
const CLOUDINARY_PRESET = 'yoursofer_upload';

// ══ Gemini ══
const GEMINI_MODEL   = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/your-sofer/locations/us-central1/publishers/google/models/${GEMINI_MODEL}:generateContent`;

// ══ קטגוריות ══
const CATEGORIES = ['יודאיקה', 'מתנות', 'שבת וחגים', 'סט טלית ותפילין', 'מזוזות'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══ Lock file — מניעת ריצות מקביליות ══
const LOCK_FILE = resolve(__dirname, '../../.pipeline.lock');

function acquireLock() {
  if (existsSync(LOCK_FILE)) {
    const pid = (() => { try { return readFileSync(LOCK_FILE, 'utf8').trim(); } catch { return '?'; } })();
    console.error(`❌ Pipeline כבר רץ (PID ${pid}). עצור אותו קודם או מחק את הקובץ: ${LOCK_FILE}`);
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

// ══ פרומט ══
const CUSTOMER_REVIEW_PROMPT = `Create a realistic customer review photo of the product placed naturally on a real table inside a home.
Use the attached product image as the exact reference for the product itself, keeping all colors, materials, proportions, textures, shapes, engravings, and details completely identical.
The product should be fully visible and already placed neatly on the table, not inside packaging and not being held.
Photograph it from a different angle than the original product image — a more casual, slightly imperfect angle, as if a customer quickly took the photo with a smartphone after placing it on the table.
The camera angle should be high and top-down, around 80 degrees from above, almost like someone is standing over the table and taking the photo directly downward with a phone.
The setting should feel like a real home environment with natural lighting, soft shadows, and slight background blur.
The table can be a dining table, kitchen counter, side table, or Shabbat table, with subtle home elements in the background like a chair, tablecloth, candles, kitchen, flowers, books, or part of a living room.
The image should look authentic and user-generated, not like a professional studio advertisement.
Do not redesign the product.
Do not change proportions or materials.
Do not add packaging.
Do not make it look overly clean, perfect, symmetrical, or heavily styled.`;

// ══ הורד תמונה כ-base64 ══
async function downloadImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`לא ניתן להוריד תמונה: ${url}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { base64, contentType };
}

// ══ Gemini ══
async function generateWithGemini(imageBase64, contentType, token) {
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

  const RETRY_WAITS = [60000, 120000, 180000]; // 1min, 2min, 3min
  for (let attempt = 0; attempt <= RETRY_WAITS.length; attempt++) {
    const res = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      if (attempt < RETRY_WAITS.length) {
        const wait = RETRY_WAITS[attempt];
        console.log(`   ⏳ 429 rate limit — ממתין ${wait / 1000}s לפני ניסיון ${attempt + 2}/${RETRY_WAITS.length + 1}...`);
        await sleep(wait);
        continue;
      }
      throw new Error('Gemini: Rate limit — נכשל אחרי כל הניסיונות');
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
  console.log(`   🔍 OpenAI response: data.data.length=${data.data?.length ?? 'undefined'}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI לא החזיר תמונה');
  return b64;
}

// ══ העלה ל-Cloudinary ══
async function uploadBase64ToCloudinary(base64, productId) {
  const caller = new Error().stack.split('\n')[2]?.trim() ?? 'unknown';
  console.log(`   📤 Cloudinary upload called for ${productId}`);
  console.log(`      caller: ${caller}`);
  const formData = new FormData();
  formData.append('file', `data:image/png;base64,${base64}`);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', `yoursofer/${productId}`);
  formData.append('public_id', `${productId}_review_${Date.now()}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`Cloudinary: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

// ══ עבד מוצר אחד ══
async function processProduct(product, provider, testMode, geminiToken) {
  const imgUrl = product.imgUrl || product.image_url;
  console.log(`\n📦 ${product.name?.substring(0, 50)}`);
  console.log(`   קטגוריה: ${product.cat} | ספק: ${provider.toUpperCase()}`);

  // בדיקה רענונית — אולי עודכן ע"י ריצה מקבילת
  if (!testMode) {
    const fresh = await db.collection('products').doc(product.id).get();
    if (fresh.exists && fresh.data()?.imgUrl2) {
      console.log('   ⏭ כבר עודכן — דולג');
      return {};
    }
  }

  let imageBase64, contentType;
  try {
    ({ base64: imageBase64, contentType } = await downloadImageAsBase64(imgUrl));
    console.log('   📥 תמונה הורדה');
  } catch (e) {
    console.error('   ❌ הורדה נכשלה:', e.message);
    return {};
  }

  let resultBase64;
  try {
    console.log(`   📸 יוצר תמונה (${provider})...`);
    if (provider === 'gemini') {
      resultBase64 = await generateWithGemini(imageBase64, contentType, geminiToken);
    } else {
      resultBase64 = await generateWithOpenAI(imageBase64, contentType);
    }
  } catch (e) {
    console.error('   ❌ יצירת תמונה נכשלה:', e.message);
    return {};
  }

  try {
    const cloudinaryUrl = await uploadBase64ToCloudinary(resultBase64, product.id);
    console.log('   ✅ הועלה:', cloudinaryUrl);

    if (!testMode) {
      await db.collection('products').doc(product.id).update({ imgUrl2: cloudinaryUrl });
      console.log('   💾 Firestore עודכן');
    } else {
      console.log('   🧪 (בדיקה) דילוג על Firestore');
    }

    return { imgUrl2: cloudinaryUrl };
  } catch (e) {
    console.error('   ❌ העלאה נכשלה:', e.message);
    return {};
  }
}

// ══ תוכנית ראשית ══
async function runPipeline() {
  acquireLock();
  const args = process.argv.slice(2);
  const testMode    = args.includes('--test');
  const providerArg = args.find(a => a.startsWith('--provider='));
  const provider    = providerArg ? providerArg.split('=')[1] : 'openai';
  const limitArg    = args.find(a => a.startsWith('--limit='));
  const perCatLimit = testMode ? 2 : (limitArg ? parseInt(limitArg.split('=')[1]) : null);
  const catArg      = args.find(a => a.startsWith('--cat='));
  const categories  = catArg ? [catArg.split('=')[1]] : CATEGORIES;
  const geminiToken = process.env.GEMINI_API_KEY || '';

  if (provider === 'gemini' && !geminiToken) {
    console.error('❌ חסר GEMINI_API_KEY — הפעל עם: GEMINI_API_KEY=ya29.xxx node ...');
    process.exit(1);
  }

  console.log(`🚀 AI Media Pipeline מתחיל...`);
  console.log(`🤖 ספק: ${provider.toUpperCase()}`);
  if (testMode) console.log('🧪 מצב בדיקה — 2 מוצרים לקטגוריה, ללא כתיבה ל-Firestore');
  else if (perCatLimit) console.log(`📊 מוגבל ל-${perCatLimit} מוצרים לקטגוריה`);
  console.log(`📂 קטגוריות: ${categories.join(' → ')}\n`);

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
    console.log(`📦 ${products.length} מוצרים לעיבוד`);

    if (products.length === 0) {
      console.log('✅ כולם כבר עודכנו!');
      continue;
    }

    let catSuccess = 0, catFailed = 0;

    for (let i = 0; i < products.length; i++) {
      console.log(`\n[${cat} — ${i + 1}/${products.length}]`);
      try {
        const result = await processProduct(products[i], provider, testMode, geminiToken);
        if (result.imgUrl2) { catSuccess++; totalSuccess++; }
        else { catFailed++; totalFailed++; }
      } catch (e) {
        console.error(`❌ שגיאה כללית:`, e.message);
        catFailed++; totalFailed++;
      }
      // OpenAI: 5 שניות בין מוצרים | Gemini: 40 שניות
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
  console.log('🎉 Pipeline הושלם — כל הקטגוריות!');
  console.log(`✅ סה״כ הצליחו: ${totalSuccess}`);
  console.log(`❌ סה״כ נכשלו: ${totalFailed}`);
  if (testMode) console.log('🧪 זו הייתה ריצת בדיקה — הפעל ללא --test לריצה מלאה');
  process.exit(0);
}

runPipeline().catch(e => { console.error(e); process.exit(1); });
