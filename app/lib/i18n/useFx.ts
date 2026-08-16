'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useFx — שערי חליפין לתצוגה (ראה app/lib/i18n/currency.ts לכללי השימוש)
//
// נשלפים פעם אחת לכל טעינת עמוד ונשמרים ב-module scope, כך שעשרות כרטיסי
// מוצר באותו עמוד לא מייצרים עשרות בקשות. בעברית לא נשלחת בקשה בכלל.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { splitLocalePath } from './config';
import { CURRENCY_BY_LOCALE, formatApprox, type FxRates } from './currency';

let cache: FxRates | null = null;
let inFlight: Promise<FxRates | null> | null = null;

async function loadRates(): Promise<FxRates | null> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = fetch('/api/fx')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { rates?: FxRates } | null) => {
        cache = d?.rates ?? null;
        return cache;
      })
      .catch(() => null)
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

export interface FxHelper {
  /** מחזיר מחרוזת מפורמטת ("≈ $34.99") או null כשאין מה להציג */
  approx: (amountIls: number) => string | null;
  /** true כשהשפה הנוכחית מציגה מטבע משני בכלל */
  enabled: boolean;
}

export function useFx(): FxHelper {
  const pathname = usePathname() || '/';
  const { locale } = splitLocalePath(pathname);
  const enabled = !!CURRENCY_BY_LOCALE[locale];
  const [rates, setRates] = useState<FxRates | null>(cache);

  useEffect(() => {
    if (!enabled || rates) return;
    let cancelled = false;
    loadRates().then(r => { if (!cancelled && r) setRates(r); });
    return () => { cancelled = true; };
  }, [enabled, rates]);

  return {
    enabled,
    // גם לפני שהשערים הגיעו מוצגת הערכה לפי ה-fallback — עדיף מחוסר מידע,
    // והיא מתחדדת מעצמה ברגע שהתשובה חוזרת.
    approx: (amountIls: number) => formatApprox(amountIls, locale, rates),
  };
}
