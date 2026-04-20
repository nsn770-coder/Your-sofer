'use client';

import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

const ITEMS = [
  {
    label: 'מזוזות מעוצבות',
    emoji: '📜',
    href: '/category/מזוזות',
    bg: 'linear-gradient(135deg, #0c1a35, #1e3d6e)',
  },
  {
    label: 'קלפי מזוזה',
    emoji: '✍️',
    href: '/category/קלפי מזוזה',
    bg: 'linear-gradient(135deg, #1a2d0c, #2e5c18)',
  },
  {
    label: 'תפילין קומפלט',
    emoji: '🖊️',
    href: '/category/תפילין קומפלט',
    bg: 'linear-gradient(135deg, #1a0c3a, #3a1878)',
  },
  {
    label: 'מגילות אסתר',
    emoji: '📖',
    href: '/category/מגילות',
    bg: 'linear-gradient(135deg, #3a1a0c, #7a3a18)',
  },
  {
    label: 'יודאיקה יוקרתית',
    emoji: '✡️',
    href: '/category/יודאיקה',
    bg: 'linear-gradient(135deg, #2d1a0c, #6b3a0c)',
  },
  {
    label: 'כלי שבת',
    emoji: '🕯️',
    href: '/category/כלי שולחן והגשה',
    bg: 'linear-gradient(135deg, #0c2d1a, #1a5c30)',
  },
  {
    label: 'מוצרים חדשים',
    emoji: '✨',
    href: '/category/מזוזות',
    bg: 'linear-gradient(135deg, #2a0d04, #5c2208)',
  },
  {
    label: 'מתנות יהודיות',
    emoji: '🎁',
    href: '/category/מתנות',
    bg: 'linear-gradient(135deg, #4a0d2a, #8c1f52)',
  },
] as const;

function FeaturedCard({ item }: { item: typeof ITEMS[number] }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(item.href)}
      style={{
        background: item.bg,
        borderRadius: 16,
        padding: '20px 16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
        minHeight: 130,
        border: '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
        el.style.borderColor = 'rgba(184,151,42,0.5)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
        el.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* subtle glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: 'radial-gradient(circle, rgba(184,151,42,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 52, height: 52,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        flexShrink: 0,
      }}>
        {item.emoji}
      </div>
      <span style={{
        fontSize: 13,
        fontWeight: 800,
        color: '#fff',
        lineHeight: 1.3,
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}>
        {item.label}
      </span>
    </div>
  );
}

export default function FeaturedCategoriesSection() {
  return (
    <div style={{
      background: '#f9f7f4',
      padding: 'clamp(32px,4.5vw,56px) 0',
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28, padding: '0 clamp(16px,4vw,40px)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.1em', marginBottom: 10 }}>
            ✦ קטגוריות נבחרות
          </div>
          <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 900, color: '#0c1a35', margin: 0 }}>
            גלישה מהירה לפי נושא
          </h2>
        </div>

        {/* Mobile: Swiper horizontal scroll */}
        <style>{`
          .featured-swiper { padding: 0 clamp(16px,4vw,40px) 8px !important; }
          .featured-desktop { display: none; }
          @media (min-width: 768px) {
            .featured-swiper-wrap { display: none; }
            .featured-desktop {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: clamp(12px,1.5vw,20px);
              padding: 0 clamp(16px,4vw,40px);
            }
          }
        `}</style>

        <div className="featured-swiper-wrap">
          <Swiper
            modules={[FreeMode]}
            freeMode
            slidesPerView="auto"
            spaceBetween={12}
            className="featured-swiper"
          >
            {ITEMS.map(item => (
              <SwiperSlide key={item.label} style={{ width: 140, flexShrink: 0 }}>
                <FeaturedCard item={item} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="featured-desktop">
          {ITEMS.map(item => (
            <FeaturedCard key={item.label} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
