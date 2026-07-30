/**
 * reclassifySimchonimSubcats.mjs
 *
 * תתי-הקטגוריות שהגיעו מהספק הן דליי אירועים ("מזכרות לחתונה", "מתנות לגבר",
 * "כל המוצרים חדשים") ולא סוגי מוצר — 81 מוצרים נפלו לדלי חסר משמעות.
 * הסקריפט מסווג מחדש לפי סוג המוצר, שנגזר משם המוצר.
 *
 * הסיווג דטרמיניסטי: כלל ראשון שמתאים גובר, לכן הסדר משמעותי —
 * "מעמד ברכונים" חייב להיתפס כמעמד ולא כברכון.
 *
 * ⚠️ תת-הקטגוריות החדשות חייבות להיות רשומות ב-app/constants/categories.ts
 *    אחרת שבבי הסינון בעמוד הקטגוריה לא יציגו אותן.
 *
 * node app/scripts/reclassifySimchonimSubcats.mjs            # תצוגה
 * node app/scripts/reclassifySimchonimSubcats.mjs --fix      # ביצוע
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_FILE = 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json';
const sa = JSON.parse(readFileSync(resolve(__dirname, '../../', SA_FILE), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const fix = process.argv.includes('--fix');

/**
 * כללי סיווג — הראשון שמתאים גובר.
 * 'סידורים ותהילים' היא תת-קטגוריה קיימת באתר; שאר החדשות מתווספות ל-categories.ts.
 */
const RULES = [
  // מעמדים לפני הכל: "מעמד ברכונים" הוא רהיט, לא ברכון
  { sub: 'מעמדים וסטנדים', kw: ['מעמד', 'סטנד'] },
  { sub: 'הגדות פסח',       kw: ['הגדה', 'הגדות'] },
  { sub: 'מגילות אסתר',     kw: ['מגילה', 'מגילת'] },
  { sub: 'זמירות שבת',      kw: ['זמירות'] },
  { sub: 'ברכונים',         kw: ['ברכון', 'ברכת המזון', 'ובנה ירושלים', 'ברכת מעין'] },
  { sub: 'סידורים ותהילים', kw: ['סדור', 'סידור', 'תהלים', 'תהילים', 'מחזור', 'סליחות'] },
];

/** ברירת מחדל: קונטרסים, מתקפלים ותפילות בודדות */
const FALLBACK = 'תפילות ותחינות';

function classify(name) {
  const n = name || '';
  for (const r of RULES) {
    if (r.kw.some(k => n.includes(k))) return r.sub;
  }
  return FALLBACK;
}

async function main() {
  const snap = await db.collection('products').where('supplier', '==', 'simchonim').get();
  console.log(`\n📦 ${snap.size} מוצרי סימחונים\n`);

  const buckets = new Map();
  const todo = [];

  snap.forEach(d => {
    const p = d.data();
    const sub = classify(p.name);

    if (!buckets.has(sub)) buckets.set(sub, []);
    buckets.get(sub).push(p.name);

    if (p.subCategory !== sub) {
      todo.push({ ref: d.ref, name: p.name, from: p.subCategory, to: sub });
    }
  });

  console.log('סיווג חדש:\n');
  [...buckets.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([sub, names]) => {
      console.log(`${String(names.length).padStart(4)}  ${sub}`);
      names.slice(0, 5).forEach(n => console.log(`        · ${n}`));
      if (names.length > 5) console.log(`        … ועוד ${names.length - 5}`);
      console.log('');
    });

  console.log(`🔄 ${todo.length} מוצרים ישונו\n`);

  if (!fix) {
    console.log('💡 לביצוע:  node app/scripts/reclassifySimchonimSubcats.mjs --fix');
    return;
  }

  let n = 0;
  for (let i = 0; i < todo.length; i += 400) {
    const batch = db.batch();
    for (const t of todo.slice(i, i + 400)) {
      batch.set(t.ref, {
        subCategory: t.to,
        // שומרים את הדלי המקורי של הספק — שימושי לאיתור ולתיקון ידני
        supplier_subCategory: t.from ?? null,
      }, { merge: true });
      n++;
    }
    await batch.commit();
    console.log(`   ${n}/${todo.length}`);
  }

  console.log(`\n✅ ${n} מוצרים סווגו מחדש`);
  console.log('⚠️  להריץ:  node scripts/syncAlgolia.mjs');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
