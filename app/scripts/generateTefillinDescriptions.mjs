// generateTefillinDescriptions.mjs
// מעדכן תיאורים למוצרי תפילין קומפלט וקלפי תפילין בעזרת Claude API
// הרצה: node generateTefillinDescriptions.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';

// ── הגדרות ──────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const CATEGORIES = ['תפילין קומפלט', 'קלפי תפילין'];
const BATCH_SIZE = 5;       // כמה מוצרים מקביל בכל פעם
const DRY_RUN = false;      // true = רק מדפיס, לא כותב ל-Firestore
// ────────────────────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── פרומפט מערכת ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `אתה כותב תיאורי מוצר מקצועיים ויבשים לאתר מרקטפלייס של סת"ם בעברית.
הכללים:
- כתוב בעברית בלבד
- סגנון: יבש, מקצועי, עובדתי — ללא פאתוס
- בנה את התיאור לפי הסעיפים שמסופקים להלן בדיוק
- אל תמציא פרטים שאינם במידע שסופק
- אם מידע חסר — אל תכתוב סעיף ריק, השמט אותו
- אל תוסיף פסקאות שיווקיות או מחמאות
- השתמש בפרטים הספציפיים שניתנו על המוצר (שם סופר, נוסח, רמת הידור, מה כלול)
- אל תזכיר מזוזה לעולם`;

function buildPrompt(product) {
  const cat = product.category;
  const isKlaf = cat === 'קלפי תפילין';

  const fields = [
    `שם מוצר: ${product.name || ''}`,
    `קטגוריה: ${cat}`,
    `נוסח כתיבה: ${product.style || product.nusach || ''}`,
    `רמת הידור: ${product.level || ''}`,
    `שם הסופר: ${product.soferName || product.sofer || ''}`,
    `מחיר: ${product.price ? `₪${product.price}` : ''}`,
    `תיאור קיים (שגוי — לא להעתיק): ${product.description || ''}`,
    `פרטים נוספים: ${product.details || product.notes || ''}`,
  ].filter(l => l.split(': ')[1]).join('\n');

  const sections = isKlaf
    ? `כתוב תיאור מוצר הכולל את הסעיפים הבאים בדיוק (כל סעיף בשורה חדשה עם כותרת):
**תיאור הקלף** — מה מייחד את הכתיבה ורמת ההידור
**סוג כתיבה** — נוסח וסגנון
**הסופר** — שם הסופר ומה ידוע עליו
**למי מתאים** — 2-3 נקודות קצרות`
    : `כתוב תיאור מוצר הכולל את הסעיפים הבאים בדיוק (כל סעיף בשורה חדשה עם כותרת):
**תיאור התפילין** — מה מייחד את הסט ורמת ההידור
**מה כלול בסט** — פרוט (בתים, רצועות, קלף, בדיקות)
**סוג כתיבה** — נוסח וסגנון
**הסופר** — שם הסופר ומה ידוע עליו
**למי מתאים** — 2-3 נקודות קצרות`;

  return `מידע על המוצר:\n${fields}\n\n${sections}`;
}

async function generateDescription(product) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildPrompt(product) }],
  });
  return response.content[0].text.trim();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`\n🔍 מושך מוצרים מקטגוריות: ${CATEGORIES.join(', ')}`);

  let allProducts = [];

  for (const category of CATEGORIES) {
    const snap = await db.collection('products')
      .where('category', '==', category)
      .get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`   ${category}: ${products.length} מוצרים`);
    allProducts = allProducts.concat(products);
  }

  console.log(`\n📦 סה"כ מוצרים לעדכון: ${allProducts.length}`);
  if (DRY_RUN) console.log('⚠️  DRY RUN — לא כותב ל-Firestore\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (product) => {
      try {
        const newDescription = await generateDescription(product);

        if (DRY_RUN) {
          console.log(`\n--- ${product.name} ---`);
          console.log(newDescription);
        } else {
          await db.collection('products').doc(product.id).update({
            description: newDescription,
            descriptionUpdatedAt: new Date().toISOString(),
            descriptionSource: 'claude-haiku-tefillin-v1',
          });
          console.log(`✅ [${i + batch.indexOf(product) + 1}/${allProducts.length}] ${product.name}`);
        }
        success++;
      } catch (err) {
        console.error(`❌ שגיאה: ${product.name} — ${err.message}`);
        failed++;
      }
    }));

    // המתנה קצרה בין batches כדי לא לעמוס על ה-API
    if (i + BATCH_SIZE < allProducts.length) {
      await sleep(1000);
    }
  }

  console.log(`\n✨ סיום!`);
  console.log(`   הצלחות: ${success}`);
  console.log(`   כשלונות: ${failed}`);
}

main().catch(console.error);
