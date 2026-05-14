export interface DemoReview {
  id: number;
  name: string;
  city: string;
  stars: number;
  text: string;
  productTypes: string[];
}

export const DEMO_REVIEWS: DemoReview[] = [
  { id: 1, name: 'אורי', city: 'דימונה', stars: 5, text: 'האפשרות לראות את הקלף האמיתי לפני הרכישה נתנה לי ביטחון שלא מצאתי בשום מקום אחר.', productTypes: ['mezuzah-klaf'] },
  { id: 2, name: 'נועה', city: 'תל אביב', stars: 5, text: 'סט בר מצווה ברמה ממש גבוהה. האריזה הייתה מרגשת בטירוף.', productTypes: ['bar-mitzvah-set'] },
  { id: 3, name: 'יאיר', city: 'ירושלים', stars: 5, text: 'הרב שלנו בדק את התפילין והתרשם מאוד מההידור.', productTypes: ['tefillin'] },
  { id: 4, name: 'פנינה', city: 'קריית גת', stars: 5, text: 'הנטלה שקיבלנו יפה יותר מהתמונות. מרגישה יוקרתית.', productTypes: ['netilat'] },
  { id: 5, name: 'רפאל', city: 'באר שבע', stars: 5, text: 'שירות אנושי נדיר. עזרו לי לבחור לפי התקציב בלי ללחוץ.', productTypes: ['mezuzah-klaf', 'tefillin', 'general'] },
  { id: 6, name: 'שרה', city: 'נתיבות', stars: 5, text: 'הילד שלי התרגש מאוד לקבל את סט הבר מצווה.', productTypes: ['bar-mitzvah-set'] },
  { id: 7, name: 'גיא', city: 'ראש העין', stars: 5, text: 'פעם ראשונה שאני באמת מרגיש שקניתי מסופר אמיתי.', productTypes: ['mezuzah-klaf'] },
  { id: 8, name: 'הילה', city: 'חולון', stars: 5, text: 'בתי המזוזה נראים יוקרתיים מאוד בבית.', productTypes: ['mezuzah-case'] },
  { id: 9, name: 'יהונתן', city: 'צפת', stars: 5, text: 'אהבתי במיוחד את השקיפות והסרטון של הסופר.', productTypes: ['mezuzah-klaf'] },
  { id: 10, name: 'אלמה', city: 'רמת השרון', stars: 5, text: 'האריזה ברמה של מותג יוקרה.', productTypes: ['bar-mitzvah-set', 'tefillin'] },
  { id: 11, name: 'נתי', city: 'קריית שמונה', stars: 5, text: 'קיבלתי תעודת בדיקה מסודרת וזה נתן הרבה ביטחון.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 12, name: 'מאיה', city: 'רמת גן', stars: 5, text: 'התפילין קומפלט הגיעו מושלם ובזמן.', productTypes: ['tefillin'] },
  { id: 13, name: 'שקד', city: 'זכרון יעקב', stars: 5, text: 'האיכות של בתי המזוזה ברמה אחרת.', productTypes: ['mezuzah-case'] },
  { id: 14, name: 'עידו', city: 'הרצליה', stars: 5, text: 'האתר הכי מקצועי שראיתי בתחום הסת״מ.', productTypes: ['general'] },
  { id: 15, name: 'רוני', city: 'פרדס חנה', stars: 5, text: 'הרגשתי שיש פה קדושה ולא רק מכירה.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 16, name: 'מור', city: 'נס ציונה', stars: 5, text: 'המזוזות הגיעו ארוזות בצורה מאוד מכובדת.', productTypes: ['mezuzah-klaf'] },
  { id: 17, name: 'אביתר', city: 'בית שמש', stars: 5, text: 'רואים שמי שכתב את הקלף באמת ירא שמים.', productTypes: ['mezuzah-klaf'] },
  { id: 18, name: 'כפיר', city: 'לוד', stars: 5, text: 'קניתי כבר כמה פעמים ואמשיך להזמין.', productTypes: ['general'] },
  { id: 19, name: 'טליה', city: 'כרמיאל', stars: 5, text: 'שירות וואטסאפ מהיר וסבלני.', productTypes: ['general'] },
  { id: 20, name: 'רועי', city: 'חיפה', stars: 5, text: 'התמונות באתר מאוד עוזרות להבין מה מקבלים.', productTypes: ['mezuzah-case', 'netilat', 'general'] },
  { id: 21, name: 'אליאור', city: 'נוף הגליל', stars: 5, text: 'הכי אהבתי שהיה אפשר לבחור קלף ספציפי.', productTypes: ['mezuzah-klaf'] },
  { id: 22, name: 'שובל', city: 'אור יהודה', stars: 5, text: 'הנטלה שקיבלתי פשוט מהממת.', productTypes: ['netilat'] },
  { id: 23, name: 'נדב', city: 'רחובות', stars: 5, text: 'הרמה ההלכתית מורגשת בכל פרט.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 24, name: 'אורטל', city: 'רמלה', stars: 5, text: 'הגיע מהר יותר ממה שציפיתי.', productTypes: ['general'] },
  { id: 25, name: 'ליבי', city: 'אופקים', stars: 5, text: 'סט הבר מצווה היה מושלם למתנה.', productTypes: ['bar-mitzvah-set'] },
  { id: 26, name: 'תומר', city: 'אשקלון', stars: 5, text: 'מחירים הוגנים ביחס לרמה.', productTypes: ['general'] },
  { id: 27, name: 'אבישג', city: 'בת ים', stars: 5, text: 'בתי המזוזה נראים אפילו יותר יפה במציאות.', productTypes: ['mezuzah-case'] },
  { id: 28, name: 'דניאל', city: 'רעננה', stars: 5, text: 'התמיכה באתר עזרה לי להבין הבדלים בין רמות הידור.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 29, name: 'אלין', city: 'עפולה', stars: 5, text: 'הרגשתי שקניתי ממקום אמין.', productTypes: ['general'] },
  { id: 30, name: 'שחר', city: 'ראשון לציון', stars: 5, text: 'המוצר הגיע עם תיעוד ותמונות וזה היה מרשים.', productTypes: ['mezuzah-klaf'] },
  { id: 31, name: 'בר', city: 'מעלה אדומים', stars: 5, text: 'האיכות של הרצועות בתפילין מורגשת.', productTypes: ['tefillin'] },
  { id: 32, name: 'עומר', city: 'נהריה', stars: 5, text: 'המשלוח היה מסודר וארוז בצורה מכבדת.', productTypes: ['general'] },
  { id: 33, name: 'סיוון', city: 'אריאל', stars: 5, text: 'פעם ראשונה שקנייה אונליין של סת״מ הרגישה בטוחה.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 34, name: 'אופיר', city: 'קריית מוצקין', stars: 5, text: 'הבית מזוזה שקנינו מושך מחמאות מכולם.', productTypes: ['mezuzah-case'] },
  { id: 35, name: 'ליאור', city: 'אשדוד', stars: 5, text: 'אהבתי שיש מידע ברור על הסופר והמגיה.', productTypes: ['mezuzah-klaf', 'tefillin'] },
  { id: 36, name: 'אדל', city: 'טירת כרמל', stars: 5, text: 'הסט לבר מצווה נתן תחושה יוקרתית מאוד.', productTypes: ['bar-mitzvah-set'] },
  { id: 37, name: 'מתן', city: 'מודיעין', stars: 5, text: 'חוויית קנייה חלקה ומכובדת.', productTypes: ['general'] },
  { id: 38, name: 'נהוראי', city: 'יקנעם', stars: 5, text: 'רואים מחשבה על כל פרט קטן.', productTypes: ['general'] },
  { id: 39, name: 'רותם', city: 'הוד השרון', stars: 5, text: 'השילוב של יוקרה ואותנטיות נדיר.', productTypes: ['general'] },
  { id: 40, name: 'יובל', city: 'נתניה', stars: 5, text: 'המזוזות הגיעו מוכנות ומסודרות בצורה מקצועית.', productTypes: ['mezuzah-klaf'] },
  { id: 41, name: 'אלון', city: 'אילת', stars: 5, text: 'הסרטונים של הסופרים ממש חיזקו לי את האמון.', productTypes: ['mezuzah-klaf'] },
  { id: 42, name: 'גלעד', city: 'פתח תקווה', stars: 5, text: 'התפילין נבדקו גם אצל הרב שלי והוא מאוד התרשם.', productTypes: ['tefillin'] },
  { id: 43, name: 'חני', city: 'ירושלים', stars: 5, text: 'המארז לבר מצווה היה מרגש ומכובד.', productTypes: ['bar-mitzvah-set'] },
  { id: 44, name: 'עדי', city: 'תל אביב', stars: 5, text: 'האתר נראה מודרני ונקי לעומת מתחרים.', productTypes: ['general'] },
  { id: 45, name: 'ימית', city: 'גבעתיים', stars: 4, text: 'המוצרים יפים מאוד, אבל הייתי שמחה לעוד תמונות מקרוב.', productTypes: ['mezuzah-case', 'netilat'] },
  { id: 46, name: 'רן', city: 'טבריה', stars: 4, text: 'סה״כ חוויה טובה, המשלוח התעכב ביום.', productTypes: ['general'] },
  { id: 47, name: 'אוריה', city: 'בני ברק', stars: 4, text: 'רמה גבוהה מאוד, המחיר קצת יקר אבל שווה.', productTypes: ['tefillin'] },
  { id: 48, name: 'קרן', city: 'חיפה', stars: 4, text: 'אהבתי את השקיפות, האתר קצת עמוס במובייל.', productTypes: ['general'] },
];

export function detectProductType(cat: string, name: string): string {
  const combined = (cat + ' ' + name).toLowerCase();
  if (combined.includes('קלפי מזוזה') || combined.includes('קלף מזוזה') || combined.includes('מזוזות')) return 'mezuzah-klaf';
  if (combined.includes('בית מזוזה') || combined.includes('בתי מזוזה') || combined.includes('כיסוי מזוזה')) return 'mezuzah-case';
  if (combined.includes('תפילין')) return 'tefillin';
  if (combined.includes('בר מצווה')) return 'bar-mitzvah-set';
  if (combined.includes('נטלה') || combined.includes('נטלות')) return 'netilat';
  return 'general';
}

export function getRelevantReviews(cat: string, name: string): DemoReview[] {
  const productType = detectProductType(cat, name);
  if (productType === 'general') return [];

  const matching = DEMO_REVIEWS.filter(r => r.productTypes.includes(productType));
  const general = DEMO_REVIEWS.filter(r => r.productTypes.includes('general') && !r.productTypes.includes(productType));

  const combined = [...matching, ...general.slice(0, 2)];
  // Shuffle deterministically based on product name
  const seed = name.length + cat.length;
  const shuffled = combined.sort((a, b) => ((a.id * seed) % 7) - ((b.id * seed) % 7));

  return shuffled.slice(0, 6);
}
