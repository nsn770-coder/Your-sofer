import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n'); let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnv();
if (!getApps().length) initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer',
  clientEmail: (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i,'').trim(),
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g,'\n'),
})});
const db = getFirestore();

// ── All planned menu items ─────────────────────────────────────────────────────
// { section, col, label, cat, filter }
// filter=null means "whole category" — verified by cat count, no subCat needed
const PLAN = [
  // 1. בתי מזוזה
  { s:'בתי מזוזה', c:'קלפי מזוזה',  label:'כל הקלפים',         cat:'קלפי מזוזה',          filter:null },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'כל בתי המזוזה',     cat:'בתי מזוזה',            filter:null },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'מזוזות פולימר',     cat:'בתי מזוזה',            filter:'מזוזות פולימר' },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'מזוזות מתכת',       cat:'בתי מזוזה',            filter:'מזוזות מתכת' },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'מזוזות פלסטיק',     cat:'בתי מזוזה',            filter:'מזוזות פלסטיק' },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'מזוזות זכוכית',     cat:'בתי מזוזה',            filter:'מזוזות זכוכית' },
  { s:'בתי מזוזה', c:'בתי מזוזה',   label:'מזוזות עץ',         cat:'בתי מזוזה',            filter:'מזוזות עץ' },
  // 2. תפילין
  { s:'תפילין', c:'קלפים',          label:'קלפי מזוזה',        cat:'קלפי מזוזה',           filter:null },
  { s:'תפילין', c:'קלפים',          label:'קלפי תפילין',       cat:'קלפי תפילין',          filter:null },
  { s:'תפילין', c:'קלפים',          label:'תפילין קומפלט',     cat:'תפילין קומפלט',        filter:null },
  { s:'תפילין', c:'סטים ותיקים',   label:'כל הסטים',           cat:'סט טלית תפילין',       filter:null },
  { s:'תפילין', c:'סטים ותיקים',   label:'סטים עור מדומה',     cat:'סט טלית תפילין',       filter:'סטים עור מדומה' },
  { s:'תפילין', c:'סטים ותיקים',   label:'תיקים טרמי',         cat:'סט טלית תפילין',       filter:'תיקים טרמי' },
  { s:'תפילין', c:'סטים ותיקים',   label:'בתי תפילין',         cat:'סט טלית תפילין',       filter:'בתי תפילין' },
  { s:'תפילין', c:'סטים ותיקים',   label:'תיקי טלית ותפילין', cat:'תיקי טלית ותפילין',   filter:null },
  { s:'תפילין', c:'טלית וציצית',   label:'טליתות וציציות',    cat:'טליתות וציציות',       filter:null },
  { s:'תפילין', c:'טלית וציצית',   label:'גופיות ציצית',      cat:'טליתות וציציות',       filter:'גופיות ציצית' },
  { s:'תפילין', c:'טלית וציצית',   label:'טליתות',             cat:'טליתות וציציות',       filter:'טליתות' },
  // 3. כיפות
  { s:'כיפות', c:'כיפות',           label:'כל הכיפות',         cat:'כיפות',                filter:null },
  // 4. שבת
  { s:'שבת', c:'שבת',               label:'כל שבת',            cat:'שבת',                  filter:null },
  { s:'שבת', c:'שבת',               label:'פמוטים',             cat:'שבת',                  filter:'פמוטים' },
  { s:'שבת', c:'שבת',               label:'כיסויי חלה',        cat:'שבת',                  filter:'כיסויי חלה' },
  { s:'שבת', c:'שבת',               label:'כוסות קידוש',       cat:'שבת',                  filter:'כוסות קידוש' },
  { s:'שבת', c:'שבת',               label:'מלחיות ומצתים',     cat:'שבת',                  filter:'מצתים, מלחיות ומתקנים לגפרורים' },
  { s:'שבת', c:'שבת',               label:'קרשי חלה',          cat:'שבת',                  filter:'קרשי חלה, סכינים ומפיונים' },
  { s:'שבת', c:'שבת',               label:'כיסויי פלטה',       cat:'שבת',                  filter:'כיסויי פלטה' },
  { s:'שבת', c:'שבת',               label:'חתן וכלה',          cat:'שבת',                  filter:'חתן וכלה' },
  // 5. יודאיקה
  { s:'יודאיקה', c:'יומיומי',       label:'כל היודאיקה',       cat:'יודאיקה',              filter:null },
  { s:'יודאיקה', c:'יומיומי',       label:'נטלות',              cat:'יודאיקה',              filter:'נטילת ידיים ומים אחרונים' },
  { s:'יודאיקה', c:'יומיומי',       label:'ברכונים',            cat:'יודאיקה',              filter:'ברכונים' },
  { s:'יודאיקה', c:'יומיומי',       label:'מחזיקי מפתחות',     cat:'יודאיקה',              filter:'מחזיקי מפתחות' },
  { s:'יודאיקה', c:'יומיומי',       label:'קופות צדקה',        cat:'יודאיקה',              filter:'קופות צדקה' },
  { s:'יודאיקה', c:'יומיומי',       label:'הבדלה',              cat:'יודאיקה',              filter:'הבדלה' },
  { s:'יודאיקה', c:'יומיומי',       label:'דמויות חסידים',     cat:'יודאיקה',              filter:'דמויות חסידים' },
  { s:'יודאיקה', c:'יומיומי',       label:'חמסות וסגולות',     cat:'יודאיקה',              filter:'חמסות וסגולות' },
  { s:'יודאיקה', c:'חגים',          label:'פסח',                cat:'יודאיקה',              filter:'פסח' },
  { s:'יודאיקה', c:'חגים',          label:'חנוכה',              cat:'יודאיקה',              filter:'חנוכה' },
  { s:'יודאיקה', c:'חגים',          label:'חנוכיות',            cat:'יודאיקה',              filter:'חנוכיות' },
  { s:'יודאיקה', c:'חגים',          label:'ראש השנה',           cat:'יודאיקה',              filter:'ראש השנה' },
  { s:'יודאיקה', c:'חגים',          label:'פורים',              cat:'יודאיקה',              filter:'פורים' },
  { s:'יודאיקה', c:'חגים',          label:'סוכות',              cat:'יודאיקה',              filter:'סוכות' },
  { s:'יודאיקה', c:'עוד',           label:'סטים ומארזים',       cat:'יודאיקה',              filter:'סטים ומארזים' },
  { s:'יודאיקה', c:'עוד',           label:'מגנטים',             cat:'יודאיקה',              filter:'מגנטים' },
  { s:'יודאיקה', c:'עוד',           label:'עטים',               cat:'יודאיקה',              filter:'עטים' },
  { s:'יודאיקה', c:'עוד',           label:'קיטלים',             cat:'יודאיקה',              filter:'קיטלים' },
  // 6. תכשיטים
  { s:'תכשיטים', c:'תכשיטים',       label:'כל התכשיטים',       cat:'תכשיטים',              filter:null },
  // 7. מוצרי בית כנסת
  { s:'מוצרי בית כנסת', c:'',       label:'כל המוצרים',        cat:'מוצרי בית כנסת',       filter:null },
  // 8. ספרי קודש
  { s:'ספרי קודש', c:'',            label:'כל הספרים',         cat:'ספרי קודש וסידורים',   filter:null },
  { s:'ספרי קודש', c:'',            label:'סידורים ותהילים',   cat:'ספרי קודש וסידורים',   filter:'סידורים ותהילים' },
];

