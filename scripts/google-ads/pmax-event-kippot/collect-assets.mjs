/**
 * collect-assets.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * בוחר תמונות ל-Asset Group אך ורק מתוך מוצרי "כיפות לאירועים",
 * וחותך אותן ליחסי הגובה-רוחב ש-PMax דורש דרך טרנספורמציות Cloudinary
 * (בלי לייצר תמונות AI חדשות ובלי להשתמש בקטגוריות אחרות).
 *
 * פלט: out/image-assets.json
 *
 * הרצה:
 *   node scripts/google-ads/pmax-event-kippot/collect-assets.mjs
 */

import { readJson, saveJson, header, line } from './lib.mjs';
import { IMAGE_SPECS, LOGO_URL } from './config.mjs';

/** עדיפות לתמונות שמדגימות בדיוק את מה שהקמפיין מוכר. */
const PRIORITY_KEYWORDS = [
  ['רקמה', 4], ['רקום', 4], ['הדפסה', 4], ['מודפס', 4], ['לוגו', 4],
  ['פשתן', 3], ['סאטן', 3], ['סטן', 3],
  ['אירוע', 3], ['בר מצווה', 2], ['חתונה', 2], ['מזכרת', 2],
  ['קטיפה', 1],
];

function scoreProduct(p) {
  const n = (p.name ?? '').toLowerCase();
  let s = 0;
  for (const [kw, w] of PRIORITY_KEYWORDS) if (n.includes(kw)) s += w;
  s += Math.min(p.images.length, 3);          // מוצר עם כמה תמונות = יותר חומר
  return s;
}

const CLOUDINARY = 'res.cloudinary.com';

/** מכניס טרנספורמציה אחרי /upload/ ומנקה טרנספורמציות קודמות. */
function transform(url, t) {
  if (!url.includes(CLOUDINARY) || !url.includes('/upload/')) return null;
  const [head, tail] = url.split('/upload/');
  // אם כבר יש טרנספורמציה (סגמנט שמכיל פסיק או מתחיל ב-w_/c_) — מסירים אותה
  const parts = tail.split('/');
  if (parts[0] && /(^|,)(c|w|h|q|f|ar|g)_/.test(parts[0])) parts.shift();
  return `${head}/upload/${t}/${parts.join('/')}`;
}

const specTransform = (spec) => {
  const ar = spec.ar === '1.0' ? '1:1' : spec.ar === '0.8' ? '4:5' : spec.ar;
  return `c_fill,g_auto,ar_${ar},w_${spec.w},q_auto:good,f_jpg`;
};

async function probe(url) {
  try {
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) return { ok: false, why: `HTTP ${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) return { ok: false, why: `גדול מ-5MB (${(buf.length / 1e6).toFixed(1)}MB)` };
    if (buf.length < 2000) return { ok: false, why: 'קטן/ריק מדי' };
    return { ok: true, bytes: buf.length };
  } catch (e) { return { ok: false, why: e.message }; }
}

async function main() {
  header('🖼️  collect-assets — תמונות מתוך מוצרי כיפות לאירועים בלבד');

  const site = readJson('event-kippot-products.json');
  if (!site) {
    console.error('❌ חסר out/event-kippot-products.json — הרץ קודם discover-products.mjs');
    process.exit(1);
  }

  const candidates = site.products
    .filter(p => p.images.length > 0)
    .map(p => ({ ...p, score: scoreProduct(p) }))
    .sort((a, b) => b.score - a.score);

  console.log(`מוצרים עם תמונה: ${candidates.length} מתוך ${site.products.length}\n`);

  const result = { generatedAt: new Date().toISOString(), logo: null, images: {}, problems: [] };

  // ── לוגו ───────────────────────────────────────────────────────────────────
  const logoProbe = await probe(LOGO_URL);
  if (logoProbe.ok) {
    result.logo = { url: LOGO_URL, field: 'LOGO', note: '500x500, יחס 1:1 — הלוגו הרשמי של האתר' };
    console.log(`✅ לוגו: ${LOGO_URL}`);
  } else {
    result.problems.push(`לוגו לא נגיש (${logoProbe.why}) — נדרש נכס LOGO ביחס 1:1`);
    console.log(`❌ לוגו: ${logoProbe.why}`);
  }

  // ── תמונות שיווקיות ────────────────────────────────────────────────────────
  for (const spec of IMAGE_SPECS) {
    const picked = [];
    const seen = new Set();
    const t = specTransform(spec);
    console.log(`\n${line()}\n${spec.label}  (${spec.field}) — נדרש מינימום ${spec.min}\n${line()}`);

    for (const p of candidates) {
      if (picked.length >= Math.max(spec.min, 5)) break;
      for (const img of p.images.slice(0, 2)) {
        const url = transform(img, t);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const pr = await probe(url);
        if (!pr.ok) { console.log(`   ✗ ${p.name.slice(0, 34)} — ${pr.why}`); continue; }
        picked.push({ url, productId: p.id, productName: p.name, bytes: pr.bytes, score: p.score });
        console.log(`   ✓ ${p.name.slice(0, 40)}  (${(pr.bytes / 1024).toFixed(0)}KB)`);
        break;
      }
    }

    result.images[spec.field] = picked;
    if (picked.length < spec.min) {
      result.problems.push(
        `${spec.label}: נמצאו ${picked.length} מתוך ${spec.min} נדרשות — ` +
        `יש להוסיף תמונות מוצר לכיפות לאירועים (או להעלות ידנית בממשק Google Ads)`
      );
    }
  }

  // ── דוח ────────────────────────────────────────────────────────────────────
  console.log(`\n${line()}\nסיכום נכסים ויזואליים\n${line()}`);
  for (const spec of IMAGE_SPECS) {
    const n = result.images[spec.field].length;
    console.log(`${n >= spec.min ? '✅' : '⚠️ '} ${spec.label.padEnd(18)} ${n}/${spec.min}`);
  }
  console.log(`${result.logo ? '✅' : '⚠️ '} Logo 1:1`);
  if (result.problems.length) {
    console.log(`\n⚠️  חסרים:`);
    for (const pr of result.problems) console.log(`   • ${pr}`);
  }
  console.log(`\nℹ️  אין וידאו בנכסים. PMax ייצר וידאו אוטומטי מהתמונות — זו התנהגות ברירת מחדל.`);

  saveJson('image-assets.json', result);
  console.log(`\n💾 נשמר: out/image-assets.json`);
  process.exit(0);
}

main().catch(e => { console.error('\n❌ שגיאה:', e.message); process.exit(1); });
