import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWhatsAppMessage } from '@/lib/whatsappSend';

// sendWhatsAppMessage falls back to a Firestore error-log write on failure
// (lib/whatsappSend.ts's logError), which is already wrapped in its own
// try/catch that swallows any error — including "Firebase app not
// initialized" in a test environment with no real credentials — so no
// Firestore mocking is needed here; those calls are safe no-ops in tests.

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.D360_API_KEY;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_API_TOKEN;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('sendWhatsAppMessage — wamid capture', () => {
  it('captures the wamid from a successful Meta Graph API response', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_API_TOKEN = 'test-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.META123' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWhatsAppMessage('972501234567', 'hello');

    expect(result).toEqual({ ok: true, wamid: 'wamid.META123' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('graph.facebook.com'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('captures the wamid from a successful 360dialog response, and prefers 360dialog when both are configured', async () => {
    process.env.D360_API_KEY = 'test-d360-key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_API_TOKEN = 'test-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.D360ABC' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWhatsAppMessage('972501234567', 'hello');

    expect(result).toEqual({ ok: true, wamid: 'wamid.D360ABC' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('waba-v2.360dialog.io'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns ok:false with no wamid when the API responds with an error status', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_API_TOKEN = 'test-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid OAuth access token',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWhatsAppMessage('972501234567', 'hello');

    expect(result.ok).toBe(false);
    expect(result.wamid).toBeNull();
    expect(result.error).toContain('401');
  });

  it('returns ok:false with no wamid, and does not call fetch, when no transport is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendWhatsAppMessage('972501234567', 'hello');

    expect(result.ok).toBe(false);
    expect(result.wamid).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
