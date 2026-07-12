// Tiered kipa unit pricing (print included): 1–29 → ₪19 | 30–99 → ₪12 | 100–150 → ₪10 | 151+ → ₪9
export const getKipaUnitPrice = (q: number): number =>
  q <= 29 ? 19 : q <= 99 ? 12 : q <= 150 ? 10 : 9;
