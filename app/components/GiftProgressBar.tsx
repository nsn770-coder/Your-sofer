'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { formatPrice } from '@/app/lib/utils';

const G = {
  gold:      '#D4AF37',
  goldBright:'#C9A227',
  goldBorder:'rgba(201,162,39,0.30)',
  goldTrack: 'rgba(201,162,39,0.14)',
  cream:     '#FAF7F0',
  text:      '#2B2418',
} as const;

export default function GiftProgressBar() {
  const pathname = usePathname();
  const { giftEnabled, giftThreshold, total, amountToGift, giftEligible } = useCart();

  const visible = giftEnabled && total > 0 && !pathname.startsWith('/checkout');

  // Nudge the WA float bubble above the bar when visible
  useEffect(() => {
    if (visible) {
      document.body.classList.add('gift-bar-active');
    } else {
      document.body.classList.remove('gift-bar-active');
    }
    return () => { document.body.classList.remove('gift-bar-active'); };
  }, [visible]);

  if (!visible) return null;

  const pct = Math.min(100, (total / giftThreshold) * 100);

  return (
    <>
      <style>{`
        @keyframes gift-glow {
          0%, 100% { filter: drop-shadow(0 0 0px rgba(212,175,55,0)); }
          50%       { filter: drop-shadow(0 0 7px rgba(212,175,55,0.55)); }
        }
        .gift-bar-eligible-icon { animation: gift-glow 2.8s ease-in-out infinite; }
      `}</style>

      <div
        dir="rtl"
        style={{
          position:   'fixed',
          bottom:     0,
          left:       0,
          right:      0,
          height:     50,
          zIndex:     9990,
          background: G.cream,
          borderTop:  `1px solid ${G.goldBorder}`,
          boxShadow:  '0 -4px 20px rgba(0,0,0,0.06)',
          display:    'flex',
          alignItems: 'center',
          padding:    '0 16px',
          gap:        10,
          fontFamily: 'var(--font-heebo), Arial, sans-serif',
        }}
      >
        {giftEligible ? (
          /* ── Reached threshold ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
            <span className="gift-bar-eligible-icon" style={{ fontSize: 19, lineHeight: 1, display: 'inline-block' }}>
              🎁
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: G.gold, letterSpacing: '0.01em' }}>
              הגעת! בחר את המתנה שלך
            </span>
          </div>
        ) : (
          /* ── Progress toward threshold ── */
          <>
            <span style={{
              fontSize:   'clamp(11px, 3.3vw, 13px)',
              fontWeight: 600,
              color:      G.text,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display:    'flex',
              alignItems: 'center',
              gap:        5,
            }}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>🎁</span>
              עוד {formatPrice(amountToGift)} למתנה חינם
            </span>

            {/* Progress track */}
            <div style={{
              flex:         1,
              background:   G.goldTrack,
              borderRadius: 999,
              height:       5,
              overflow:     'hidden',
              minWidth:     40,
            }}>
              <div style={{
                background:   `linear-gradient(90deg, ${G.goldBright}, ${G.gold})`,
                height:       '100%',
                width:        `${pct}%`,
                borderRadius: 999,
                transition:   'width 0.5s ease',
              }} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
