'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Carousel loads only after hydration — keeps it out of the critical render path
const SmartHeroCarousel = dynamic(() => import('@/app/components/SmartHero'), { ssr: false });

// Mirrors SLIDES[0] from SmartHero — shown instantly on SSR for fast LCP
const SLIDE0 = {
  mobileSrc: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_1200,q_auto:good,f_auto/v1777365682/%D7%91%D7%90%D7%A0%D7%A8_2_wovsve.png',
  desktopSrc: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_1280,q_auto:best,f_auto/v1777452503/%D7%9E%D7%97%D7%A9%D7%91_dmat7m.png',
  alt: 'Your Sofer — סת״מ ויודאיקה מהודרים',
};

interface Props {
  isMobile: boolean;
  onScrollToProducts: () => void;
  onSelectCat: (cat: string) => void;
}

export default function HeroSwiper({ isMobile, onScrollToProducts, onSelectCat }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ background: '#F5F0E8', padding: '12px 0' }}>
      <style>{`
        .ys-hero-wrap { height: 580px; }
        @media (max-width: 767px) { .ys-hero-wrap { height: calc(100vw * 2 / 3); } }
      `}</style>
      <div className="ys-hero-wrap" style={{
        position: 'relative',
        width: '92%',
        margin: '0 auto',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        {mounted ? (
          <SmartHeroCarousel
            isMobile={isMobile}
            onScrollToProducts={onScrollToProducts}
            onSelectCat={onSelectCat}
          />
        ) : (
          <Image
            src={isMobile ? SLIDE0.mobileSrc : SLIDE0.desktopSrc}
            alt={SLIDE0.alt}
            fill
            priority
            fetchPriority="high"
            sizes="92vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        )}
      </div>
    </div>
  );
}
