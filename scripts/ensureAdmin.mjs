/**
 * Checks if yosef21me@gmail.com exists in the admins collection.
 * If not found — creates the document.
 * Run: node scripts/ensureAdmin.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Load .env.local ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const envVars = {};
let currentKey = null, currentValue = [];
for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!m) continue;
    currentKey = m[1]; currentValue = [m[2]];
  } else {
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      envVars[currentKey] = currentValue.join('\n');
      const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      currentKey = m[1]; currentValue = [m[2]];
    } else { currentValue.push(line.trimEnd()); }
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

const projectId   = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase credentials in .env.local'); process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const TARGET_EMAIL = 'yosef21me@gmail.com';

async function main() {
  console.log(`Searching admins collection for email: ${TARGET_EMAIL} ...\n`);

  // Query by email field
  const snap = await db.collection('admins').where('email', '==', TARGET_EMAIL).get();

  if (!snap.empty) {
    snap.forEach(doc => {
      console.log(`✅ מסמך קיים כבר:`);
      console.log(`   ID   : ${doc.id}`);
      console.log(`   data : ${JSON.stringify(doc.data())}`);
    });
    process.exit(0);
  }

  // Not found — create it
  console.log('לא נמצא. יוצר מסמך חדש...\n');
  const ref = await db.collection('admins').add({
    email: TARGET_EMAIL,
    name:  'יוסף חיים',
    role:  'admin',
  });

  console.log(`✅ מסמך נוצר בהצלחה!`);
  console.log(`   ID    : ${ref.id}`);
  console.log(`   email : ${TARGET_EMAIL}`);
  console.log(`   name  : יוסף חיים`);
  console.log(`   role  : admin`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
