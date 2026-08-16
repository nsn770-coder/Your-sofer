// ─────────────────────────────────────────────────────────────────────────────
// /en/cart · /fr/cart · … — אותה עגלה בדיוק, בכתובת עם קידומת שפה.
//
// למה זה נחוץ: useT גוזר את השפה מהנתיב, ולכן /cart (ללא קידומת) הוא תמיד
// עברית. בלי המסלול הזה התרגום של העגלה פשוט לא היה נראה לאף אחד.
// הקומפוננטה עצמה משותפת — אין שכפול לוגיקה, רק כתובת נוספת.
// ─────────────────────────────────────────────────────────────────────────────

import CartPage from '@/app/cart/page';
import { PREFIXED_LOCALES } from '@/app/lib/i18n/config';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return PREFIXED_LOCALES.map(locale => ({ locale }));
}
export const dynamicParams = false;

export default async function LocaleCartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return <CartPage />;
}
