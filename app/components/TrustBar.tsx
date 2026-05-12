'use client';

export default function TrustBar() {
  return (
    <div style={{
      width: '100%',
      height: 36,
      background: '#EDE8DF',
      borderBottom: '1px solid #D4C9B0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      direction: 'rtl',
      boxSizing: 'border-box',
      padding: '0 16px',
    }}>
      {['סופרים מוסמכים', 'מגיה מוסמך', 'משלוח מהיר', 'החזר מובטח'].map((item, i) => (
        <div key={item} style={{ display: 'contents' }}>
          {i > 0 && (
            <span className={i >= 2 ? 'trust-divider trust-desktop-only' : 'trust-divider'} />
          )}
          <span className={i >= 2 ? 'trust-item trust-desktop-only' : 'trust-item'}>
            <span style={{ color: '#7C6030', fontWeight: 700, marginLeft: 4 }}>✓</span>
            {item}
          </span>
        </div>
      ))}
      <style jsx global>{`
        .trust-item {
          font-size: 11px;
          color: #6B5744;
          font-weight: 500;
          white-space: nowrap;
          display: flex;
          align-items: center;
        }
        .trust-divider {
          display: inline-block;
          width: 1px;
          height: 14px;
          background: #C4B89A;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .trust-desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
