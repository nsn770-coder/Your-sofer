/**
 * Finds a sofer by email and prints all fields.
 * Run: node scripts/getSofer.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
let currentKey = null;
let currentValue = [];

for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!match) continue;
    currentKey = match[1];
    currentValue = [match[2]];
  } else {
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
      envVars[currentKey] = currentValue.join('\n');
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      currentKey = match[1];
      currentValue = [match[2]];
    } else {
      currentValue.push(line.trimEnd());
    }
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

const projectId = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

const EMAIL = 'worldofchasidut@gmail.com';

const snap = await db.collection('soferim').where('email', '==', EMAIL).get();

if (snap.empty) {
  console.log(`No sofer found with email: ${EMAIL}`);
  process.exit(0);
}

snap.docs.forEach((doc, i) => {
  console.log(`\n=== Sofer #${i + 1} [id: ${doc.id}] ===`);
  const data = doc.data();
  for (const [key, val] of Object.entries(data).sort(([a], [b]) => a.localeCompare(b))) {
    const display = val && typeof val === 'object' && val._seconds !== undefined
      ? new Date(val._seconds * 1000).toISOString()
      : JSON.stringify(val);
    console.log(`  ${key}: ${display}`);
  }
});

process.exit(0);
