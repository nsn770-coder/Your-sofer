'use client';
import { useEffect } from 'react';

// PERF: the async.co.il chat widget used to load with strategy="afterInteractive",
// putting its script (plus a ~2.1MB avatar image it fetches) in competition with
// hydration and the LCP image on every page. It is not needed for first paint —
// so we inject it only after the first user interaction, or after 8s of idle,
// whichever comes first. Same widget, same config, same position — it just no
// longer delays the initial render. (Its bubble is position:fixed, so late
// insertion causes zero layout shift.)
//
// NOTE (external config, not fixable in code): the bubble avatar served by
// async.co.il from storage.googleapis.com is ~2.1MB displayed at ~70×105px.
// Ask async.co.il support / dashboard to use a compressed avatar.
const SRC      = 'https://cdn.async.co.il/widget.js';
const DATA_KEY = '9fb328ec30b744058aeb1e2776270894';
const IDLE_MS  = 8_000;

export default function AsyncChatWidget() {
  useEffect(() => {
    let loaded = false;
    const load = () => {
      if (loaded || document.querySelector(`script[src="${SRC}"]`)) return;
      loaded = true;
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.dataset.key = DATA_KEY;
      s.dataset.apiBase = 'https://api.async.co.il';
      s.dataset.side = 'right';
      document.body.appendChild(s);
    };

    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, load, { once: true, passive: true }));
    const t = setTimeout(load, IDLE_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, load));
      clearTimeout(t);
    };
  }, []);

  return null;
}
