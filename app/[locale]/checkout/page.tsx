// ─────────────────────────────────────────────────────────────────────────────
// /en/checkout — אותו checkout בכתובת עם קידומת שפה.
// ─────────────────────────────────────────────────────────────────────────────

import CheckoutPage from '@/app/checkout/page';
import { PREFIXED_LOCALES } from '@/app/lib/i18n/config';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return PREFIXED_LOCALES.map(locale => ({ locale }));
}
export const dynamicParams = false;

export default async function LocaleCheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return <CheckoutPage />;
}
