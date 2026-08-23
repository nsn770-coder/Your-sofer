/**
 * lib.mjs — עזרים משותפים: טעינת סביבה, Firestore, לקוח Google Ads,
 * וההגדרה היחידה של "מהי כיפה לאירועים".
 *
 * אין הדפסה של סודות. אף פונקציה כאן לא מדפיסה refresh token / secret / key.
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT    = resolve(__dirname, '../../..');   // שורש הפרויקט
export const OUT_DIR = resolve(__dirname, 'out');

// ── .env.local ────────────────────────────────────────────────────────────────
// אותה לוגיקת פירוק כמו scripts/syncAlgolia.mjs (תומכת ב-private key רב-שורתי).
export function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) {
        if (key && !process.env[key]) process.env[key] = val.trim();
        key = m[1]; val = m[2];
      } else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch { /* אין .env.local — נסתמך על משתני סביבה */ }
}
loadEnvLocal();

/**
 * מנקה ערך שהודבק בטעות עם תווים זרים: גרשיים עוטפים, סוגריים זוויתיים
 * (`<VALUE>` מהתבנית), רווחים נסתרים ותווי BOM/RTL. בלי זה `>` בסוף
 * ה-client_id שולח בקשת OAuth שגויה שקשה לאתר.
 */
export function cleanEnv(v) {
  return String(v ?? '')
    .replace(/^﻿/, '')
    .replace(/[‎‏‪-‮]/g, '')   // סימני כיווניות RTL/LTR
    .trim()
    .replace(/^["'](.*)["']$/s, '$1')
    .replace(/^<(.*)>$/s, '$1')
    .replace(/^[<>]+|[<>]+$/g, '')
    .trim();
}

// ── Firestore ─────────────────────────────────────────────────────────────────
export function getDb() {
  if (!getApps().length) {
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
    const privateKey  = (process.env.FIREBASE_PRIVATE_KEY  ?? '').replace(/\\n/g, '\n');
    const projectId   = process.env.FIREBASE_PROJECT_ID ?? 'your-sofer';
    if (clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      const sa = JSON.parse(
        readFileSync(resolve(ROOT, 'your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8')
      );
      initializeApp({ credential: cert(sa) });
    }
  }
  return getFirestore();
}

// ─────────────────────────────────────────────────────────────────────────────
// ההגדרה של "כיפה לאירועים" — חייבת להישאר זהה ל-isEventKippah()
// ב-app/category/[category]/CategoryClient.tsx ולסקריפט
// scripts/tagEventKippotSubcategory.mjs. זהו מקור האמת של הקמפיין.
// ─────────────────────────────────────────────────────────────────────────────
export const EVENT_CAT    = 'כיפות';
export const EVENT_SUBCAT = 'כיפות לאירועים';

export function isEventKippah(p) {
  if ((p.cat ?? p.category) !== EVENT_CAT) return false;
  if (p.hidden === true) return false;
  if (p.subCategory === EVENT_SUBCAT) return true;
  // סקרולי המזכרות בעמוד האירועים (מטפחות, ברכונים, הבדלה) אינם כיפות
  if (p.eventScrollSection) return false;
  return p.isEventKippot === true || p.isEventProduct === true || p.eventsOnly === true;
}

/** מזהה המוצר בפיד (g:id) הוא doc.id של Firestore — ראה app/api/google-feed/route.ts */
export const offerIdOf = (docId) => docId;

/** האם המוצר בכלל ייכנס לפיד המרצ'נט (אותם תנאים כמו ב-route.ts). */
export function feedEligibility(p) {
  const reasons = [];
  if (p.hidden === true) reasons.push('hidden');
  if (p.eventsOnly === true) reasons.push('eventsOnly');
  if (p.status && p.status !== 'active') reasons.push(`status_${p.status}`);
  if (!(p.name ?? '')) reasons.push('missing_name');
  const price = typeof p.price === 'number' ? p.price : Number(p.price) || 0;
  if (!price) reasons.push('missing_or_zero_price');
  const img = p.imgUrl ?? p.image_url ?? p.img1;
  if (!img || typeof img !== 'string' || !img.trim()) reasons.push('missing_image');
  return { eligible: reasons.length === 0, reasons };
}

// ── Google Ads ────────────────────────────────────────────────────────────────
/**
 * מחזיר { client, customer }. משתמש ב-google-ads-api (Google Ads API v24).
 * כל הפרטים מגיעים ממשתני סביבה — שום דבר לא מודפס.
 */
export async function getAdsCustomer() {
  const need = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ];
  for (const k of need) if (process.env[k]) process.env[k] = cleanEnv(process.env[k]);
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `חסרים משתני סביבה: ${missing.join(', ')}\n` +
      `הוסף אותם ל-.env.local לפי scripts/google-ads/pmax-event-kippot/.env.example`
    );
  }
  const { GoogleAdsApi } = await import('google-ads-api');
  const client = new GoogleAdsApi({
    client_id:       process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret:   process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  });
  const customer = client.Customer({
    customer_id:       digits(process.env.GOOGLE_ADS_CUSTOMER_ID),
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
      ? digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) : undefined,
    refresh_token:     process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });
  return { client, customer };
}

export const digits = (s) => String(s ?? '').replace(/\D/g, '');

// ── עזרים כלליים ──────────────────────────────────────────────────────────────
export function saveJson(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = resolve(OUT_DIR, name);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  return p;
}

export function readJson(name) {
  const p = resolve(OUT_DIR, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export const line = (c = '─', n = 72) => c.repeat(n);
export function header(title) {
  console.log(`\n${line('=')}\n${title}\n${line('=')}\n`);
}
