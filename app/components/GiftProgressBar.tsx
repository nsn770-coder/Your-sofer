'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { formatPrice } from '@/app/lib/utils';

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
    <div
      dir="rtl"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 44, zIndex: 9990,
        background: '#fffbeb',
        borderTop: '1.5px solid #C5A028',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12,
        fontFamily: 'var(--font-heebo), Arial, sans-serif',
        boxShadow: '0 -2px 12px rgba(197,160,40,0.10)',
      }}
    >
      {giftEligible ? (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3c' }}>
          🎁 הגעת! בחר את המתנה שלך
        </span>
      ) : (
        <>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap', flexShrink: 0 }}>
            🎁 עוד {formatPrice(amountToGift)} למתנה חינם
          </span>
          <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 6, overflow: 'hidden', minWidth: 60 }}>
            <div style={{ background: '#C5A028', height: '100%', width: `${pct}%`, transition: 'width 0.4s ease' }} />
          </div>
        </>
      )}
    </div>
  );
}
