'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const GIFTS = [
  {
    label: 'מתנות לאישה',
    sub: 'פמוטים, תכשיטים ועוד',
    href: '/category/מתנות',
    bg: 'linear-gradient(135deg, #4a0d2a 0%, #8c1f52 55%, #4a0d2a 100%)',
  },
  {
    label: 'מתנות לגבר',
    sub: 'יודאיקה, תפילין ועוד',
    href: '/category/יודאיקה',
    bg: 'linear-gradient(135deg, #0c1a35 0%, #1e3d6e 55%, #0c1a35 100%)',
  },
  {
    label: 'מתנות לחתן',
    sub: 'סט תפילין מהודר לחתן',
    href: '/category/תפילין קומפלט',
    bg: 'linear-gradient(135deg, #1a2d0c 0%, #2e5c18 55%, #1a2d0c 100%)',
  },
  {
    label: 'מתנות לכלה',
    sub: 'כלי שבת ומתנות מיוחדות',
    href: '/category/כלי שולחן והגשה',
    bg: 'linear-gradient(135deg, #3a1a0c 0%, #7a3a18 55%, #3a1a0c 100%)',
  },
  {
    label: 'מתנות לבר מצווה',
    sub: 'תפילין, סידורים ויודאיקה',
    href: '/category/בר מצווה',
    bg: 'linear-gradient(135deg, #1a0c3a 0%, #3a1878 55%, #1a0c3a 100%)',
  },
  {
    label: 'מתנות לחג',
    sub: 'מתנות לכל חג ומועד',
    href: '/category/מתנות',
    bg: 'linear-gradient(135deg, #2d1a0c 0%, #6b3a0c 55%, #2d1a0c 100%)',
  },
] as const;

function GiftCard({ gift }: { gift: typeof GIFTS[number] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => router.push(gift.href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        background: gift.bg,
        cursor: 'pointer',
        boxShadow: hovered ? '0 12px 36px rgba(0,0,0,0.28)' : '0 3px 12px rgba(0,0,0,0.14)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s ease',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(184,151,42,0.12) 0%, transparent 60%)',
        transition: 'opacity 0.22s',
        opacity: hovered ? 1 : 0,
      }} />

      {/* bottom gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
      }} />

      {/* border on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          border: '1.5px solid rgba(184,151,42,0.6)',
          pointerEvents: 'none',
        }} />
      )}

      {/* content */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 22px',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 4, lineHeight: 1.2 }}>
            {gift.label}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(220,210,190,0.8)', fontWeight: 500 }}>
            {gift.sub}
          </div>
        </div>
        <button
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #b8972a 0%, #e6c84a 100%)',
            color: '#0c1a35',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 900,
            cursor: 'pointer',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.18s',
          }}
          onClick={e => { e.stopPropagation(); router.push(gift.href); }}
        >
          לקנייה ←
        </button>
      </div>
    </div>
  );
}

export default function GiftCategoriesSection() {
  return (
    <div style={{
      background: '#fff',
      padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,40px)',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.1em', marginBottom: 10 }}>
            ✦ מתנות מיוחדות
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#0c1a35', margin: '0 0 8px' }}>
            מתנה יהודית לכל אחד
          </h2>
          <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
            מתנות מהודרות לכל אירוע — עם אריזה מיוחדת ואישית
          </p>
        </div>

        <style>{`
          .gift-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: clamp(12px, 1.8vw, 20px);
          }
          @media (min-width: 640px) {
            .gift-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (min-width: 1024px) {
            .gift-grid { grid-template-columns: repeat(3, 1fr); }
          }
        `}</style>

        <div className="gift-grid">
          {GIFTS.map(gift => (
            <GiftCard key={gift.label} gift={gift} />
          ))}
        </div>
      </div>
    </div>
  );
}
