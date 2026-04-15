/**
 * Prints all documents in sofer_edit_requests collection.
 * Run: node scripts/checkEditRequests.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

async function main() {
  const snap = await db.collection('sofer_edit_requests').orderBy('createdAt', 'desc').get();
  console.log(`\nסה"כ מסמכים ב-sofer_edit_requests: ${snap.size}\n`);

  if (snap.empty) {
    console.log('אין מסמכים בcollection.');
    process.exit(0);
  }

  snap.forEach((d, i) => {
    const data = d.data();
    const date = data.createdAt?.toDate?.()?.toLocaleDateString('he-IL') ?? '—';
    console.log(`── מסמך ${i + 1} ──────────────────────────`);
    console.log(`  id         : ${d.id}`);
    console.log(`  status     : ${data.status}`);
    console.log(`  soferId    : ${data.soferId}`);
    console.log(`  soferDocId : ${data.soferDocId ?? '(חסר)'}`);
    console.log(`  soferName  : ${data.soferName}`);
    console.log(`  createdAt  : ${date}`);
    console.log(`  changes    : ${Object.keys(data.changes ?? {}).join(', ') || '(ריק)'}`);
    console.log();
  });

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
