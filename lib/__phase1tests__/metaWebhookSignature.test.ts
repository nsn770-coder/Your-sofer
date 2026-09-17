import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyMetaSignature } from '@/lib/metaWebhookSignature';

function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('verifyMetaSignature', () => {
  it('reports valid for a correctly-signed body', () => {
    const secret = 'test-app-secret';
    const body = JSON.stringify({ object: 'whatsapp_business_account' });
    const header = sign(body, secret);

    expect(verifyMetaSignature(body, header, secret)).toEqual({ status: 'valid' });
  });

  it('reports invalid when the signature does not match the body', () => {
    const secret = 'test-app-secret';
    const body = JSON.stringify({ object: 'whatsapp_business_account' });
    const header = sign('{"tampered":true}', secret);

    expect(verifyMetaSignature(body, header, secret)).toEqual({ status: 'invalid' });
  });

  it('reports invalid when signed with the wrong secret', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account' });
    const header = sign(body, 'wrong-secret');

    expect(verifyMetaSignature(body, header, 'test-app-secret')).toEqual({ status: 'invalid' });
  });

  it('reports missing_secret when no App Secret is configured, regardless of the header', () => {
    const body = '{}';
    const header = sign(body, 'irrelevant');

    expect(verifyMetaSignature(body, header, undefined)).toEqual({ status: 'missing_secret' });
    expect(verifyMetaSignature(body, null, '')).toEqual({ status: 'missing_secret' });
  });

  it('reports missing_signature when the header is absent or malformed, even with a secret configured', () => {
    const secret = 'test-app-secret';
    const body = '{}';

    expect(verifyMetaSignature(body, null, secret)).toEqual({ status: 'missing_signature' });
    expect(verifyMetaSignature(body, undefined, secret)).toEqual({ status: 'missing_signature' });
    expect(verifyMetaSignature(body, 'not-the-right-format', secret)).toEqual({ status: 'missing_signature' });
  });

  it('never throws on a malformed non-hex signature value', () => {
    const secret = 'test-app-secret';
    const body = '{}';
    expect(() => verifyMetaSignature(body, 'sha256=not-hex-at-all!!', secret)).not.toThrow();
    expect(verifyMetaSignature(body, 'sha256=not-hex-at-all!!', secret).status).toBe('invalid');
  });
});
