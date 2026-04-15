import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RULES = [
  { cat: 'מזוזות',          keywords: ['מזוזה'] },
  { cat: 'מגילות',          keywords: ['מגילה', 'אסתר'] },
  { cat: 'תפילין קומפלט',   keywords: ['תפילין', 'פילין'] },
  { cat: 'סט טלית תפילין',  keywords: ['טלית', 'ציצית'] },
  { cat: 'בר מצוה',         keywords: ['בר מצוה', 'בר-מצוה'] },
  { cat: 'יודאיקה',         keywords: ['חנוכיה', 'מנורה', 'שבת', 'קידוש', 'הבדלה', 'סידור', 'תנ"ך', 'ספר תורה'] },
];

const DEFAULT_CAT = 'יודאיקה';

function categorize(name) {
  for (const rule of RULES) {
    if (rule.keywords.some(kw => name.includes(kw))) {
      return rule.cat;
    }
  }
  return DEFAULT_CAT;
}

const inputPath  = join(__dirname, 'paldinox_judaica.json');
const outputPath = join(__dirname, 'paldinox_categorized.json');

const products = JSON.parse(readFileSync(inputPath, 'utf8'));

const categorized = products.map(p => ({
  ...p,
  cat: categorize(p.name),
}));

// Summary
const summary = {};
for (const p of categorized) {
  summary[p.cat] = (summary[p.cat] ?? 0) + 1;
}

console.log('=== סיכום סיווג ===');
for (const [cat, count] of Object.entries(summary).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count} מוצרים`);
}
console.log(`  סה"כ: ${categorized.length} מוצרים`);

writeFileSync(outputPath, JSON.stringify(categorized, null, 2), 'utf8');
console.log(`\nנשמר: scripts/paldinox_categorized.json`);
