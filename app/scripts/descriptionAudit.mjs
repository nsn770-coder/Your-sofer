/**
 * descriptionAudit.mjs
 * Read-only audit — no Firestore writes.
 * Flags products whose descriptions contain keywords that contradict their category.
 * Output: app/scripts/description-audit.json
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dir = dirname(fileURLToPath(import.meta.url));

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

// ── Rules ────────────────────────────────────────────────────────────────────

// STaM = actual scribal parchment/set items — description should NOT mention home decor
const STAM_CATS = new Set([
  'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה',
]);

// Home decor/hosting categories — description should NOT mention STaM-specific terms
const HOME_CATS = new Set([
  'עיצוב הבית', 'כלי שולחן והגשה', 'הגשה ואירוח',
  'נטילת ידיים', 'שבת', 'חגים', 'חנוכה', 'פסח',
  'סטים ומארזים', 'יודאיקה', 'יודאיקה כללי', 'מתנות',
]);

// Keywords that are wrong if they appear in a STaM product description
const STAM_WRONG_KW = ['בית', 'עיצוב', 'מתנה', 'נרות', 'שבת', 'מטבח', 'שולחן', 'הגשה'];

// Keywords that are wrong if they appear in a home/decor product description
const HOME_WRONG_KW = ['כשרות', 'מגיה', 'סופר', 'קלף', 'כתיבה', 'הלכה'];

function findMatches(text, keywords) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return keywords.filter(kw => lower.includes(kw));
}

function severity(item) { return item.flaggedKeywords.length; }

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('🔍 טוען מוצרים פעילים מ-Firestore...');
  const snap = await getDocs(collection(db, 'products'));
  const allDocs = [];
  snap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));

  const active = allDocs.filter(p => p.status === 'active');
  console.log(`✅ נמצאו ${active.length} מוצרים פעילים (מתוך ${allDocs.length} סה"כ)\n`);

  const flagged = [];
  let stamChecked = 0, homeChecked = 0, noDesc = 0;

  for (const p of active) {
    const cat  = p.cat || p.category || '';
    const desc = p.desc || p.description || '';

    if (!desc.trim()) { noDesc++; continue; }

    if (STAM_CATS.has(cat)) {
      stamChecked++;
      const kw = findMatches(desc, STAM_WRONG_KW);
      if (kw.length > 0) {
        flagged.push({
          id: p.id,
          name: p.name || '(ללא שם)',
          cat,
          issue: 'stam_has_home_keywords',
          issueLabel: 'מוצר סת"מ עם מילות עיצוב/בית',
          flaggedKeywords: kw,
          descSnippet: desc.substring(0, 300),
        });
      }
    } else if (HOME_CATS.has(cat)) {
      homeChecked++;
      const kw = findMatches(desc, HOME_WRONG_KW);
      if (kw.length > 0) {
        flagged.push({
          id: p.id,
          name: p.name || '(ללא שם)',
          cat,
          issue: 'home_has_stam_keywords',
          issueLabel: 'מוצר עיצוב עם מילות סת"מ',
          flaggedKeywords: kw,
          descSnippet: desc.substring(0, 300),
        });
      }
    }
  }

  // Sort: worst mismatches first
  flagged.sort((a, b) => severity(b) - severity(a));

  const stamFlagged = flagged.filter(f => f.issue === 'stam_has_home_keywords');
  const homeFlagged = flagged.filter(f => f.issue === 'home_has_stam_keywords');

  // Keyword frequency
  const kwFreq = {};
  for (const f of flagged) {
    for (const kw of f.flaggedKeywords) {
      kwFreq[kw] = (kwFreq[kw] || 0) + 1;
    }
  }
  const topKeywords = Object.entries(kwFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({ keyword, count }));

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalActive: active.length,
      noDescSkipped: noDesc,
      stamProductsChecked: stamChecked,
      homeProductsChecked: homeChecked,
      totalFlagged: flagged.length,
      stamFlagged: stamFlagged.length,
      homeFlagged: homeFlagged.length,
    },
    topMismatchKeywords: topKeywords,
    worstMismatches: flagged.slice(0, 10),
    allFlagged: flagged,
  };

  const outPath = resolve(__dir, 'description-audit.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  // ── Console report ─────────────────────────────────────────────────────
  console.log('════════════════════════════════════════');
  console.log('📋 דוח ביקורת תיאורים');
  console.log('════════════════════════════════════════');
  console.log(`סה"כ מוצרים פעילים:          ${active.length}`);
  console.log(`ללא תיאור (דולגו):            ${noDesc}`);
  console.log(`מוצרי סת"מ שנבדקו:            ${stamChecked}`);
  console.log(`מוצרי עיצוב/בית שנבדקו:       ${homeChecked}`);
  console.log('────────────────────────────────────────');
  console.log(`🚨 סה"כ מוצרים שסומנו:         ${flagged.length}`);
  console.log(`   סת"מ עם מילות עיצוב/בית:    ${stamFlagged.length}`);
  console.log(`   עיצוב עם מילות סת"מ:         ${homeFlagged.length}`);

  if (topKeywords.length > 0) {
    console.log('\n📊 מילות מפתח בעייתיות (לפי תדירות):');
    for (const { keyword, count } of topKeywords.slice(0, 8)) {
      console.log(`   "${keyword}" — ${count} מוצרים`);
    }
  }

  if (flagged.length > 0) {
    console.log('\n⚠️  5 הדוגמאות הגרועות ביותר:');
    for (const f of flagged.slice(0, 5)) {
      const tag = f.issue === 'stam_has_home_keywords' ? 'סת"מ' : 'עיצוב';
      console.log(`\n  [${tag}] ${f.name}`);
      console.log(`  קטגוריה: ${f.cat} | מילות: ${f.flaggedKeywords.join(', ')}`);
      console.log(`  תיאור: "${f.descSnippet.substring(0, 120)}..."`);
    }
  } else {
    console.log('\n✅ לא נמצאו אי-התאמות!');
  }

  console.log('\n════════════════════════════════════════');
  console.log(`📁 הדוח נשמר ב: app/scripts/description-audit.json`);

  process.exit(0);
}

run().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
