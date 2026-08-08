/**
 * Check if products were uploaded with images
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Firebase ────────────────────────────────────────────
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
}

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

async function main() {
  console.log('\n🔍 Checking uploaded products...\n');

  // Check some SKUs from our list
  const testSkus = ['UK50636', 'UK59857', 'UK59870', 'UK59254', 'UK86041'];

  for (const sku of testSkus) {
    const snap = await db.collection('products').where('sku', '==', sku).limit(1).get();

    if (snap.empty) {
      console.log(`❌ ${sku}: NOT FOUND in Firestore`);
      continue;
    }

    const doc = snap.docs[0].data();
    console.log(`✅ ${sku}:`);
    console.log(`   Name: ${doc.name}`);
    console.log(`   Available: ${doc.available}`);
    console.log(`   Badge: ${doc.badge}`);
    console.log(`   imgUrl: ${doc.imgUrl ? '✓' : '✗'} ${doc.imgUrl || '(empty)'}`);
    console.log(`   images[]: ${doc.images?.length || 0} items`);
    if (doc.images?.[0]) {
      console.log(`   images[0]: ${doc.images[0].substring(0, 80)}...`);
    }
    console.log('');
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
