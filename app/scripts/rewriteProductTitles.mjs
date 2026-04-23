// rewriteProductTitles.mjs
// מייצר כותרות מוצר חדשות: חכמות, SEO-friendly, אנושיות
//
// אפשרויות הרצה:
//   node app/scripts/rewriteProductTitles.mjs --dry-run --limit=20
//   node app/scripts/rewriteProductTitles.mjs --dry-run --cat=מזוזות --limit=30
//   node app/scripts/rewriteProductTitles.mjs --force --cat=מזוזות   ← כותב ל-Firestore

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ טען .env.local ══
(function loadEnv() {
  const envPath = resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k) process.env[k] = v;
  }
})();

// ══ Firebase ══
const SA_PATH = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(SA_PATH) });
const db = getFirestore();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
if (!ANTHROPIC_API_KEY) { console.error('❌ חסר ANTHROPIC_API_KEY'); process.exit(1); }

// ══ הגדרות ══
const BATCH_SIZE = 5;   // כמה מוצרים לשלוח ל-Claude בפעם אחת
const DELAY_MS   = 800; // השהיה בין batch כדי לא לפגוע ב-rate limit
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══ פרומט ל-Claude ══
const SYSTEM_PROMPT = `אתה מומחה SEO לכתיבת כותרות מוצרים לחנות יודאיקה ישראלית (YourSofer).

עליך לנתח כותרות מוצרים קיימות ולהציע שיפורים.

כללי ברזל:
1. תמיד להתחיל בסוג מוצר ברור: מזוזה / חנוכייה / נטלה / קנקן / קערה / פמוטים / סט כוסות / מגש / מנורה / וכו'
2. לא להתחיל בקוד דגם (H13, D10, h50D30, X17 וכדומה) — אם קיים, הסר אותו
3. לא להתחיל במידות (7 ס"מ, 30 ס"מ וכדומה) — אם חשוב, הזז לסוף
4. לא להשתמש בשפת ספק לא טבעית ("ציפוי כסף מחוברות אמייל שקוף")
5. לשמור על עברית אנושית, אלגנטית, ברורה
6. לשלב: חומר / צבע / סגנון / שימוש כשזה תורם להבנה ולחיפוש בגוגל
7. לגוון — לא להחזיר את אותה תבנית לכל המוצרים
8. אורך אידיאלי: 4–9 מילים
9. אם הכותרת הקיימת כבר טובה (אנושית, ברורה, ללא קודים) — השאר אותה בדיוק
10. לא להמציא פרטים שלא קיימים בשם הקיים

דוגמאות לכיוון הנכון:
- "מזוזה אלומיניום 7 ס"מ כסף מט ש' מודפס" → "מזוזה מאלומיניום כסף מט עם אות ש' – 7 ס"מ"
- "h50D30 מעמד 3 קומות עגול שחור" → "מעמד 3 קומות עגול בצבע שחור"
- "נטלה H13 נלה נירי שיש אפור וזהב" → "נטלה לשטיפת ידיים בעיצוב שיש אפור וזהב"
- "חנוכיה קריסטל שופר שילוב כסף רוחב 36 ס"מ" → "חנוכיית קריסטל בשילוב כסף – עיצוב שופר"
- "קנקן פולירזין חום טייגר קוטר 12.7 גובה 26.7" → "קנקן בגוון חום טייגר לשולחן שבת"
- "גלאסיאר קערה מחולקת 280" → "קערת הגשה מחולקת – סדרת גלאסיאר"
- "סט 6 כוס אספרסו עם תחתית Marine כחול/זהב 80 מ"ל New Bone China" → "סט 6 כוסות אספרסו כחול וזהב – New Bone China"

כשהכותרת משתנה — הסבר בקצרה WHY (באנגלית, משפט קצר):
- removed model code
- moved dimensions to end
- replaced supplier wording with customer-friendly language
- clarified product type
- differentiated from similar items
- title already good

פורמט תשובה: JSON בלבד, בלי markdown, בצורה:
[
  { "id": "...", "newTitle": "...", "changed": true, "reason": "..." },
  ...
]`;

// ══ קרא ל-Claude ב-batch ══
async function rewriteBatch(products) {
  const input = products.map(p => ({
    id: p.id,
    currentTitle: p.name,
    category: p.cat,
    desc: p.desc ? p.desc.substring(0, 80) : '',
  }));

  const userMsg = `נתח את הכותרות הבאות והצע שיפורים לפי הכללים שהוגדרו.

מוצרים לניתוח:
${JSON.stringify(input, null, 2)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API: ${res.status} — ${err.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '[]';

  // חלץ JSON גם אם יש טקסט לפניו/אחריו
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Claude לא החזיר JSON תקין:\n${text.substring(0, 300)}`);

  return JSON.parse(jsonMatch[0]);
}

