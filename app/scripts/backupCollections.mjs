/**
 * backupCollections.mjs
 * Reads the current `collection` field from every active product and saves
 * { id, collection } records to a timestamped JSON file in the project root.
 * READ-ONLY on Firestore — no documents are written or modified.
 *
 * Usage:
 *   node app/scripts/backupCollections.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { fileURLToPath }                 from 'url';
import { dirname, resolve }              from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────────────────────
(function loadEnv() {
  const p = resolve(__dirname, '../../.env.local');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k) process.env[k] = v;
  }
})();

// ── Firebase Admin ────────────────────────────────────────────────────────────
const SA = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA) });
const db = getFirestore();

// ── Read ──────────────────────────────────────────────────────────────────────
console.log('🔍 Fetching active products from Firestore (read-only)...');
const snap = await db.collection('products').where('status', '==', 'active').get();

const records = snap.docs.map(d => ({
  id:         d.id,
  collection: d.data().collection ?? null,
}));

console.log(`📦 ${records.length} active products read`);

// ── Write local file ──────────────────────────────────────────────────────────
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename  = `collections-backup-${timestamp}.json`;
const outPath   = resolve(__dirname, '../../', filename);

writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf8');

console.log(`✅ Backup written → ${filename}`);
console.log(`   Records: ${records.length}`);

const withCollection    = records.filter(r => r.collection !== null).length;
const withoutCollection = records.filter(r => r.collection === null).length;
console.log(`   With collection field:    ${withCollection}`);
console.log(`   Without collection field: ${withoutCollection}`);
