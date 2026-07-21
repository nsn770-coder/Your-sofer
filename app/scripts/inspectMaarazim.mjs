// inspectMaarazim.mjs — סריקה בלבד, ללא כתיבה.
// מציג את כל המוצרים עם "מארז" בשם, מקובצים לפי cat | subCategory, עם תאריך יצירה.
//   node app/scripts/inspectMaarazim.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const snap = await db.collection('products').get();
const maarazim = snap.docs.filter(d => (d.data().name || '').includes('מארז'));

const fmtDate = v => v?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? (typeof v === 'string' ? v.slice(0, 10) : '-');

const groups = new Map();
for (const d of maarazim) {
  const p = d.data();
  const key = `${p.cat ?? '(ללא cat)'} | ${p.subCategory ?? '(ללא sub)'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ id: d.id, name: p.name, created: fmtDate(p.createdAt) });
}

console.log(`סה"כ ${maarazim.length} מוצרים עם "מארז" בשם, ב-${groups.size} קבוצות:\n`);
for (const [key, items] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`━━ ${key} — ${items.length} מוצרים`);
  for (const it of items.sort((a, b) => (b.created > a.created ? 1 : -1)).slice(0, 20)) {
    console.log(`   ${it.created} | ${it.name.slice(0, 70)}`);
  }
  if (items.length > 20) console.log(`   ... ועוד ${items.length - 20}`);
  console.log('');
}
