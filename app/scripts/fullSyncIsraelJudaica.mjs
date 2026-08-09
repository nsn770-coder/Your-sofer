/**
 * fullSyncIsraelJudaica.mjs
 *
 * sync מלא מול israel-judaica.com:
 *   1. גלה קטגוריות חדשות אצל הספק (probe codes)
 *   2. שלוף כל SKUs מהספק
 *   3. מוצרים שהיו אצלנו ועכשיו אין → מחק Firestore + Cloudinary
 *   4. מוצרים חדשים שיש אצל הספק ואין אצלנו → ייבא
 *
 * Usage:
 *   node app/scripts/fullSyncIsraelJudaica.mjs --dry-run      ← תצוגה בלבד
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute      ← ביצוע
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute --skip-delete  ← ייבוא בלי מחיקה
 *   node app/scripts/fullSyncIsraelJudaica.mjs --execute --skip-import  ← מחיקה בלי ייבוא
 *
 * מצב ייבוא-חדשים-בלבד (07/2026):
 *   node app/scripts/fullSyncIsraelJudaica.mjs --import-only            ← DRY-RUN: מפיק CSV מועמדים
 *   node app/scripts/fullSyncIsraelJudaica.mjs --import-only --execute  ← ייבוא חדשים בלבד כ-draft
 *
 *   ב---import-only:
 *     • אין מחיקה ואין עדכון מוצרים קיימים — הוספת חדשים בלבד
 *     • חדשים נוצרים עם status:'draft'
 *     • rawProduct.arrive_date → comingSoon + expectedArrivalDate ("מגיע בקרוב")
 *     • העשרה עם לוגין ספק (Playwright): מחיר סוחר + "נמכר באריזה של X יחידות"
 *       (SUPPLIER_EMAIL / SUPPLIER_PASSWORD ב-.env.local; --no-enrich לדילוג)
 *     • DRY-RUN כותב scripts/new-products-candidates-<תאריך>.csv
 *     • EXECUTE כותב לוג scripts/import-log-<תאריך>.json
 *
 * דגלים נוספים (07/2026):
 *   --codes=1152,1153,1154,1155,1156,1157,1158,1159  ← קטגוריות ספציפיות בלבד
 *       (מדלג על גילוי קטגוריות; מחיקה נחסמת אוטומטית לבטיחות)
 *   --price-mult=2  ← מחיר מכירה = ספק × 2, מחיר מחוק = ספק × 2.5
 *       (ללא הדגל: הנוסחה הרגילה ×1.568 / ×1.96)
 *   תיאור: נשלף אוטומטית מ"פרטי המוצר" (חומר/צבע/גודל) בשלב ההעשרה → שדה description
 *
 * דוגמה — ייבוא כל בתי המזוזה עם מחיר כפול:
 *   node app/scripts/fullSyncIsraelJudaica.mjs --import-only --codes=1152,1153,1154,1155,1156,1157,1158,1159 --price-mult=2
 *   node app/scripts/fullSyncIsraelJudaica.mjs --import-only --codes=1152,1153,1154,1155,1156,1157,1158,1159 --price-mult=2 --execute
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue }      from 'firebase-admin/firestore';
import { readFileSync, writeFileSync }   from 'fs';
import { resolve, dirname }              from 'path';
import { fileURLToPath }                 from 'url';
import crypto                            from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '../..');

// ── CLI ───────────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const EXECUTE     = args.includes('--execute');
const IMPORT_ONLY = args.includes('--import-only');
const NO_ENRICH   = args.includes('--no-enrich');
// --codes=1153,1155  ← הרצה על קטגוריות ספציפיות בלבד (מדלג על גילוי קטגוריות חדשות)
const codesArg    = args.find(a => a.startsWith('--codes='));
const ONLY_CODES  = codesArg ? new Set(codesArg.split('=')[1].split(',').map(s => s.trim())) : null;

// בטיחות: עם --codes אסור למחוק — רשימת הספק חלקית וכל השאר ייראה כ"פסק"
const SKIP_DELETE = args.includes('--skip-delete') || IMPORT_ONLY || !!ONLY_CODES;
const SKIP_IMPORT = args.includes('--skip-import');
const DRY_RUN     = !EXECUTE;

// --price-mult=2  ← מחיר מכירה = מחיר ספק × N (ברירת מחדל: הנוסחה הרגילה 1.4×1.12)
const multArg     = args.find(a => a.startsWith('--price-mult='));
const PRICE_MULT  = multArg ? parseFloat(multArg.split('=')[1]) : null;
if (multArg && (!PRICE_MULT || PRICE_MULT <= 0)) { console.error('❌ --price-mult לא תקין'); process.exit(1); }
if (ONLY_CODES) console.log(`🎯 הרצה על קטגוריות: ${[...ONLY_CODES].join(', ')}`);
if (PRICE_MULT) console.log(`💰 מכפיל מחיר: ×${PRICE_MULT} (מחיר מחוק: ×${(PRICE_MULT * 1.25).toFixed(2)})`);

if (IMPORT_ONLY) console.log('🛡️  IMPORT-ONLY — ללא מחיקות וללא עדכון מוצרים קיימים. חדשים בלבד (draft).\n');

if (DRY_RUN) console.log('🧪  DRY-RUN — Firestore/Cloudinary לא יעודכנו. הוסף --execute להרצה.\n');

// ── Env vars ──────────────────────────────────────────────────────────────────
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv(resolve(ROOT, '.env.local'));
loadEnv(resolve(ROOT, '.env.israel-judaica'));

const CLOUDINARY_CLOUD    = 'dyxzq3ucy';
const CLOUDINARY_API_KEY  = process.env.CLOUDINARY_API_KEY  || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const UPLOAD_PRESET       = 'yoursofer_upload';
const BASE_URL            = 'https://www.israel-judaica.com';
const LANG                = 'he';
const BATCH               = 100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Firebase ──────────────────────────────────────────────────────────────────
const SA_PATH = resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

// ── Known category map ────────────────────────────────────────────────────────
const CATEGORY_MAP = [
  // קטגוריות קולקציה חדשות (07/2026) — בראש המפה בכוונה: מוצר שנמצא גם
  // בקטגוריית-אם וגם בקולקציה יקבל את שיוך הקולקציה (first-occurrence wins)
  { code: '1194', label: 'קולקציית דבשיות לראש השנה',      cat: 'חגים',                subCategory: 'דבשיות לראש השנה' },
  { code: '1195', label: 'קולקציית צלחות סימני ראש השנה',  cat: 'חגים',                subCategory: 'צלחות סימני ראש השנה' },
  { code: '1197', label: 'קולקציית סכיני חלה לראש השנה',   cat: 'חגים',                subCategory: 'סכיני חלה לראש השנה' },
  { code: '1196', label: 'קולקציית סוכות',                  cat: 'חגים',                subCategory: 'סוכות' },
  { code: '1198', label: 'סטים לטלית מעור אמיתי',           cat: 'תיקי טלית ותפילין',  subCategory: 'סטים לטלית מעור אמיתי' },
  { code: '1116', label: 'הפרשת חלה',          cat: 'שבת',                subCategory: 'הפרשת חלה' },
  { code: '1118', label: 'ברכות',               cat: 'יודאיקה',            subCategory: 'ברכונים' },
  { code: '1119', label: 'חמסות וסגולות',        cat: 'יודאיקה',            subCategory: 'חמסות וסגולות' },
  { code: '1121', label: 'גופיות ציצית',          cat: 'טליתות',             subCategory: 'גופיות ציצית' },
  { code: '1122', label: 'גביעי קידוש פלסטיק',   cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1123', label: 'גביעי קידוש קריסטל',   cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1124', label: 'גביעי קידוש מתכת',     cat: 'שבת',                subCategory: 'כוסות קידוש' },
  { code: '1125', label: 'מחלקי יין ואביזרים',   cat: 'שבת',                subCategory: 'מחלקי יין' },
  { code: '1127', label: 'דמויות חסידים',         cat: 'יודאיקה',            subCategory: 'דמויות חסידים' },
  { code: '1129', label: 'חנוכה',               cat: 'חגים',               subCategory: 'חנוכה' },
  { code: '1130', label: 'סוכות',               cat: 'חגים',               subCategory: 'סוכות' },
  { code: '1131', label: 'פורים',               cat: 'חגים',               subCategory: 'פורים' },
  { code: '1132', label: 'פסח',                 cat: 'חגים',               subCategory: 'פסח' },
  { code: '1133', label: 'ראש השנה',             cat: 'חגים',               subCategory: 'ראש השנה' },
  { code: '1135', label: 'בתי תפילין',           cat: 'יודאיקה',            subCategory: 'בתי תפילין' },
  { code: '1136', label: 'תיקי טלית',            cat: 'טליתות',             subCategory: 'תיקי טלית' },
  { code: '1137', label: 'מחזיקי טלית',          cat: 'טליתות',             subCategory: 'מחזיקי טלית' },
  { code: '1138', label: 'טליתות',               cat: 'טליתות',             subCategory: 'טלית גדול' },
  { code: '1139', label: 'סטים טלית תפילין',     cat: 'טליתות',             subCategory: 'סט טלית תפילין' },
  { code: '1143', label: 'כיפות סרוגות',         cat: 'כיפות',              subCategory: 'סרוגות' },
  { code: '1144', label: 'כיפות סאטן וטרילין',   cat: 'כיפות',              subCategory: 'סאטן וטריקלין' },
  { code: '1145', label: 'כיפות קטיפה',          cat: 'כיפות',              subCategory: 'קטיפה' },
  { code: '1146', label: 'כיפות סרוגות עם רקמה', cat: 'כיפות',              subCategory: 'סרוגות עם רקמה' },
  { code: '1147', label: 'כיפות מיוחדות',        cat: 'כיפות',              subCategory: 'כיפות מיוחדות' },
  { code: '1148', label: 'כיפות עור',            cat: 'כיפות',              subCategory: 'עור' },
  { code: '1149', label: 'כיפות פריק',           cat: 'כיפות',              subCategory: 'פריק' },
  { code: '1150', label: 'סיכות לכיפה',          cat: 'כיפות',              subCategory: 'סיכות כיפה' },
  { code: '1151', label: 'כיפות סרוגות DMC',     cat: 'כיפות',              subCategory: 'סרוגות ד.מ.צ.' },
  { code: '1153', label: 'מזוזות זכוכית',         cat: 'בתי מזוזה',          subCategory: 'מזוזות זכוכית' },
  { code: '1154', label: 'מזוזות אלומיניום',      cat: 'בתי מזוזה',          subCategory: 'מזוזות אלומיניום' },
  { code: '1155', label: 'מזוזות פולירזין',       cat: 'בתי מזוזה',          subCategory: 'מזוזות פולירזין' },
  { code: '1156', label: 'מזוזות לרכב',           cat: 'בתי מזוזה',          subCategory: 'מזוזות לרכב' },
  { code: '1157', label: 'מזוזות מתכת',           cat: 'בתי מזוזה',          subCategory: 'מזוזות מתכת' },
  { code: '1158', label: 'מזוזות עץ',             cat: 'בתי מזוזה',          subCategory: 'מזוזות עץ' },
  { code: '1159', label: 'מזוזות פלסטיק',         cat: 'בתי מזוזה',          subCategory: 'מזוזות פלסטיק' },
  { code: '1160', label: 'מוצרי בית כנסת',        cat: 'יודאיקה',            subCategory: 'מוצרי בית כנסת' },
  { code: '1161', label: 'מנורות',               cat: 'יודאיקה',            subCategory: 'מנורות' },
  { code: '1163', label: 'מגנטים',               cat: 'יודאיקה',            subCategory: 'מגנטים' },
  { code: '1164', label: 'מחזיקי מפתחות',         cat: 'יודאיקה',            subCategory: 'מחזיקי מפתחות' },
  { code: '1165', label: 'נטילת ידיים',           cat: 'יודאיקה',            subCategory: 'נטילת ידיים' },
  { code: '1166', label: 'סידורים ותהילים',       cat: 'יודאיקה',            subCategory: 'סידורים ותהילים' },
  { code: '1167', label: 'עטים',                 cat: 'יודאיקה',            subCategory: 'עטים' },
  { code: '1168', label: 'פמוטים',               cat: 'שבת',                subCategory: 'פמוטים' },
  { code: '1169', label: 'קופות צדקה',            cat: 'יודאיקה',            subCategory: 'קופות צדקה' },
  { code: '1171', label: 'כיסויי חלה',            cat: 'שבת',                subCategory: 'כיסויי חלה' },
  { code: '1172', label: 'כיסויי פלטה',           cat: 'שבת',                subCategory: 'כיסויי פלטה' },
  { code: '1173', label: 'מפות שולחן',            cat: 'שבת',                subCategory: 'מפות שולחן' },
  { code: '1174', label: 'קרשי חלה וסכינים',      cat: 'שבת',                subCategory: 'קרשי חלה' },
  { code: '1175', label: 'מלחיות',               cat: 'שבת',                subCategory: 'מלחיות' },
  { code: '1177', label: 'צמידים וטבעות',         cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1178', label: 'תכשיטי כסף טהור',       cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1180', label: 'נירוסטה ורודיום',       cat: 'יודאיקה',            subCategory: 'תכשיטים' },
  { code: '1181', label: 'כיפות פריק עבודת יד',   cat: 'כיפות',              subCategory: 'פריק עבודת יד' },
  { code: '1184', label: 'תיקי תפילין',           cat: 'טליתות',             subCategory: 'תיקי תפילין' },
  { code: '1185', label: 'קיטלים',               cat: 'יודאיקה',            subCategory: 'קיטלים' },
  { code: '1187', label: 'ברכונים',              cat: 'יודאיקה',            subCategory: 'ברכונים' },
  { code: '1193', label: 'גביעי קידוש פולימר',   cat: 'שבת',                subCategory: 'כוסות קידוש' },

  // ── קטגוריות שהספק הוסיף ולא היו במפה (08/2026) ───────────────────────
  // התגלו בהשוואה מול טאב "מוצרים חדשים" שלהם: 186 מוצרים שמעולם לא נסרקו,
  // כי הסנכרון עובד לפי רשימת קודים קבועה. קטגוריה חדשה אצל הספק פשוט
  // לא קיימת בשבילנו עד שמוסיפים אותה כאן.
  { code: '1199', label: 'סכינים',                cat: 'שבת',      subCategory: 'קרשי חלה, סכינים ומפיונים' },
  { code: '1200', label: 'מזוזות אקריליק',        cat: 'בתי מזוזה', subCategory: 'מזוזות פלסטיק' },
  { code: '1201', label: 'מוצרי האש שלי',         cat: 'יודאיקה',  subCategory: 'סטים ומארזים' },
  { code: '1202', label: 'מוצרי חב"ד',            cat: 'יודאיקה',  subCategory: 'סטים ומארזים' },
  { code: '1126', label: 'הבדלה',                 cat: 'יודאיקה',  subCategory: 'הבדלה' },
  { code: '1140', label: 'ילדים',                 cat: 'יודאיקה',  subCategory: 'מוצרים לילדים' },
  { code: '1141', label: 'כריות לברית',           cat: 'יודאיקה',  subCategory: 'כריות לברית' },
  { code: '1183', label: 'אביזרי תצוגה',          cat: 'יודאיקה',  subCategory: 'אביזרי תצוגה' },
];

// ── Supplier API ──────────────────────────────────────────────────────────────
async function fetchBatch(categoryCode, offset) {
  const body = new URLSearchParams({
    category: categoryCode, filterChoices: '[]',
    limit: String(BATCH), offset: String(offset),
    sortValue: '', sortDirection: '', note: '', search_term: '',
  });
  const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts&lang=${LANG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.status) return {};
  return json.products || {};
}

async function fetchAllSkusForCode(code) {
  const collected = {};
  let offset = 0;
  while (true) {
    const batch = await fetchBatch(code, offset);
    const keys = Object.keys(batch);
    if (!keys.length) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(300);
  }
  return collected;
}

/**
 * רשת ביטחון: טאב "מוצרים חדשים" של הספק.
 *
 * הסנכרון עובד לפי CATEGORY_MAP — רשימת קודים קבועה. כשהספק מוסיף קטגוריה
 * חדשה היא פשוט לא קיימת בשבילנו, וכל המוצרים שבה נעלמים. כך פספסנו 186
 * מוצרים (08/2026), רובם בקטגוריות סכינים ומזוזות אקריליק שנוספו אצלם.
 *
 * הטאב הזה הוא סינון רוחבי מעל כל הקטגוריות (special_type=new_arrival),
 * ולכן הוא תופס גם מה שאיננו מכירים. כישלון כאן אינו קריטי — הסנכרון
 * הרגיל ממשיך כרגיל.
 */
