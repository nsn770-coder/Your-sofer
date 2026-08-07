'use client';

// פס הודעה עליון — רקע כחול-נייבי של המותג, טקסט לבן, קוד קופון זהב עם פולס עדין.
// אנימציה על הקוד בלבד (CSS טהור). גובה, ריווח והתנהגות רספונסיבית — ללא שינוי.
const COUPON_CODE = 'ברכה5';

export default function AnnouncementTicker() {
  return (
    <div className="ticker-bar" dir="rtl" role="status" aria-label="הודעת מבצע">
      <span className="ticker-item">
        <span aria-hidden="true">🎁</span>
        <span className="ticker-text">5% הנחה על כל האתר | קוד קופון:</span>
        <span className="ticker-coupon">{COUPON_CODE}</span>
      </span>

      <style jsx>{`
        .ticker-bar {
          width: 100%;
          max-width: 100vw;
          height: 40px;
          background-color: #3B3B41;
          color: #ffffff;
          position: relative;
          z-index: 101;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ticker-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 16px;
          font-size: 14px;
          letter-spacing: 0.2px;
          white-space: nowrap;
          flex-wrap: wrap;
          row-gap: 0;
        }
        .ticker-text {
          color: #ffffff;
          font-weight: 600;
        }
        .ticker-coupon {
          color: #d4af37;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-shadow: 0 0 6px rgba(212, 175, 55, 0.45);
          display: inline-block;
          animation: coupon-pulse 6s ease-in-out infinite;
          will-change: transform;
          transition: text-shadow 0.25s ease;
        }
        /* פולס אחד של 0.8 שניות בכל מחזור של 6 שניות (0.8/6 ≈ 13%) */
        @keyframes coupon-pulse {
          0%   { transform: scale(1); }
          6.5% { transform: scale(1.08); }
          13%  { transform: scale(1); }
          100% { transform: scale(1); }
        }
        /* הגברת זוהר בריחוף — דסקטופ בלבד */
        @media (hover: hover) and (pointer: fine) {
          .ticker-coupon:hover {
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.75);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-coupon { animation: none; }
        }
        @media (max-width: 640px) {
          .ticker-bar { height: 36px; }
          .ticker-item { font-size: 13px; padding: 0 10px; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
