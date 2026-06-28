import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? 'dev-unsubscribe-secret-change-in-prod';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://your-sofer.com';

export function signUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim();
  const payload = Buffer.from(normalized).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(normalized).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx < 1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const providedSig = token.slice(dotIdx + 1);
    const email = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = createHmac('sha256', SECRET).update(email).digest('base64url');
    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(providedSig.padEnd(expectedSig.length, '\0'));
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return email;
  } catch {
    return null;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  return `${BASE_URL}/unsubscribe?token=${signUnsubscribeToken(email)}`;
}
