import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ── Load .env.local manually ────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');
  // Parse multiline values (private key spans many lines)
  let currentKey = null;
  let currentVal = [];
  let inMultiline = false;

  for (const line of envContent.split('\n')) {
    if (!inMultiline && line.includes('=')) {
      const eqIdx = line.indexOf('=');
      currentKey = line.slice(0, eqIdx).trim();
      const rest = line.slice(eqIdx + 1);
      if (rest.includes('-----BEGIN')) {
        inMultiline = true;
        currentVal = [rest];
      } else {
        process.env[currentKey] = rest.trim();
        currentKey = null;
      }
    } else if (inMultiline) {
      currentVal.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[currentKey] = currentVal.join('\n').trim();
        inMultiline = false; currentKey = null; currentVal = [];
      }
    }
  }
} catch { /* .env.local not found — rely on existing env */ }

// ── Init Admin ──────────────────────────────────────────────────────────────
const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ חסרים משתני סביבה: FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

// ── Level inference ─────────────────────────────────────────────────────────
function inferLevel(name) {
  if (!name) return '';
  if (
    name.includes('מהודר בתכלית') ||
    name.includes('מהודרת בתכלית') ||
    name.includes('הידור בתכלית')
  ) return 'מהודר בתכלית';
  if (name.includes('מהודר') || name.includes('מהודרת')) return 'מהודר';
  if (
    name.includes('פשוט') ||
    name.includes('כשרות לכתחילה') ||
    name.includes('כשרות טובה') ||
    name.includes('לכתחילה')
  ) return 'פשוט';
  return '';
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const TARGET_CATS = ['קלפי מזוזה', 'תפילין קומפלט'];
  const counts = { 'פשוט': 0, 'מהודר': 0, 'מהודר בתכלית': 0, empty: 0 };
  let total = 0;

  for (const cat of TARGET_CATS) {
    console.log(`\nמעבד קטגוריה: ${cat}`);
    const snap = await db.collection('products').where('cat', '==', cat).get();
    console.log(`  נמצאו ${snap.size} מוצרים`);

    for (const d of snap.docs) {
      const data = d.data();
      const level = inferLevel(data.name || '');
      await d.ref.update({ level });
      if (level === 'פשוט') counts['פשוט']++;
      else if (level === 'מהודר') counts['מהודר']++;
      else if (level === 'מהודר בתכלית') counts['מהודר בתכלית']++;
      else counts.empty++;
      total++;
      const mark = level ? '✅' : '⚠️ ';
      console.log(`  ${mark} ${data.name} → "${level || 'ריק'}"`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('סיכום:');
  console.log(`  פשוט:           ${counts['פשוט']}`);
  console.log(`  מהודר:          ${counts['מהודר']}`);
  console.log(`  מהודר בתכלית:   ${counts['מהודר בתכלית']}`);
  console.log(`  ריק (ידני):     ${counts.empty}`);
  console.log(`  סה"כ עודכנו:    ${total}`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
