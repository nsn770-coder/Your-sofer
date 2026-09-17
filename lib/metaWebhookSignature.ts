import { createHmac, timingSafeEqual } from 'crypto';

// Phase 1 Step 5 — webhook signature verification, LOG-ONLY.
//
// Verifies Meta's `X-Hub-Signature-256` header (HMAC-SHA256 of the raw
// request body, keyed by the app's App Secret) against the raw body bytes.
// This module is a pure function with no side effects and NEVER throws —
// callers decide what to do with the result. In Phase 1, callers must never
// reject a request based on this result; it exists purely to observe real
// Meta traffic before enforcement is deliberately enabled in a later phase.
//
// SECURITY: never log the App Secret, the raw signature header value, or the
// computed digest anywhere — only the categorical status below.

export type SignatureVerificationStatus = 'valid' | 'invalid' | 'missing_secret' | 'missing_signature';

export interface VerifyMetaSignatureResult {
  status: SignatureVerificationStatus;
}

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verifies Meta's X-Hub-Signature-256 header against the exact raw webhook
 * body Meta signed. Must be called with the raw body text — re-serializing
 * already-parsed JSON will not reliably match (whitespace/key-order can
 * differ) and will falsely report `invalid`.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined,
): VerifyMetaSignatureResult {
  if (!appSecret) {
    return { status: 'missing_secret' };
  }
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return { status: 'missing_signature' };
  }

  const provided = signatureHeader.slice(SIGNATURE_PREFIX.length).trim();
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  // Buffer.from(str, 'hex') never throws on non-hex input — it just stops
  // parsing early, which naturally produces a length mismatch below rather
  // than requiring a try/catch for malformed header values.
  const providedBuf = Buffer.from(provided, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  // Constant-time comparison to avoid leaking timing information. Lengths
  // must match before calling timingSafeEqual (it throws on mismatched
  // lengths) — a mismatch here just means "invalid", not an error.
  if (providedBuf.length !== expectedBuf.length) {
    return { status: 'invalid' };
  }

  return { status: timingSafeEqual(providedBuf, expectedBuf) ? 'valid' : 'invalid' };
}