async function fetchNewArrivals() {
  const collected = {};
  let offset = 0;
  while (true) {
    const body = new URLSearchParams({
      category: '', filterChoices: '[]',
      special_type: 'new_arrival',
      limit: String(BATCH), offset: String(offset),
      sortValue: '', sortDirection: '', note: '', search_term: '',
    });
    let json;
    try {
      const res = await fetch(`${BASE_URL}/index.php?option=com_art&task=category.getProducts&lang=${LANG}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) break;
      json = await res.json();
    } catch { break; }
    if (!json?.status) break;
    const batch = json.products || {};
    const keys = Object.keys(batch);
    if (!keys.length) break;
    for (const [sku, p] of Object.entries(batch)) collected[sku] = p;
    if (keys.length < BATCH) break;
    offset += BATCH;
    await sleep(300);
  }
  return collected;
}

async function fetchHebName(sku) {
  try {
    const res = await fetch(
      `${BASE_URL}/index.php?option=com_art&task=search.searchTerm&lang=${LANG}&term=${encodeURIComponent(sku)}`
    );
    if (!res.ok) return null;
    const arr = await res.json();
    const hit = Array.isArray(arr) ? arr.find(p => p.sku === sku) : null;
    return hit ? { name: hit.name || null } : null;
  } catch { return null; }
}

function buildImgUrl(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  return `${BASE_URL}/${ext === 'webp' ? 'webp' : 'big'}/${filename}`;
}

/**
 * rawProduct.arrive_date → תאריך צפי הגעה ("מגיע בקרוב").
 * "0000-00-00" = אין. מחזיר 'YYYY-MM-DD' רק אם התאריך עתידי (עבר = כבר הגיע).
 */
function parseArriveDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || m[1] === '0000') return null;
  const today = new Date().toISOString().slice(0, 10);
  return raw > today ? raw : null;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' לתצוגה */
function formatArriveDate(iso) {
  if (!iso) return '';
  const [y, mo, d] = iso.split('-');
  return `${d}/${mo}/${y}`;
}

// ── Cloudinary helpers ────────────────────────────────────────────────────────
function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) return null;
  // Strip transforms: /upload/v123/  or  /upload/f_auto,.../
  const match = cloudinaryUrl.match(/\/upload\/(?:[^/]+\/)?(.+?)(?:\.[a-z]+)?$/i);
  return match ? match[1] : null;
}

async function uploadToCloudinary(imageUrl) {
  const form = new FormData();
  form.append('file', imageUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'Cloudinary upload failed');
  return data.secure_url;
}

async function deleteFromCloudinary(publicId) {
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log(`    ⚠️  אין CLOUDINARY_API_KEY/SECRET — דלג מחיקה: ${publicId}`);
    return false;
  }
  const timestamp = Math.round(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');
  const form = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: CLOUDINARY_API_KEY, signature });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/destroy`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString(),
  });
  const json = await res.json();
  return json.result === 'ok';
}

// ── Enrichment: dealer login → prices + pack sizes (Playwright) ───────────────
// מבוסס על scripts/scrapePackSizes.mjs (לוגין #btl + regex "נמכר באריזה של X יחידות")
const ENRICH_CACHE_PATH = resolve(__dirname, '../../scripts/ij-new-enrichment-cache.json');

function loadEnrichCache() {
  try { return JSON.parse(readFileSync(ENRICH_CACHE_PATH, 'utf8')); } catch { return {}; }
}

async function enrichNewProducts(newSkus) {
  // newSkus: Array<[sku, { catEntry, rawProduct }]>
  const cache = loadEnrichCache();
  const result = new Map(Object.entries(cache).map(([k, v]) => [k, v]));
  // entry ישן בלי description נחשב pending (נוסף 07/2026)
  const pending = newSkus.filter(([sku]) => !cache[sku] || cache[sku].description === undefined);

  if (NO_ENRICH) {
    console.log('  ⏭  --no-enrich — דילוג העשרה (מחיר סוחר/כמות באריזה)');
    return result;
  }
  if (pending.length === 0) {
    console.log(`  ✅ העשרה: הכל ב-cache (${result.size} מוצרים)`);
    return result;
  }

  const EMAIL    = process.env.SUPPLIER_EMAIL;
  const PASSWORD = process.env.SUPPLIER_PASSWORD;
  if (!EMAIL || !PASSWORD) {
    console.log('  ⚠️  חסרים SUPPLIER_EMAIL/SUPPLIER_PASSWORD ב-.env.local — ממשיך ללא העשרה');
    return result;
  }

  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { console.log('  ⚠️  playwright לא מותקן — ממשיך ללא העשרה'); return result; }

  console.log(`\n══ העשרה: מחיר סוחר + כמות באריזה (${pending.length} מוצרים חדשים) ══\n`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // login (same flow as scrapePackSizes.mjs)
    await page.goto(`${BASE_URL}/index.php?lang=he`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.fill('#btl-input-username', EMAIL);
    await page.fill('#btl-input-password', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.$eval('.btl-formlogin input[type=submit]', el => el.click()),
    ]);
    const loggedIn = await page.$eval('body', b => /שלום|התנתק|חשבון שלי|יציאה/i.test(b.innerText));
    if (!loggedIn) throw new Error('אימות התחברות נכשל');
    console.log('  ✅ התחברות ספק הצליחה');

    // 1) מחירי סוחר בבת אחת: קריאת ה-API מתוך הדפדפן (עם session) לכל קטגוריה רלוונטית
    const neededCodes = [...new Set(pending.map(([, { catEntry }]) => catEntry.code))];
    const dealerPrices = {};
    console.log(`  💰 שולף מחירי סוחר מ-${neededCodes.length} קטגוריות...`);
    for (const code of neededCodes) {
      let offset = 0;
      while (true) {
        const products = await page.evaluate(async ({ code, offset, limit }) => {
          const body = new URLSearchParams({
            category: code, filterChoices: '[]', limit: String(limit), offset: String(offset),
            sortValue: '', sortDirection: '', note: '', search_term: '',
          });
          const r = await fetch('/index.php?option=com_art&task=category.getProducts&lang=he', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(),
          });
          const j = await r.json();
          return j.status ? (j.products || {}) : {};
        }, { code, offset, limit: BATCH });
        const keys = Object.keys(products);
        if (!keys.length) break;
        for (const [sku, p] of Object.entries(products)) {
          const n = parseFloat(p.price);
          if (!isNaN(n) && n > 0) dealerPrices[sku] = n;
        }
        if (keys.length < BATCH) break;
        offset += BATCH;
        await sleep(250);
      }
      await sleep(300);
    }
    console.log(`  💰 נמצאו מחירים ל-${Object.keys(dealerPrices).length} SKUs`);

    // 2) כמות באריזה + תיאור (פרטי המוצר) — דף מוצר לכל מוצר חדש (resumable cache)
    let sinceFlush = 0;
    for (let i = 0; i < pending.length; i++) {
      const [sku, { catEntry, rawProduct }] = pending[i];
      let entry = { price: dealerPrices[sku] ?? null, packSize: 1, description: null };
      try {
        // sku= לא תמיד מרנדר; code=<product_code>&Itemid=280 הוא הקישור שהאתר עצמו משתמש בו
        const prodUrl = rawProduct?.product_code
          ? `${BASE_URL}/index.php?option=com_art&view=product&code=${rawProduct.product_code}&Itemid=280&lang=he`
          : `${BASE_URL}/index.php?option=com_art&view=product&sku=${sku}&lang=he`;
        await page.goto(prodUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
        const bodyText = await page.evaluate(() => document.body.innerText);
        const m = bodyText.match(/נמכר באריזה של\s*(\d+)\s*יחידות/);
        if (m) entry.packSize = Number(m[1]);

        // תיאור מתוך "פרטי המוצר": חומר / צבע / גודל / משקל
        const block = bodyText.split('פרטי המוצר')[1]?.split(/פריטים נבחרים|Previous/)[0] || '';
        const attr = (label) => block.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`))?.[1]?.trim() || null;
        const material = attr('חומר'), color = attr('צבע'), size = attr('גודל');
        if (material || color || size) {
          const parts = [];
          if (catEntry?.cat === 'בתי מזוזה') {
            parts.push(/לרכב/.test(catEntry?.subCategory || '') ? 'מזוזה לרכב' : 'בית מזוזה מהודר');
          }
          if (material) parts.push(`עשוי ${material}`);
          if (color)    parts.push(`בצבע ${color}`);
          if (size)     parts.push(`בגודל ${size} ס"מ`);
          entry.description = `${parts.join(' ')}. מבית ארט יודאיקה — עיצוב איכותי ועמיד לבית היהודי.`;
        }
      } catch (e) {
        process.stdout.write(`  ⚠️  ${sku}: ${e.message}\n`);
      }
      result.set(sku, entry);
      cache[sku] = entry;
      sinceFlush++;
      if (sinceFlush >= 25) {
        writeFileSync(ENRICH_CACHE_PATH, JSON.stringify(cache, null, 2));
        sinceFlush = 0;
      }
      process.stdout.write(`  [${i + 1}/${pending.length}] ${sku} — ₪${entry.price ?? '?'} | אריזה: ${entry.packSize}\r`);
      await sleep(600);
    }
    writeFileSync(ENRICH_CACHE_PATH, JSON.stringify(cache, null, 2));
    console.log(`\n  💾 cache: ${ENRICH_CACHE_PATH}`);
  } catch (e) {
    console.log(`\n  ⚠️  העשרה נכשלה (${e.message}) — ממשיך עם מה שנאסף`);
    writeFileSync(ENRICH_CACHE_PATH, JSON.stringify(cache, null, 2));
  } finally {
    await browser.close();
  }
  return result;
}

