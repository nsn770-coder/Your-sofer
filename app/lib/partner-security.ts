// Phase 8: Security Utilities
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

/**
 * Verify partner ownership of a resource
 */
export async function verifyPartnerOwnership(
  uid: string,
  partnerId: string
): Promise<boolean> {
  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection('users').doc(uid).get();

  if (!userSnap.exists || !userSnap.data()?.partnerId) {
    return false;
  }

  return userSnap.data()?.partnerId === partnerId;
}

/**
 * Verify admin access
 */
export async function verifyAdminAccess(uid: string): Promise<boolean> {
  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection('users').doc(uid).get();

  return userSnap.exists && userSnap.data()?.role === 'admin';
}

/**
 * Sanitize update object - only allow whitelisted fields
 */
export function sanitizePartnerUpdate(
  updates: Record<string, unknown>,
  allowedFields: string[]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate business name
 */
export function validateBusinessName(name: string): boolean {
  return name.length >= 3 && name.length <= 100 && !/<|>|\//.test(name);
}

/**
 * Validate hex color
 */
export function validateHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Validate Israeli phone number (mobile or landline, with or without dashes)
 */
export function validateIsraeliPhone(phone: string): boolean {
  const digits = phone.replace(/[\s-]/g, '');
  return /^0(5\d|[2-489])\d{7}$/.test(digits);
}

/**
 * Rate limit check
 */
const limiter = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = limiter.get(key);

  if (!entry || now > entry.resetAt) {
    limiter.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}
