'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = 'G-PM7GW4MWEJ';
let loaded = false; // module-level guard — survives route changes

function loadGTM() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);
}

// Paths that always need analytics (purchase funnel + registration)
const TRIGGER_PATHS = ['/cart', '/checkout', '/join', '/register'];

export default function GTMLoader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Trigger on funnel / registration pages
  useEffect(() => {
    if (TRIGGER_PATHS.some(p => pathname.includes(p))) {
      loadGTM();
    }
  }, [pathname]);

  // Trigger when a user is already logged in
  useEffect(() => {
    if (!loading && user) {
      loadGTM();
    }
  }, [user, loading]);

  // Trigger on "הוסף לסל" click anywhere in the document
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const btn = target.closest('button, [role="button"]') as HTMLElement | null;
      if (!btn) return;
      const text = btn.textContent?.trim() ?? '';
      const cls  = btn.className ?? '';
      if (text.includes('הוסף לסל') || cls.includes('add-to-cart')) {
        loadGTM();
      }
    }

    document.addEventListener('click', handleClick, { capture: true, passive: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}
