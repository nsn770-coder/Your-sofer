export interface StepDef {
  title:    string;
  subtitle: string;
  href:     string;
  category: string; // Firestore cat value for wizardCategory
}

export const BAR_MITZVA_STEPS: StepDef[] = [
  {
    title:    'בחר סט בר מצווה',
    subtitle: 'סטים מלאים הכוללים טלית, תפילין וכיסויים',
    href:     `/category/${encodeURIComponent('בר מצווה')}?from=bar-mitzva`,
    category: 'בר מצווה',
  },
  {
    title:    'בחר כיסוי',
    subtitle: 'כיסויי תפילין – מגוון צבעים ובדים',
    href:     `/category/${encodeURIComponent('סט טלית תפילין')}?from=bar-mitzva`,
    category: 'סט טלית תפילין',
  },
  {
    title:    'בחר טלית',
    subtitle: 'טליתות איכותיות לבר מצווה',
    href:     `/category/${encodeURIComponent('טליתות וציציות')}?from=bar-mitzva`,
    category: 'טליתות',
  },
  {
    title:    'בחר תפילין',
    subtitle: 'תפילין מהודרים לכל הנוסחים',
    href:     `/category/${encodeURIComponent('תפילין קומפלט')}?from=bar-mitzva`,
    category: 'תפילין קומפלט',
  },
  {
    title:    'בחר כיפה',
    subtitle: 'כיפות בסגנונות ובחומרים מגוונים',
    href:     `/category/${encodeURIComponent('כיפות')}?from=bar-mitzva`,
    category: 'כיפות',
  },
  {
    title:    'בחר סידור',
    subtitle: 'סידורים מהודרים לבר מצווה',
    href:     `/category/${encodeURIComponent('ספרים')}?filter=${encodeURIComponent('סידורים')}&from=bar-mitzva`,
    category: 'ספרים',
  },
];

export const BAR_MITZVA_TOTAL = BAR_MITZVA_STEPS.length;
