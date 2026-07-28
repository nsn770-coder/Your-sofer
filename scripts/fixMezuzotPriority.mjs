/**
 * fixMezuzotPriority.mjs — משלים priority למוצרים שחסר להם.
 * דף הקטגוריה ממיין orderBy('priority','desc') — מסמך בלי priority לא חוזר בשאילתה!
 *
 * Usage:
 *   node scripts/fixMezuzotPriority.mjs            ← DRY-RUN
 *   node scripts/fixMezuzotPriority.mjs --execute  ← ביצוע (בתי מזוזה בלבד)
 *   node scripts/fixMezuzotPriority.mjs --execute --all-cats  ← כל הקטלוג
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXECUTE  = process.argv.includes('--execute');
const ALL_CATS = process.argv.includes('--all-cats');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

const snap = await db.collection('products').get();
const missing = [];
const byCatMissing = {};
snap.forEach(d => {
  const p = d.data();
  if (p.priority === undefined || p.priority === null) {
    const cat = p.cat ?? '(ריק)';
    byCatMissing[cat] = (byCatMissing[cat] || 0) + 1;
    if (ALL_CATS || cat === 'בתי מזוזה') missing.push({ id: d.id, name: p.name, cat });
  }
});

console.log('\n── מוצרים בלי priority (נעלמים מדפי קטגוריה!) לפי קטגוריה ──');
Object.entries(byCatMissing).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

console.log(`\n${EXECUTE ? '🚀 EXECUTE' : '🧪 DRY-RUN'} — יתוקנו ${missing.length} מוצרים (priority → 50)${ALL_CATS ? ' [כל הקטלוג]' : ' [בתי מזוזה בלבד]'}\n`);

if (!EXECUTE) { console.log('הוסף --execute לביצוע.\n'); process.exit(0); }

let updated = 0;
for (let i = 0; i < missing.length; i += 400) {
  const batch = db.batch();
  for (const p of missing.slice(i, i + 400)) {
    batch.update(db.collection('products').doc(p.id), { priority: 50 });
    updated++;
  }
  await batch.commit();
  console.log(`  ✅ עודכנו ${updated}/${missing.length}`);
}
console.log(`\n🎉 בוצע! ${updated} מוצרים קיבלו priority ויופיעו בדפי הקטגוריה.\n`);