// ── CSV of new-product candidates (dry-run deliverable) ──────────────────────
function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCandidatesCsv(rows) {
  const header = ['קוד UK', 'שם', 'תיאור', 'מחיר ספק', 'מחיר אצלנו', 'מחיר מחוק', 'מגיע בקרוב', 'תאריך צפי', 'כמות באריזה', 'קטגוריה', 'תת-קטגוריה', 'תמונה'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.sku, r.name, r.description ?? '', r.purchasePrice ?? '', r.price ?? '', r.was ?? '',
      r.comingSoon ? 'כן' : '', r.comingSoon ? formatArriveDate(r.expectedArrivalDate) : '',
      r.packSize ?? 1, r.category, r.subCategory, r.imgUrl ?? '',
    ].map(csvEscape).join(','));
  }
  const path = resolve(__dirname, `../../scripts/new-products-candidates-${new Date().toISOString().slice(0, 10)}.csv`);
  writeFileSync(path, '﻿' + lines.join('\n')); // BOM לעברית באקסל
  return path;
}

// ── Phase 1: Discover new categories ─────────────────────────────────────────
async function discoverNewCategories() {
  console.log('\n══ שלב 1: חיפוש קטגוריות חדשות (קודים 1199–1250) ══\n');
  const knownCodes = new Set(CATEGORY_MAP.map(c => c.code));
  const newCats = [];

  for (let code = 1199; code <= 1250; code++) {
    try {
      const batch = await fetchBatch(String(code), 0);
      if (Object.keys(batch).length > 0) {
        console.log(`  ✅ קוד ${code}: ${Object.keys(batch).length} מוצרים (חדש!)`);
        newCats.push({ code: String(code), count: Object.keys(batch).length });
      }
    } catch {}
    await sleep(200);
  }

  if (newCats.length === 0) {
    console.log('  ✅ לא נמצאו קטגוריות חדשות מעבר לידועות.');
  } else {
    console.log(`\n⚠️  נמצאו ${newCats.length} קטגוריות חדשות — יש להוסיף ל-CATEGORY_MAP:`);
    newCats.forEach(c => console.log(`     code: '${c.code}', label: '???', cat: '???', subCategory: '???'  (${c.count} מוצרים)`));
    writeFileSync(resolve(__dirname, '../../scripts/new-categories-found.json'), JSON.stringify(newCats, null, 2));
    console.log('  📄 נשמר: scripts/new-categories-found.json');
  }
  return newCats;
}