// ══ הדפס טבלה ══
function printTable(results) {
  const changed = results.filter(r => r.changed);
  const unchanged = results.filter(r => !r.changed);

  console.log('\n' + '═'.repeat(120));
  console.log('📋 PREVIEW — כותרות מוצרים חדשות');
  console.log('═'.repeat(120));

  // כותרת
  console.log(
    'ID'.padEnd(22) +
    'קטגוריה'.padEnd(22) +
    'כותרת ישנה'.padEnd(50) +
    'כותרת חדשה'.padEnd(50) +
    'שינוי'.padEnd(8) +
    'סיבה'
  );
  console.log('─'.repeat(180));

  for (const r of results) {
    const id      = r.id.substring(0, 20).padEnd(22);
    const cat     = (r.cat || '').substring(0, 20).padEnd(22);
    const oldT    = (r.oldTitle || '').substring(0, 48).padEnd(50);
    const newT    = (r.newTitle || '').substring(0, 48).padEnd(50);
    const chg     = (r.changed ? '✅ כן' : '– לא').padEnd(8);
    const reason  = r.reason || '';
    console.log(`${id}${cat}${oldT}${newT}${chg}${reason}`);
  }

  console.log('─'.repeat(180));
  console.log(`\n📊 סיכום:`);
  console.log(`   סה"כ: ${results.length} מוצרים`);
  console.log(`   ✅ ישתנו: ${changed.length}`);
  console.log(`   – ישארו: ${unchanged.length}`);

  if (changed.length > 0) {
    // ריכוז סיבות
    const reasons = {};
    for (const r of changed) {
      const k = r.reason || 'other';
      reasons[k] = (reasons[k] || 0) + 1;
    }
    console.log(`\n📌 דפוסי שינוי עיקריים:`);
    for (const [reason, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${count}x  ${reason}`);
    }
  }
}

// ══ תוכנית ראשית ══
async function run() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const catArg   = args.find(a => a.startsWith('--cat='));
  const limit    = limitArg ? parseInt(limitArg.split('=')[1]) : (isDryRun ? 20 : null);
  const cat      = catArg ? catArg.split('=')[1] : null;
  const saveJson = args.includes('--save');

  console.log(`🔤 Rewrite Product Titles`);
  console.log(`   מצב: ${isDryRun ? '🔍 DRY-RUN (בלי כתיבה)' : '✍️  FORCE (כותב ל-Firestore)'}`);
  if (cat)   console.log(`   קטגוריה: ${cat}`);
  if (limit) console.log(`   מגבלה: ${limit} מוצרים`);
  console.log('');

  if (!isDryRun) {
    console.log('⚠️  מצב FORCE — כותב ל-Firestore!');
    console.log('   ממשיך בעוד 3 שניות... (Ctrl+C לביטול)\n');
    await sleep(3000);
  }

  // שלוף מוצרים — דלג על כאלו שכבר עובדו (nameUpdatedAt קיים)
  let query = db.collection('products').where('status', '==', 'active');
  if (cat) query = query.where('cat', '==', cat);
  const snap = await query.get();

  let products = [];
  let skippedAlready = 0;
  snap.forEach(d => {
    const p = d.data();
    if (!p.name) return;
    if (!isDryRun && p.nameUpdatedAt) { skippedAlready++; return; } // כבר עובד
    products.push({ id: d.id, name: p.name, cat: p.cat, desc: p.desc || '' });
  });
  if (skippedAlready > 0) console.log(`   ⏭  דילוג על ${skippedAlready} מוצרים שכבר עובדו\n`);

  // סינון מקרים ברורים: שמות שכבר נראים טובים (אין קודים, אין מידות בהתחלה) — עדיין נעבד הכל, Claude יחליט
  if (limit) products = products.slice(0, limit);
  console.log(`📦 ${products.length} מוצרים לניתוח\n`);

  // עבד ב-batches
  const allResults = [];
  let batchNum = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    batchNum++;
    process.stdout.write(`   batch ${batchNum}/${Math.ceil(products.length / BATCH_SIZE)} (${i + 1}–${Math.min(i + BATCH_SIZE, products.length)})... `);

    try {
      const batchResults = await rewriteBatch(batch);

      // מיזוג נתונים — Claude מחזיר id+newTitle+changed+reason, אנחנו מוסיפים oldTitle+cat
      for (const r of batchResults) {
        const original = batch.find(p => p.id === r.id);
        allResults.push({
          id: r.id,
          cat: original?.cat || '',
          oldTitle: original?.name || '',
          newTitle: r.newTitle || original?.name || '',
          changed: r.changed === true,
          reason: r.reason || '',
        });
      }

      // מוצרים שחזרו ללא תשובה מ-Claude (לא צריך לקרות, רק בטיחות)
      for (const p of batch) {
        if (!batchResults.find(r => r.id === p.id)) {
          allResults.push({ id: p.id, cat: p.cat, oldTitle: p.name, newTitle: p.name, changed: false, reason: 'skipped by model' });
        }
      }

      console.log(`✅ ${batchResults.filter(r => r.changed).length} שינויים`);
    } catch (e) {
      console.error(`❌ שגיאה: ${e.message}`);
      for (const p of batch) {
        allResults.push({ id: p.id, cat: p.cat, oldTitle: p.name, newTitle: p.name, changed: false, reason: `error: ${e.message.substring(0, 60)}` });
      }
    }

    if (i + BATCH_SIZE < products.length) await sleep(DELAY_MS);
  }

  // הצג טבלה
  printTable(allResults);

  // שמור JSON אם ביקשו
  if (saveJson) {
    const outPath = resolve(__dirname, '../../title-rewrite-preview.json');
    writeFileSync(outPath, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 נשמר: ${outPath}`);
  }

  // כתוב ל-Firestore אם --force
  if (!isDryRun) {
    const toWrite = allResults.filter(r => r.changed);
    console.log(`\n✍️  כותב ${toWrite.length} עדכונים ל-Firestore...`);
    let written = 0, failed = 0;

    for (const r of toWrite) {
      try {
        await db.collection('products').doc(r.id).update({ name: r.newTitle, nameUpdatedAt: Date.now() });
        written++;
        if (written % 10 === 0) console.log(`   ${written}/${toWrite.length}...`);
      } catch (e) {
        console.error(`   ❌ ${r.id}: ${e.message}`);
        failed++;
      }
      await sleep(50); // מניעת rate limit על Firestore
    }

    console.log(`\n✅ עודכנו: ${written} | ❌ נכשלו: ${failed}`);
  } else {
    console.log('\n💡 כדי לכתוב ל-Firestore הוסף --force (לדוגמה: --force --cat=מזוזות)');
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
