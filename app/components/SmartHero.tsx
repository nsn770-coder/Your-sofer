'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

const SLIDES = [
  {
    src: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_1200,q_auto:good,f_auto/v1777365682/%D7%91%D7%90%D7%A0%D7%A8_2_wovsve.png',
    alt: 'Your Sofer — סת״מ ויודאיקה מהודרים',
    priority: true,
  },
  {
    src: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/w_1200,q_auto:good,f_auto/v1777363664/%D7%94%D7%A1%D7%95%D7%A4%D7%A8%D7%99%D7%9D_%D7%A9%D7%9C%D7%A0%D7%95_1200_x_800_%D7%A4%D7%99%D7%A7%D7%A1%D7%9C_mpaeoc.png',
    alt: 'הסופרים שלנו — סופרי סת״מ מוסמכים',
    priority: false,
  },
] as const;

const AUTO_ADVANCE_MS = 5000;

export default function SmartHero({ isMobile, onScrollToProducts, onSelectCat, bgImage }: {
  isMobile: boolean;
  onScrollToProducts?: () => void;
  onSelectCat?: (cat: string) => void;
  bgImage?: string;
}) {
  void onScrollToProducts;
  void onSelectCat;
  void bgImage;

  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: idx * trackRef.current.offsetWidth, behavior: 'smooth' });
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrent(prev => {
        const next = (prev + 1) % SLIDES.length;
        if (trackRef.current) {
          trackRef.current.scrollTo({ left: next * trackRef.current.offsetWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, AUTO_ADVANCE_MS);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, startTimer]);

  // Sync dot indicator when user manually scrolls
  const handleScroll = useCallback(() => {
    if (!trackRef.current) return;
    const idx = Math.round(trackRef.current.scrollLeft / trackRef.current.offsetWidth);
    setCurrent(idx);
  }, []);

  const desktopHeight = 800;
  // Mobile: 3:2 aspect ratio expressed as padding-top trick via minHeight calc
  const mobileHeight = isMobile ? `calc(100vw * 2 / 3)` : `${desktopHeight}px`;

  return (
    <div style={{ position: 'relative', width: '100%', direction: 'ltr' }}>
      {/* ── Scroll track ── */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          width: '100%',
          height: mobileHeight,
        } as React.CSSProperties}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              height: '100%',
            }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={slide.priority}
              fetchPriority={slide.priority ? 'high' : 'auto'}
              loading={slide.priority ? 'eager' : 'lazy'}
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        ))}
      </div>

      {/* ── Hide scrollbar (WebKit) ── */}
      <style>{`
        div[style*="scroll-snap-type"]::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Dot indicators ── */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? 10 : 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        zIndex: 10,
      }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`מעבר לבאנר ${i + 1}`}
            onClick={() => { goTo(i); startTimer(); }}
            style={{
              width: current === i ? 24 : 8,
              height: 8,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              background: current === i ? '#fff' : 'rgba(255,255,255,0.45)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
