// Account era separation — YourSofer moved from the Amuta's Sumit account to the
// business (עוסק מורשה 304803810) Sumit account on 10/07/2026.
// All financial dashboards start counting fresh from this date ("business era"),
// while Amuta-era history stays viewable. Inventory is NOT era-split — stock carries over.

export const BUSINESS_ERA_START = new Date('2026-07-10T00:00:00+03:00');

export type AccountEra = 'business' | 'amuta' | 'all';

export const ERA_OPTIONS: { value: AccountEra; label: string }[] = [
  { value: 'business', label: '🏢 העסק (מ-10/07/26)' },
  { value: 'amuta', label: '🕍 העמותה (היסטוריה)' },
  { value: 'all', label: '📋 הכל' },
];

/**
 * Does a date belong to the given era?
 * Orders with an `account` field (stamped at creation from 10/07/2026 onwards)
 * should prefer isOrderInEra below; date-based check is the fallback for all
 * historical orders that have no such field.
 */
export function isDateInEra(date: Date | null, era: AccountEra): boolean {
  if (era === 'all') return true;
  if (!date) return era === 'amuta'; // undated docs are old → amuta era
  return era === 'business'
    ? date.getTime() >= BUSINESS_ERA_START.getTime()
    : date.getTime() < BUSINESS_ERA_START.getTime();
}

/** Era check for order-like objects: explicit `account` field wins, date is fallback. */
export function isOrderInEra(
  order: { account?: string },
  date: Date | null,
  era: AccountEra,
): boolean {
  if (era === 'all') return true;
  if (order.account === 'business') return era === 'business';
  if (order.account === 'amuta') return era === 'amuta';
  return isDateInEra(date, era);
}
