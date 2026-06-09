import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);
const sa        = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COST_FIELDS = ['purchasePrice','soferBasePrice','cost','supplierPrice','basePrice','was'];

const snap = await db.collection('products').limit(20).get();

const coverage = Object.fromEntries(COST_FIELDS.map(f => [f, 0]));
let hasSku = 0, hasSource = 0;

console.log('═══════════════════════════════════════════════════════');
console.log('20 מוצרים — שדות עלות ספק');
console.log('═══════════════════════════════════════════════════════\n');

for (const d of snap.docs) {
  const p = d.data();
  const foundCost = COST_FIELDS.filter(f => p[f] !== undefined);
  const sku  = p.sku || p.supplierCode || '—';
  const src  = p.source || '—';
  if (p.sku || p.supplierCode) hasSku++;
  if (p.source) hasSource++;
  foundCost.forEach(f => coverage[f]++);

  const costStr = foundCost.length
    ? foundCost.map(f => `${f}=${p[f]}`).join(', ')
    : '⚠ אין שדה עלות';
  console.log(`${(p.name || d.id).slice(0,40).padEnd(42)} | sku:${sku.toString().padEnd(12)} | src:${src.padEnd(16)} | ${costStr}`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('סיכום כיסוי (מתוך 20):');
for (const [f, n] of Object.entries(coverage)) {
  if (n > 0) console.log(`  ${f.padEnd(16)}: ${n}/20`);
}
console.log(`  sku/supplierCode: ${hasSku}/20`);
console.log(`  source:           ${hasSource}/20`);
console.log('═══════════════════════════════════════════════════════');

process.exit(0);
