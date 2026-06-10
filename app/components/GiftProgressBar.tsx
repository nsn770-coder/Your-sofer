'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { formatPrice } from '@/app/lib/utils';

export default function GiftProgressBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { giftEnabled, giftThreshold, total, amountToGift, giftEligible, count } = useCart();

  const visible = giftEnabled && total > 0 && !pathname.startsWith('/checkout');

  useEffect(() => {
    document.body.classList.toggle('gift-bar-active', visible);
    return () => { document.body.classList.remove('gift-bar-active'); };
  }, [visible]);

  if (!visible) return null;

  const pct = Math.min(100, (total / giftThreshold) * 100);

  return (
    <>
      <style>{`
        @keyframes gift-bounce {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.14); }
        }
        .gift-icon-pulse { animation: gift-bounce 2.2s ease-in-out infinite; }
      `}</style>

      <div
        dir="rtl"
        style={{
          position:     'fixed',
          bottom:       'calc(14px + env(safe-area-inset-bottom, 0px))',
          left:         16,
          right:        16,
          zIndex:       9990,
          borderRadius: 9999,
          background:   '#1a1a1a',
          boxShadow:    '0 6px 28px rgba(0,0,0,0.38)',
          display:      'flex',
          alignItems:   'center',
          padding:      '8px 8px 8px 10px',
          gap:          10,
          fontFamily:   'var(--font-heebo), Arial, sans-serif',
        }}
      >
        {/* ── Gift icon + item-count badge ── */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            className={giftEligible ? 'gift-icon-pulse' : ''}
            style={{
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #C9A227, #E6C25A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🎁
          </div>
          {count > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 18, height: 18, borderRadius: 9999,
              background: '#e53e3e', color: '#fff',
              fontSize: 10, fontWeight: 800, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
              border: '1.5px solid #1a1a1a',
            }}>
              {count}
            </div>
          )}
        </div>

        {/* ── Text + progress bar ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color:      '#fff',
            fontSize:   'clamp(11px, 3.2vw, 13px)',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 5,
          }}>
            {giftEligible
              ? 'זכית במתנה חינם! 🎉'
              : `עוד ${formatPrice(amountToGift)} למתנה חינם`}
          </div>
          <div style={{
            background:   'rgba(255,255,255,0.18)',
            borderRadius: 9999,
            height:       4,
            overflow:     'hidden',
          }}>
            <div style={{
              background:   'linear-gradient(90deg, #C9A227, #E6C25A)',
              height:       '100%',
              width:        `${pct}%`,
              borderRadius: 9999,
              transition:   'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* ── Checkout button ── */}
        <button
          onClick={() => router.push('/checkout')}
          style={{
            flexShrink:     0,
            background:     '#fff',
            color:          '#1a1a1a',
            border:         'none',
            borderRadius:   9999,
            padding:        '6px 14px',
            cursor:         'pointer',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            gap:            1,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>המשך לתשלום</span>
          <span style={{ fontSize: 10, color: '#666', fontWeight: 600 }}>{formatPrice(total)}</span>
        </button>
      </div>
    </>
  );
}
