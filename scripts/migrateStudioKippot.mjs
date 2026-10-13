/**
 * migrateStudioKippot.mjs
 * מעביר את כיפות הסטודיו שהיו מוגדרות בקוד אל Firestore — studioKippot/{id} —
 * כך שמהיום הן מנוהלות רק מהדשבורד (/admin/logo-studio → "כיפות והדמיה").
 *
 * מה נאסף לכל כיפה (בלי לאבד כלום):
 *   • שם, תמונת המוצר לרשימה וסדר התצוגה — מהרשימה שהייתה בקוד
 *     (app/lib/eventKippotStyles.ts / EventKippotClient / kippot-order — זהות).
 *   • סוג בד (סאטן/פשתן) — SATIN_STYLE_IDS מ-app/lib/kippot.ts.
 *   • שיוך למוצר בחנות (מלאי/רווחיות) — settings/eventKippotStyles, ואם אין —
 *     DEFAULT_STYLE_PRODUCT_MAP מהקוד.
 *   • הגדרות סטודיו — settings/logoStudioStyles: תמונת צד תחתון → bottomDesignImage,
 *     אזורי הדפסה, רוחב במ״מ, גימורים, "מושבת בסטודיו" → active=false.
 *
 * בטוח להרצה חוזרת: מסמך שכבר קיים לא נדרס — רק שדות חסרים בו מושלמים.
 * מסמכי ה-settings הישנים לא נמחקים (נשארים כגיבוי).
 *
 * Usage:
 *   node scripts/migrateStudioKippot.mjs          ← dry-run (בלי כתיבה)
 *   node scripts/migrateStudioKippot.mjs --live   ← כתיבה ל-Firestore
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = !process.argv.includes('--live');

const SA_PATH = resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
const serviceAccount = JSON.parse(readFileSync(SA_PATH, 'utf8'));
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── הרשימה שהייתה בקוד (העתק מדויק של EVENT_KIPPOT_STYLES) ──────────────────
const CODE_STYLES = [
  { id: 'lavan',       label: 'לבן ורדרד',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  { id: 'beige',       label: "בז'",           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  { id: 'linen-tchelet', label: 'תכלת',       img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1789036165/gpmma8td8rvvqvhyptel.png' },
  { id: 'white',       label: 'לבן',           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_25_PM_mcqhle.png' },
  { id: 'beige-natural', label: "בז' טבעי",    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_58_PM_wva57o.png' },
  { id: 'beige-luxury', label: "בז' יוקרתי",   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1787821187/yu4zdyfhd4leqe4h5l4b.png' },
  { id: 'navy',        label: 'כחול כהה',      img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1787821093/kmmuycfw287ui8kcnyrs.png' },
  { id: 'satin-white', label: 'סאטן',          img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781586601/a8c7n05vniv34n4qw44g.jpg' },
  { id: 'satin-white-18', label: 'סאטן לבן 18 ס"מ', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781587426/eu12gjypbrxlyhfi40tk.jpg' },
];
const SATIN_STYLE_IDS = new Set(['satin-white', 'satin-white-18']);
const DEFAULT_STYLE_PRODUCT_MAP = {
  'satin-white':    { productId: 'GA6IaHppba8peGVGHGud', sku: 'UK00321', name: 'כיפת סאטן' },
  'satin-white-18': { productId: 'qcGTjNpP2eoqyxM6Ns4L', sku: 'UK11889', name: 'כיפה סטן לבן 18 ס"מ' },
  'linen-tchelet':  { productId: 'rKF1knFcF2jmzEwzZG5B', sku: 'ys112',   name: 'כיפה פשתן תכלת' },
};

async function main() {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`🧢 migrateStudioKippot — ${DRY_RUN ? '🧪 DRY RUN (no writes)' : '🔴 LIVE'}`);
  console.log('═'.repeat(62));

  const [mapSnap, cfgSnap] = await Promise.all([
    db.doc('settings/eventKippotStyles').get(),
    db.doc('settings/logoStudioStyles').get(),
  ]);
  const productMap = { ...DEFAULT_STYLE_PRODUCT_MAP, ...(mapSnap.exists ? mapSnap.data() : {}) };
  const studioCfgs = cfgSnap.exists ? cfgSnap.data() : {};

  // גיבוי של מה שנקרא — לפני כל כתיבה
  const backupPath = resolve(__dirname, `studioKippot-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(backupPath, JSON.stringify({ eventKippotStyles: mapSnap.exists ? mapSnap.data() : null, logoStudioStyles: studioCfgs }, null, 2));
  console.log(`💾 גיבוי הגדרות ישנות: ${backupPath}`);

  // style ids שקיימים רק ב-Firestore (שויכו/הוגדרו אבל לא ברשימת הקוד) — מדווחים, לא מאבדים
  const codeIds = new Set(CODE_STYLES.map(s => s.id));
  const orphanIds = [...new Set([...Object.keys(productMap), ...Object.keys(studioCfgs)])].filter(id => !codeIds.has(id));
  if (orphanIds.length) console.log(`⚠️  מזהים בהגדרות שאינם ברשימת הקוד (לא יועברו אוטומטית, נשמרו בגיבוי): ${orphanIds.join(', ')}`);

  let created = 0, completed = 0, untouched = 0;
  for (const [i, s] of CODE_STYLES.entries()) {
    const m = productMap[s.id] ?? {};
    const c = studioCfgs[s.id] ?? {};
    const studio = {};
    if (c.printArea) studio.printArea = c.printArea;
    if (c.bottomPrintArea) studio.bottomPrintArea = c.bottomPrintArea;
    if (c.maxPrintWidthMm != null) studio.maxPrintWidthMm = c.maxPrintWidthMm;
    if (c.bottomMaxPrintWidthMm != null) studio.bottomMaxPrintWidthMm = c.bottomMaxPrintWidthMm;
    if (Array.isArray(c.finishes) && c.finishes.length) studio.finishes = c.finishes;

    const doc = {
      label: s.label,
      material: SATIN_STYLE_IDS.has(s.id) ? 'satin' : 'linen',
      embroidered: false,
      listImage: s.img,
      topDesignImage: c.topImage || null,
      bottomDesignImage: c.bottomImage || null,
      sides: { top: true, bottom: true },
      active: c.disabled === true ? false : true,
      sortOrder: (i + 1) * 10,
      productId: m.productId || null,
      sku: m.sku || null,
      productName: m.name || null,
      studio,
    };

    const ref = db.collection('studioKippot').doc(s.id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  ➕ ${s.id.padEnd(16)} ${s.label} · ${doc.material} · מוצר: ${doc.sku ?? '—'} · צד תחתון: ${doc.bottomDesignImage ? 'יש' : 'אין'}`);
      if (!DRY_RUN) await ref.set({ ...doc, createdAt: Date.now(), updatedAt: Date.now(), migratedFrom: 'code' });
      created++;
      continue;
    }
    // קיים — משלימים רק שדות חסרים, לא דורסים מה שנערך בדשבורד
    const cur = snap.data();
    const patch = {};
    for (const [k, v] of Object.entries(doc)) {
      if (cur[k] === undefined && v !== null) patch[k] = v;
    }
    if (Object.keys(patch).length) {
      console.log(`  ✏️  ${s.id.padEnd(16)} משלים שדות: ${Object.keys(patch).join(', ')}`);
      if (!DRY_RUN) await ref.update({ ...patch, updatedAt: Date.now() });
      completed++;
    } else {
      console.log(`  ✓  ${s.id.padEnd(16)} כבר קיים ומלא`);
      untouched++;
    }
  }

  console.log('─'.repeat(62));
  console.log(`נוצרו: ${created} · הושלמו: ${completed} · ללא שינוי: ${untouched}`);
  if (DRY_RUN) console.log('🧪 זו הייתה הרצת ניסיון. להרצה אמיתית: node scripts/migrateStudioKippot.mjs --live');
  else console.log('✅ המיגרציה הסתיימה. הכיפות מנוהלות מעכשיו מ-/admin/logo-studio → "כיפות והדמיה".');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
