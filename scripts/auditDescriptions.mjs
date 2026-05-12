/**
 * Audit products in יודאיקה / כלי שולחן והגשה / עיצוב הבית
 * for potentially wrong descriptions.
 * Run: node scripts/auditDescriptions.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
const envVars = {};
let currentKey = null, currentValue = [];
for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!m) continue;
    currentKey = m[1]; currentValue = [m[2]];
  } else {
    if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ')) {
      envVars[currentKey] = currentValue.join('\n');
      const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      currentKey = m[1]; currentValue = [m[2]];
    } else { currentValue.push(line.trimEnd()); }
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

initializeApp({ credential: cert({
  projectId: envVars['FIREBASE_PROJECT_ID'],
  clientEmail: (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim(),
  privateKey: (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n'),
}) });

const db = getFirestore();
const CATS = ['יודאיקה', 'כלי שולחן והגשה', 'עיצוב הבית'];

async function main() {
  const wrongMezuzah = [], misleadingSilver = [];

  for (const cat of CATS) {
    const snap = await db.collection('products').where('cat', '==', cat).get();
    for (const d of snap.docs) {
      const { name = '', desc = '' } = d.data();
      if (desc.includes('מזוזה')) {
        wrongMezuzah.push({ id: d.id, cat, name, desc: desc.slice(0, 80) });
      }
      if (desc.includes('כסף') && (name.includes('מצופה') || name.includes('דמוי'))) {
        misleadingSilver.push({ id: d.id, cat, name, desc: desc.slice(0, 80) });
      }
    }
  }

  console.log(`\n=== תיאורי מזוזה שגויים (${wrongMezuzah.length}) ===`);
  wrongMezuzah.forEach(p => console.log(`  [${p.cat}] ${p.name}\n    desc: ${p.desc}`));

  console.log(`\n=== תיאורי כסף מטעים (${misleadingSilver.length}) ===`);
  misleadingSilver.forEach(p => console.log(`  [${p.cat}] ${p.name}\n    desc: ${p.desc}`));

  console.log(`\nסה"כ: ${wrongMezuzah.length + misleadingSilver.length} מוצרים בעייתיים`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
