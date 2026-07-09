'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ClubPopup = dynamic(() => import('./ClubPopup'), { ssr: false });

// PERF (homepage LCP): the popup used to mount immediately on every page and
// show itself on a fixed 8s timer — under slow connections it appeared inside
// the LCP window and Lighthouse flagged its text as the LCP element.
// Now the chunk isn't even downloaded until the user interacts (scroll/touch/
// click/keys) or 12s pass — ClubPopup's own 8s delay then runs as before, so
// it can never compete with the initial render. Same design, same once-per-
// session logic (checked here too, so returning visitors skip the JS entirely).
const SESSION_KEY = 'ys_club_popup_seen'; // KEEP IN SYNC with ClubPopup.tsx
const FALLBACK_MS = 12_000;

export default function ClubPopupWrapper() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return; // already seen — skip chunk
    } catch { /* sessionStorage unavailable */ }

    const arm = () => setArmed(true);
    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, arm, { once: true, passive: true }));
    const t = setTimeout(arm, FALLBACK_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, arm));
      clearTimeout(t);
    };
  }, []);

  if (!armed) return null;
  return <ClubPopup />;
}
