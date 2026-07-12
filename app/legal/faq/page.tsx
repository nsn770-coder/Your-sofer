import { redirect } from 'next/navigation';

/**
 * /legal/faq — עמוד FAQ ישן שהכיל מידע לא מעודכן (אמצעי תשלום, תשלומים).
 * הוחלף בדף המרכזי /faq שנשען על מקור האמת data/faq.ts.
 * ההפניה קבועה כדי לא ליצור תוכן כפול או סתירות.
 */
export default function LegacyFaqRedirect() {
  redirect('/faq');
}
