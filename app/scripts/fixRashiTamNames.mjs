/**
 * WRITE — מתקן שמות רש"י ר"ת ב-2 מוצרים בלבד.
 * משתמש ב-Admin SDK (כמו שאר סקריפטי הכתיבה בפרויקט).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Load .env.local ──────────────────────────────────────────────────────────
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
      if (rest.includes('-----BEGIN')) {
        inMultiline = true; currentVal = [rest];
      } else {
        process.env[currentKey] = rest.trim(); currentKey = null;
      }
    } else if (inMultiline) {
      currentVal.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[currentKey] = currentVal.join('\n').trim();
        inMultiline = false; currentKey = null; currentVal = [];
      }
    }
  }
} catch { /* rely on existing env */ }

// ── Init Admin ───────────────────────────────────────────────────────────────
const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ חסרים: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  process.exit(1);
}
if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── תיקונים — 2 מוצרים בלבד ─────────────────────────────────────────────────
const FIXES = [
  { id: '47vPam6IGCNv4DYe4sMp', pattern: /רש[״"]?יתם|רשי[״"]?תם/g },
  { id: 'BytNVLipUibuIfEMeCE4',  pattern: /רש[״"]?יתם|רשיתם/g      },
];
const REPLACEMENT = 'רש"י ר"ת';

for (const { id, pattern } of FIXES) {
  const snap    = await db.collection('products').doc(id).get();
  const current = snap.data()?.name ?? '';
  const updated = current.replace(pattern, REPLACEMENT);

  if (current === updated) {
    console.log(`⚠️  [${id}] דפוס לא תואם — לא עודכן`);
    continue;
  }

  await db.collection('products').doc(id).update({ name: updated });
  console.log(`✅ [${id}]`);
  console.log(`   לפני: ${current}`);
  console.log(`   אחרי: ${updated}`);
}

console.log('\nסיום — נוגע ב-2 מוצרים בלבד.');
process.exit(0);
