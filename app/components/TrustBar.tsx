'use client';

const ITEMS = [
  'סופרים מוסמכים בלבד',
  'מגיה מוסמך על כל מוצר',
  'משלוח מהיר לכל הארץ',
  'החזר כספי מובטח',
];

export default function TrustBar() {
  return (
    <div className="trust-bar" dir="rtl">
      {ITEMS.map((item, i) => (
        <span key={item} className="trust-bar__item">
          {i > 0 && <span className="trust-bar__divider" aria-hidden="true" />}
          <svg className="trust-bar__check" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="#7C6030" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {item}
        </span>
      ))}
      <style jsx global>{`
        .trust-bar {
          width: 100%;
          background: #F5F0E8;
          border-bottom: 1px solid #E8E0D0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          padding: 6px 16px;
          box-sizing: border-box;
        }
        .trust-bar__item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #5C4A2A;
          font-weight: 600;
          white-space: nowrap;
          padding: 2px 12px;
        }
        .trust-bar__divider {
          display: inline-block;
          width: 1px;
          height: 12px;
          background: #C8BAA0;
          margin-left: 12px;
          flex-shrink: 0;
        }
        .trust-bar__check {
          flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .trust-bar__item {
            font-size: 10px;
            padding: 2px 8px;
          }
          .trust-bar__divider {
            margin-left: 8px;
          }
        }
      `}</style>
    </div>
  );
}
