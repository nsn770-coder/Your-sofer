'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ClubPopup = dynamic(() => import('./ClubPopup'), { ssr: false });

// PERF (homepage LCP + Speed Index): the popup used to mount immediately on
// every page and show itself on a fixed 8s timer — under slow connections it
// appeared inside the LCP window and Lighthouse flagged its text as the LCP
// element. A later version armed it on interaction OR a 12s fallback timer —
// but 12s (arm) + 8s (ClubPopup's own delay) = the full-screen overlay painting
// at ~20s, which single-handedly blew Speed Index up to 20.2s in Lighthouse.
// Now it arms ONLY on real user interaction (scroll/touch/click/keys) — no
// timer at all. A visitor who hasn't touched the page in 20s isn't reading a
// coupon popup anyway. Same design, same once-per-session logic.
const SESSION_KEY = 'ys_club_popup_seen'; // KEEP IN SYNC with ClubPopup.tsx

export default function ClubPopupWrapper() {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return; // already seen — skip chunk
    } catch { /* sessionStorage unavailable */ }

    const arm = () => setArmed(true);
    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, arm, { once: true, passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, arm));
    };
  }, []);

  if (!armed) return null;
  return <ClubPopup />;
}
