import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');
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
} catch { /* rely on existing env */ }

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

const CODE = 'AM_ISRAEL_CHAI10';

async function run() {
  const col = db.collection('coupons');
  const snap = await col.where('code', '==', CODE).get();

  if (snap.empty) {
    const ref = await col.add({
      code:      CODE,
      type:      'percent',
      discount:  10,
      active:    true,
      usedBy:    [],
      createdAt: Timestamp.now(),
    });
    console.log(`✅ קופון נוצר: ${CODE} (id: ${ref.id})`);
  } else {
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const needsUpdate = !data.active || data.discount !== 10;
    if (needsUpdate) {
      await docSnap.ref.update({ active: true, discount: 10 });
      console.log(`✏️  קופון עודכן: active=true, discount=10 (id: ${docSnap.id})`);
    } else {
      console.log(`✓ קופון קיים ותקין: ${CODE} (id: ${docSnap.id})`);
    }
    console.log('מצב סופי:', { ...data, active: true, discount: 10 });
  }
}

run().catch(e => { console.error(e); process.exit(1); });
