/**
 * updateCategoryBanners.mjs
 * Updates imageUrl for 6 specific categories in Firestore.
 * Matches docs by id, slug, OR name field. Updates ALL matching docs per name.
 * Never creates new docs. Never touches other fields.
 */

import { readFileSync }                 from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../../.env.local'), 'utf8');
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
  } catch { /* ignore */ }
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── Target mapping ────────────────────────────────────────────────────────────
const UPDATES = {
  'יודאיקה':        'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805780/%D7%A9%D7%91%D7%AA_rrjykd.png',
  'בתי מזוזה':      'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805834/%D7%91%D7%AA%D7%99_%D7%9E%D7%96%D7%95%D7%96%D7%94_tbgtir.png',
  'פסח':            'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805780/%D7%A4%D7%A1%D7%97_a9tvtd.png',
  'נטלות':          'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805780/%D7%A0%D7%98%D7%9C%D7%95%D7%AA_cldwcy.png',
  'חנוכה':          'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805780/%D7%97%D7%A0%D7%95%D7%9B%D7%99%D7%94_h2uwiq.png',
  'סט טלית תפילין': 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780805779/Gemini_Generated_Image__1_tmz9wy.png',
};

// ── Read all category docs ────────────────────────────────────────────────────
const snap = await db.collection('categories').get();
const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

console.log(`📦 ${allDocs.length} מסמכי קטגוריה סה"כ\n`);
console.log('─'.repeat(60));

// ── Match docs to each target name ────────────────────────────────────────────
// A doc matches a target name if its id, slug, OR name field equals the target.
const matchMap = new Map(); // targetName → [matchingDocs]
for (const targetName of Object.keys(UPDATES)) {
  const matches = allDocs.filter(d =>
    d.id   === targetName ||
    d.slug === targetName ||
    d.name === targetName
  );
  matchMap.set(targetName, matches);
}

// ── Phase 1: Validation report ────────────────────────────────────────────────
console.log('🔍 שלב 1 — אימות (לפני כתיבה)\n');

const allKnownNames = [...new Set(allDocs.flatMap(d =>
  [d.id, d.slug, d.name].filter(Boolean)
))].sort();

let hasWarning = false;
for (const [name, matches] of matchMap) {
  if (matches.length === 0) {
    console.log(`⚠️  "${name}" — לא נמצא אף מסמך תואם`);
    hasWarning = true;
  } else {
    console.log(`✅ "${name}" — נמצאו ${matches.length} מסמכ${matches.length > 1 ? 'ים' : ''}:`);
    for (const d of matches) {
      const cur = d.imageUrl || d.imgUrl || '(ריק)';
      console.log(`   ID="${d.id}" | imageUrl נוכחי: ${cur.slice(0, 70)}`);
    }
  }
}

if (hasWarning) {
  console.log('\n📋 כל השמות הקיימים ב-collection:');
  for (const n of allKnownNames) console.log(`   • ${n}`);
}

// ── Phase 2: Write ────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log('✏️  שלב 2 — עדכון\n');

let updated = 0;
for (const [name, matches] of matchMap) {
  if (matches.length === 0) {
    console.log(`⏭️  "${name}" — מדולג (לא נמצא)`);
    continue;
  }
  const newUrl = UPDATES[name];
  for (const d of matches) {
    try {
      await db.collection('categories').doc(d.id).update({ imageUrl: newUrl });
      console.log(`✅ "${name}" (ID="${d.id}") עודכן`);
      updated++;
    } catch (e) {
      console.log(`❌ "${name}" (ID="${d.id}") — שגיאה: ${e.message}`);
    }
  }
}

console.log(`\n✓ עודכנו ${updated} מסמכים`);
process.exit(0);
