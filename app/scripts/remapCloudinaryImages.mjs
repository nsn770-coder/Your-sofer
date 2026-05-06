/**
 * remapCloudinaryImages.mjs
 * Re-maps AI-generated Cloudinary images to the correct Firestore fields
 * based on filename pattern (_lifestyle_, _studio_, _human_, _review_).
 *
 * Field mapping:
 *   _lifestyle_ → imgUrl
 *   _studio_    → imgUrl2
 *   _human_     → imgUrl3
 *   _review_    → imgUrl4
 *   _src_       → skip
 *   imgUrl5     → always cleared
 *
 * Dry-run (10 products):
 *   node app/scripts/remapCloudinaryImages.mjs
 *
 * Full run:
 *   node app/scripts/remapCloudinaryImages.mjs --fix
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dir, '../../serviceAccountKey.json.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const FIX_MODE  = process.argv.includes('--fix');
const DRY_LIMIT = FIX_MODE ? Infinity : 10;
const DELAY_MS  = 120;

const CLOUD      = 'dyxzq3ucy';
const API_KEY    = '768969912295749';
const API_SECRET = '8QthVmK6c0Doa866Xpc2IalFH6U';
const AUTH       = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Cloudinary ────────────────────────────────────────────────────────────────

async function listFolder(productId) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image` +
    `?prefix=yoursofer/${productId}&type=upload&max_results=20`;
  const res = await fetch(url, { headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.resources || [];
}

/** Pick the image with the highest embedded timestamp (most recent upload). */
function pickLatest(secureUrls) {
  return secureUrls.sort((a, b) => {
    const tsA = parseInt(a.match(/_(\d{10,13})\.[^.]+$/)?.[1] ?? '0');
    const tsB = parseInt(b.match(/_(\d{10,13})\.[^.]+$/)?.[1] ?? '0');
    return tsB - tsA;
  })[0];
}

function classifyResources(resources) {
  const buckets = { lifestyle: [], studio: [], human: [], review: [] };
  for (const r of resources) {
    const pid = r.public_id || '';
    if (pid.includes('_src_'))       continue;
    if (pid.includes('_lifestyle_')) buckets.lifestyle.push(r.secure_url);
    else if (pid.includes('_studio_'))  buckets.studio.push(r.secure_url);
    else if (pid.includes('_human_'))   buckets.human.push(r.secure_url);
    else if (pid.includes('_review_'))  buckets.review.push(r.secure_url);
  }
  return {
    imgUrl:  pickLatest(buckets.lifestyle) ?? null,
    imgUrl2: pickLatest(buckets.studio)    ?? null,
    imgUrl3: pickLatest(buckets.human)     ?? null,
    imgUrl4: pickLatest(buckets.review)    ?? null,
  };
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

const FIELDS = ['imgUrl', 'imgUrl2', 'imgUrl3', 'imgUrl4', 'imgUrl5'];

function buildUpdate(current, proposed) {
  const update = {};
  for (const f of ['imgUrl', 'imgUrl2', 'imgUrl3', 'imgUrl4']) {
    const newVal = proposed[f];
    const curVal = current[f] || null;
    if (newVal && newVal !== curVal) update[f] = newVal;
    // Don't clear a field if Cloudinary found nothing for it — keep existing
  }
  // Always clear imgUrl5
  if (current.imgUrl5) update.imgUrl5 = FieldValue.delete();
  return update;
}

function shortUrl(url) {
  if (!url) return '—';
  const m = url.match(/\/([^/]+)\.[^.]+$/);
  return m ? m[1].slice(0, 50) : url.slice(-50);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`🔍 מצב: ${FIX_MODE ? '🔧 תיקון מלא (--fix)' : `🔎 dry-run — 10 מוצרים ראשונים`}`);
  console.log('📦 טוען מוצרים פעילים...');

  const snap = await db.collection('products').get();
  const candidates = [];
  snap.forEach(d => {
    const p = { ...d.data(), id: d.id };
    if (p.status === 'active' && p.imgUrl2?.trim()) candidates.push(p);
  });
  console.log(`✅ ${candidates.length} מוצרים עם imgUrl2\n`);

  const toProcess = candidates.slice(0, DRY_LIMIT);
  const changes = [];
  let cloudinaryErrors = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    process.stdout.write(`  [${i + 1}/${toProcess.length}] ${p.name?.slice(0, 40)}...`);

    let resources;
    try {
      resources = await listFolder(p.id);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
      cloudinaryErrors++;
      await sleep(DELAY_MS);
      continue;
    }

    const proposed = classifyResources(resources);
    const update   = buildUpdate(p, proposed);

    if (Object.keys(update).length === 0) {
      console.log(' ✅ אין שינויים');
    } else {
      console.log(` 📝 ${Object.keys(update).filter(k => k !== 'imgUrl5' || p.imgUrl5).join(', ')}`);
      changes.push({ id: p.id, name: p.name, cat: p.cat, update, current: p, proposed });
    }

    await sleep(DELAY_MS);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log(`📋 תוצאות — ${toProcess.length} מוצרים נסרקו`);
  console.log('════════════════════════════════════════');
  console.log(`שינויים נדרשים:    ${changes.length}`);
  console.log(`שגיאות Cloudinary: ${cloudinaryErrors}`);

  for (const c of changes.slice(0, FIX_MODE ? 0 : 10)) {
    console.log(`\n  📦 ${c.name} [${c.id}]`);
    for (const f of FIELDS) {
      const cur = c.current[f] || null;
      const upd = c.update[f];
      if (upd === undefined) continue;
      const newVal = upd instanceof Object ? '(deleted)' : upd;
      if (cur !== newVal) {
        console.log(`    ${f}:`);
        console.log(`      לפני: ${shortUrl(cur)}`);
        console.log(`      אחרי: ${shortUrl(typeof newVal === 'string' ? newVal : null)}`);
      }
    }
  }

  if (!FIX_MODE) {
    console.log('\n💡 הרץ עם --fix לעדכון כל המוצרים:');
    console.log('   node app/scripts/remapCloudinaryImages.mjs --fix');
    process.exit(0);
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  console.log(`\n🔧 מעדכן ${changes.length} מוצרים...`);
  let done = 0;
  for (const c of changes) {
    await db.collection('products').doc(c.id).update(c.update);
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${changes.length}...`);
  }
  console.log(`\n✅ הושלם — ${done} מוצרים עודכנו.`);
  process.exit(0);
}

run().catch(err => { console.error('❌ שגיאה:', err.message); process.exit(1); });