async function main() {
  // Load all active products once
  const snap = await db.collection('products').get();
  const catCounts = {};    // cat → count
  const subCounts = {};    // cat+|||+subCat → count

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.status !== 'active' || d.hidden === true) continue;
    const cat = d.cat || d.category || '__missing__';
    const sc  = d.subCategory || '__none__';
    catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    subCounts[`${cat}|||${sc}`] = (subCounts[`${cat}|||${sc}`] ?? 0) + 1;
  }

  console.log('\nבדיקת אימות — כל פריטי התפריט המתוכננים\n');
  console.log('  '.padEnd(20) + ' תת-קטגוריה/עמודה'.padEnd(22) + ' תווית'.padEnd(22) + ' filter (ערך מדויק)'.padEnd(44) + ' מוצרים  סטטוס');
  console.log('─'.repeat(130));

  const failed = [];

  for (const item of PLAN) {
    let count;
    if (item.filter === null) {
      count = catCounts[item.cat] ?? 0;
    } else {
      count = subCounts[`${item.cat}|||${item.filter}`] ?? 0;
    }

    const ok = count > 0;
    if (!ok) failed.push(item);

    const filterDisplay = item.filter ?? '(כל הקטגוריה)';
    const status = ok ? '✅' : '❌ ZERO';
    console.log(
      item.s.padEnd(20) +
      item.c.padEnd(22) +
      item.label.padEnd(22) +
      filterDisplay.padEnd(44) +
      String(count).padStart(6) + '   ' + status
    );
  }

  console.log('\n' + '─'.repeat(130));
  if (failed.length === 0) {
    console.log('✅ כל הפריטים מאומתים — אין אף ריק');
  } else {
    console.log(`❌ ${failed.length} פריטים עם 0 מוצרים:`);
    for (const f of failed) {
      console.log(`   ${f.s} / ${f.label} / filter="${f.filter ?? 'כל הקטגוריה'}"`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
