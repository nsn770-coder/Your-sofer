/**
 * READ-ONLY — tests Firestore CLIENT SDK (with security rules) for new-home.
 * Mimics exactly what MomentClient.tsx does in the browser.
 * Run: node scripts/debugMomentClient.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key) env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key) env[key] = val.trim();
  } catch {}
  return env;
}
const ENV = loadEnv();

// ── Firebase client SDK config (same as firebase-app.ts) ─────────────────────
// projectId: prefers NEXT_PUBLIC_FIREBASE_PROJECT_ID, falls back to FIREBASE_PROJECT_ID
const firebaseConfig = {
  apiKey:     ENV.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'your-sofer.firebaseapp.com',
  projectId:  ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID  ?? ENV.FIREBASE_PROJECT_ID ?? 'your-sofer',
  storageBucket:    ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:      ENV.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('\n=== Firebase client config (masked) ===');
console.log('  projectId:', firebaseConfig.projectId);
console.log('  apiKey:   ', firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0,12) + '…' : '(missing)');
console.log('  authDomain:', firebaseConfig.authDomain);
console.log('');

// ── Init client SDK ───────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

// ── new-home relatedCategories (verbatim from data/lifeEvents.ts) ─────────────
const relatedCategories = [
  { category: 'קלפי מזוזה',   subCategories: 'all' },
  { category: 'בתי מזוזה',    subCategories: 'all' },
  { category: 'עיצוב הבית',   subCategories: ['אגרטלים', 'מראות', 'מסגרות תמונה', 'עיטורים וזרים'] },
];

const uniqueCats = [...new Set(relatedCategories.map(cf => cf.category))];

console.log('=== debugMomentClient: new-home ===');
console.log('uniqueCats:', uniqueCats, '\n');

async function main() {
  // ── Step 1: getDocs (CLIENT SDK — rules apply) ────────────────────────────
  console.log('── Step 1: getDocs (client SDK, rules apply) ────────────────');
  const snapshots = [];
  for (const cat of uniqueCats) {
    try {
      const snap = await getDocs(query(collection(db, 'products'), where('cat', '==', cat)));
      console.log(`  cat="${cat}" → ${snap.docs.length} docs`);
      snapshots.push({ cat, snap, error: null });
    } catch (err) {
      console.error(`  cat="${cat}" → ERROR: ${err.code ?? err.message}`);
      if (err.code) console.error(`  full error:`, err);
      snapshots.push({ cat, snap: null, error: err });
    }
  }

  const anyError = snapshots.some(s => s.error);
  if (anyError) {
    console.log('\n❌ At least one query failed — security rules likely blocking client reads.');
    console.log('   Admin SDK returned 747, so data exists. This confirms a rules issue.');
    process.exit(0);
  }

  const totalRaw = snapshots.reduce((s, { snap }) => s + snap.docs.length, 0);
  console.log(`  TOTAL raw docs: ${totalRaw}`);

  // ── Steps 2–4: mirror MomentClient filtering logic ────────────────────────
  console.log('\n── Steps 2–4: filter trace ──────────────────────────────────');

  const catSubMap = new Map();
  for (const cf of relatedCategories) {
    if (cf.subCategories === 'all') {
      catSubMap.set(cf.category, 'all');
    } else {
      catSubMap.set(cf.category, new Set(cf.subCategories));
    }
  }

  const seen = new Set();
  const all  = [];

  for (const { cat, snap } of snapshots) {
    const allowedSubs = catSubMap.get(cat);
    let afterHidden = 0, afterSub = 0;

    for (const docSnap of snap.docs) {
      if (seen.has(docSnap.id)) continue;
      const p = docSnap.data();

      if (p.hidden === true) continue;
      afterHidden++;

      if (allowedSubs !== 'all') {
        if (!p.subCategory || !(allowedSubs).has(p.subCategory)) continue;
      }
      afterSub++;

      seen.add(docSnap.id);
      all.push({ id: docSnap.id, ...p });
    }

    const subsLabel = allowedSubs === 'all' ? "'all'" : `[${[...allowedSubs].join(', ')}]`;
    console.log(`  cat="${cat}" allowedSubs=${subsLabel}`);
    console.log(`    raw: ${snap.docs.length}  after-hidden: ${afterHidden}  after-subCat: ${afterSub}`);
  }

  console.log(`\n── Final ─────────────────────────────────────────────────────`);
  console.log(`  after dedup: ${all.length}  (admin SDK got 747)`);

  if (all.length === 0 && totalRaw > 0) {
    console.log('\n⚠  getDocs returned docs but filtering wiped them all.');
    console.log('  Check: hidden field values and subCategory field values in client data.');
    // Show a sample raw doc to compare
    const sample = snapshots[0].snap.docs[0]?.data();
    if (sample) {
      console.log('\n  Sample doc fields:', Object.keys(sample).sort().join(', '));
      console.log('  Sample hidden:', sample.hidden, '| subCategory:', sample.subCategory ?? '(missing)');
    }
  } else if (all.length > 0) {
    console.log('\n✓  Client SDK filtering works correctly.');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Unhandled error:', err.code ?? err.message, err);
  process.exit(1);
});
