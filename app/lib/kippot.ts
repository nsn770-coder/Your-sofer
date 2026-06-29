// Tiered kipa unit pricing (print included): 1–49 → ₪19 | 50–99 → ₪17 | 100–150 → ₪10 | 151+ → ₪9
export const getKipaUnitPrice = (q: number): number =>
  q <= 49 ? 19 : q <= 99 ? 17 : q <= 150 ? 10 : 9;
