import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(path.join(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('=== אבחון הזמנות ===\n');

const snap = await db.collection('orders')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

console.log(`נמצאו ${snap.size} הזמנות\n`);

// ── א. מבנה כל הזמנה ──────────────────────────────────────────────────────
let totalWithItems = 0;
let totalWithPrint = 0;
const fieldNameCounts = {};  // מה השדה שמחזיק את פריטי ההזמנה
const itemFieldCounts = {};  // אילו שדות קיימים בתוך item

for (const docSnap of snap.docs) {
  const d = docSnap.data();
  const topKeys = Object.keys(d);

  // בדוק אילו שמות שדה יכולים להכיל items
  for (const k of ['items', 'cart', 'orderItems', 'products', 'lineItems']) {
    if (d[k] !== undefined) fieldNameCounts[k] = (fieldNameCounts[k] || 0) + 1;
  }

  const items = d.items ?? d.cart ?? d.orderItems ?? d.products ?? d.lineItems ?? [];
  const hasItems = Array.isArray(items) && items.length > 0;
  if (hasItems) totalWithItems++;

  const hasPrint = hasItems && items.some(i => i?.printCustomization);
  if (hasPrint) totalWithPrint++;

  // אסוף שדות מכל item
  if (hasItems) {
    for (const item of items) {
      if (item && typeof item === 'object') {
        for (const k of Object.keys(item)) {
          itemFieldCounts[k] = (itemFieldCounts[k] || 0) + 1;
        }
      }
    }
  }

  console.log(`──────────────────────────────────────────`);
  console.log(`id:          ${docSnap.id}`);
  console.log(`orderNumber: ${d.orderNumber ?? '(none)'}`);
  console.log(`status:      ${d.status ?? '(none)'}`);
  console.log(`top-level keys: ${topKeys.join(', ')}`);
  console.log(`items count: ${Array.isArray(items) ? items.length : '(not array — type: ' + typeof items + ')'}`);

  if (Array.isArray(items) && items.length > 0) {
    console.log(`\nitem[0] full JSON:\n${JSON.stringify(items[0], null, 2)}`);
    if (items.length > 1) {
      console.log(`\nitem[1] keys: ${Object.keys(items[1] ?? {}).join(', ')}`);
    }
  } else {
    // אולי items בכלל לא קיים — הדפס את כל המסמך
    console.log(`\n⚠ אין items — כל שדות המסמך:\n${JSON.stringify(d, null, 2)}`);
  }
  console.log('');
}

// ── ב. סיכום ──────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════');
console.log('סיכום:');
console.log(`  הזמנות עם items לא ריק:      ${totalWithItems} / ${snap.size}`);
console.log(`  הזמנות עם printCustomization: ${totalWithPrint} / ${snap.size}`);
console.log(`\nשמות שדה שמכילים פריטים:`, fieldNameCounts);
console.log(`\nשדות בתוך item (כמות הופעות):`);
Object.entries(itemFieldCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

process.exit(0);
