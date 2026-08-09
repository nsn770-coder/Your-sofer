/**
 * deleteTodaysAiImages.mjs
 *
 * מוחק תמונות AI שנוצרו בתאריך מסוים (ברירת מחדל: היום) ומנקה את השדה
 * aiLifestyleImage מהמוצר — כך שהכרטיס חוזר להציג את תמונת המוצר האמיתית.
 *
 * רקע: הפייפליין generateProductImages ייצר ב-08/2026 תמונות שמשנות את
 * העיצוב של המוצר (רקמה, צבע, טיפוגרפיה). התיקון בפרומפט נעשה בדיעבד,
 * ולכן צריך לנקות את מה שכבר נוצר.
 *
 * Usage:
 *   node app/scripts/deleteTodaysAiImages.mjs                    ← DRY-RUN, היום
 *   node app/scripts/deleteTodaysAiImages.mjs --execute          ← ביצוע
 *   node app/scripts/deleteTodaysAiImages.mjs --date=2026-08-09  ← תאריך אחר
 *   node app/scripts/deleteTodaysAiImages.mjs --since=2026-08-01 ← מתאריך ואילך
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                 from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }  from 'fs';
import { resolve, dirname }             from 'path';
import { fileURLToPath }                from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');
const EXECUTE   = process.argv.includes('--execute');
const dateArg   = process.argv.find(a => a.startsWith('--date='));
const sinceArg  = process.argv.find(a => a.startsWith('--since='));

const TARGET_DATE = dateArg  ? dateArg.split('=')[1]  : new Date().toISOString().slice(0, 10);
const SINCE_DATE  = sinceArg ? sinceArg.split('=')[1] : null;

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim(); if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv(resolve(ROOT, '.env.local'));

const CLOUD      = 'dyxzq3ucy';
const API_KEY    = process.env.CLOUDINARY_API_KEY    || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const FOLDER     = 'yoursofer/ai-lifestyle';

if (!API_KEY || !API_SECRET) {
  console.error('❌ חסרים CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET ב-.env.local');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(
    readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'))) });
}
const db = getFirestore();

/** כל הנכסים בתיקייה, בעימוד */
async function listAll() {
  const out = [];
  let cursor = null;
  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload`);
    url.searchParams.set('prefix', FOLDER);
    url.searchParams.set('max_results', '500');
    if (cursor) url.searchParams.set('next_cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: AUTH } });
    if (!res.ok) throw new Error(`Cloudinary list ${res.status}: ${await res.text()}`);
    const data = await res.json();
    out.push(...(data.resources || []));
    cursor = data.next_cursor || null;
  } while (cursor);
  return out;
}

/** מחיקה בקבוצות של 100 — מגבלת ה-API */
async function deleteBatch(publicIds) {
  const url = new URL(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/upload`);
  for (const id of publicIds) url.searchParams.append('public_ids[]', id);
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: AUTH } });
  if (!res.ok) throw new Error(`Cloudinary delete ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  if (!EXECUTE) console.log('🧪 DRY-RUN — לא נמחק ולא נכתב כלום.\n');
  console.log(SINCE_DATE ? `מסנן: נוצרו מ-${SINCE_DATE} ואילך` : `מסנן: נוצרו בתאריך ${TARGET_DATE}`);

  const all = await listAll();
  console.log(`בתיקייה ${FOLDER}: ${all.length} תמונות\n`);

  const match = all.filter(r => {
    const d = (r.created_at || '').slice(0, 10);
    return SINCE_DATE ? d >= SINCE_DATE : d === TARGET_DATE;
  });
  console.log(`תואמות למסנן: ${match.length}\n`);
  if (!match.length) { console.log('אין מה למחוק.'); process.exit(0); }

  // public_id הוא yoursofer/ai-lifestyle/ai_<productId> — משם נחלץ את המוצר
  const rows = match.map(r => ({
    publicId: r.public_id,
    productId: (r.public_id.split('/').pop() || '').replace(/^ai_/, ''),
    createdAt: r.created_at,
  }));

  console.log('דוגמאות:');
  for (const r of rows.slice(0, 5)) console.log(`  ${r.createdAt.slice(0,19)}  ${r.productId}`);

  const out = resolve(ROOT, `scripts/deleted-ai-images-${TARGET_DATE}.json`);
  writeFileSync(out, JSON.stringify(rows, null, 2), 'utf8');
  console.log(`\n📄 רשימה מלאה: ${out}`);

  if (!EXECUTE) {
    console.log(`\n🧪 הרצה יבשה — ${match.length} תמונות *היו* נמחקות. הוסף --execute.`);
    process.exit(0);
  }

  // ── 1. ניקוי השדה בפיירסטור לפני מחיקת הקובץ ──
  // הסדר חשוב: אם נמחק ב-Cloudinary קודם ואז ניפול, יישארו מוצרים
  // שמצביעים לתמונה שלא קיימת — כרטיס שבור במקום כרטיס תקין.
  let cleared = 0;
  for (const r of rows) {
    try {
      const ref = db.collection('products').doc(r.productId);
      const doc = await ref.get();
      if (!doc.exists) continue;
      await ref.update({ aiLifestyleImage: '', aiMatchScore: null });
      cleared++;
    } catch (e) { console.error(`  ✗ ${r.productId}: ${e.message}`); }
  }
  console.log(`\n🧹 נוקו ${cleared} מוצרים בפיירסטור`);

  // ── 2. מחיקה מ-Cloudinary ──
  let deleted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100).map(r => r.publicId);
    try { await deleteBatch(chunk); deleted += chunk.length; }
    catch (e) { console.error(`  ✗ מחיקה נכשלה: ${e.message}`); }
  }
  console.log(`🗑️  נמחקו ${deleted} תמונות מ-Cloudinary`);
  console.log(`\n✅ הכרטיסים חזרו להציג את תמונת המוצר האמיתית.`);
  process.exit(0);
})();
