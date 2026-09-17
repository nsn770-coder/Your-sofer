import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  it('normalizes a local Israeli number (trunk 0)', () => {
    expect(normalizePhone('0501234567')).toBe('+972501234567');
  });

  it('normalizes bare digits already carrying the country code (Meta wa_id shape)', () => {
    expect(normalizePhone('972501234567')).toBe('+972501234567');
  });

  it('normalizes an already-E.164 number', () => {
    expect(normalizePhone('+972501234567')).toBe('+972501234567');
  });

  it('normalizes the 00 international prefix', () => {
    expect(normalizePhone('00972501234567')).toBe('+972501234567');
  });

  it('strips common human formatting characters', () => {
    expect(normalizePhone('050-123-4567')).toBe('+972501234567');
    expect(normalizePhone('(050) 123 4567')).toBe('+972501234567');
  });

  it('does not corrupt a non-Israeli bare-digit wa_id by prepending the default country', () => {
    // 11-digit bare number with no +/00/0 prefix — treated as already
    // country-coded rather than assumed to be a short local number.
    expect(normalizePhone('15551234567')).toBe('+15551234567');
  });

  it('returns null for empty/whitespace/nullish input, never throws', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });

  it('returns null for malformed input containing letters, never throws', () => {
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('050abc4567')).toBeNull();
    expect(normalizePhone('call me maybe')).toBeNull();
  });

  it('returns null for input that is too short to be a real number', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('0')).toBeNull();
  });

  it('returns null for input that is too long to be E.164', () => {
    expect(normalizePhone('+9725012345671234567890')).toBeNull();
  });

  it('respects a custom defaultCountry parameter', () => {
    expect(normalizePhone('0501234567', '1')).toBe('+1501234567');
  });
});
