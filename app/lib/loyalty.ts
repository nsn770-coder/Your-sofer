// ── מועדון YOUR SOFER — הגדרות דרגות ופונקציות עזר ──────────────────────────
// תצוגה בלבד. לוגיקת צבירה תיבנה בשלב 3.

export type Tier = 'bronze' | 'silver' | 'gold';

export interface TierDefinition {
  id: Tier;
  label: string;          // שם בעברית
  labelEn: string;
  minSpent: number;       // סף כניסה ב-₪
  maxSpent: number | null; // null = אין תקרה
  color: string;          // צבע ראשי
  colorLight: string;     // רקע בהיר לכרטיסים
  accrualRate: number;    // אחוז צבירה (לתצוגה)
  benefits: string[];     // רשימת הטבות
  icon: string;
}

export const TIER_CONFIG: Record<Tier, TierDefinition> = {
  bronze: {
    id: 'bronze',
    label: 'ברונזה',
    labelEn: 'Bronze',
    minSpent: 0,
    maxSpent: 1399,
    color: '#CD7F32',
    colorLight: '#FDF5EC',
    accrualRate: 10,
    benefits: [
      'צבירת 10% נקודות על כל קנייה',
      'גישה למבצעי מועדון',
    ],
    icon: '🥉',
  },
  silver: {
    id: 'silver',
    label: 'כסף',
    labelEn: 'Silver',
    minSpent: 1400,
    maxSpent: 3599,
    color: '#9CA3AF',
    colorLight: '#F3F4F6',
    accrualRate: 10,
    benefits: [
      'צבירת 10% נקודות על כל קנייה',
      'גישה מוקדמת למבצעים',
      'מבצעי מועדון בלעדיים',
    ],
    icon: '🥈',
  },
  gold: {
    id: 'gold',
    label: 'זהב',
    labelEn: 'Gold',
    minSpent: 3600,
    maxSpent: null,
    color: 'var(--ys-accent)',
    colorLight: '#FDF8EE',
    accrualRate: 12,
    benefits: [
      'צבירת 12% נקודות על כל קנייה',
      'משלוח חינם בהזמנות מעל ₪100',
      'גישה מוקדמת למבצעים ומוצרים חדשים',
      'מבצעי מועדון בלעדיים',
    ],
    icon: '🥇',
  },
};

// סדר הדרגות מהנמוך לגבוה — לשימוש בטבלאות תצוגה
export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold'];

// מחזיר את הדרגה של המשתמש לפי הוצאה מצטברת
export function getTier(totalSpent: number): TierDefinition {
  if (totalSpent >= TIER_CONFIG.gold.minSpent) return TIER_CONFIG.gold;
  if (totalSpent >= TIER_CONFIG.silver.minSpent) return TIER_CONFIG.silver;
  return TIER_CONFIG.bronze;
}

export interface NextTierInfo {
  nextTier: TierDefinition | null; // null = כבר בדרגה הגבוהה ביותר
  amountToNext: number;            // כמה ₪ חסרים
  progressPercent: number;         // 0–100 לפס ההתקדמות
  progressLabel: string;           // טקסט לתצוגה
}

// מחשב את ההתקדמות לדרגה הבאה
export function getNextTierInfo(totalSpent: number): NextTierInfo {
  const current = getTier(totalSpent);

  if (current.id === 'gold') {
    return {
      nextTier: null,
      amountToNext: 0,
      progressPercent: 100,
      progressLabel: 'הדרגה הגבוהה ביותר 🏆',
    };
  }

  const nextTier = current.id === 'bronze' ? TIER_CONFIG.silver : TIER_CONFIG.gold;
  const rangeStart = current.minSpent;
  const rangeEnd = nextTier.minSpent;
  const amountToNext = rangeEnd - totalSpent;
  const progressPercent = Math.round(
    ((totalSpent - rangeStart) / (rangeEnd - rangeStart)) * 100
  );

  return {
    nextTier,
    amountToNext,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    progressLabel: `עוד ₪${amountToNext.toLocaleString('he-IL')} עד דרגת ${nextTier.label}`,
  };
}

// עיצוב מספר כ-₪ קריא
export function formatILS(n: number): string {
  return `₪${n.toLocaleString('he-IL')}`;
}
