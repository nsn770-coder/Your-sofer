'use client';
import { useEffect } from 'react';

export function FacebookPixel() {
  useEffect(() => {
    const load = () => {
      if ((window as any).fbq) return;
      const s = document.createElement('script');
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      s.async = true;
      document.head.appendChild(s);
      s.onload = () => {
        (window as any).fbq('init', process.env.NEXT_PUBLIC_META_PIXEL_ID);
        (window as any).fbq('track', 'PageView');
      };
      window.removeEventListener('scroll', load);
      window.removeEventListener('click', load);
      window.removeEventListener('touchstart', load);
    };
    window.addEventListener('scroll', load, { once: true });
    window.addEventListener('click', load, { once: true });
    window.addEventListener('touchstart', load, { once: true });
    return () => {
      window.removeEventListener('scroll', load);
      window.removeEventListener('click', load);
      window.removeEventListener('touchstart', load);
    };
  }, []);
  return null;
}
