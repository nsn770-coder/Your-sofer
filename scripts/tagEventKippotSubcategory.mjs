/**
 * tagEventKippotSubcategory.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * מסמן isEventKippot = true לכל מוצרי הכיפות שמופיעים גם בעמוד /event-kippot,
 * כדי שתת-הקטגוריה הווירטואלית "כיפות לאירועים" תעבוד ב-
 * /category/כיפות?filter=כיפות לאירועים ובתפריט.
 *
 * ⚠️ הסקריפט לא נוגע ב-subCategory. "כיפות לאירועים" היא תת-קטגוריה וירטואלית
 *    (CategoryClient.isEventKippah) — כך כיפת סאטן נשארת "כיפות סאטן וטרילין"
 *    וגם מופיעה תחת "כיפות לאירועים".
 *
 * מקורות המוצרים (איחוד, ללא כפילויות):
 *   1. settings/eventKippotStyles — שיוך דגם ← מוצר בחנות (+ DEFAULT_STYLE_PRODUCT_MAP מהקוד)
 *   2. cat === "כיפות" עם isEventKippot / isEventProduct / eventsOnly
 *
 * מוחרגים: מוצרים עם eventScrollSection — אלה סקרולי המזכרות בעמוד האירועים
 * (מטפחות, כיסויי ראש, ברכונים, הבדלה) ואינם כיפות.
 *
 * תיקון cat: כיפות המשויכות לדגם בעמוד אך שמורות תחת cat אחר (למשל "יודאיקה")
 * מועברות ל-cat = "כיפות" — אחרת הן לא מופיעות בקטגוריה כלל.
 *
 * DRY_RUN כברירת מחדל — להרצה אמיתית להוסיף --live
 *
 * שימוש:
 *   node scripts/tagEventKippotSubcategory.mjs           ← דמו (ללא כתיבה)
 *   node scripts/tagEventKippotSubcategory.mjs --live    ← כתיבה בפועל
 *
 * אחרי --live: להריץ  node scripts/syncAlgolia.mjs  כדי לעדכן את האינדקס.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = !process.argv.includes('--live');

const SUBCAT = 'כיפות לאירועים';
const CAT    = 'כיפות';

// חייב להישאר זהה ל-DEFAULT_STYLE_PRODUCT_MAP ב-app/lib/kippot.ts
const DEFAULT_STYLE_PRODUCT_MAP = {
  'satin-white':    { productId: 'GA6IaHppba8peGVGHGud', sku: 'UK00321', name: 'כיפת סאטן' },
  'satin-white-18': { productId: 'qcGTjNpP2eoqyxM6Ns4L', sku: 'UK11889', name: 'כיפה סטן לבן 18 ס"מ' },
};

// ── חיבור ל-Firestore (קובץ service account, ונפילה ל-.env.local) ───────────
function initDb() {
  try {
    const sa = JSON.parse(
      readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
    );
    if (!getApps().length) initializeApp({ credential: cert(sa) });
    return getFirestore();
  } catch {
    try {
      const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
      let key = null, val = '';
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
        if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
        else if (key) { val += '\n' + line; }
      }
      if (key && !process.env[key]) process.env[key] = val.trim();
    } catch {}
    if (!getApps().length) initializeApp({ credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
      clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim(),
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    })});
    return getFirestore();
  }
}

const db = initDb();
const short = t => (t ?? '').toString().slice(0, 48);

async function main() {
  console.log(`\n${'='.repeat(64)}`);
  console.log(`🧿 tagEventKippot — ${DRY_RUN ? '🧪 DRY RUN (ללא כתיבה)' : '🔴 LIVE'}`);
  console.log(`${'='.repeat(64)}\n`);

  // ── 1. שיוך דגם ← מוצר (settings/eventKippotStyles) ───────────────────────
  const settingsSnap = await db.doc('settings/eventKippotStyles').get();
  const styleMap = { ...DEFAULT_STYLE_PRODUCT_MAP, ...(settingsSnap.exists ? settingsSnap.data() : {}) };
  const styleIds = new Set(Object.values(styleMap).map(m => m?.productId).filter(Boolean));
  console.log(`📥 settings/eventKippotStyles → ${Object.keys(styleMap).length} דגמים, ${styleIds.size} מזהי מוצר`);

  // ── 2. כל מוצרי הכיפות ────────────────────────────────────────────────────
  const prodSnap = await db.collection('products').where('cat', '==', CAT).get();
  console.log(`📥 cat="${CAT}" → ${prodSnap.size} מוצרים\n`);

  const picked  = new Map();   // id → { data, reasons[] }
  const skipped = [];          // מוצרי סקרולי מזכרות — לא כיפות
  const add = (id, data, reason) => {
    const cur = picked.get(id) ?? { data, reasons: [] };
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    picked.set(id, cur);
  };

  for (const d of prodSnap.docs) {
    const p = d.data();
    const isCandidate =
      styleIds.has(d.id) || p.isEventKippot === true || p.isEventProduct === true || p.eventsOnly === true;
    if (!isCandidate) continue;

    // סקרולי המזכרות (מטפחות/כיסויי ראש/ברכונים/הבדלה) אינם כיפות
    if (p.eventScrollSection) {
      skipped.push({ id: d.id, data: p, why: `סקרול מזכרות: ${p.eventScrollSection}` });
      continue;
    }

    if (styleIds.has(d.id))        add(d.id, p, 'דגם בעמוד האירועים');
    if (p.isEventKippot === true)  add(d.id, p, 'isEventKippot');
    if (p.isEventProduct === true) add(d.id, p, 'isEventProduct');
    if (p.eventsOnly === true)     add(d.id, p, 'eventsOnly');
  }

  // ── 3. כיפות משויכות-דגם ששמורות תחת cat אחר → יעברו ל-"כיפות" ────────────
  const catFix = [];
  for (const id of styleIds) {
    if (picked.has(id)) continue;
    const snap = await db.doc(`products/${id}`).get();
    if (!snap.exists) { console.log(`  ⚠️  [${id}] מסמך לא קיים — מדולג`); continue; }
    catFix.push({ id, data: snap.data() });
  }

  // ── 4. דוח ────────────────────────────────────────────────────────────────
  const toFlag = [...picked.entries()]
    .filter(([, x]) => x.data.isEventKippot !== true)
    .map(([id, x]) => ({ id, ...x }));
  const alreadyFlagged = picked.size - toFlag.length;

  console.log(`── ${toFlag.length} מוצרים יסומנו isEventKippot=true ──`);
  for (const x of toFlag) {
    console.log(`  • [${x.id}] ${x.data.sku ?? '—'} · ${short(x.data.name)}`);
    console.log(`      subCategory נשמר: "${x.data.subCategory ?? '(ריק)'}" · סיבה: ${x.reasons.join(', ')}`);
  }
  if (alreadyFlagged) console.log(`\n── ${alreadyFlagged} מוצרים כבר מסומנים — מדולגים ──`);

  if (catFix.length) {
    console.log(`\n── ${catFix.length} כיפות משויכות-דגם תחת cat אחר → יעברו ל-"${CAT}" ──`);
    for (const x of catFix) {
      console.log(`  • [${x.id}] cat="${x.data.cat ?? '—'}" · ${short(x.data.name)}`);
    }
  }

  if (skipped.length) {
    console.log(`\n── ${skipped.length} מוצרים הוחרגו (אינם כיפות) ──`);
    for (const x of skipped) console.log(`  • [${x.id}] ${short(x.data.name)} — ${x.why}`);
  }

  const eventsOnlyCount = [...picked.values()].filter(x => x.data.eventsOnly === true).length;
  if (eventsOnlyCount) {
    console.log(`\nℹ️  ${eventsOnlyCount} מהמוצרים מסומנים eventsOnly — יוצגו רק כשתת-הקטגוריה`);
    console.log(`   "${SUBCAT}" פעילה, לא בעמוד הכיפות הכללי (התנהגות מכוונת).`);
  }

  // ── 5. מסמך categories (לתמונת תת-קטגוריה) ────────────────────────────────
  const catDocSnap = await db.collection('categories')
    .where('parentCategory', '==', CAT).where('slug', '==', SUBCAT).get();
  const needCatDoc = catDocSnap.empty;
  console.log(`\n📂 מסמך categories עבור "${SUBCAT}": ${needCatDoc ? 'ייווצר' : 'כבר קיים'}`);

  const total = toFlag.length + catFix.length;

  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN — לא בוצעו שינויים. סה"כ ${total} מוצרים יעודכנו.`);
    console.log(`   בתת-הקטגוריה יופיעו בסוף ${picked.size + catFix.length} כיפות.`);
    console.log('   להרצה אמיתית:  node scripts/tagEventKippotSubcategory.mjs --live\n');
    process.exit(0);
  }

  // ── 6. כתיבה ──────────────────────────────────────────────────────────────
  console.log(`\n✏️  מעדכן ${total} מוצרים...`);
  let ok = 0, fail = 0;
  const writes = [
    ...toFlag.map(x => ({ id: x.id, patch: { isEventKippot: true } })),
    ...catFix.map(x => ({ id: x.id, patch: { cat: CAT, isEventKippot: true } })),
  ];

  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400);
    const batch = db.batch();
    for (const w of chunk) batch.update(db.doc(`products/${w.id}`), w.patch);
    try { await batch.commit(); ok += chunk.length; }
    catch (e) { console.error(`  ❌ batch ${i}: ${e.message}`); fail += chunk.length; }
  }

  if (needCatDoc) {
    const ref = await db.collection('categories').add({
      slug:           SUBCAT,
      displayName:    SUBCAT,
      parentCategory: CAT,
      priority:       1,
      productCount:   picked.size + catFix.length,
      createdAt:      FieldValue.serverTimestamp(),
    });
    console.log(`  ✅ נוצר מסמך categories [${ref.id}]`);
  }

  console.log(`\n${'='.repeat(64)}`);
  console.log(`✅ הסתיים — עודכנו ${ok} מוצרים${fail ? `, נכשלו ${fail}` : ''}`);
  console.log(`   שלב הבא:  node scripts/syncAlgolia.mjs`);
  console.log(`${'='.repeat(64)}\n`);
  process.exit(0);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
