/**
 * Adds two new categories to Firestore categories collection:
 *   - הגשה ואירוח  (priority 11, parentCategory: מתנות)
 *   - עיצוב הבית   (priority 12, parentCategory: מתנות)
 *
 * Run: node scripts/addNewCategories.mjs
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
  } catch { }
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const NEW_CATEGORIES = [
  {
    slug:           'הגשה ואירוח',
    displayName:    'הגשה ואירוח 🍽️',
    priority:       11,
    parentCategory: 'מתנות',
  },
  {
    slug:           'עיצוב הבית',
    displayName:    'עיצוב הבית 🏠',
    priority:       12,
    parentCategory: 'מתנות',
  },
];

async function main() {
  console.log('\n➕ addNewCategories\n');

  // Load existing slugs
  const snap = await db.collection('categories').get();
  const existing = new Set();
  snap.forEach(doc => {
    const s = doc.data().slug || doc.data().name;
    if (s) existing.add(s);
  });
  console.log(`   ${existing.size} קטגוריות קיימות`);

  for (const cat of NEW_CATEGORIES) {
    if (existing.has(cat.slug)) {
      console.log(`   ⏭️  כבר קיים: ${cat.slug}`);
      continue;
    }
    await db.collection('categories').add({
      ...cat,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`   ✅ נוסף: ${cat.displayName}`);
  }

  console.log('\n✅ סיום!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
