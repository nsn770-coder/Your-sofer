import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
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

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  const snap = await db.collection('products').limit(200).get();
  const docs = snap.docs;

  // Pick 50 at random
  const shuffled = docs.sort(() => Math.random() - 0.5).slice(0, 50);

  console.log(`\n── 50 random products ──────────────────────────────────────\n`);
  shuffled.forEach((doc, i) => {
    const d = doc.data();
    console.log(`[${String(i + 1).padStart(2)}] id: ${doc.id}`);
    console.log(`     name: ${d.name ?? '—'}`);
    console.log(`     cat:  ${d.cat ?? '—'}`);
    console.log(`     desc: ${(d.desc ?? d.description ?? '—').toString().slice(0, 120)}`);
    console.log();
  });

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
