'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// PERF (TBT/INP): ShiraChat is an 862-line component that was statically
// imported in the root layout — bundled + hydrated on every page before the
// page became interactive. It is now code-split and mounted after the first
// user interaction or 3.5s, whichever comes first. Same bubble, same design,
// same behavior once mounted (its own badge timer etc. run from mount, as
// before). The bubble is position:fixed, so late mounting causes zero CLS.
const ShiraChat = dynamic(() => import('./ShiraChat'), { ssr: false });

const IDLE_MS = 3_500;

export default function ShiraChatLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const arm = () => setReady(true);
    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, arm, { once: true, passive: true }));
    const t = setTimeout(arm, IDLE_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, arm));
      clearTimeout(t);
    };
  }, []);

  if (!ready) return null;
  return <ShiraChat />;
}
