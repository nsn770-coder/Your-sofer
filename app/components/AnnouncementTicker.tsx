'use client';

// פס הודעה סטטי — ללא תזוזה. רקע זהב (צבע האתר), כתב שחור.
const MESSAGE = '5% הנחה על כל האתר עם קוד קופון: ברכה5';

export default function AnnouncementTicker() {
  return (
    <div className="ticker-bar" dir="rtl" role="status" aria-label="הודעת מבצע">
      <span className="ticker-item">
        <span className="ticker-mark" aria-hidden="true">✦</span>
        {MESSAGE}
        <span className="ticker-mark" aria-hidden="true">✦</span>
      </span>

      <style jsx>{`
        .ticker-bar {
          width: 100%;
          max-width: 100vw;
          height: 40px;
          background-color: #C9A227;
          color: #000000;
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
          gap: 10px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.2px;
          color: #000000;
          white-space: nowrap;
        }
        .ticker-mark {
          opacity: 0.85;
        }
        @media (max-width: 640px) {
          .ticker-bar { height: 36px; }
          .ticker-item { font-size: 13px; padding: 0 10px; }
        }
      `}</style>
    </div>
  );
}
