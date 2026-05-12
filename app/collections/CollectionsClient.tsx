'use client';

import Link from 'next/link';
import { useState } from 'react';

const COLLECTIONS = [
  {
    id: 'יהלום',
    tagline: 'הקו השקוף והמודרני',
    description: 'עיצובים נקיים משקף, אקריל וקריסטל — אלגנטיות מינימליסטית לבית המודרני.',
    color: '#0ea5e9',
    bg: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
    border: '#bae6fd',
    dot: '#87CEEB',
    href: '/category/מזוזות?collection=יהלום',
    bannerImage: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919873/1777913222083_ibossf.png',
  },
  {
    id: 'שוהם',
    tagline: 'הקו הטבעי והכהה',
    description: 'עץ, אבן ואוניקס — טבע ועומק בעיצוב שמחמם את הבית.',
    color: '#92400e',
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
    border: '#fde68a',
    dot: '#78350f',
    href: '/category/מזוזות?collection=שוהם',
    bannerImage: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777920809/1777920771814_vikmum.png',
  },
  {
    id: 'ישפה',
    tagline: 'הקו האומנותי והצבעוני',
    description: 'הדפסים, ציורים ופסיפסים — אמנות ביודאיקה שמספרת סיפור.',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #faf5ff 100%)',
    border: '#ddd6fe',
    dot: 'rainbow',
    href: '/category/כלי שולחן והגשה?collection=ישפה',
    bannerImage: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919874/1777919845235_zcbze1.png',
  },
  {
    id: 'ספיר',
    tagline: 'הקו המתכתי והקריר',
    description: 'אלומיניום, נירוסטה ומתכת — עיצוב תעשייתי-מודרני עם ניחוח פרמיום.',
    color: '#475569',
    bg: 'linear-gradient(135deg, #f1f5f9 0%, #f8fafc 100%)',
    border: '#cbd5e1',
    dot: '#94a3b8',
    href: '/category/יודאיקה?collection=ספיר',
    bannerImage: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919875/1777919702083_vflhuc.png',
  },
  {
    id: 'ברקת',
    tagline: 'הקו החגיגי והיוקרתי',
    description: 'זהב, אמייל ויוקרה — מוצרים שמרגישים כמו חגיגה בכל יום.',
    color: '#15803d',
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #f7fef9 100%)',
    border: '#bbf7d0',
    dot: '#15803d',
    href: '/category/כלי שולחן והגשה?collection=ברקת',
    bannerImage: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_600,q_auto,f_auto/v1777919875/1777919689931_fkb8c6.png',
  },
];

type Collection = typeof COLLECTIONS[0];

function RainbowDot() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#8b5cf6)',
    }} />
  );
}

function ColorDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
      background: color, border: '1px solid rgba(255,255,255,0.4)',
    }} />
  );
}

function CollectionCard({ col }: { col: Collection }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={col.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          border: `1.5px solid ${col.border}`,
          boxShadow: hovered
            ? '0 16px 40px rgba(12,26,53,0.18), 0 2px 8px rgba(184,151,42,0.15)'
            : '0 2px 12px rgba(12,26,53,0.07)',
          transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden' }}>
          {col.bannerImage ? (
            <img
              src={col.bannerImage}
              alt={col.id}
              style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: col.bg }} />
          )}

          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            background: 'linear-gradient(180deg, rgba(12,26,53,0.18) 0%, rgba(12,26,53,0.72) 100%)',
          }} />

          <div style={{
            position: 'absolute', bottom: 0, right: 0, left: 0,
            padding: '10px 18px',
            display: 'flex', alignItems: 'center', gap: 9,
          }}>
            {col.dot === 'rainbow' ? <RainbowDot /> : <ColorDot color={col.dot} />}
            <span style={{
              fontSize: 22, fontWeight: 900, color: '#fff',
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              letterSpacing: '0.01em',
            }}>
              {col.id}
            </span>
          </div>

          <div style={{
            position: 'absolute', bottom: 0, right: 0, left: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(184,151,42,0.7), transparent)',
          }} />
        </div>

        <div style={{
          background: col.bg,
          padding: '18px 22px 20px',
          display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', margin: 0, lineHeight: 1.4 }}>
            {col.tagline}
          </p>

          <p style={{ fontSize: 13, color: '#4a5568', margin: 0, lineHeight: 1.7, flexGrow: 1 }}>
            {col.description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#C5A028', letterSpacing: '0.01em' }}>
              לצפייה בקולקציה ←
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CollectionsPage() {
  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>

      <div style={{
        background: 'linear-gradient(135deg, #0c1a35 0%, #18274a 100%)',
        borderBottom: '3px solid rgba(184,151,42,0.5)',
        padding: '52px 20px 44px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#C5A028', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
          YOUR SOFER
        </p>
        <h1 style={{ fontSize: 'clamp(26px,5vw,42px)', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>
          הקולקציות שלנו
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          חמישה קוים עיצוביים נבחרים — מצאו את הסגנון שמדבר אליכם
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px,4vw,52px) 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 460px), 1fr))',
          gap: 24,
        }}>
          {COLLECTIONS.map(col => (
            <CollectionCard key={col.id} col={col} />
          ))}
        </div>
      </div>
    </div>
  );
}
