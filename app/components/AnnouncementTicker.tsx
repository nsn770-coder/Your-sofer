'use client';

const TICKER_ITEMS = [
  "הדפסת כיפות לאירועים – הנחה של עד 30% בהזמנות כמותיות",
  "הצטרפו למועדון Your Sofer וקבלו 10% הנחה על ההזמנה הראשונה",
  "נוספו 28 מוצרים חדשים להפרשת חלה – גלו את הקולקציה החדשה",
];

export default function AnnouncementTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="ticker-bar" dir="rtl" role="marquee" aria-label="הודעות מבצעים">
      <div className="ticker-track">
        {items.map((text, i) => (
          <span className="ticker-item" key={i}>
            <span className="ticker-mark" aria-hidden="true">✦</span>
            {text}
          </span>
        ))}
      </div>

      <style jsx>{`
        .ticker-bar {
          width: 100%;
          height: 40px;
          background-color: #000000;
          color: #ffffff;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.2px;
        }
        .ticker-track {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          white-space: nowrap;
          min-width: max-content;
          will-change: transform;
          animation: ticker-scroll 30s linear infinite;
          animation-fill-mode: both;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          padding: 0 28px;
        }
        .ticker-mark {
          margin-left: 10px;
          opacity: 0.9;
        }
        /* תנועה משמאל לימין: מתחילים ב--50% וגולשים ל-0 */
        @keyframes ticker-scroll {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .ticker-bar:hover .ticker-track {
          animation-play-state: paused;
        }
        @media (max-width: 640px) {
          .ticker-bar { height: 36px; font-size: 13px; }
          .ticker-item { padding: 0 18px; }
          .ticker-track { animation-duration: 22s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none; justify-content: center; width: 100%; }
        }
      `}</style>
    </div>
  );
}
