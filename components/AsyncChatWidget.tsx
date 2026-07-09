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

// PERF: the widget's bubble avatar (img.acw-bubble-avatar) is a ~2.1MB image
// displayed at ~70×105px. Until it's replaced with a compressed one in the
// async.co.il dashboard, we reroute it through Cloudinary's fetch proxy
// (f_auto,q_auto,w_200 ≈ 10-20KB) the moment the widget inserts it into the
// DOM. Visually identical — same image, properly sized. Fully defensive: if
// the widget's markup ever changes, or the proxied image fails to load, we
// fall back to the original src and nothing breaks.
function optimizeAvatar(img: HTMLImageElement) {
  const original = img.src;
  if (!original || original.includes('res.cloudinary.com')) return;
  const proxied = `https://res.cloudinary.com/dyxzq3ucy/image/fetch/f_auto,q_auto,w_200/${encodeURIComponent(original)}`;
  img.onerror = () => { img.onerror = null; img.src = original; };
  img.src = proxied;
  if (img.srcset) img.srcset = '';
}

function watchForAvatar(): () => void {
  const trySwap = () => {
    const img = document.querySelector<HTMLImageElement>('img.acw-bubble-avatar');
    if (img) { optimizeAvatar(img); return true; }
    return false;
  };
  if (trySwap()) return () => {};
  const observer = new MutationObserver(() => { if (trySwap()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  // Safety valve — stop observing after 60s regardless
  const t = setTimeout(() => observer.disconnect(), 60_000);
  return () => { observer.disconnect(); clearTimeout(t); };
}

export default function AsyncChatWidget() {
  useEffect(() => {
    let loaded = false;
    let stopWatching: (() => void) | null = null;
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
      stopWatching = watchForAvatar();
    };

    const events: (keyof WindowEventMap)[] = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, load, { once: true, passive: true }));
    const t = setTimeout(load, IDLE_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, load));
      clearTimeout(t);
      stopWatching?.();
    };
  }, []);

  return null;
}
