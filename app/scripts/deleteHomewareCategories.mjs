/**
 * deleteHomewareCategories.mjs
 *
 * מוחק את כל המוצרים מקטגוריות:
 *   - עיצוב הבית
 *   - כלי שולחן והגשה
 *
 * תבנית: גיבוי → dry-run → אישור → מחיקה בסבתות → אימות
 *
 * Usage:
 *   node app/scripts/deleteHomewareCategories.mjs           ← dry-run
 *   node app/scripts/deleteHomewareCategories.mjs --execute ← מחיקה בפועל
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');

// ── Load env ────────────────────────────────────────────────────────────────
try {
  const env = readFileSync(envPath, 'utf-8');
  let key = null, val = [], multi = false;
  for (const line of env.split('\n')) {
    if (!multi && line.includes('=')) {
      const eq   = line.indexOf('=');
      key        = line.slice(0, eq).trim();
      const rest = line.slice(eq + 1);
      if (rest.includes('-----BEGIN')) { multi = true; val = [rest]; }
      else { process.env[key] = rest.trim(); key = null; }
    } else if (multi) {
      val.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[key] = val.join('\n').trim();
        multi = false; key = null; val = [];
      }
    }
  }
} catch { /* rely on existing env */ }

const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ חסרים משתני סביבה (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)');
  process.exit(1);
}
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const EXECUTE = process.argv.includes('--execute');
const CATS_TO_DELETE = ['עיצוב הבית', 'כלי שולחן והגשה'];
const BATCH_SIZE = 400;

// ── Step 1: Load ─────────────────────────────────────────────────────────────
console.log('⏳ טוען מוצרים...');
const snap = await db.collection('products').get();
const toDelete = [];

snap.forEach(doc => {
  const cat = doc.data().cat || doc.data().category || '';
  if (CATS_TO_DELETE.includes(cat)) toDelete.push({ id: doc.id, data: doc.data() });
});

console.log(`סה"כ מוצרים בטעינה: ${snap.size}`);
console.log(`מוצרים לפי קטגוריה:`);
CATS_TO_DELETE.forEach(c => {
  console.log(`  "${c}": ${toDelete.filter(p => (p.data.cat || p.data.category) === c).length}`);
});
console.log(`\nסה"כ למחיקה: ${toDelete.length}`);

if (toDelete.length === 0) {
  console.log('✅ אין מה למחוק.');
  process.exit(0);
}

// ── Step 2: Backup ────────────────────────────────────────────────────────────
const ts = new Date().toISOString().slice(0, 10);
const backupPath = resolve(__dir, `backup-homeware-${ts}.json`);
writeFileSync(backupPath, JSON.stringify(toDelete.map(p => ({ id: p.id, ...p.data })), null, 2));
console.log(`\n💾 גיבוי נשמר: ${backupPath}`);

// ── Step 3: Dry-run / Execute ────────────────────────────────────────────────
if (!EXECUTE) {
  console.log('\n⚠️  DRY-RUN בלבד — לא נמחק כלום.');
  console.log('   להרצת מחיקה בפועל: node app/scripts/deleteHomewareCategories.mjs --execute');
  process.exit(0);
}

// ── Step 4: Delete in batches ────────────────────────────────────────────────
console.log('\n🗑️  מוחק בסבתות...');
let deleted = 0;
for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
  const chunk = toDelete.slice(i, i + BATCH_SIZE);
  const batch = db.batch();
  chunk.forEach(p => batch.delete(db.collection('products').doc(p.id)));
  await batch.commit();
  deleted += chunk.length;
  console.log(`  ${deleted}/${toDelete.length} נמחקו`);
}

// ── Step 5: Verify ────────────────────────────────────────────────────────────
console.log('\n🔍 מאמת...');
const after = await db.collection('products').get();
console.log(`מוצרים לפני: ${snap.size}`);
console.log(`מוצרים אחרי: ${after.size}`);
console.log(`הופחתו: ${snap.size - after.size} (צפוי: ${toDelete.length})`);

CATS_TO_DELETE.forEach(c => {
  const remaining = after.docs.filter(d => (d.data().cat || d.data().category) === c).length;
  console.log(`  "${c}" שנותר: ${remaining}`);
});

console.log(`\n✅ הושלם. גיבוי שמור ב: ${backupPath}`);
process.exit(0);
