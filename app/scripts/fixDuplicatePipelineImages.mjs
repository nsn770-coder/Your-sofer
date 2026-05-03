/**
 * fixDuplicatePipelineImages.mjs
 * Detects products where the AI pipeline ran twice and uploaded duplicate
 * images — same type (lifestyle/studio/human) stored in consecutive imgUrl fields.
 *
 * Detection: extract Cloudinary public_id from each URL, strip the trailing
 * timestamp suffix (_\d{10,}), compare base names across consecutive fields.
 * If base names match → the second one is a duplicate.
 *
 * Dry-run (default):
 *   node app/scripts/fixDuplicatePipelineImages.mjs
 *
 * Apply fixes:
 *   node app/scripts/fixDuplicatePipelineImages.mjs --fix
 *
 * Requires: app/scripts/serviceAccountKey.json
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH   = resolve(__dirname, './serviceAccountKey.json');

// ── Load .env.local ────────────────────────────────────────────────────────────
(function loadEnvLocal() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k) process.env[k] = v;
  }
})();

if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const FIX_MODE  = process.argv.includes('--fix');
const IMG_FIELDS = ['imgUrl2', 'imgUrl3', 'imgUrl4', 'imgUrl5'];

// ── Cloudinary helpers ─────────────────────────────────────────────────────────

/**
 * Extract the public_id from a Cloudinary URL.
 *
 * Cloudinary URL forms:
 *   https://res.cloudinary.com/{cloud}/image/upload/v{ver}/{public_id}.ext
 *   https://res.cloudinary.com/{cloud}/image/upload/{transforms}/v{ver}/{public_id}.ext
 *
 * Returns null for non-Cloudinary or unrecognised URLs.
 */
function extractPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;

  const uploadIdx = url.indexOf('/upload/');
  if (uploadIdx === -1) return null;

  // Everything after "/upload/", without file extension
  const afterUpload = url.slice(uploadIdx + 8).replace(/\.[^./]+$/, '');
  const parts = afterUpload.split('/');

  // Find the version segment (e.g. "v1748000000")
  const vIdx = parts.findIndex(p => /^v\d+$/.test(p));
  if (vIdx !== -1) {
    // public_id = everything after the version token
    return parts.slice(vIdx + 1).join('/');
  }

  // No version token — skip any leading transformation segments
  // (Cloudinary transformations look like "w_800", "c_fill", "q_auto", etc.)
  const firstNonTransform = parts.findIndex(p => !/^[a-z_]+\d*(_[a-z\d]+)*$/.test(p) || p.includes('yoursofer'));
  return parts.slice(firstNonTransform !== -1 ? firstNonTransform : 0).join('/');
}

/**
 * Strip trailing Cloudinary timestamp from a public_id to get the type base.
 *
 * e.g. "yoursofer/abc123/abc123_lifestyle_1748000000123"
 *   →  "yoursofer/abc123/abc123_lifestyle"
 *
 * Timestamps are 10–13 digits appended with an underscore.
 */
function baseId(publicId) {
  if (!publicId) return null;
  return publicId.replace(/_\d{10,13}$/, '');
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`🔍 מצב: ${FIX_MODE ? '🔧 תיקון (--fix)' : '🔎 dry-run בלבד'}`);
  console.log('📦 טוען מוצרים פעילים...');

  const snap = await db.collection('products').get();
  const active = [];
  snap.forEach(d => { const p = d.data(); if (p.status === 'active') active.push({ id: d.id, ...p }); });
  console.log(`✅ ${active.length} מוצרים פעילים\n`);

  const flagged = [];
  let totalDupes = 0;

  for (const p of active) {
    // Collect the consecutive image fields that have a value
    const fields = IMG_FIELDS
      .map(f => ({ field: f, url: (p[f] || '').trim() }))
      .filter(f => f.url);

    if (fields.length < 2) continue;

    const toClear = [];

    for (let i = 0; i < fields.length - 1; i++) {
      const a = fields[i];
      const b = fields[i + 1];

      const pidA = extractPublicId(a.url);
      const pidB = extractPublicId(b.url);
      if (!pidA || !pidB) continue; // skip non-Cloudinary pairs

      const baseA = baseId(pidA);
      const baseB = baseId(pidB);

      if (baseA && baseB && baseA === baseB) {
        toClear.push({ field: b.field, url: b.url, duplicateOf: a.field, base: baseA });
      }
    }

    if (toClear.length > 0) {
      totalDupes += toClear.length;
      flagged.push({ id: p.id, name: p.name || '(ללא שם)', cat: p.cat || '', toClear });
    }
  }

  // ── Console report ─────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════');
  console.log('📋 סיכום תמונות כפולות מה-pipeline');
  console.log('════════════════════════════════════════');
  console.log(`מוצרים עם כפולות:    ${flagged.length}`);
  console.log(`שדות לניקוי:          ${totalDupes}`);

  if (flagged.length > 0) {
    console.log('\n⚠️  דוגמאות (עד 10):');
    for (const p of flagged.slice(0, 10)) {
      console.log(`\n  ${p.name} (${p.cat})  [${p.id}]`);
      for (const c of p.toClear) {
        console.log(`    ${c.duplicateOf} ≡ ${c.field}  (base: ${c.base})`);
        console.log(`    → ינוקה: ${c.field}`);
      }
    }
  } else {
    console.log('\n✅ לא נמצאו כפולות מה-pipeline!');
  }

  // ── Save JSON report ────────────────────────────────────────────────────────
  const report = {
    generatedAt: new Date().toISOString(),
    fixMode: FIX_MODE,
    summary: {
      totalActive: active.length,
      productsWithDuplicates: flagged.length,
      fieldsToFix: totalDupes,
    },
    flagged,
  };
  const outPath = resolve(__dirname, 'pipeline-dupe-audit.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📁 דוח מלא: app/scripts/pipeline-dupe-audit.json`);

  if (!FIX_MODE) {
    console.log('\n💡 הרץ עם --fix כדי לבצע תיקונים:');
    console.log('   node app/scripts/fixDuplicatePipelineImages.mjs --fix');
    process.exit(0);
  }

  // ── Apply fixes ─────────────────────────────────────────────────────────────
  console.log('\n🔧 מתחיל תיקון...');
  let fixed = 0;

  for (const p of flagged) {
    const update = {};
    for (const c of p.toClear) {
      update[c.field] = FieldValue.delete();
    }
    await db.collection('products').doc(p.id).update(update);
    console.log(`  ✅ ${p.id} — נוקו: ${p.toClear.map(c => c.field).join(', ')}`);
    fixed++;
  }

  console.log(`\n✅ הושלם — ${fixed} מוצרים תוקנו, ${totalDupes} שדות נוקו.`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
