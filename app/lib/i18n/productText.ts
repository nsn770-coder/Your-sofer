// ─────────────────────────────────────────────────────────────────────────────
// קריאת שם ותיאור מוצר בשפת המשתמש
//
// התרגומים נשמרים על מסמך המוצר תחת translations.<locale>, ונכתבים ע"י
// scripts/translateProducts.mjs. השדות המקוריים (name / desc / description)
// לא משתנים לעולם — הם נשארים מקור האמת בעברית ומשמשים את האדמין, את פיד
// המרצ'נט, את ההזמנות ואת החיפוש.
//
// כלל הנפילה: תרגום חסר → מוחזר הטקסט העברי. עדיף שם עברי אמיתי מאשר
// תיבה ריקה או מזהה גולמי.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductTranslation {
  name?: string;
  description?: string;
}

/** צורת השדה שמתווסף למסמך המוצר */
export type ProductTranslations = Record<string, ProductTranslation | undefined>;

interface TranslatableProduct {
  name?: string;
  desc?: string;
  description?: string;
  translations?: ProductTranslations;
}

/** שם המוצר בשפת המשתמש */
export function productName(p: TranslatableProduct | null | undefined, locale: string): string {
  if (!p) return '';
  const hebrew = p.name ?? '';
  if (locale === 'he') return hebrew;
  const t = p.translations?.[locale]?.name;
  return t && t.trim() ? t : hebrew;
}

/** תיאור המוצר בשפת המשתמש */
export function productDescription(p: TranslatableProduct | null | undefined, locale: string): string {
  if (!p) return '';
  const hebrew = p.desc || p.description || '';
  if (locale === 'he') return hebrew;
  const t = p.translations?.[locale]?.description;
  return t && t.trim() ? t : hebrew;
}

/** האם קיים תרגום לשפה הזו — שימושי לדוחות כיסוי ולבדיקות */
export function hasTranslation(p: TranslatableProduct | null | undefined, locale: string): boolean {
  return !!p?.translations?.[locale]?.name?.trim();
}
