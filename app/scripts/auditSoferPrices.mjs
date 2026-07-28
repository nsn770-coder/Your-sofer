/**
 * READ-ONLY audit: מזהה מוצרי סופרים שנשמרו עם מחיר בסיס בלי נוסחת 1.15×1.18
 *
 * חשוד = uploadedBySofer:true ועומד באחד מהתנאים:
 *   א. soferBasePrice חסר (הבאג הישן לא שמר את השדה כלל)
 *   ב. price == soferBasePrice (הנוסחה לא הוחלה)
 *   ג. price < soferBasePrice * 1.30 (סף סביר — מחיר נכון אמור להיות לפחות ×1.357)
 *
 * לא משנה שום דבר.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I',
  projectId: 'your-sofer',
});
const db = getFirestore(app);

console.log('טוען מוצרי סופרים (uploadedBySofer=true)...');

const snap = await getDocs(
  query(collection(db, 'products'), where('uploadedBySofer', '==', true))
);

console.log(`סה"כ מוצרי סופרים: ${snap.size}`);

const suspected = [];

snap.forEach(d => {
  const p   = d.data();
  const id  = d.id;
  const price         = typeof p.price === 'number' ? p.price : null;
  const soferBase     = typeof p.soferBasePrice === 'number' ? p.soferBasePrice : null;

  // תנאי חשד
  const missingBase   = soferBase === null;                           // א. soferBasePrice חסר
  const baseEqualsPrice = !missingBase && price !== null && price === soferBase;  // ב. price == soferBasePrice
  const tooLow        = !missingBase && price !== null && soferBase > 0
                        && price < soferBase * 1.30;                 // ג. מחיר נמוך מסף

  if (missingBase || baseEqualsPrice || tooLow) {
    const expectedPrice = soferBase ? Math.round(soferBase * 1.15 * 1.18) : '—';
    suspected.push({
      id,
      name:          p.name ?? '(ללא שם)',
      price,
      soferBasePrice: soferBase,
      expectedPrice,
      reason: missingBase
        ? 'soferBasePrice חסר'
        : baseEqualsPrice
          ? 'price == soferBasePrice'
          : `מחיר נמוך מסף (${price} < ${Math.round(soferBase * 1.30)})`,
    });
  }
});

// ── תוצאות ──────────────────────────────────────────────────────────────────

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`מוצרים חשודים שנפגעו מהבאג: ${suspected.length} מתוך ${snap.size}`);
console.log(`══════════════════════════════════════════════════════`);

if (suspected.length === 0) {
  console.log('\n✅ לא נמצאו מוצרים חשודים.');
  process.exit(0);
}

// פירוט לפי סיבה
const byReason = suspected.reduce((acc, p) => {
  acc[p.reason] = (acc[p.reason] || 0) + 1;
  return acc;
}, {});
console.log('\nפירוט לפי סיבה:');
Object.entries(byReason).forEach(([r, n]) => console.log(`  ${r}: ${n}`));

// 10 דוגמאות
console.log('\n10 דוגמאות ראשונות:');
console.log('─'.repeat(90));
console.log(
  'id'.padEnd(22) +
  'name'.padEnd(30) +
  'price'.padStart(8) +
  'soferBase'.padStart(11) +
  'expected'.padStart(10) +
  '  סיבה'
);
console.log('─'.repeat(90));

suspected.slice(0, 10).forEach(p => {
  console.log(
    p.id.padEnd(22) +
    (p.name ?? '').slice(0, 29).padEnd(30) +
    String(p.price ?? '—').padStart(8) +
    String(p.soferBasePrice ?? '—').padStart(11) +
    String(p.expectedPrice).padStart(10) +
    '  ' + p.reason
  );
});

console.log('─'.repeat(90));
console.log('\n⚠️  הסקריפט לא שינה שום דבר.');
process.exit(0);
