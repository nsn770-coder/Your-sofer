'use client';

const ITEMS = [
  {
    label: 'בדיקה על ידי רב מוסמך',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    label: 'צילום קלף אמיתי לפני משלוח',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    label: 'רכישה ישירות מהסופר',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    label: 'שירות אישי בוואטסאפ',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: 'משלוחים לכל הארץ',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'אפשרות להחזר כספי',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
  },
] as const;

export default function TrustBar() {
  return (
    <div
      style={{
        background: '#f9f7f4',
        borderTop: '1px solid #ede9e0',
        borderBottom: '1px solid #ede9e0',
        padding: 'clamp(28px, 4vw, 44px) clamp(16px, 4vw, 40px)',
        direction: 'rtl',
      }}
    >
      <style>{`
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (min-width: 640px) {
          .trust-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1024px) {
          .trust-grid { grid-template-columns: repeat(6, 1fr); gap: 16px; }
        }
      `}</style>
      <div className="trust-grid">
        {ITEMS.map(item => (
          <div
            key={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(184,151,42,0.1)',
                border: '1.5px solid rgba(184,151,42,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <span
              style={{
                fontSize: 'clamp(11px, 1.2vw, 13px)',
                fontWeight: 700,
                color: '#3a3020',
                lineHeight: 1.35,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
