/**
 * deleteCloudinaryImages.mjs
 *
 * מוחק מ-Cloudinary את תמונות המוצרים שנמחקו מ-Firestore.
 * קורא את הגיבוי backup-homeware-*.json ומוצא את כל ה-public_ids.
 *
 * Usage:
 *   node app/scripts/deleteCloudinaryImages.mjs           ← dry-run
 *   node app/scripts/deleteCloudinaryImages.mjs --execute ← מחיקה בפועל
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');

// ── Load env ────────────────────────────────────────────────────────────────
const env = readFileSync(envPath, 'utf-8');
const vars = {};
let key = null, val = [], multi = false;
for (const line of env.split('\n')) {
  if (!multi && line.includes('=')) {
    const eq = line.indexOf('=');
    key = line.slice(0, eq).trim();
    const rest = line.slice(eq + 1);
    if (rest.includes('-----BEGIN')) { multi = true; val = [rest]; }
    else { vars[key] = rest.trim(); key = null; }
  } else if (multi) {
    val.push(line);
    if (line.includes('-----END PRIVATE KEY-----')) { vars[key] = val.join('\n').trim(); multi = false; key = null; val = []; }
  }
}

const CLOUD_NAME = vars['CLOUDINARY_CLOUD_NAME'];
const API_KEY    = vars['CLOUDINARY_API_KEY'];
const API_SECRET = vars['CLOUDINARY_API_SECRET'];

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ חסרים CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET');
  process.exit(1);
}

const EXECUTE = process.argv.includes('--execute');

// ── Load backup ──────────────────────────────────────────────────────────────
const ts = new Date().toISOString().slice(0, 10);
const backupPath = resolve(__dir, `backup-homeware-${ts}.json`);
let backup;
try {
  backup = JSON.parse(readFileSync(backupPath, 'utf-8'));
} catch {
  console.error(`❌ לא נמצא גיבוי: ${backupPath}`);
  process.exit(1);
}

// ── Extract public_ids from Cloudinary URLs ──────────────────────────────────
function extractPublicId(url) {
  if (!url || !url.includes('cloudinary')) return null;
  // URL pattern: /upload/[transformations/]v1234/public/id.ext
  // Transformations look like: f_auto,q_auto:good/ or w_300,h_300/ etc.
  // Version looks like: v1234567890/
  // We skip everything after /upload/ until we hit /v\d+/ or a segment without commas/letters-only
  const afterUpload = url.match(/\/upload\/(.+)/);
  if (!afterUpload) return null;
  let rest = afterUpload[1];
  // Strip leading transformations: segments containing commas or param-like patterns (w_,h_,f_,q_,c_,e_ etc.)
  // A transformation segment looks like: f_auto,q_auto:good or w_300,h_200/c_fill
  rest = rest.replace(/^(?:[a-z]+_[^/]+,?)+\//, '');  // strip one transform layer
  rest = rest.replace(/^(?:[a-z]+_[^/]+,?)+\//, '');  // strip another if stacked
  // Strip version: v1234567890/
  rest = rest.replace(/^v\d+\//, '');
  // Strip file extension
  rest = rest.replace(/\.[a-z]{2,4}(\?.*)?$/i, '');
  return rest || null;
}

const imgFields = ['imgUrl', 'image_url', 'imgUrl2', 'imgUrl3'];
const publicIds = new Set();

for (const p of backup) {
  for (const f of imgFields) {
    const id = extractPublicId(p[f]);
    if (id) publicIds.add(id);
  }
}

console.log(`📦 גיבוי: ${backup.length} מוצרים`);
console.log(`🖼️  public_ids ייחודיים למחיקה: ${publicIds.size}`);

if (publicIds.size === 0) {
  console.log('✅ אין תמונות למחיקה.');
  process.exit(0);
}

// Show sample
console.log('\nדוגמת 5 public_ids:');
[...publicIds].slice(0, 5).forEach(id => console.log(`  ${id}`));

if (!EXECUTE) {
  console.log('\n⚠️  DRY-RUN — לא נמחק כלום.');
  console.log('   להרצת מחיקה: node app/scripts/deleteCloudinaryImages.mjs --execute');
  process.exit(0);
}

// ── Cloudinary bulk delete (max 100 per request) ────────────────────────────
// Auth: Basic Auth with api_key:api_secret
// Endpoint: DELETE /v1_1/{cloud}/resources/image/upload?public_ids[]=...
const CHUNK = 100;
const allIds = [...publicIds];
let totalDeleted = 0, totalFailed = 0;

const basicAuth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

console.log('\n🗑️  מוחק תמונות מ-Cloudinary...');

for (let i = 0; i < allIds.length; i += CHUNK) {
  const chunk = allIds.slice(i, i + CHUNK);

  // Build query string: public_ids[]=id1&public_ids[]=id2...
  const qs = chunk.map(id => `public_ids[]=${encodeURIComponent(id)}`).join('&');
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${qs}`;

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) {
      console.log(`  ❌ HTTP ${res.status} בחלק ${i+1}-${i+chunk.length}: ${data.error?.message || text.slice(0,80)}`);
      totalFailed += chunk.length;
    } else {
      const deleted = Object.values(data.deleted || {}).filter(v => v === 'deleted').length;
      const notFound = Object.values(data.deleted || {}).filter(v => v === 'not_found').length;
      totalDeleted += deleted;
      console.log(`  [${i+1}-${i+chunk.length}] נמחקו: ${deleted}, לא נמצאו: ${notFound}`);
    }
  } catch (e) {
    console.log(`  ❌ שגיאה בחלק ${i+1}-${i+chunk.length}: ${e.message}`);
    totalFailed += chunk.length;
  }

  // Rate limit: 500ms between batches
  if (i + CHUNK < allIds.length) await new Promise(r => setTimeout(r, 500));
}

console.log(`\n✅ סיום Cloudinary:`);
console.log(`   נמחקו: ${totalDeleted}`);
console.log(`   נכשלו: ${totalFailed}`);
process.exit(0);
