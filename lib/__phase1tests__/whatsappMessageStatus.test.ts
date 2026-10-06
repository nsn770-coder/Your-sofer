import { describe, it, expect } from 'vitest';
import { createFakeFirestore } from './helpers/fakeFirestore';
import {
  recordOutboundMessagePending,
  markOutboundMessageSent,
  recordEchoedOutboundMessage,
  applyInboundStatusEvent,
} from '@/lib/services/whatsappMessageStore';

async function setUpSentMessage(db: ReturnType<typeof createFakeFirestore>, wamid: string) {
  const { messageId } = await recordOutboundMessagePending(db, {
    conversationId: '972501234567',
    senderType: 'BOT',
    text: 'hello',
  });
  await markOutboundMessageSent(db, '972501234567', messageId, wamid);
  return messageId;
}

describe('applyInboundStatusEvent', () => {
  it('progresses sent -> delivered -> read, in order', async () => {
    const db = createFakeFirestore();
    const messageId = await setUpSentMessage(db, 'wamid.PROGRESS1');

    const r1 = await applyInboundStatusEvent(db, 'wamid.PROGRESS1', 'delivered');
    expect(r1).toEqual({ applied: true, reason: 'updated_to_delivered' });
    expect(db._get(`whatsappConversations/972501234567/messages/${messageId}`)?.status).toBe('delivered');

    const r2 = await applyInboundStatusEvent(db, 'wamid.PROGRESS1', 'read');
    expect(r2).toEqual({ applied: true, reason: 'updated_to_read' });
    expect(db._get(`whatsappConversations/972501234567/messages/${messageId}`)?.status).toBe('read');
  });

  it('does not let a late "delivered" regress an already-"read" message', async () => {
    const db = createFakeFirestore();
    const messageId = await setUpSentMessage(db, 'wamid.LATE1');

    await applyInboundStatusEvent(db, 'wamid.LATE1', 'delivered');
    await applyInboundStatusEvent(db, 'wamid.LATE1', 'read');

    const late = await applyInboundStatusEvent(db, 'wamid.LATE1', 'delivered');
    expect(late).toEqual({ applied: false, reason: 'not_monotonic' });
    expect(db._get(`whatsappConversations/972501234567/messages/${messageId}`)?.status).toBe('read');
  });

  it('is idempotent for a duplicate/retried identical status event', async () => {
    const db = createFakeFirestore();
    const messageId = await setUpSentMessage(db, 'wamid.DUP1');

    const first = await applyInboundStatusEvent(db, 'wamid.DUP1', 'delivered');
    const second = await applyInboundStatusEvent(db, 'wamid.DUP1', 'delivered');

    expect(first.applied).toBe(true);
    expect(second).toEqual({ applied: false, reason: 'not_monotonic' });
    expect(db._get(`whatsappConversations/972501234567/messages/${messageId}`)?.status).toBe('delivered');
  });

  it('records a failed status with error details on a freshly-sent message', async () => {
    const db = createFakeFirestore();
    const messageId = await setUpSentMessage(db, 'wamid.FAIL1');

    const result = await applyInboundStatusEvent(db, 'wamid.FAIL1', 'failed', {
      errorCode: '131026',
      errorMessage: 'Message undeliverable',
    });

    expect(result).toEqual({ applied: true, reason: 'failed_recorded' });
    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('failed');
    expect(stored?.errorCode).toBe('131026');
    expect(stored?.errorMessage).toBe('Message undeliverable');
  });

  it('ignores a stale "failed" event that arrives after delivered/read', async () => {
    const db = createFakeFirestore();
    const messageId = await setUpSentMessage(db, 'wamid.STALEFAIL1');
    await applyInboundStatusEvent(db, 'wamid.STALEFAIL1', 'delivered');

    const result = await applyInboundStatusEvent(db, 'wamid.STALEFAIL1', 'failed', {
      errorCode: '131026',
      errorMessage: 'should not apply',
    });

    expect(result).toEqual({ applied: false, reason: 'stale_failed_after_success' });
    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('delivered');
    expect(stored?.errorCode).toBeNull();
  });

  it('does not crash and reports unknown_wamid for a status event with no matching pointer', async () => {
    const db = createFakeFirestore();
    const result = await applyInboundStatusEvent(db, 'wamid.NEVERSEEN', 'delivered');
    expect(result).toEqual({ applied: false, reason: 'unknown_wamid' });
  });
});

describe('applyInboundStatusEvent — race guard (status arrives before the wamid pointer)', () => {
  it('does not permanently lose a "sent" status that races ahead of markOutboundMessageSent', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'BOT',
      text: 'hello',
    });

    // Simulates Meta's status webhook arriving before our own code has
    // finished writing the whatsappProcessed/{wamid} pointer.
    const raced = await applyInboundStatusEvent(db, 'wamid.RACE1', 'sent');
    expect(raced).toEqual({ applied: false, reason: 'unknown_wamid' });
    expect(db._get(`whatsappConversations/972501234567/messages/${messageId}`)?.status).toBe('pending');

    // The pointer is registered afterward, as normal — reconciliation should
    // replay the orphaned "sent" event automatically.
    await markOutboundMessageSent(db, '972501234567', messageId, 'wamid.RACE1');

    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('sent');
    expect(stored?.sentAt).toBeInstanceOf(Date);
  });

  it('reconciles a raced "delivered" event that arrived after "sent" but before the pointer existed', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'BOT',
      text: 'hello',
    });

    const raced = await applyInboundStatusEvent(db, 'wamid.RACE2', 'delivered');
    expect(raced.reason).toBe('unknown_wamid');

    await markOutboundMessageSent(db, '972501234567', messageId, 'wamid.RACE2');

    // Reconciliation applies the orphaned "delivered" directly from pending —
    // correct even though it skips the intermediate "sent" timestamp.
    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('delivered');
  });

  it('reconciles a raced status for a coexistence echo the same way', async () => {
    const db = createFakeFirestore();

    const raced = await applyInboundStatusEvent(db, 'wamid.RACEECHO1', 'delivered');
    expect(raced.reason).toBe('unknown_wamid');

    await recordEchoedOutboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.RACEECHO1',
      text: 'ענינו ידנית',
    });

    const stored = db._get('whatsappConversations/972501234567/messages/wamid.RACEECHO1');
    expect(stored?.status).toBe('delivered');
  });

  it('is a safe no-op when no orphaned event exists for the wamid', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'BOT',
      text: 'hello',
    });

    // No prior orphan for this wamid — markOutboundMessageSent's
    // reconciliation call must not throw or alter status.
    await markOutboundMessageSent(db, '972501234567', messageId, 'wamid.NOORPHAN1');

    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('sent');
  });
});
