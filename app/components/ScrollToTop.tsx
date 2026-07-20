'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * ScrollToTop — מוודא שכל מעבר דף מתחיל בראש הדף.
 * תיקון לבאג שבו ניווט בין דפים השאיר את הגלילה בתחתית.
 * מדלג כשיש עוגן (#hash) בכתובת — כדי לא לשבור קישורי עוגן.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash) return;
    // גם window וגם documentElement — כיסוי לכל הדפדפנים
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
