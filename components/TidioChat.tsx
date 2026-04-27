'use client';
import { useEffect } from 'react';

export function TidioChat() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const s = document.createElement('script');
      s.src = `//code.tidio.co/${process.env.NEXT_PUBLIC_TIDIO_KEY}.js`;
      s.async = true;
      document.body.appendChild(s);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
