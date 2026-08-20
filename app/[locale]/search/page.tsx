// ─────────────────────────────────────────────────────────────────────────────
// /en/search · /fr/search · … — אותו עמוד תוצאות, בכתובת עם קידומת שפה.
//
// force-dynamic במכוון: העמוד נשען כולו על useSearchParams (?q, ?sort, ?page),
// אין לו שום תוכן סטטי, וניסיון לרנדר אותו מראש בזמן build רק מייצר עמוד ריק.
// גם /search המקורי מתנהג ככה — כאן רק מוסיפים לו כתובת.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import SearchPage from '@/app/search/page';
import { PREFIXED_LOCALES } from '@/app/lib/i18n/config';

export const dynamic = 'force-dynamic';

export default async function LocaleSearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!PREFIXED_LOCALES.includes(locale)) notFound();
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  );
}
