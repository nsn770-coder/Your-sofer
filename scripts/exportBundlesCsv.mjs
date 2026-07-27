#!/usr/bin/env node
/**
 * exportBundlesCsv.mjs — ייצוא כל מוצרי המארז (bundleComponentCodes) ל-CSV
 * עם הצעת שם משודרג לכל אחד.
 *
 * ⚠️ קריאה בלבד. הסקריפט **לא כותב שום דבר ל-Firestore** ולא משנה מוצרים.
 * הפלט הוא קובץ CSV לאישור ידני.
 *
 * הרצה:
 *   node scripts/exportBundlesCsv.mjs
 *
 * פלט:
 *   scripts/out/bundles-rename-suggestions.csv
 *
 * עמודות:
 *   id, sku, cat, subCategory, price, currentName,
 *   componentCodes, componentNames, suggestedName, approved
 *
 * זרימת עבודה: פותחים את ה-CSV באקסל, עוברים על suggestedName, מתקנים מה
 * שצריך, ומסמנים approved=כן בשורות שמאושרות. אחר כך אפשר להריץ סקריפט
 * החלה נפרד (עוד לא קיים — ייכתב רק אחרי אישור).
 */

import fs from 'node:fs';
import path from 'node:path';

const FIREBASE_PROJECT = 'your-sofer';
const FIREBASE_API_KEY = 'AIzaSyAcIDIn7VkGlXIeVoyDFgk1v_jhvW9tK0I';
const OUT_DIR = path.join(process.cwd(), 'scripts', 'out');
const OUT_FILE = path.join(OUT_DIR, 'bundles-rename-suggestions.csv');

// ── תבנית השם: "מארז [אירוע] מהודר | [רכיבים עיקריים]" ───────────────────────
// זיהוי האירוע לפי קטגוריה / תת-קטגוריה / מילות מפתח בשם הקיים.
const OCCASION_RULES = [
  { occasion: 'בר מצווה', match: /בר\s*מצו|בר-מצו|תפילין|בר מצווה/ },
  { occasion: 'חתן וכלה', match: /חתן|כלה|חתונה|נישואי|הפרשת חלה/ },
  { occasion: 'שבת',       match: /שבת|קידוש|חלה|הבדלה|פמוט/ },
  { occasion: 'חנוכת בית', match: /חנוכת\s*בית|מזוזה|בית חדש/ },
  { occasion: 'לידה',      match: /לידה|ברית|תינוק|יולדת/ },
  { occasion: 'חג',        match: /חנוכה|פסח|סוכות|פורים|ראש השנה/ },
];

function detectOccasion(p) {
  const hay = [p.cat, p.subCategory, p.name].filter(Boolean).join(' ');
  for (const r of OCCASION_RULES) if (r.match.test(hay)) return r.occasion;
  return 'מתנה';
}

/** 2–3 רכיבים עיקריים, מקוצרים — כדי שהשם לא יתפח */
function mainComponents(names) {
  return names
    .filter(Boolean)
    .slice(0, 3)
    .map(n => n.split(/[|,–-]/)[0].trim().split(/\s+/).slice(0, 3).join(' '))
    .filter(Boolean)
    .join(' + ');
}

function suggestName(p, componentNames) {
  const occasion = detectOccasion(p);
  const parts = mainComponents(componentNames);
  const base = `מארז ${occasion} מהודר`;
  return parts ? `${base} | ${parts}` : base;
}

// ── Firestore REST ───────────────────────────────────────────────────────────

const parse = v => {
  if (!v || typeof v !== 'object') return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue?.values ?? []).map(parse);
  return undefined;
};

const toObj = doc => {
  const out = { id: String(doc.name).split('/').pop() };
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = parse(v);
  return out;
};

async function listAllProducts() {
  const all = [];
  let pageToken;
  do {
    const url =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}` +
      `/databases/(default)/documents/products?pageSize=300&key=${FIREBASE_API_KEY}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`);
    const json = await res.json();
    for (const d of json.documents ?? []) all.push(toObj(d));
    pageToken = json.nextPageToken;
    process.stdout.write(`\rנטענו ${all.length} מוצרים...`);
  } while (pageToken);
  process.stdout.write('\n');
  return all;
}

// ── CSV ──────────────────────────────────────────────────────────────────────

const esc = v => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function main() {
  const products = await listAllProducts();

  const byId = new Map(products.map(p => [p.id, p]));
  const bySku = new Map(products.filter(p => p.sku).map(p => [String(p.sku), p]));
  const resolve = code => byId.get(code) ?? bySku.get(String(code)) ?? null;

  const bundles = products.filter(
    p => Array.isArray(p.bundleComponentCodes) && p.bundleComponentCodes.filter(Boolean).length > 0,
  );

  console.log(`נמצאו ${bundles.length} מוצרי מארז מתוך ${products.length} מוצרים.`);
  if (!bundles.length) {
    console.log('אין מה לייצא — אף מוצר לא מסומן כמארז (bundleComponentCodes ריק בכל המוצרים).');
    return;
  }

  const header = [
    'id', 'sku', 'cat', 'subCategory', 'price', 'currentName',
    'componentCodes', 'componentNames', 'suggestedName', 'approved',
  ];

  const rows = bundles.map(p => {
    const codes = p.bundleComponentCodes.filter(Boolean);
    const comps = codes.map(resolve);
    const names = comps.map((c, i) => (c ? c.name : `⚠️ לא נמצא: ${codes[i]}`));
    return [
      p.id, p.sku ?? '', p.cat ?? '', p.subCategory ?? '', p.price ?? '',
      p.name ?? '',
      codes.join(' | '),
      names.join(' | '),
      suggestName(p, comps.map(c => c?.name)),
      '', // approved — ממלאים ידנית
    ].map(esc).join(',');
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // BOM — כדי שאקסל יפתח עברית ב-UTF-8 בלי ג'יבריש
  fs.writeFileSync(OUT_FILE, '﻿' + [header.join(','), ...rows].join('\n'), 'utf8');

  const missing = rows.filter(r => r.includes('לא נמצא')).length;
  console.log(`\n✓ נכתב: ${OUT_FILE}`);
  console.log(`  ${rows.length} שורות${missing ? ` · ⚠️ ב-${missing} שורות יש קוד רכיב שלא נפתר` : ''}`);
  console.log('  לא בוצע שום שינוי ב-Firestore.');
}

main().catch(err => {
  console.error('שגיאה:', err.message);
  process.exit(1);
});
