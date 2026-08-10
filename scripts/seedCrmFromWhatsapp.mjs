/**
 * Backfill for the /admin/crm CRM.
 *
 * Creates a crmLeads doc for every existing whatsappConversations doc (that
 * predates the live hook in app/api/whatsapp/webhook/handler.ts), and for
 * every existing order whose phone doesn't already match a lead — those
 * become leads with status "עסקה נסגרה" (a customer who already bought).
 *
 * Can be run multiple times safely — skips existing leads by normalized phone.
 *
 * Run: node scripts/seedCrmFromWhatsapp.mjs
 *      node scripts/seedCrmFromWhatsapp.mjs --dry-run
 *
 * Use this if:
 * - Setting up CRM for the first time
 * - Adding new orders that should appear in CRM (e.g., from Google Ads campaigns)
 * - Re-syncing after Firestore backups
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Env loader (same convention as scripts/addPriorityFields.mjs) ───────────

const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
let currentKey = null;
let currentValue = [];

for (const line of envContent.split('\n')) {
  const trimmed = line.trimEnd();
  if (!currentKey) {
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (!match) continue;
    currentKey = match[1];
    currentValue = [match[2]];
  } else if (/^[A-Z_][A-Z0-9_]*=/.test(trimmed) && !trimmed.startsWith(' ') && !trimmed.startsWith('\t')) {
    envVars[currentKey] = currentValue.join('\n');
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    currentKey = match[1];
    currentValue = [match[2]];
  } else {
    currentValue.push(line.trimEnd());
  }
}
if (currentKey) envVars[currentKey] = currentValue.join('\n');

const projectId = envVars['FIREBASE_PROJECT_ID'];
const clientEmail = (envVars['FIREBASE_CLIENT_EMAIL'] ?? '').replace(/^Value:\s*/i, '').trim();
const privateKey = (envVars['FIREBASE_PRIVATE_KEY'] ?? '').replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY in .env.local');
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhone(phone) {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.slice(-9);
}

function toMillis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

// Mirrors lib/crm.ts's sourceFromAttribution — kept inline since this is a
// standalone Node script (can't import the app's TS path aliases).
function sourceFromAttribution(attribution) {
  const utmSource = (attribution?.utm_source ?? '').toLowerCase();
  if (attribution?.gclid || utmSource === 'google') {
    return { source: 'google', sourceDetail: attribution?.utm_campaign ?? null };
  }
  if (attribution?.fbclid || ['facebook', 'fb', 'ig'].includes(utmSource)) {
    return { source: 'facebook', sourceDetail: attribution?.utm_campaign ?? null };
  }
  return { source: 'אתר', sourceDetail: attribution?.utm_campaign ?? null };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔎 Dry run — no writes will be made\n' : '✏️  Live run — writing to Firestore\n');

  // 1. Existing leads (so we never clobber a lead an admin/hook already created)
  const existingLeadsSnap = await db.collection('crmLeads').get();
  const existingByNormPhone = new Map(); // normalizedPhone -> leadId
  existingLeadsSnap.forEach((d) => {
    existingByNormPhone.set(normalizePhone(d.data().phone ?? d.id), d.id);
  });
  console.log(`Found ${existingLeadsSnap.size} existing crmLeads docs`);

  // 2. Backfill from whatsappConversations
  const convosSnap = await db.collection('whatsappConversations').get();
  console.log(`Found ${convosSnap.size} whatsappConversations docs`);

  let createdFromWhatsapp = 0;
  for (const convoDoc of convosSnap.docs) {
    const phone = convoDoc.data().phone ?? convoDoc.id;
    if (existingByNormPhone.has(normalizePhone(phone))) continue;

    const messages = convoDoc.data().messages ?? [];
    const firstMsgTs = messages[0]?.ts ?? null;
    const updatedAtMs = toMillis(convoDoc.data().updatedAt) ?? Date.now();
    const referral = convoDoc.data().referral ?? null;

    console.log(`  + lead from whatsapp: ${phone}${referral ? ' (via FB/IG ad)' : ''}`);
    if (!DRY_RUN) {
      await db.collection('crmLeads').doc(convoDoc.id).set({
        phone,
        name: null,
        source: referral ? 'facebook' : 'whatsapp',
        sourceDetail: referral ? [referral.headline, referral.source_id].filter(Boolean).join(' — ') || null : null,
        status: 'חדש',
        saleStage: null,
        notes: referral ? [{ text: `הגיע ממודעת פייסבוק: ${referral.headline ?? 'ללא כותרת'}`, ts: Date.now() }] : [],
        followUpAt: null,
        assignedTo: null,
        createdAt: firstMsgTs ? new Date(firstMsgTs) : new Date(updatedAtMs),
        lastContactAt: new Date(updatedAtMs),
      });
    }
    existingByNormPhone.set(normalizePhone(phone), convoDoc.id);
    createdFromWhatsapp++;
  }

  // 3. Backfill closed-deal leads from existing orders
  const ordersSnap = await db.collection('orders').get();
  console.log(`Found ${ordersSnap.size} orders docs`);

  // Keep the most recent order per normalized phone
  const latestOrderByPhone = new Map();
  ordersSnap.forEach((d) => {
    const data = d.data();
    if (!data.phone) return;
    const norm = normalizePhone(data.phone);
    if (!norm) return;
    const createdMs = toMillis(data.createdAt) ?? 0;
    const existing = latestOrderByPhone.get(norm);
    if (!existing || createdMs > existing.createdMs) {
      latestOrderByPhone.set(norm, { ...data, id: d.id, createdMs });
    }
  });

  let createdFromOrders = 0;
  for (const [norm, order] of latestOrderByPhone) {
    if (existingByNormPhone.has(norm)) continue;

    const { source, sourceDetail } = sourceFromAttribution(order.attribution);
    const orderRef = `#${order.orderNumber ?? order.id.slice(0, 6)}`;
    console.log(`  + lead from order: ${order.phone} (${order.customerName ?? 'ללא שם'}) — source=${source} — ${orderRef}`);
    if (!DRY_RUN) {
      const leadId = normalizePhone(order.phone) || order.id;
      await db.collection('crmLeads').doc(leadId).set({
        phone: order.phone,
        name: order.customerName ?? null,
        source,
        sourceDetail,
        status: 'עסקה נסגרה',
        saleStage: null,
        notes: [{ text: `יובא מהזמנה קיימת: ${orderRef}`, ts: Date.now() }],
        followUpAt: null,
        assignedTo: null,
        createdAt: order.createdMs ? new Date(order.createdMs) : new Date(),
        lastContactAt: order.createdMs ? new Date(order.createdMs) : new Date(),
      });
    }
    existingByNormPhone.set(norm, order.id);
    createdFromOrders++;
  }

  console.log(`\n✅ Done. Created ${createdFromWhatsapp} leads from WhatsApp, ${createdFromOrders} leads from orders.`);
  if (DRY_RUN) console.log('(dry run — nothing was written; re-run without --dry-run to apply)');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
