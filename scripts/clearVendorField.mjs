/**
 * Deletes the `vendor` field from specific product documents using FieldValue.delete().
 * Run: node scripts/clearVendorField.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Load .env.local ──────────────────────────────────────────────────────────
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

const projectId   = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE credentials in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── IDs to update ────────────────────────────────────────────────────────────
const IDS = [
  '2KDCMIFxAWUQMCrDgaIX',
  '3c3LGSq4tjq5wMwePuma',
  'CwgNCYIYFtdNUl0Parpq',
  'GiU4OdtgARrxFXThmGjT',
  'K3lUMe7K2geTJl5vPx6Y',
  'KioKTmxSvI8HWgklhKG0',
  'LtZ8AHRuQJDBfzNKc6eU',
  'bWMDW0cRKflz37iyntfN',
  'cAlZUKRXkbJlcOSKzBsk',
  'enSWZprGCl4udFN75O7o',
  'hdIVcbPvuUoNffH7YXyf',
  'hwnX0SuhEqmtnzXIAqLg',
  'lA0aRYrtyt910GWE9Qv5',
  'lOvMb2r1eVJYvep0UKKq',
  'v24WCFzqf1gMIQ7uGNlz',
  'yhq7ZVE1SCUWadhtvWmA',
  'z2cWMHDFZdlHwAZjQrWK',
];

async function main() {
  console.log(`Deleting vendor field from ${IDS.length} products...\n`);

  let ok = 0;
  let fail = 0;

  for (const id of IDS) {
    try {
      await db.collection('products').doc(id).update({ vendor: FieldValue.delete() });
      console.log(`  ✓ ${id}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${id} — ${err.message}`);
      fail++;
    }
  }

  console.log(`\nסיום: ${ok} הצליחו, ${fail} נכשלו.`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
