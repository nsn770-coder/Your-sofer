/**
 * Phase 1 — additive phoneE164 backfill.
 *
 * Computes a canonical E.164 `phoneE164` field on existing documents in
 * `orders`, `crmLeads`, and `whatsappConversations`, without renaming,
 * deleting, or otherwise touching any existing field or document ID.
 *
 * Idempotent: re-running it converges to the same result — a document whose
 * stored `phoneE164` already matches the freshly-computed value is skipped
 * (not rewritten), so running this multiple times is always safe.
 *
 * SAFETY: dry-run by default. No Firestore writes happen unless --live is
 * passed explicitly, matching this repo's existing convention (see
 * scripts/grantAdmin.mjs).
 *
 *   node scripts/backfillPhoneE164.mjs                # dry run, all collections
 *   node scripts/backfillPhoneE164.mjs --live          # real writes, all collections
 *   node scripts/backfillPhoneE164.mjs --only=crmLeads # limit to one collection
 *   node scripts/backfillPhoneE164.mjs --limit=50      # cap docs scanned per collection (testing)
 *
 * NOTE (Phase 1 report): this script intentionally duplicates the parsing
 * logic in lib/phone.ts as plain JS, since it's a standalone Node script with
 * no TypeScript build step (matching how every other one-off script in this
 * repo already works). Keep the two in sync if normalizePhone() ever changes.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const onlyArg = args.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice('--only='.length) : null;
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : null;

// ── Env + Admin SDK init (env-first, JSON-file fallback — see Phase 1 audit) ─

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {
    /* .env.local not present — rely on real environment variables */
  }
}
loadEnvLocal();

if (!getApps().length) {
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer', clientEmail, privateKey }),
    });
  } else {
    const sa = JSON.parse(
      readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'),
    );
    initializeApp({ credential: cert(sa) });
  }
}
const db = getFirestore();

// ── normalizePhone — kept in sync with lib/phone.ts ─────────────────────────

const MIN_E164_DIGITS = 8;
const MAX_E164_DIGITS = 15;

function normalizePhone(raw, defaultCountry = '972') {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  if (!cleaned) return null;
  if (!/^\+?\d+$/.test(cleaned)) return null;

  const hasPlus = cleaned.startsWith('+');
  let digits = hasPlus ? cleaned.slice(1) : cleaned;
  if (!digits) return null;

  if (hasPlus) {
    // already E.164 shape
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountry + digits.slice(1);
  } else if (digits.length <= 10) {
    digits = defaultCountry + digits;
  }

  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) return null;
  return '+' + digits;
}

// ── Per-collection backfill ──────────────────────────────────────────────────

const COLLECTIONS = [
  { name: 'orders', rawPhoneField: 'phone', fallbackToDocId: false },
  { name: 'crmLeads', rawPhoneField: 'phone', fallbackToDocId: true },
  { name: 'whatsappConversations', rawPhoneField: 'phone', fallbackToDocId: true },
];

async function backfillCollection({ name, rawPhoneField, fallbackToDocId }) {
  console.log(`\n── ${name} ──`);
  let snap = await db.collection(name).get();
  let docs = snap.docs;
  if (LIMIT) docs = docs.slice(0, LIMIT);

  let scanned = 0;
  let wouldUpdate = 0;
  let alreadyCorrect = 0;
  let noPhone = 0;
  const unparseable = [];

  let batch = db.batch();
  let batchCount = 0;
  const BATCH_LIMIT = 400;

  for (const doc of docs) {
    scanned++;
    const data = doc.data();
    const rawPhone = data[rawPhoneField] ?? (fallbackToDocId ? doc.id : undefined);

    if (!rawPhone) {
      noPhone++;
      continue;
    }

    const phoneE164 = normalizePhone(rawPhone);
    if (!phoneE164) {
      unparseable.push({ id: doc.id, rawPhone: String(rawPhone) });
      continue;
    }

    if (data.phoneE164 === phoneE164) {
      alreadyCorrect++;
      continue;
    }

    wouldUpdate++;
    if (LIVE) {
      batch.set(doc.ref, { phoneE164 }, { merge: true });
      batchCount++;
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (LIVE && batchCount > 0) {
    await batch.commit();
  }

  console.log(`  scanned:          ${scanned}`);
  console.log(`  ${LIVE ? 'updated' : 'would update'}:     ${wouldUpdate}`);
  console.log(`  already correct:  ${alreadyCorrect}`);
  console.log(`  no phone field:   ${noPhone}`);
  console.log(`  unparseable:      ${unparseable.length}`);
  if (unparseable.length > 0) {
    console.log('  unparseable examples (first 20, for manual review):');
    for (const ex of unparseable.slice(0, 20)) {
      console.log(`    - doc ${ex.id}: raw phone = ${JSON.stringify(ex.rawPhone)}`);
    }
  }

  return { name, scanned, wouldUpdate, alreadyCorrect, noPhone, unparseable: unparseable.length };
}

async function main() {
  console.log(LIVE ? '=== LIVE RUN — writes will be committed ===' : '=== DRY RUN — no writes will be performed ===');
  if (ONLY) console.log(`(limited to collection: ${ONLY})`);
  if (LIMIT) console.log(`(limited to first ${LIMIT} docs per collection)`);

  const targets = ONLY ? COLLECTIONS.filter((c) => c.name === ONLY) : COLLECTIONS;
  if (targets.length === 0) {
    console.error(`No matching collection for --only=${ONLY}`);
    process.exit(1);
  }

  const results = [];
  for (const target of targets) {
    results.push(await backfillCollection(target));
  }

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(
      `${r.name}: scanned=${r.scanned} ${LIVE ? 'updated' : 'wouldUpdate'}=${r.wouldUpdate} alreadyCorrect=${r.alreadyCorrect} noPhone=${r.noPhone} unparseable=${r.unparseable}`,
    );
  }
  if (!LIVE) {
    console.log('\nThis was a dry run. Re-run with --live to write phoneE164 fields.');
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('backfillPhoneE164 failed:', err);
  process.exit(1);
});
