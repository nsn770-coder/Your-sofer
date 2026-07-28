/**
 * READ-ONLY + BACKUP — גיבוי ותצוגה מקדימה לתיוג bundlePromo בכיפות
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dir   = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../../.env.local');
try {
  const env = readFileSync(envPath, 'utf-8');
  let key = null, val = [], multi = false;
  for (const line of env.split('\n')) {
    if (!multi && line.includes('=')) {
      const eq = line.indexOf('=');
      key = line.slice(0, eq).trim();
      const rest = line.slice(eq + 1);
      if (rest.includes('-----BEGIN')) { multi = true; val = [rest]; }
      else { process.env[key] = rest.trim(); key = null; }
    } else if (multi) {
      val.push(line);
      if (line.includes('-----END PRIVATE KEY-----')) {
        process.env[key] = val.join('\n').trim();
        multi = false; key = null; val = [];
      }
    }
  }
} catch { /* rely on existing env */ }

const projectId   = process.env.FIREBASE_PROJECT_ID ?? '';
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const rawKey      = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey  = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
if (!projectId || !clientEmail || !privateKey) { console.error('❌ חסרים משתני סביבה'); process.exit(1); }
if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

function resolveTag(price) {
  if (price >= 34 && price <= 44) return '3for100';
  if (price >= 25 && price <= 33) return '4for100';
  if (price >= 20 && price <= 24) return '5for100';
  if (price === 9)                return '12for100';
  return null;
}

console.log('טוען כל מוצרי כיפות...');
const snap = await db.collection('products').where('cat', '==', 'כיפות').get();
console.log(`סה"כ: ${snap.size} מוצרים\n`);

// גיבוי
const backup = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const date   = new Date().toISOString().slice(0, 10);
const path   = resolve(__dir, `backup-kippot-tag-${date}.json`);
writeFileSync(path, JSON.stringify(backup, null, 2), 'utf-8');
console.log(`✅ גיבוי נשמר → ${path}\n`);

// סיווג
const counts = { '3for100': [], '4for100': [], '5for100': [], '12for100': [], none: [] };
snap.docs.forEach(d => {
  const p   = d.data();
  const tag = resolveTag(p.price);
  (counts[tag ?? 'none']).push({ id: d.id, name: p.name, price: p.price, existing: p.bundlePromo ?? null });
});

console.log('=== תצוגה מקדימה ===');
const rows = [
  { tag: '3for100',  range: '₪34-44',   list: counts['3for100']  },
  { tag: '4for100',  range: '₪25-33',   list: counts['4for100']  },
  { tag: '5for100',  range: '₪20-24',   list: counts['5for100']  },
  { tag: '12for100', range: '₪9 בדיוק', list: counts['12for100'] },
  { tag: '(ללא)',    range: 'מחוץ לטווח', list: counts['none']    },
];
for (const r of rows) {
  console.log(`  ${r.tag.padEnd(10)}  ${r.range.padEnd(12)}  ${r.list.length} מוצרים`);
  r.list.slice(0, 2).forEach(p =>
    console.log(`    ₪${String(p.price).padEnd(6)} ${p.name?.slice(0,45)}`)
  );
}

// בדיקה: כמה כבר יש עם bundlePromo (שלא צריך לשנות)
const alreadyTagged = snap.docs.filter(d => d.data().bundlePromo).length;
console.log(`\nכבר יש bundlePromo: ${alreadyTagged} מוצרים`);
console.log(`ללא bundlePromo ויקבלו: ${counts['3for100'].length + counts['4for100'].length + counts['5for100'].length + counts['12for100'].length}`);
console.log(`ללא תווית (לא ישתנו): ${counts['none'].length}`);

console.log('\n⚠️  הסקריפט לא שינה שום דבר — ממתין לאישור.');
process.exit(0);
