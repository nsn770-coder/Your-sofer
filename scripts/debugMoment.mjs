/**
 * READ-ONLY debug script — mirrors MomentClient.tsx filtering logic exactly.
 * Runs with admin SDK to isolate whether the bug is in the logic or client-side rules.
 * Run: node scripts/debugMoment.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
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
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── new-home relatedCategories (copied verbatim from data/lifeEvents.ts) ──────
const EVENT_ID = 'new-home';
const relatedCategories = [
  { category: 'קלפי מזוזה',   subCategories: 'all' },
  { category: 'בתי מזוזה',    subCategories: 'all' },
  { category: 'עיצוב הבית',   subCategories: ['אגרטלים', 'מראות', 'מסגרות תמונה', 'עיטורים וזרים'] },
];

async function main() {
  console.log(`\n=== debugMoment: ${EVENT_ID} ===\n`);

  // ── Step 1: getDocs per cat (mirrors Promise.all in MomentClient) ─────────
  const uniqueCats = [...new Set(relatedCategories.map(cf => cf.category))];
  console.log('uniqueCats:', uniqueCats);

  const snapshots = await Promise.all(
    uniqueCats.map(cat => db.collection('products').where('cat', '==', cat).get())
  );

  console.log('\n── Step 1: getDocs raw results ──────────────────────────────');
  snapshots.forEach((snap, i) => {
    console.log(`  cat="${uniqueCats[i]}" → ${snap.docs.length} docs`);
  });
  const totalRaw = snapshots.reduce((s, snap) => s + snap.docs.length, 0);
  console.log(`  TOTAL raw docs: ${totalRaw}`);

  // ── Build catSubMap (same logic as MomentClient) ──────────────────────────
  const catSubMap = new Map();
  for (const cf of relatedCategories) {
    if (cf.subCategories === 'all') {
      catSubMap.set(cf.category, 'all');
    } else {
      const existing = catSubMap.get(cf.category);
      if (existing === 'all') continue;
      if (!existing) {
        catSubMap.set(cf.category, new Set(cf.subCategories));
      } else {
        for (const s of cf.subCategories) existing.add(s);
      }
    }
  }

  console.log('\n── Step 2–4: per-cat filter trace ───────────────────────────');
  const seen = new Set();
  const all = [];

  for (let i = 0; i < uniqueCats.length; i++) {
    const cat = uniqueCats[i];
    const allowedSubs = catSubMap.get(cat);
    const raw = snapshots[i].docs;

    // Step 2: hidden filter
    const afterHidden = raw.filter(d => d.data().hidden !== true);

    // Step 3: subCategory filter
    let afterSub;
    if (allowedSubs === 'all') {
      afterSub = afterHidden;
    } else {
      afterSub = afterHidden.filter(d => {
        const sub = d.data().subCategory;
        return sub && allowedSubs.has(sub);
      });

      // Show subCategory distribution for this cat (to spot mismatches)
      const subDist = {};
      for (const d of afterHidden) {
        const sub = d.data().subCategory ?? '(ללא)';
        subDist[sub] = (subDist[sub] ?? 0) + 1;
      }
      console.log(`\n  cat="${cat}" | allowedSubs: [${[...allowedSubs].join(', ')}]`);
      console.log(`  subCategory distribution in Firestore:`);
      Object.entries(subDist).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
        const match = allowedSubs.has(k) ? '✓' : '✗';
        console.log(`    ${match} "${k}": ${v}`);
      });
    }

    // Step 4: dedup
    let countDeduped = 0;
    for (const d of afterSub) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        all.push({ id: d.id, ...d.data() });
        countDeduped++;
      }
    }

    const subsLabel = allowedSubs === 'all' ? "'all'" : `[${[...allowedSubs].join(',')}]`;
    console.log(`\n  cat="${cat}" allowedSubs=${subsLabel}`);
    console.log(`    step1 raw:          ${raw.length}`);
    console.log(`    step2 after-hidden: ${afterHidden.length}`);
    console.log(`    step3 after-subCat: ${afterSub.length}`);
    console.log(`    step4 after-dedup:  ${countDeduped}`);
  }

  console.log('\n── Final ────────────────────────────────────────────────────');
  console.log(`  Total after all steps: ${all.length}`);
  console.log(`  (expected ~747)\n`);

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
