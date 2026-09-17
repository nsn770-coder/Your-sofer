/**
 * Phase 1 — historical messages[] -> messages subcollection backfill.
 *
 * Reads whatsappConversations/{id}.messages[] (the legacy array, untouched
 * by this script) and creates one corresponding doc per entry under
 * whatsappConversations/{id}/messages/{legacyId} for read-history purposes.
 *
 * This is a READ-HISTORY-ONLY backfill:
 *   - Historical entries never had a wamid captured (the pre-Phase-1 code
 *     never stored one), so backfilled docs get wamid: null. No future
 *     status webhook can ever reference these — Meta correlates status
 *     events by wamid, which we don't have for anything predating Phase 1.
 *   - For the same reason, `status` is left null for outbound historical
 *     entries too, rather than fabricating "sent" — the legacy array was
 *     written independently of whether the WhatsApp send actually
 *     succeeded, so we have no reliable evidence either way.
 *
 * Idempotent: doc ID is deterministic (`legacy_<message ts>`), so re-running
 * this script skips entries already backfilled rather than duplicating them.
 *
 * SAFETY: dry-run by default. No Firestore writes happen unless --live is
 * passed explicitly (same convention as backfillPhoneE164.mjs).
 *
 *   node scripts/backfillWhatsappMessages.mjs                # dry run
 *   node scripts/backfillWhatsappMessages.mjs --live          # real writes
 *   node scripts/backfillWhatsappMessages.mjs --limit=10      # cap conversations scanned (testing)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : null;

// ── Env + Admin SDK init (env-first, JSON-file fallback) ────────────────────

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    let key = null, val = '';
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
      if (m) { if (key && !process.env[key]) process.env[key] = val.trim(); key = m[1]; val = m[2]; }
      else if (key) { val += '\n' + line; }
    }
    if (key && !process.env[key]) process.env[key] = val.trim();
  } catch {
    /* .env.local not present — rely on real environment variables */
  }
}
loadEnvLocal();

if (!getApps().length) {
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL ?? '').replace(/^Value:\s*/i, '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'your-sofer', clientEmail, privateKey }),
    });
  } else {
    const sa = JSON.parse(
      readFileSync(resolve(__dirname, '../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json'), 'utf8'),
    );
    initializeApp({ credential: cert(sa) });
  }
}
const db = getFirestore();

// ── Role -> (direction, senderType) mapping, matching the legacy array's roles ─

function roleToDirectionAndSender(role) {
  if (role === 'user') return { direction: 'inbound', senderType: 'CUSTOMER' };
  if (role === 'assistant') return { direction: 'outbound', senderType: 'BOT' };
  if (role === 'admin') return { direction: 'outbound', senderType: 'AGENT' };
  return { direction: 'outbound', senderType: 'SYSTEM' };
}

// ── Backfill ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(LIVE ? '=== LIVE RUN — writes will be committed ===' : '=== DRY RUN — no writes will be performed ===');
  if (LIMIT) console.log(`(limited to first ${LIMIT} conversations)`);

  const convosSnap = await db.collection('whatsappConversations').get();
  let conversations = convosSnap.docs;
  if (LIMIT) conversations = conversations.slice(0, LIMIT);

  let conversationsScanned = 0;
  let messagesScanned = 0;
  let messagesWritten = 0;
  let messagesAlreadyBackfilled = 0;
  let messagesSkippedNoTs = 0;

  for (const convoDoc of conversations) {
    conversationsScanned++;
    const data = convoDoc.data();
    const messages = Array.isArray(data.messages) ? data.messages : [];
    if (messages.length === 0) continue;

    const messagesRef = convoDoc.ref.collection('messages');
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 400;

    for (const m of messages) {
      messagesScanned++;
      if (typeof m.ts !== 'number') {
        messagesSkippedNoTs++;
        continue;
      }

      const legacyId = `legacy_${m.ts}`;
      const msgRef = messagesRef.doc(legacyId);

      // Idempotency check (dry run reports this too, so counts are accurate
      // for a "what would --live actually do" preview).
      const existing = await msgRef.get();
      if (existing.exists) {
        messagesAlreadyBackfilled++;
        continue;
      }

      messagesWritten++;
      if (LIVE) {
        const { direction, senderType } = roleToDirectionAndSender(m.role);
        batch.set(msgRef, {
          id: legacyId,
          wamid: null,
          conversationId: convoDoc.id,
          direction,
          senderType,
          senderAgentId: null,
          type: 'text',
          text: m.content ?? null,
          media: null,
          replyToMessageId: null,
          status: null, // unknown for historical entries — see file header
          errorCode: null,
          errorMessage: null,
          createdAt: new Date(m.ts),
          metaTimestamp: null,
          sentAt: null,
          deliveredAt: null,
          readAt: null,
          failedAt: null,
          backfilled: true,
        });
        batchCount++;
        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (LIVE && batchCount > 0) {
      await batch.commit();
    }
  }

  console.log('\n=== Summary ===');
  console.log(`conversations scanned:        ${conversationsScanned}`);
  console.log(`messages scanned:             ${messagesScanned}`);
  console.log(`messages ${LIVE ? 'written' : 'would write'}:${' '.repeat(LIVE ? 10 : 6)}${messagesWritten}`);
  console.log(`messages already backfilled:  ${messagesAlreadyBackfilled}`);
  console.log(`messages skipped (no ts):     ${messagesSkippedNoTs}`);

  if (!LIVE) {
    console.log('\nThis was a dry run. Re-run with --live to write the messages subcollection.');
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('backfillWhatsappMessages failed:', err);
  process.exit(1);
});
