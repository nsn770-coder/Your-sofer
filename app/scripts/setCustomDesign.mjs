/**
 * setCustomDesign.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets customDesign: true on the 4 designable kippah products.
 *
 * Usage:
 *   DRY-RUN (default — no writes):
 *     node app/scripts/setCustomDesign.mjs
 *
 *   EXECUTE (real writes):
 *     node app/scripts/setCustomDesign.mjs --execute
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync }                 from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const IS_EXECUTE = process.argv.includes('--execute');

const PRODUCT_IDS = [
  'FK0yaNwyqxt7io0J0uHO',
  'GANILLKK6zvFHLwpaN63',
  'XBOeXmrIzxmwPGeMgcis',
  'aSbBHKvoUblLztzAKLzn',
];

// ── Load .env.local (same pattern as all other admin scripts) ─────────────────

function loadEnvLocal() {
  try {
    const raw   = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
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
  } catch { /* .env.local may not exist in CI */ }
}
loadEnvLocal();

// ── Init Firebase Admin ────────────────────────────────────────────────────────

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    // Fallback: local service account key (same file used by other admin scripts)
    const sa = JSON.parse(readFileSync(resolve(__dirname, 'serviceAccountKey.json'), 'utf8'));
    initializeApp({ credential: cert(sa) });
  }
}
const db = getFirestore();
try { db.settings({ preferRest: true }); } catch { /* already initialized */ }

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(IS_EXECUTE ? '⚡ EXECUTE MODE — writing to Firestore' : '🔍 DRY-RUN — no writes (add --execute to apply)');
  console.log('─'.repeat(60));

  let ok = 0, missing = 0, already = 0;

  for (const id of PRODUCT_IDS) {
    const ref  = db.collection('products').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`❌ ${id} — NOT FOUND`);
      missing++;
      continue;
    }

    const data = snap.data();
    const current = data.customDesign === true;
    console.log(`${current ? '✓ (already true)' : '→ will set customDesign: true'} | ${id} | cat="${data.cat ?? '?'}" | "${data.name ?? '?'}"`);

    if (current) { already++; continue; }

    if (IS_EXECUTE) {
      await ref.update({ customDesign: true });
      console.log(`   ✅ updated`);
    }
    ok++;
  }

  console.log('─'.repeat(60));
  console.log(`Summary: ${ok} ${IS_EXECUTE ? 'updated' : 'to update'}, ${already} already true, ${missing} not found (of ${PRODUCT_IDS.length})`);
  if (!IS_EXECUTE) console.log('Run again with --execute to apply.');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
