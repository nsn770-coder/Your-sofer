// Canonical phone normalization for the WhatsApp CRM foundation (Phase 1).
//
// Goal: exactly one function, used everywhere a phone number needs to be
// compared across systems (WhatsApp wa_id, checkout-entered numbers, manual
// admin entry). Output is always full E.164 (e.g. "+972501234567") or null.
//
// This is deliberately a lightweight heuristic, not a full international
// phone-parsing library (e.g. libphonenumber) — this business's customers are
// overwhelmingly Israeli, so the defaults are Israel-first, but a bare-digit
// string long enough to already look like a full international number (e.g.
// a non-Israeli WhatsApp wa_id) is left as-is rather than corrupted by
// blindly prepending the default country code.

const MIN_E164_DIGITS = 8; // conservative floor — rejects obviously-too-short garbage
const MAX_E164_DIGITS = 15; // E.164 hard limit

/**
 * Normalizes a phone number to E.164 (e.g. "+972501234567").
 * Returns null for anything that doesn't resolve to a plausible number —
 * never throws on bad input.
 *
 * Handles: local Israeli numbers ("0501234567"), already-E.164 numbers
 * ("+972501234567"), the "00" international prefix ("00972501234567"), and
 * Meta's digits-only wa_id format ("972501234567", no leading "+").
 */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountry: string = '972',
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Strip common human formatting characters only (spaces, dashes, dots,
  // parens) — anything else left over (letters, etc.) means the input is
  // treated as malformed rather than guessed at.
  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  if (!cleaned) return null;
  if (!/^\+?\d+$/.test(cleaned)) return null;

  const hasPlus = cleaned.startsWith('+');
  let digits = hasPlus ? cleaned.slice(1) : cleaned;
  if (!digits) return null;

  if (hasPlus) {
    // Already E.164 shape — use as-is.
  } else if (digits.startsWith('00')) {
    // International prefix — the rest is <countrycode><number>.
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    // Local number with a trunk 0 (e.g. Israeli "050...").
    digits = defaultCountry + digits.slice(1);
  } else if (digits.length <= 10) {
    // Short bare-digit string with no leading 0/+/00 — treat as a local
    // number missing its trunk 0 (e.g. "501234567").
    digits = defaultCountry + digits;
  }
  // else: 11+ bare digits with no +/00/0 prefix — assume it already IS
  // country-code-prefixed (this is exactly what Meta's wa_id looks like,
  // for Israeli and non-Israeli senders alike) and leave it unchanged.

  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) return null;

  return '+' + digits;
}
