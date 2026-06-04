'use client';

import { useEffect, useRef } from 'react';

const TICKER_ITEMS = [
  "הדפסת כיפות לאירועים – הנחה של עד 30% בהזמנות כמותיות",
  "הצטרפו למועדון Your Sofer וקבלו 10% הנחה על ההזמנה הראשונה",
  "נוספו 28 מוצרים חדשים להפרשת חלה – גלו את הקולקציה החדשה",
];

export default function AnnouncementTicker() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId: number;
    let paused = false;
    const speed = 0.6;

    // מתחילים מאמצע (סוף העותק הראשון) כדי שיהיה מקום לגלול ימינה
    const initScroll = () => {
      el.scrollLeft = el.scrollWidth / 2;
    };
    initScroll();

    const step = () => {
      if (!paused && el) {
        // מקטינים = תנועה ימינה (נוח לקריאת עברית)
        el.scrollLeft -= speed;
        const half = el.scrollWidth / 2;
        // כשהגענו ל-0 או מתחת — מוסיפים חצי רוחב, הלולאה seamless
        if (el.scrollLeft <= 0) {
          el.scrollLeft += half;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className="ticker-bar" dir="rtl" role="marquee" aria-label="הודעות מבצעים">
      <div className="ticker-scroller" ref={scrollerRef}>
        <div className="ticker-track">
          {items.map((text, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-mark" aria-hidden="true">✦</span>
              {text}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .ticker-bar {
          width: 100%;
          max-width: 100vw;
          height: 40px;
          background-color: #000000;
          color: #ffffff;
          position: relative;
          z-index: 101;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        .ticker-scroller {
          width: 100%;
          overflow-x: hidden;
          overflow-y: hidden;
          direction: ltr;
        }
        .ticker-track {
          display: flex;
          width: max-content;
          align-items: center;
          white-space: nowrap;
          direction: rtl;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          padding: 0 28px;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.2px;
          color: #ffffff;
        }
        .ticker-mark {
          margin-left: 10px;
          opacity: 0.9;
        }
        @media (max-width: 640px) {
          .ticker-bar { height: 36px; }
          .ticker-item { padding: 0 18px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
