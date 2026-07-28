/**
 * READ-ONLY analysis — does NOT modify any data.
 * Counts products per category/subCategory for all life events.
 * Run: node scripts/analyzeLifeEvents.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const lines = raw.split('\n');
    let key = null, val = '';
    for (const line of lines) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {}
}
loadEnvLocal();

const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';

if (getApps().length === 0) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ── Life event definitions (mirrors data/lifeEvents.ts after edits) ──────────
const EVENTS = [
  {
    id: 'new-home',
    title: 'בית חדש',
    relatedCategories: [
      { category: 'קלפי מזוזה',   subCategories: 'all' },
      { category: 'בתי מזוזה',    subCategories: 'all' },
      { category: 'עיצוב הבית',   subCategories: ['אגרטלים', 'מראות', 'מסגרות תמונה', 'עיטורים וזרים'] },
    ],
  },
  {
    id: 'shabbat-home',
    title: 'שבת בבית',
    relatedCategories: [
      { category: 'שבת',                subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['הבדלה'] },
      { category: 'כלי שולחן והגשה',   subCategories: ['כוסות', 'קנקנים'] },
      { category: 'עיצוב הבית',         subCategories: ['פמוטים', 'מעמדות לנר'] },
    ],
  },
  {
    id: 'bar-mitzvah',
    title: 'בר מצווה',
    relatedCategories: [
      { category: 'סט טלית תפילין',      subCategories: 'all' },
      { category: 'תפילין קומפלט',        subCategories: 'all' },
      { category: 'כיסוי תפילין',         subCategories: 'all' },
      { category: 'תיקי טלית ותפילין',   subCategories: 'all' },
      { category: 'קלפי תפילין',          subCategories: 'all' },
      { category: 'בר מצווה',             subCategories: 'all' },
      { category: 'כיפות',               subCategories: 'all' },
      { category: 'טליתות וציציות',       subCategories: 'all' },
    ],
  },
  {
    id: 'wedding',
    title: 'חתונה',
    relatedCategories: [
      { category: 'סט טלית תפילין',  subCategories: 'all' },
      { category: 'טליתות וציציות',   subCategories: 'all' },
      { category: 'תכשיטים',          subCategories: 'all' },
      { category: 'עיצוב הבית',       subCategories: ['פמוטים'] },
    ],
  },
  {
    id: 'new-baby',
    title: 'לידה ומשפחה',
    relatedCategories: [
      { category: 'בתי מזוזה',          subCategories: 'all' },
      { category: 'כיפות',              subCategories: 'all' },
      { category: 'ספרי קודש וסידורים', subCategories: 'all' },
      { category: 'מתנות',              subCategories: 'all' },
      { category: 'יודאיקה',            subCategories: ['דמויות חסידים', 'מגנטים'] },
    ],
  },
  {
    id: 'holidays',
    title: 'חגים וזמנים',
    relatedCategories: [
      {
        category: 'יודאיקה',
        subCategories: ['פסח', 'חנוכה', 'חנוכיות', 'ראש השנה', 'פורים', 'סוכות', 'הבדלה'],
      },
    ],
  },
  {
    id: 'reconnect',
    title: 'להתחבר מחדש',
    relatedCategories: [
      { category: 'קלפי מזוזה',          subCategories: 'all' },
      { category: 'תפילין קומפלט',        subCategories: 'all' },
      { category: 'טליתות וציציות',       subCategories: 'all' },
      { category: 'ספרי קודש וסידורים',  subCategories: 'all' },
      { category: 'מוצרי בית כנסת',      subCategories: 'all' },
      { category: 'מגילות',              subCategories: 'all' },
      { category: 'ספרי תורה',           subCategories: 'all' },
    ],
  },
];

async function main() {
  console.log('\n🔍 שולף מוצרים מ-Firestore (קריאה בלבד)...\n');
  const snap = await db.collection('products').get();
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.hidden !== true);

  console.log(`סה"כ מוצרים פעילים: ${products.length}\n`);

  // Build lookup: cat → products
  const bycat = {};
  for (const p of products) {
    const c = p.cat ?? '(ריק)';
    if (!bycat[c]) bycat[c] = [];
    bycat[c].push(p);
  }

  // Summary row per event
  const summaryRows = [];

  for (const event of EVENTS) {
    console.log('='.repeat(68));
    console.log(`${event.title} (${event.id})`);
    console.log('='.repeat(68));
    console.log(`${'קטגוריה'.padEnd(22)} ${'subCategory'.padEnd(24)} ${'כמות'.padStart(6)}`);
    console.log('-'.repeat(55));

    const seenIds = new Set();
    let eventTotal = 0;

    for (const cf of event.relatedCategories) {
      const catProducts = bycat[cf.category] ?? [];

      if (cf.subCategories === 'all') {
        const subMap = {};
        for (const p of catProducts) {
          const sub = p.subCategory || '(ללא subCategory)';
          subMap[sub] = (subMap[sub] ?? 0) + 1;
          seenIds.add(p.id);
        }
        const total = catProducts.length;
        eventTotal += total;
        const subs = Object.entries(subMap).sort((a, b) => b[1] - a[1]);
        console.log(`${cf.category.padEnd(22)} ${'[הכל]'.padEnd(24)} ${String(total).padStart(6)}`);
        for (const [sub, cnt] of subs) {
          console.log(`${''.padEnd(22)}   ${sub.padEnd(21)} ${String(cnt).padStart(6)}`);
        }
      } else {
        for (const sub of cf.subCategories) {
          const matching = catProducts.filter(p => p.subCategory === sub);
          const count = matching.length;
          for (const p of matching) seenIds.add(p.id);
          eventTotal += count;
          console.log(`${cf.category.padEnd(22)} ${sub.padEnd(24)} ${String(count).padStart(6)}`);
        }
      }
    }

    const deduped = seenIds.size;
    console.log('-'.repeat(55));
    if (deduped !== eventTotal) {
      console.log(`${'סה"כ (לפני דה-דופ)'.padEnd(46)} ${String(eventTotal).padStart(6)}`);
      console.log(`${'סה"כ (אחרי דה-דופ)'.padEnd(46)} ${String(deduped).padStart(6)}`);
    } else {
      console.log(`${'סה"כ'.padEnd(46)} ${String(eventTotal).padStart(6)}`);
    }
    console.log('');

    summaryRows.push({ title: event.title, raw: eventTotal, deduped });
  }

  // Summary table
  console.log('='.repeat(55));
  console.log('סיכום כל האירועים');
  console.log('='.repeat(55));
  console.log(`${'אירוע'.padEnd(20)} ${'לפני דה-דופ'.padStart(12)} ${'אחרי דה-דופ'.padStart(13)}`);
  console.log('-'.repeat(48));
  for (const r of summaryRows) {
    const diff = r.raw !== r.deduped ? ` (−${r.raw - r.deduped})` : '';
    console.log(`${r.title.padEnd(20)} ${String(r.raw).padStart(12)} ${String(r.deduped).padStart(13)}${diff}`);
  }
  console.log('='.repeat(55));

  process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
