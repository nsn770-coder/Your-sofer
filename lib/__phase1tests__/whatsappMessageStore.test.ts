import { describe, it, expect } from 'vitest';
import { createFakeFirestore } from './helpers/fakeFirestore';
import {
  recordInboundMessage,
  recordEchoedOutboundMessage,
  recordOutboundMessagePending,
  markOutboundMessageSent,
  markOutboundMessageFailed,
} from '@/lib/services/whatsappMessageStore';

describe('whatsappMessageStore — inbound', () => {
  it('records an inbound message under the conversation, keyed by wamid', async () => {
    const db = createFakeFirestore();
    const result = await recordInboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.ABC123',
      text: 'שלום, יש לכם כיפות?',
    });

    expect(result).toEqual({ created: true, messageId: 'wamid.ABC123' });
    const stored = db._get('whatsappConversations/972501234567/messages/wamid.ABC123');
    expect(stored?.direction).toBe('inbound');
    expect(stored?.senderType).toBe('CUSTOMER');
    expect(stored?.text).toBe('שלום, יש לכם כיפות?');
    expect(stored?.wamid).toBe('wamid.ABC123');
  });

  it('is idempotent — a duplicate inbound wamid is not written twice', async () => {
    const db = createFakeFirestore();
    const first = await recordInboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.DUP',
      text: 'first delivery',
    });
    const second = await recordInboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.DUP',
      text: 'retried delivery — should not overwrite',
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    const stored = db._get('whatsappConversations/972501234567/messages/wamid.DUP');
    expect(stored?.text).toBe('first delivery'); // untouched by the "duplicate" retry
  });
});

describe('whatsappMessageStore — outbound', () => {
  it('creates a pending message with an auto-id and no wamid', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'BOT',
      text: 'הי! איך אפשר לעזור?',
    });

    expect(messageId).toBeTruthy();
    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('pending');
    expect(stored?.wamid).toBeNull();
    expect(stored?.direction).toBe('outbound');
    expect(stored?.senderType).toBe('BOT');
  });

  it('transitions pending -> sent and captures the wamid, registering a whatsappProcessed pointer', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'BOT',
      text: 'הי!',
    });

    await markOutboundMessageSent(db, '972501234567', messageId, 'wamid.SENT1');

    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('sent');
    expect(stored?.wamid).toBe('wamid.SENT1');
    expect(stored?.sentAt).toBeInstanceOf(Date);

    const pointer = db._get('whatsappProcessed/wamid.SENT1');
    expect(pointer).toEqual(
      expect.objectContaining({ direction: 'outbound', conversationId: '972501234567', messageId }),
    );
  });

  it('marks a pending message as failed with error details, without touching wamid', async () => {
    const db = createFakeFirestore();
    const { messageId } = await recordOutboundMessagePending(db, {
      conversationId: '972501234567',
      senderType: 'AGENT',
      senderAgentId: 'agent-1',
      text: 'תשובה ידנית',
    });

    await markOutboundMessageFailed(db, '972501234567', messageId, '131056', 'Recipient not on WhatsApp');

    const stored = db._get(`whatsappConversations/972501234567/messages/${messageId}`);
    expect(stored?.status).toBe('failed');
    expect(stored?.errorCode).toBe('131056');
    expect(stored?.errorMessage).toBe('Recipient not on WhatsApp');
    expect(stored?.wamid).toBeNull();
  });
});

describe('whatsappMessageStore — coexistence echo', () => {
  it('records an echoed business-app message as an already-sent AGENT message', async () => {
    const db = createFakeFirestore();
    const result = await recordEchoedOutboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.ECHO1',
      text: 'ענינו ידנית מהטלפון',
    });

    expect(result.created).toBe(true);
    const stored = db._get('whatsappConversations/972501234567/messages/wamid.ECHO1');
    expect(stored?.direction).toBe('outbound');
    expect(stored?.senderType).toBe('AGENT');
    expect(stored?.status).toBe('sent');

    const pointer = db._get('whatsappProcessed/wamid.ECHO1');
    expect(pointer).toEqual(
      expect.objectContaining({ direction: 'outbound', conversationId: '972501234567', messageId: 'wamid.ECHO1' }),
    );
  });

  it('is idempotent — a duplicate echo wamid is not written twice', async () => {
    const db = createFakeFirestore();
    const first = await recordEchoedOutboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.ECHODUP',
      text: 'original',
    });
    const second = await recordEchoedOutboundMessage(db, {
      conversationId: '972501234567',
      wamid: 'wamid.ECHODUP',
      text: 'retried — should not overwrite',
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    const stored = db._get('whatsappConversations/972501234567/messages/wamid.ECHODUP');
    expect(stored?.text).toBe('original');
  });
});
