/**
 * Search all products for "רקמת המלך" or "ריקמת המלך" in:
 *   name, desc, description, vendor, supplier, brand
 *
 * Run: node scripts/findRikamatHamelech.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const projectId  = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

// ─── Init Admin SDK ───────────────────────────────────────────────────────────
initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── Config ───────────────────────────────────────────────────────────────────
const TERMS  = ['רקמת המלך', 'ריקמת המלך'];
const FIELDS = ['name', 'desc', 'description', 'vendor', 'supplier', 'brand'];
const BATCH  = 500; // docs per page

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Scanning products collection...\n');

  const matches = [];   // { serial, id, name, field, term }
  let   fetched = 0;
  let   cursor  = null;

  // Paginate through all products
  while (true) {
    let q = db.collection('products').orderBy('__name__').limit(BATCH);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    if (snap.empty) break;

    cursor  = snap.docs[snap.docs.length - 1];
    fetched += snap.docs.length;

    for (const doc of snap.docs) {
      const data = doc.data();
      const foundIn = [];

      for (const field of FIELDS) {
        const val = data[field];
        if (typeof val !== 'string') continue;
        for (const term of TERMS) {
          if (val.includes(term)) {
            foundIn.push({ field, term });
            break; // one match per field is enough
          }
        }
      }

      if (foundIn.length > 0) {
        matches.push({
          id:     doc.id,
          name:   data.name ?? '—',
          fields: foundIn,
        });
      }
    }

    process.stdout.write(`\r  fetched ${fetched} docs, found ${matches.length} so far...`);

    if (snap.docs.length < BATCH) break; // last page
  }

  console.log(`\n\nסרקו ${fetched} מוצרים סה"כ.\n`);

  if (matches.length === 0) {
    console.log('לא נמצאו מוצרים המכילים את המונחים המבוקשים.');
    process.exit(0);
  }

  console.log(`נמצאו ${matches.length} מוצרים:\n`);
  console.log('─'.repeat(90));

  matches.forEach((m, i) => {
    const fieldSummary = m.fields.map(f => `${f.field} ("${f.term}")`).join(', ');
    const num  = String(i + 1).padStart(3, ' ');
    const name = m.name.length > 45 ? m.name.slice(0, 44) + '…' : m.name.padEnd(45);
    console.log(`${num}. ${name}  ID: ${m.id}`);
    console.log(`      שדה: ${fieldSummary}`);
  });

  console.log('─'.repeat(90));
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
