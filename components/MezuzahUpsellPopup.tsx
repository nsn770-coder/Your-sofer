'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MezuzahUpsellPopup() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 7000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes ys-upsell-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .ys-upsell-sheet {
          animation: ys-upsell-slide-up 0.35s ease-out;
        }
      `}</style>
      <div
        dir="rtl"
        className="ys-upsell-sheet"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 8000,
          background: '#1E3A8A',
          borderTop: '2px solid rgba(184,151,42,0.5)',
          borderRadius: '18px 18px 0 0',
          padding: '20px 20px 28px',
          fontFamily: 'Heebo, Arial, sans-serif',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute', top: 14, left: 16,
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: '#aaa', borderRadius: '50%', width: 28, height: 28,
            cursor: 'pointer', fontSize: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              טיפ לך!
            </div>
            <div style={{ fontSize: 13, color: '#a8c0d8', marginBottom: 12, lineHeight: 1.6 }}>
              מזמינים קלף מזוזה? קבלו 10% הנחה על בתי מזוזה
            </div>
            {/* Coupon code */}
            <div style={{
              display: 'inline-block',
              background: 'rgba(184,151,42,0.15)',
              border: '1.5px dashed #b8972a',
              borderRadius: 8, padding: '6px 14px',
              fontSize: 16, fontWeight: 900, color: '#b8972a',
              letterSpacing: 1.5, marginBottom: 14,
            }}>
              BAYIT10
            </div>
            <br />
            <button
              onClick={() => {
                setVisible(false);
                router.push(`/category/${encodeURIComponent('בתי-מזוזה')}`);
              }}
              style={{
                background: '#b8972a', color: '#1E3A8A',
                border: 'none', borderRadius: 20,
                padding: '10px 22px', fontSize: 13, fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              לבתי מזוזה בהנחה ←
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