// ── Phase 2: Fetch all supplier SKUs ─────────────────────────────────────────
async function fetchAllSupplierSkus() {
  console.log('\n══ שלב 2: שליפת כל SKUs מהספק ══\n');
  const supplierSkus = new Map(); // sku → { catEntry, rawProduct }
  const catMap = ONLY_CODES ? CATEGORY_MAP.filter(c => ONLY_CODES.has(c.code)) : CATEGORY_MAP;
  let totalCats = catMap.length;

  for (let i = 0; i < catMap.length; i++) {
    const entry = catMap[i];
    process.stdout.write(`  [${i+1}/${totalCats}] code=${entry.code} (${entry.label})... `);
    try {
      const products = await fetchAllSkusForCode(entry.code);
      const skuList = Object.keys(products);
      process.stdout.write(`${skuList.length} מוצרים\n`);
      for (const [sku, rawProduct] of Object.entries(products)) {
        if (!supplierSkus.has(sku)) supplierSkus.set(sku, { catEntry: entry, rawProduct });
      }
    } catch (e) {
      process.stdout.write(`❌ שגיאה: ${e.message}\n`);
    }
    await sleep(400);
  }

  console.log(`\n  📦 סה"כ ${supplierSkus.size} SKUs ייחודיים אצל הספק`);

  // ── רשת ביטחון: השוואה מול טאב "מוצרים חדשים" ──────────────────────────
  // מדווח בלבד, לא מייבא. מוצר שמופיע שם ולא נסרק אצלנו = הקטגוריה שלו
  // חסרה ב-CATEGORY_MAP, וצריך להוסיף אותה ידנית עם השיוך הנכון.
  // ייבוא אוטומטי היה מחייב ניחוש קטגוריה, וניחוש שגוי גרוע מחוסר.
  try {
    const arrivals = await fetchNewArrivals();
    const unseen = Object.keys(arrivals).filter(sku => !supplierSkus.has(sku));
    if (unseen.length) {
      console.log(`\n  ⚠️  ${unseen.length} מוצרים בטאב "מוצרים חדשים" שלא נסרקו!`);
      console.log(`      הקטגוריה שלהם חסרה ב-CATEGORY_MAP. דוגמאות:`);
      for (const sku of unseen.slice(0, 10)) {
        const p = arrivals[sku];
        console.log(`        ${sku} — ${(p?.name || '').slice(0, 45)}`);
      }
      try {
        writeFileSync(
          resolve(ROOT, `scripts/uncovered-new-arrivals-${new Date().toISOString().slice(0,10)}.json`),
          JSON.stringify(unseen.map(s => ({ sku: s, name: arrivals[s]?.name })), null, 2), 'utf8');
      } catch {}
    } else if (Object.keys(arrivals).length) {
      console.log(`  ✅ כל ${Object.keys(arrivals).length} המוצרים החדשים אצל הספק מכוסים במפה`);
    }
  } catch { /* לא קריטי — הסנכרון ממשיך */ }

  return supplierSkus;
}

