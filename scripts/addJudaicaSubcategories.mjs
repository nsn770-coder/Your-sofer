/**
 * Adds judaica subcategories to Firestore categories collection.
 * Run: node scripts/addJudaicaSubcategories.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const NEW_CATS = [
  { slug: 'נטילת ידיים',  displayName: 'נטילת ידיים 🤲', priority: 1, parentCategory: 'יודאיקה' },
  { slug: 'שבת',          displayName: 'שבת ✨',           priority: 2, parentCategory: 'יודאיקה' },
  { slug: 'חגים',         displayName: 'חגים 🕍',          priority: 3, parentCategory: 'יודאיקה' },
  { slug: 'חנוכה',        displayName: 'חנוכה 🕎',         priority: 1, parentCategory: 'חגים'    },
  { slug: 'פסח',          displayName: 'פסח 🍷',           priority: 2, parentCategory: 'חגים'    },
  { slug: 'סטים ומארזים', displayName: 'סטים ומארזים 🎁',  priority: 4, parentCategory: 'יודאיקה' },
  { slug: 'יודאיקה כללי', displayName: 'יודאיקה כללי ✡️', priority: 5, parentCategory: 'יודאיקה' },
];

async function main() {
  console.log('\n➕ addJudaicaSubcategories\n');

  const snap = await db.collection('categories').get();
  const existing = new Set(snap.docs.map(d => d.data().slug || d.data().name).filter(Boolean));
  console.log(`   ${existing.size} קטגוריות קיימות\n`);

  for (const cat of NEW_CATS) {
    if (existing.has(cat.slug)) {
      console.log(`   ⏭️  כבר קיים: ${cat.slug}`);
    } else {
      await db.collection('categories').add({ ...cat, createdAt: FieldValue.serverTimestamp() });
      console.log(`   ✅ נוסף: ${cat.displayName}  (parent: ${cat.parentCategory})`);
    }
  }

  console.log('\n✅ סיום!\n');
  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
