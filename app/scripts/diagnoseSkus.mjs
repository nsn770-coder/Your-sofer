/**
 * diagnoseSkus.mjs
 *
 * אבחון מלא של רשימת SKUs: קיים? מוסתר? יש תמונה? יש priority?
 * ובעיקר — האם הוא באמת יוצג בעמוד הקטגוריה.
 *
 * דפי הקטגוריה מריצים orderBy('priority'), ובפיירסטור מסמך **בלי השדה**
 * פשוט לא חוזר מהשאילתה. מוצר יכול להיות hidden:false, status:'active',
 * עם תמונה — ועדיין להיות בלתי נראה. זו התקלה הכי שקטה שיש.
 *
 * Usage:
 *   node app/scripts/diagnoseSkus.mjs [scripts/missing-skus.json]
 *   node app/scripts/diagnoseSkus.mjs --fix   ← מתקן את מה שניתן
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }  from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const FIX       = process.argv.includes('--fix');
const listArg   = process.argv.find(a => a.endsWith('.json'));
const LIST_PATH = resolve(ROOT, listArg || 'scripts/missing-skus.json');

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

const isCloudinary = u => typeof u === 'string' && u.includes('cloudinary.com');

(async () => {
  if (!FIX) console.log('🧪 אבחון בלבד — לא נכתב כלום. הוסף --fix לתיקון.\n');

  const wanted = JSON.parse(readFileSync(LIST_PATH, 'utf8')).map(s => String(s).trim().toUpperCase());
  const snap = await db.collection('products').get();

  const bySku = new Map();
  snap.forEach(d => {
    const p = d.data();
    if (typeof p.sku === 'string') bySku.set(p.sku.trim().toUpperCase(), { ref: d.ref, id: d.id, ...p });
  });

  console.log(`רשימה: ${wanted.length} SKUs | קטלוג: ${snap.size} מוצרים\n`);

  const buckets = {
    notFound: [], noPriority: [], hidden: [], noImage: [],
    inactive: [], noCat: [], visible: [],
  };

  for (const sku of wanted) {
    const p = bySku.get(sku);
    if (!p) { buckets.notFound.push(sku); continue; }

    // הסדר חשוב: כל בדיקה היא סיבה *מספיקה* לאי-הצגה
    if (p.priority === undefined || p.priority === null) buckets.noPriority.push(p);
    else if (p.hidden === true)                          buckets.hidden.push(p);
    else if (p.status && p.status !== 'active')          buckets.inactive.push(p);
    else if (!isCloudinary(p.imgUrl))                    buckets.noImage.push(p);
    else if (!p.cat && !p.category)                      buckets.noCat.push(p);
    else                                                 buckets.visible.push(p);
  }

  console.log('══ למה הם לא מופיעים ══');
  console.log(`  ❌ לא קיימים בקטלוג:        ${buckets.notFound.length}`);
  console.log(`  🚫 חסר priority (לא נשלף):  ${buckets.noPriority.length}`);
  console.log(`  🙈 hidden = true:            ${buckets.hidden.length}`);
  console.log(`  ⏸  status לא active:         ${buckets.inactive.length}`);
  console.log(`  🖼  בלי תמונה תקינה:         ${buckets.noImage.length}`);
  console.log(`  📂 בלי קטגוריה:              ${buckets.noCat.length}`);
  console.log(`  ✅ אמורים להיות גלויים:      ${buckets.visible.length}`);

  const show = (label, arr) => {
    if (!arr.length) return;
    console.log(`\n  ${label} (5 ראשונים):`);
    for (const p of arr.slice(0, 5)) {
      const name = typeof p === 'string' ? p : (p.name || '').slice(0, 40);
      const extra = typeof p === 'string' ? '' :
        ` | cat=${p.cat || p.category || '—'} pri=${p.priority ?? '—'} hidden=${p.hidden} status=${p.status || '—'}`;
      console.log(`    ${typeof p === 'string' ? p : p.sku} ${name}${extra}`);
    }
  };
  show('חסר priority', buckets.noPriority);
  show('מוסתרים', buckets.hidden);
  show('בלי תמונה', buckets.noImage);
  show('לא קיימים', buckets.notFound);

  // ── איפה הם יושבים בפועל ────────────────────────────────────────────────
  // כשמוצר "נעלם", ברוב המקרים הוא פשוט בקטגוריה אחרת מזו שמחפשים בה.
  // הפירוט הזה עונה על השאלה מהר יותר מכל בדיקה אחרת.
  const all = [...buckets.visible, ...buckets.hidden, ...buckets.inactive, ...buckets.noImage];
  const byCat = all.reduce((a, p) => {
    const k = `${p.cat || p.category || '—'} › ${p.subCategory || '—'}`;
    (a[k] ??= []).push(p);
    return a;
  }, {});
  console.log('\n══ באילו קטגוריות הם נמצאים ══');
  for (const [k, arr] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
    const vis = arr.filter(p => p.hidden !== true).length;
    console.log(`  ${String(arr.length).padStart(3)} מוצרים  (${vis} גלויים)  ${k}`);
  }

  // ── תיקון ──
  if (FIX) {
    let fixed = 0;
    // priority חסר — הסיבה היחידה שאפשר לתקן בבטחה בלי שיקול דעת
    for (const p of buckets.noPriority) {
      await p.ref.update({ priority: 50 });
      fixed++;
    }
    // מוסתרים שיש להם תמונה — אין סיבה שיישארו מוסתרים
    for (const p of buckets.hidden) {
      if (isCloudinary(p.imgUrl)) {
        await p.ref.update({ hidden: false, status: 'active', needsImage: false, ...(p.priority == null ? { priority: 50 } : {}) });
        fixed++;
      }
    }
    for (const p of buckets.inactive) {
      if (isCloudinary(p.imgUrl)) { await p.ref.update({ status: 'active' }); fixed++; }
    }
    console.log(`\n  🔧 תוקנו ${fixed} מוצרים`);
  }

  if (buckets.notFound.length) {
    const out = resolve(ROOT, 'scripts/truly-missing-skus.json');
    writeFileSync(out, JSON.stringify(buckets.notFound, null, 2), 'utf8');
    console.log(`\n  📄 SKUs שלא קיימים כלל: ${out}`);
  }
  if (!FIX) console.log('\n🧪 אבחון בלבד. הוסף --fix לתיקון.');
  process.exit(0);
})();
