'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { pageview } from '@/lib/metaPixel';

/**
 * Fires fbq('track', 'PageView') on every client-side navigation.
 * The initial PageView on first load is already fired by the inline
 * pixel script in layout.tsx — so we skip the very first render.
 */
export default function MetaPixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    pageview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
