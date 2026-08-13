/**
 * Reports which live products qualify for embroidery (₪50) and embossing
 * (₪15 / ₪130) under the rules in app/lib/personalization.ts.
 *
 * Run this to confirm the rules cover the right products before/after deploying:
 *   node app/scripts/checkPersonalizationEligibility.mjs
 *   node app/scripts/checkPersonalizationEligibility.mjs --list
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const listAll = process.argv.includes('--list');

const serviceAccount = JSON.parse(
  readFileSync(new URL('../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json', import.meta.url))
);
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Keep in sync with app/lib/personalization.ts
const EMBROIDERY_CATEGORIES = [
  'כיסוי טלית', 'סט טלית תפילין', 'בר מצווה', 'סט לבר מצוה', 'סט לחתן', 'תיקי טלית ותפילין',
];
const EMBROIDERY_KEYWORDS = ['הפרשת חלה', 'כיסוי חלה', 'כיסוי לחלה', 'מפת חלה'];
const EMBROIDERY_EXCLUDE = ['כרטיס', 'מתקפל', 'ספרי קודש', 'ספרון', 'סדר הפרשת'];
const EMBOSSING_CATEGORIES = ['ספרי קודש וברכונים'];
const EMBOSSING_KEYWORDS = [
  'ברכון', 'ברכונים', 'זמירות', 'מזמור', 'סידור', 'סדור',
  'תהילים', 'תהלים', 'חומש', 'מחזור', 'הגדה', 'ברכת המזון',
];
const EMBOSSING_EXCLUDE = [
  'ספר תורה', 'מגילת אסתר', 'מגילה',
  'מעמד', 'סטנד', 'מתקן', 'מחזיק מפתחות', 'תיק',
  'אקריליק', 'אקרילי', 'פרספקס', 'זכוכית', 'קריסטל', 'לוסייט', 'פולימר',
  'מסגרת', 'תמונה', 'קנווס', 'בלוק', 'מגנט', 'לתלייה', 'לתליה',
  'חמסה', 'סגולה', 'תוף', 'מעץ', 'ממתכת', 'פלקטה',
];

const norm = (p) => `${p.cat ?? ''} ${p.subCat ?? ''} ${p.name ?? ''}`;
const embroidery = (p) => {
  if (EMBROIDERY_CATEGORIES.includes(p.cat ?? '')) return true;
  const h = norm(p);
  if (EMBROIDERY_EXCLUDE.some((k) => h.includes(k))) return false;
  return EMBROIDERY_KEYWORDS.some((k) => h.includes(k));
};
const embossing = (p) => {
  const h = norm(p);
  if (EMBOSSING_EXCLUDE.some((k) => h.includes(k))) return false;
  if (EMBOSSING_CATEGORIES.some((c) => (p.cat ?? '').includes(c))) return true;
  return EMBOSSING_KEYWORDS.some((k) => h.includes(k));
};

const snap = await db.collection('products').get();
const products = snap.docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .filter((p) => p.active !== false && p.hidden !== true);

const emb = products.filter(embroidery);
const emo = products.filter(embossing);

console.log(`\nactive products: ${products.length}`);
console.log(`embroidery (₪50) eligible: ${emb.length}`);
console.log(`embossing (₪15/₪130) eligible: ${emo.length}`);

const byCat = (list) => {
  const m = new Map();
  for (const p of list) m.set(p.cat || '(ללא קטגוריה)', (m.get(p.cat || '(ללא קטגוריה)') || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

console.log('\n— embroidery by category —');
for (const [c, n] of byCat(emb)) console.log(String(n).padStart(5), c);

console.log('\n— embossing by category —');
for (const [c, n] of byCat(emo)) console.log(String(n).padStart(5), c);

// Products whose name looks like a bound book but did NOT qualify — sanity check
const missed = products.filter(
  (p) => !embossing(p) && /ברכון|זמירות|סידור|תהילים|חומש/.test(String(p.name || ''))
);
if (missed.length) {
  console.log(
    `\nℹ excluded on purpose — book keyword but not a bound book (${missed.length}):`
  );
  console.log('  (stands, keychains, bags, acrylic/glass art — cannot be embossed)');
  console.log('  scan this list for anything that IS a real book and should qualify:');
  missed.slice(0, 20).forEach((p) => console.log('  ', p.name, '|', p.cat));
}

if (listAll) {
  console.log('\n— embroidery products —');
  emb.forEach((p) => console.log('  ', p.name, '|', p.cat));
  console.log('\n— embossing products —');
  emo.forEach((p) => console.log('  ', p.name, '|', p.cat));
}

process.exit(0);
