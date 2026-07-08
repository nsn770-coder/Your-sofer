'use client';

import { useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   StickyBarLift
   ─────────────────────────────────────────────────────────────────────────────
   Keeps floating chat widgets (the async.co.il WhatsApp widget, Tidio, and the
   legacy .wa-float-wrap bubble) from overlapping the sticky bottom gift/cart
   bar (GiftProgressBar).

   How it works:
   1. Measures the sticky bar dynamically (ResizeObserver + MutationObserver +
      viewport resize) — no hardcoded heights.
   2. Publishes the required clearance as a CSS variable on <html>:
        --sticky-bar-clearance = (viewport bottom → 16px above the bar's top)
      globals.css uses it to lift our own CSS-controlled widgets.
   3. Lifts the third-party async chat widget (button AND its opened window,
      which live in fixed-position containers we don't control) via a
      translateY transform with a 280ms transition. Transform is used so we
      never fight the widget's own inline `bottom`/positioning styles.
   4. When the bar disappears (empty cart, /checkout, /admin, filter drawer),
      the clearance variable is removed and every widget animates back to its
      original position.

   Nothing here alters the sticky bar, the gift progress logic, the checkout
   flow, or the WhatsApp links themselves.
──────────────────────────────────────────────────────────────────────────── */

const GAP = 16; // minimum spacing (px) between widgets and the sticky bar
const BAR_SELECTOR = '.gift-progress-bar';

// Elements that can belong to the async chat widget (button + opened window).
const WIDGET_HINTS = 'iframe[src*="async.co.il"], [id*="async" i], [class*="async" i]';

// Our own elements — handled by CSS in globals.css, never lifted by JS.
const OWN_ELEMENTS = '.gift-progress-bar, .wa-float-wrap, .shira-toggle, .shira-window, .shira-badge';

function findWidgetRoots(): HTMLElement[] {
  const roots = new Set<HTMLElement>();
  document.querySelectorAll<HTMLElement>(WIDGET_HINTS).forEach(el => {
    if (el.closest(OWN_ELEMENTS)) return;
    // Walk up to the nearest fixed-position ancestor — that's what we shift.
    let node: HTMLElement | null = el;
    while (node && node !== document.body) {
      if (getComputedStyle(node).position === 'fixed') {
        roots.add(node);
        return;
      }
      node = node.parentElement;
    }
  });
  return Array.from(roots);
}

export default function StickyBarLift() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let observedBar: Element | null = null;

    const setShift = (el: HTMLElement, shift: number) => {
      const prev = parseFloat(el.dataset.stickyShift || '0') || 0;
      if (prev === shift) return;
      if (!reduceMotion) el.style.transition = 'transform 0.28s ease';
      el.style.transform = shift > 0 ? `translateY(-${shift}px)` : '';
      el.dataset.stickyShift = String(shift);
    };

    const update = () => {
      const bar = document.querySelector<HTMLElement>(BAR_SELECTOR);
      const rect = bar?.getBoundingClientRect();
      const visible =
        !!bar && !!rect && rect.height > 0 && getComputedStyle(bar).display !== 'none';

      // (Re)attach the ResizeObserver whenever the bar mounts/unmounts.
      if (bar !== observedBar) {
        resizeObserver?.disconnect();
        observedBar = bar;
        if (bar && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(schedule);
          resizeObserver.observe(bar);
        }
      }

      // Clearance = distance from viewport bottom to GAP px above the bar top.
      const clearance = visible && rect ? Math.ceil(window.innerHeight - rect.top + GAP) : 0;

      if (clearance > 0) root.style.setProperty('--sticky-bar-clearance', `${clearance}px`);
      else root.style.removeProperty('--sticky-bar-clearance');

      // Lift the third-party async chat widget (button + opened chat window).
      findWidgetRoots().forEach(el => {
        const applied = parseFloat(el.dataset.stickyShift || '0') || 0;
        const elRect = el.getBoundingClientRect();
        if (elRect.height === 0) return; // hidden — nothing to do
        // Untransformed gap between the element's bottom edge and the viewport bottom.
        const baseGap = window.innerHeight - elRect.bottom - applied;
        const shift = clearance > baseGap ? Math.round(clearance - baseGap) : 0;
        setShift(el, shift);
      });
    };

    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    // Detects: gift bar mounting/unmounting, the async widget injecting itself,
    // and the widget's chat window opening/closing.
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);

    // The async widget loads lazily (afterInteractive) — a few delayed passes.
    const timers = [500, 1500, 4000].map(ms => setTimeout(schedule, ms));
    schedule();

    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      root.style.removeProperty('--sticky-bar-clearance');
      findWidgetRoots().forEach(el => setShift(el, 0));
    };
  }, []);

  return null;
}
