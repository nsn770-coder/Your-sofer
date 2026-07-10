'use client';
import { useEffect } from 'react';

// PERF: the async.co.il chat widget used to load with strategy="afterInteractive",
// putting its script (plus a ~2.1MB avatar image it fetches) in competition with
// hydration and the LCP image on every page. It then moved to "first interaction
// OR 8s idle" — but the idle timer meant Lighthouse (which never interacts) still
// caught the widget + full 2.1MB avatar inside its trace. Now it loads ONLY on
// the first real user interaction. Its bubble is position:fixed, so late
// insertion causes zero layout shift.
//
// NOTE (external config — the real fix): the bubble avatar served by async.co.il
// from storage.googleapis.com is ~2.1MB (1024×1024 PNG) displayed at ~40×60px.
// Replace it with a compressed avatar in the async.co.il dashboard / support.
const SRC      = 'https://cdn.async.co.il/widget.js';
const DATA_KEY = '9fb328ec30b744058aeb1e2776270894';

// PERF: until the avatar is replaced in the async.co.il dashboard, we reroute it
// through Cloudinary's fetch proxy (f_auto,q_auto,w_200 ≈ 10-20KB) the moment the
// widget inserts it into the DOM. Visually identical — same image, properly sized.
// Fully defensive: if the proxied image fails to load we fall back to the original.
function optimizeAvatar(img: HTMLImageElement) {
  const original = img.src;
  if (!original || original.includes('res.cloudinary.com')) return;
  const proxied = `https://res.cloudinary.com/dyxzq3ucy/image/fetch/f_auto,q_auto,w_200/${encodeURIComponent(original)}`;
  img.onerror = () => { img.onerror = null; img.src = original; };
  img.src = proxied;
  if (img.srcset) img.srcset = '';
}

// The July-2026 Lighthouse trace showed the swap NOT taking effect (the <img>
// still carried the original storage.googleapis.com URL) — most likely because
// the widget renders inside a shadow root, which document.querySelector and a
// body-level MutationObserver can't see into. This finder pierces open shadow
// roots recursively, and we also re-poll briefly in case the widget sets the
// src after inserting the element.
function findAvatarDeep(root: ParentNode): HTMLImageElement | null {
  const direct = root.querySelector<HTMLImageElement>('img.acw-bubble-avatar');
  if (direct) return direct;
  const walker = root.querySelectorAll<HTMLElement>('*');
  for (const el of walker) {
    if (el.shadowRoot) {
      const found = findAvatarDeep(el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

function watchForAvatar(): () => void {
  let done = false;
  const trySwap = () => {
    if (done) return true;
    const img = findAvatarDeep(document);
    if (img && img.src) { optimizeAvatar(img); done = true; return true; }
    return false;
  };
  if (trySwap()) return () => {};
  // MutationObserver catches normal DOM insertion; the interval catches
  // shadow-root insertion (not visible to the observer) and late src changes.
  const observer = new MutationObserver(() => { if (trySwap()) stop(); });
  observer.observe(document.body, { childList: true, subtree: true });
  const poll = setInterval(() => { if (trySwap()) stop(); }, 500);
  // Safety valve — stop everything after 60s regardless
  const t = setTimeout(() => stop(), 60_000);
  function stop() { observer.disconnect(); clearInterval(poll); clearTimeout(t); }
  return stop;
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
    return () => {
      events.forEach(e => window.removeEventListener(e, load));
      stopWatching?.();
    };
  }, []);

  return null;
}
