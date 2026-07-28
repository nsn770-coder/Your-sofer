/**
 * READ-ONLY + BACKUP — גיבוי ותצוגה מקדימה של מוצרי כיפות ב-₪8.97
 * לא כותב שום דבר ל-Firestore.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  let currentKey = null, currentVal = [], inMultiline = false;
  for (const line of envContent.split('\n')) {
    if (!inMultiline && line.includes('=')) {
      const eqIdx = line.indexOf('=');
      currentKey  = line.slice(0, eqIdx).trim();
      const rest  = line.slice(eqIdx + 1);
      if (rest.includes('-----BEGIN')) { inMultiline = true; currentVal = [rest]; }
      else { process.env[currentKey] = rest.trim(); currentKey = null; }
    } else if (inMultiline) {
      currentVal.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[currentKey] = currentVal.join('\n').trim();
        inMultiline = false; currentKey = null; currentVal = [];
      }
    }
  }
} catch { /* rely on existing env */ }

const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
if (!projectId || !clientEmail || !privateKey) { console.error('❌ חסרים משתני סביבה'); process.exit(1); }
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// שליפת כל מוצרי כיפות ב-₪8.97
const snap = await db.collection('products')
  .where('cat', '==', 'כיפות')
  .where('price', '==', 8.97)
  .get();

console.log(`\n=== תצוגה מקדימה ===`);
console.log(`מוצרי כיפות עם price === 8.97: ${snap.size}`);

// גיבוי JSON
const backup = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const dateStr = new Date().toISOString().slice(0, 10);
const backupPath = resolve(__dir, `backup-897-${dateStr}.json`);
writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
console.log(`\n✅ גיבוי נשמר → ${backupPath}`);

// 5 דוגמאות
console.log('\n5 דוגמאות ראשונות:');
snap.docs.slice(0, 5).forEach(d => {
  const p = d.data();
  console.log(`  [${d.id}]  price: ₪${p.price}  name: ${(p.name ?? '').slice(0, 50)}`);
});

console.log(`\n✏️  השינוי המתוכנן: price 8.97 → 9.00 (שדה אחד בלבד, ${snap.size} מסמכים)`);
console.log('⚠️  הסקריפט לא שינה שום דבר — ממתין לאישור.');
process.exit(0);