// ── Phase 3: Load Firestore products ──────────────────────────────────────────
async function loadFirestoreProducts() {
  if (IMPORT_ONLY) {
    // השוואה לפי קוד UK מול *כל* הקטלוג שלנו (לא רק source=israel-judaica) —
    // מונע ייבוא כפול של מוצר שקיים אצלנו עם source אחר/חסר.
    console.log('\n══ שלב 3: טעינת כל המוצרים מ-Firestore (השוואת קוד UK מול כל הקטלוג) ══\n');
    const snap = await db.collection('products').get();
    const products = [];
    snap.forEach(d => {
      const data = d.data();
      products.push({ id: d.id, sku: data.supplierCode || data.sku || null, ...data });
    });
    const withUk = products.filter(p => typeof p.sku === 'string' && /^UK\d+/i.test(p.sku)).length;
    console.log(`  📥 נטענו ${products.length} מוצרים (מתוכם עם קוד UK: ${withUk})`);
    return products;
  }
  console.log('\n══ שלב 3: טעינת מוצרי israel-judaica מ-Firestore ══\n');
  const snap = await db.collection('products').where('source', '==', 'israel-judaica').get();
  const products = [];
  snap.forEach(d => {
    const data = d.data();
    products.push({ id: d.id, sku: data.supplierCode || data.sku || null, ...data });
  });
  console.log(`  📥 נטענו ${products.length} מוצרים`);
  return products;
}

