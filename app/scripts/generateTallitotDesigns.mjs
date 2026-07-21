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
// הפרומט לעיצוב — הדבק כאן את הפרומט (או השאר וקלוד יעדכן כשתשלח אותו)
// ═══════════════════════════════════════════════════════════════════════════
const DESIGN_PROMPT = `
PASTE_PROMPT_HERE
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
  if (DESIGN_PROMPT === 'PASTE_PROMPT_HERE') {
    console.error('❌ אין פרומט — יש להדביק את הפרומט בראש הקובץ (DESIGN_PROMPT) לפני הרצה.');
    process.exit(1);
  }

  const snap = await db.collection('products').where('source', '==', 'mofet').get();
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`נמצאו ${products.length} מוצרי טליתות\n`);

  let done = 0, skipped = 0, failed = 0;
  for (const p of products) {
    if (done >= LIMIT) break;
    const label = p.name || p.id;
    try {
      if (!FORCE && p.designImage) { console.log(`⏭️  ${label} — כבר יש עיצוב, מדלג`); skipped++; continue; }
      if (!p.imgUrl) { console.log(`⚠️ ${label} — אין תמונה, מדלג`); skipped++; continue; }
      const srcUrls = [p.imgUrl, p.imgUrl2].filter(Boolean);
      console.log(`🎨 ${label} — ${srcUrls.length} תמונות מקור`);
      if (DRY) { done++; continue; }

      const parts = await Promise.all(srcUrls.map(urlToPart));
      const result = await imageModel.generateContent([...parts, { text: DESIGN_PROMPT }]);
      const imgPart = result.response.candidates?.[0]?.content?.parts?.find(x => x.inlineData);
      if (!imgPart) throw new Error('Gemini לא החזיר תמונה');

      const upload = await cloudinary.uploader.upload(
        `data:image/png;base64,${imgPart.inlineData.data}`,
        { folder: 'yoursofer/tallitot-designs', public_id: `design_${p.id}`, overwrite: true }
      );

      // הטמעה: העיצוב הופך לתמונה הראשית; המקוריות זזות אחורה
      await db.collection('products').doc(p.id).update({
        imgUrl: upload.secure_url,
        imgUrl2: p.imgUrl,
        ...(p.imgUrl2 ? { imgUrl3: p.imgUrl2 } : {}),
        designImage: upload.secure_url,
      });
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