// ── Phase 4: Delete discontinued products ────────────────────────────────────
async function deleteDiscontinued(firestoreProducts, supplierSkus) {
  if (SKIP_DELETE) { console.log('\n══ שלב 4: דילוג מחיקה (--skip-delete) ══'); return; }
  console.log('\n══ שלב 4: מחיקת מוצרים שפסקו אצל הספק ══\n');

  const discontinued = firestoreProducts.filter(p => p.sku && !supplierSkus.has(p.sku));
  console.log(`  🗑️  ${discontinued.length} מוצרים שפסקו (SKU לא מופיע אצל הספק)`);

  if (discontinued.length === 0) {
    console.log('  ✅ אין מוצרים למחיקה.');
    return;
  }

  // Show preview
  discontinued.slice(0, 20).forEach(p => console.log(`    • ${p.name || p.sku} [${p.sku}]`));
  if (discontinued.length > 20) console.log(`    ... ועוד ${discontinued.length - 20}`);

  if (DRY_RUN) { console.log('\n  🧪 DRY-RUN — לא נמחק כלום'); return; }

  // Save backup
  const backup = discontinued.map(p => ({ id: p.id, sku: p.sku, name: p.name, imgUrl: p.imgUrl }));
  const backupPath = resolve(__dirname, `../../scripts/discontinued-backup-${Date.now()}.json`);
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\n  💾 גיבוי: ${backupPath}`);

  let deleted = 0, cloudDeleted = 0, cloudFailed = 0;

  for (const product of discontinued) {
    process.stdout.write(`  מוחק: ${product.name || product.sku}... `);

    // Delete Cloudinary image
    if (product.imgUrl && product.imgUrl.includes('cloudinary.com')) {
      const publicId = extractPublicId(product.imgUrl);
      if (publicId) {
        const ok = await deleteFromCloudinary(publicId);
        if (ok) { cloudDeleted++; process.stdout.write('☁️✓ '); }
        else    { cloudFailed++;  process.stdout.write('☁️✗ '); }
      }
    }

    // Delete from Firestore
    await db.collection('products').doc(product.id).delete();
    deleted++;
    process.stdout.write('🗑️✓\n');

    await sleep(100);
  }

  console.log(`\n  ✅ נמחקו ${deleted} מוצרים | Cloudinary: ${cloudDeleted} מחיקות, ${cloudFailed} כישלונות`);
}

// ── Phase 5: Import new products ─────────────────────────────────────────────
async function importNewProducts(firestoreProducts, supplierSkus) {
  if (SKIP_IMPORT) { console.log('\n══ שלב 5: דילוג ייבוא (--skip-import) ══'); return; }
  console.log('\n══ שלב 5: ייבוא מוצרים חדשים ══\n');

  const existingSkus = new Set(firestoreProducts.map(p => p.sku && String(p.sku).toUpperCase()).filter(Boolean));
  const newSkus = [...supplierSkus.entries()].filter(([sku]) => !existingSkus.has(String(sku).toUpperCase()));
  console.log(`  🆕 ${newSkus.length} מוצרים חדשים שאין אצלנו`);

  if (newSkus.length === 0) { console.log('  ✅ אין מוצרים חדשים לייבא.'); return; }

  // העשרה: מחיר סוחר + כמות באריזה (עם cache; --no-enrich לדילוג)
  const enrichment = await enrichNewProducts(newSkus);

  // בניית שורות המועמדים (משמש גם ל-CSV וגם לייבוא)
  const candidates = [];
  for (const [sku, { catEntry, rawProduct }] of newSkus) {
    const enriched      = enrichment.get(sku) || {};
    const purchasePrice = enriched.price ?? (rawProduct.price ? parseFloat(rawProduct.price) : null);
    // ברירת מחדל: מחיר סופי = ספק × 1.4 × 1.12 | מחיר מחוק = ספק × 1.4 × 1.40
    // עם --price-mult=N: מחיר סופי = ספק × N | מחיר מחוק = ספק × N × 1.25
    const salePrice     = purchasePrice ? Math.round(purchasePrice * (PRICE_MULT ?? 1.4 * 1.12)) : null;
    let   wasPrice      = purchasePrice ? Math.round(purchasePrice * (PRICE_MULT ? PRICE_MULT * 1.25 : 1.4 * 1.40)) : null;
    if (wasPrice != null && salePrice != null && wasPrice <= salePrice) wasPrice = salePrice + 1;

    const expectedArrivalDate = parseArriveDate(rawProduct.arrive_date);

    candidates.push({
      sku,
      catEntry,
      rawProduct,
      name:          rawProduct.name_he || null, // fallback ל-fetchHebName בזמן ייבוא
      purchasePrice,
      price:         salePrice,
      was:           wasPrice,
      comingSoon:    !!expectedArrivalDate,
      expectedArrivalDate,
      packSize:      enriched.packSize ?? 1,
      // תיאור: מ"פרטי המוצר" (העשרה); fallback — נבנה מהשם
      description:   enriched.description
        ?? (rawProduct.name_he
              ? `${catEntry.cat === 'בתי מזוזה' ? (/לרכב/.test(catEntry.subCategory) ? 'מזוזה לרכב — ' : 'בית מזוזה מהודר — ') : ''}${rawProduct.name_he}. מבית ארט יודאיקה — עיצוב איכותי ועמיד לבית היהודי.`
              : null),
      category:      catEntry.cat,
      subCategory:   catEntry.subCategory,
      imgUrl:        buildImgUrl(rawProduct.image),
    });
  }

  const comingSoonCount = candidates.filter(c => c.comingSoon).length;
  console.log(`  🔜 מתוכם "מגיע בקרוב": ${comingSoonCount}`);

  if (DRY_RUN) {
    const csvPath = writeCandidatesCsv(candidates);
    console.log(`\n  🧪 DRY-RUN — לא ייובא כלום.`);
    console.log(`  📄 CSV מועמדים: ${csvPath}`);
    candidates.slice(0, 10).forEach(c =>
      console.log(`    • ${c.sku} → ${c.category} / ${c.subCategory}${c.comingSoon ? ` | 🔜 ${formatArriveDate(c.expectedArrivalDate)}` : ''} | אריזה: ${c.packSize}`)
    );
    return;
  }

  let imported = 0, failed = 0;
  const skippedNoImage = [];
  const importLog = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    process.stdout.write(`  [${i+1}/${candidates.length}] ${c.sku}... `);

    // שם עברי: מה-API (name_he) או fallback לחיפוש
    let name = c.name;
    if (!name) {
      const heb = await fetchHebName(c.sku);
      await sleep(300);
      name = heb?.name || null;
    }
    if (!name) {
      process.stdout.write('⚠️  ללא שם עברי — דולג\n');
      failed++;
      continue;
    }

    // ── העלאת תמונה ל-Cloudinary, עם ניסיונות חוזרים ─────────────────────
    // עד 08/2026 היה כאן ניסיון בודד, ובכישלון נשמרה כתובת אתר הספק כ-
    // fallback. זה קישור חם לשרת שלהם — הוא נחסם, והמוצר הופיע באתר בלי
    // תמונה. שלושה ניסיונות עם השהיה עולה פותרים את רוב הכשלים, שהם
    // בדרך כלל זמניים (עומס או timeout).
    let cloudinaryUrl = null;
    if (c.imgUrl) {
      for (let attempt = 1; attempt <= 3 && !cloudinaryUrl; attempt++) {
        try {
          cloudinaryUrl = await uploadToCloudinary(c.imgUrl);
          process.stdout.write(attempt === 1 ? '☁️✓ ' : `☁️✓${attempt} `);
        } catch {
          if (attempt === 3) process.stdout.write('☁️✗ ');
          else await sleep(1200 * attempt); // 1.2 שנייה, ואז 2.4
        }
      }
      await sleep(400);
    }

    // עדיין בלי תמונה — המוצר עדיין מיובא (לבקשת המשתמש), אבל נרשם
    // לקובץ נפרד כדי שאפשר יהיה להשלים לו תמונה ידנית.
    if (!cloudinaryUrl) {
      skippedNoImage.push({ sku: c.sku, name, reason: c.imgUrl ? 'העלאה נכשלה' : 'אין תמונה אצל הספק' });
    }

    const newDoc = {
      name,
      sku:           c.sku,
      supplierCode:  c.sku,
      source:        'israel-judaica',
      cat:           c.category, // דפי הקטגוריה באתר שולפים לפי 'cat'
      category:      c.category,
      subCategory:   c.subCategory,
      // ── פרסום אוטומטי מותנה בתמונה (08/2026) ────────────────────────────
      // מוצר עם תמונה תקינה עולה ישירות למכירה; בלי תמונה הוא נשאר טיוטה
      // מוסתרת וממתין להשלמה ידנית. כרטיס מוצר ריק פוגע יותר מהיעדר המוצר.
      hidden:        !cloudinaryUrl,
      description:   c.description || null,
      // רק כתובת Cloudinary. אין נפילה לכתובת הספק — קישור חם לשרת שלהם
      // נחסם ומייצר מוצר עם תמונה שבורה, וזה גרוע יותר מ-null (שאפשר לזהות).
      imgUrl:        cloudinaryUrl || null,
      // דגל לאיתור מהיר באדמין של מוצרים שצריך להשלים להם תמונה
      needsImage:    !cloudinaryUrl,
      purchasePrice: c.purchasePrice,
      price:         c.price,
      was:           c.was,
      packSize:      c.packSize,
      comingSoon:    c.comingSoon,
      expectedArrivalDate: c.expectedArrivalDate, // 'YYYY-MM-DD' או null
      stockStatus:   c.comingSoon ? 'coming_soon' : 'in_stock',
      outOfStock:    c.comingSoon, // טרם במלאי — צפייה כן, רכישה לא
      status:        cloudinaryUrl ? 'active' : 'draft',
      priority:      50, // חובה! דפי קטגוריה ממיינים orderBy('priority') — בלי השדה המוצר לא מוצג
      supplierCatCode: c.catEntry.code,
      createdAt:     FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('products').add(newDoc);
    imported++;
    importLog.push({ docId: ref.id, sku: c.sku, name, price: c.price, purchasePrice: c.purchasePrice, comingSoon: c.comingSoon, expectedArrivalDate: c.expectedArrivalDate, packSize: c.packSize, category: c.category, subCategory: c.subCategory });
    process.stdout.write(`✓ ${name.slice(0, 30)}${c.comingSoon ? ' 🔜' : ''}\n`);
    await sleep(200);
  }

  const logPath = resolve(__dirname, `../../scripts/import-log-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(logPath, JSON.stringify({ date: new Date().toISOString(), imported, failed, items: importLog }, null, 2));
  console.log(`\n  ✅ יובאו ${imported} מוצרים חדשים | נכשלו: ${failed}`);
  if (skippedNoImage.length) {
    console.log(`  ⚠️  ${skippedNoImage.length} מוצרים יובאו ללא תמונה — סומנו needsImage:true:`);
    for (const s of skippedNoImage.slice(0, 20)) console.log(`     ${s.sku} — ${s.name} (${s.reason})`);
    if (skippedNoImage.length > 20) console.log(`     ...ועוד ${skippedNoImage.length - 20}`);
    // נשמר לקובץ כדי שאפשר יהיה לטפל בהם ידנית מול הספק
    try {
      writeFileSync(
        resolve(ROOT, `scripts/skipped-no-image-${new Date().toISOString().slice(0,10)}.json`),
        JSON.stringify(skippedNoImage, null, 2), 'utf8');
    } catch {}
  }
  console.log(`  📄 לוג ייבוא: ${logPath}`);
  console.log('  ℹ️  כל המוצרים החדשים מוגדרים status=draft — בדוק ופרסם ידנית.');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(60));
  console.log(' YourSofer — Full Israel-Judaica Sync');
  console.log(`═`.repeat(60));
  console.log(`מצב: ${DRY_RUN ? '🧪 DRY-RUN' : '🚀 EXECUTE'}`);
  if (!DRY_RUN) {
    console.log(`מחיקת מוצרים שפסקו: ${SKIP_DELETE ? '⏭ דילוג' : '✅ פעיל'}`);
    console.log(`ייבוא מוצרים חדשים: ${SKIP_IMPORT ? '⏭ דילוג' : '✅ פעיל'}`);
  }
  if (!CLOUDINARY_API_KEY) {
    console.log('⚠️  CLOUDINARY_API_KEY חסר — מחיקת תמונות מ-Cloudinary לא תפעל.');
    console.log('   הוסף CLOUDINARY_API_KEY ו-CLOUDINARY_API_SECRET ל-.env.local');
  }
  console.log('═'.repeat(60));

  const newCats = ONLY_CODES ? [] : await discoverNewCategories();
  if (ONLY_CODES) console.log('\n⏭  --codes פעיל — דילוג על גילוי קטגוריות חדשות.');
  const supplierSkus = await fetchAllSupplierSkus();
  const firestoreProducts = await loadFirestoreProducts();

  // Summary before acting
  const existingSkus = new Set(firestoreProducts.map(p => p.sku && String(p.sku).toUpperCase()).filter(Boolean));
  const toDelete = firestoreProducts.filter(p => p.sku && !supplierSkus.has(p.sku));
  const toImport = [...supplierSkus.keys()].filter(sku => !existingSkus.has(String(sku).toUpperCase()));

  console.log('\n══ סיכום ══\n');
  console.log(`  📦 אצל הספק:     ${supplierSkus.size} SKUs`);
  console.log(`  🏪 אצלנו:        ${firestoreProducts.length} מוצרים`);
  console.log(`  🗑️  למחיקה:       ${toDelete.length} (פסקו אצל הספק)`);
  console.log(`  🆕 לייבוא:       ${toImport.length} (חדשים אצל הספק)`);
  console.log(`  🆕 קטגוריות חדשות: ${newCats.length}`);

  // Save report
  const report = {
    date: new Date().toISOString(),
    supplierSkuCount: supplierSkus.size,
    firestoreCount: firestoreProducts.length,
    toDeleteCount: toDelete.length,
    toImportCount: toImport.length,
    newCategories: newCats,
    toDelete: toDelete.map(p => ({ id: p.id, sku: p.sku, name: p.name })),
    toImport: toImport.slice(0, 100), // first 100 for preview
  };
  const reportPath = resolve(__dirname, `../../scripts/sync-report-${new Date().toISOString().slice(0,10)}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 דו"ח: ${reportPath}`);

  await deleteDiscontinued(firestoreProducts, supplierSkus);
  await importNewProducts(firestoreProducts, supplierSkus);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Sync הסתיים');
  console.log('═'.repeat(60));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
