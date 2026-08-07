'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface HeroSlide {
  imgUrl: string;
  imgUrlMobile?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** 'none' | 'light' | 'medium' — ברירת מחדל none, כמו אצלם */
  scrim?: string;
}

const INTERVAL_MS = 6000;
const SWIPE_THRESHOLD = 50; // פיקסלים לפני שנחשב החלקה ולא נגיעה

/** גרדיאנט עדין מכיוון הטקסט. ברירת המחדל היא ללא — הבאנרים אמורים
 *  להיות מצולמים עם שטח נקי לכותרת, כמו ב-NOTHS. */
const SCRIMS: Record<string, string> = {
  none:   'none',
  light:  'linear-gradient(to left, rgba(26,26,26,0.45) 0%, rgba(26,26,26,0.15) 50%, rgba(26,26,26,0) 80%)',
  medium: 'linear-gradient(to left, rgba(26,26,26,0.7) 0%, rgba(26,26,26,0.35) 55%, rgba(26,26,26,0.05) 88%)',
};

/**
 * קרוסלת Hero.
 *
 * מעבר: הזזה אופקית (slide) ולא הבהוב — כל שקופית דוחפת את הקודמת הצידה.
 * הרצועה כולה היא flex ב-RTL, והמעבר הוא translateX חיובי: ב-RTL השקופית
 * הבאה יושבת משמאל, ולכן הזזת הרצועה ימינה מכניסה אותה למסך.
 *
 * במובייל אפשר להחליק באצבע; בדסקטופ ההחלפה אוטומטית ונעצרת בריחוף.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState(0);           // היסט חי בזמן גרירה
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex(i => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  // ── החלקה באצבע ──
  function onPointerDown(e: React.PointerEvent) {
    if (count <= 1) return;
    startX.current = e.clientX;
    dragging.current = true;
    setPaused(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startX.current === null) return;
    setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const d = drag;
    setDrag(0);
    setPaused(false);
    if (Math.abs(d) < SWIPE_THRESHOLD) return;
    // ב-RTL: גרירה ימינה מביאה את השקופית הבאה
    go(d > 0 ? index + 1 : index - 1);
  }

  if (count === 0) return null;

  const offsetPct = index * 100;

  return (
    <section
      dir="rtl"
      aria-roledescription="carousel"
      aria-label="באנרים ראשיים"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="ys-hero-carousel"
      style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'var(--ys-page, #FEFBF7)' }}
    >
      {/* הרצועה — כל השקופיות זו לצד זו, נעות יחד */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          display: 'flex',
          // בזמן גרירה בלי transition, אחרת ההזזה מרגישה דביקה
          transition: dragging.current ? 'none' : 'transform 0.55s cubic-bezier(0.32,0.72,0,1)',
          transform: `translateX(calc(${offsetPct}% + ${drag}px))`,
          touchAction: 'pan-y',   // גלילה אנכית נשארת של הדפדפן
          cursor: count > 1 ? 'grab' : 'default',
        }}
      >
        {slides.map((s, i) => {
          const active = i === index;
          const scrim = SCRIMS[s.scrim ?? 'none'] ?? SCRIMS.none;
          const Tag = (s.ctaHref ? 'a' : 'div') as 'a';
          return (
            <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} מתוך ${count}`}
              style={{ position: 'relative', flex: '0 0 100%', width: '100%' }}
            >
              <picture>
                {s.imgUrlMobile && <source media="(max-width: 767px)" srcSet={s.imgUrlMobile} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imgUrl}
                  alt=""
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding={i === 0 ? 'sync' : 'async'}
                  draggable={false}
                  className="ys-hero-img"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </picture>

              {scrim !== 'none' && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: scrim }} />
              )}

              {/* כל שטח הבאנר הוא הקישור — הכפתור, אם קיים, הוא span
                  ולא <a>, כדי לא לקנן קישורים. */}
              <Tag
                {...(s.ctaHref ? { href: s.ctaHref, tabIndex: active ? 0 : -1, 'aria-hidden': !active } : {})}
                className="ys-hero-content"
                style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'flex-start', alignItems: 'flex-start',
                  textDecoration: 'none',
                  cursor: s.ctaHref ? 'pointer' : 'default',
                }}
              >
                {s.eyebrow && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#FEFBF7', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 10px', opacity: 0.9 }}>
                    {s.eyebrow}
                  </p>
                )}
                <p className="ys-hero-title" style={{
                  fontWeight: 500, fontFamily: 'var(--font-cormorant), serif',
                  color: '#FEFBF7', lineHeight: 1.15, margin: 0, letterSpacing: '-0.02em',
                }}>
                  {s.title}
                </p>
                {s.subtitle && (
                  <p className="ys-hero-sub" style={{ fontWeight: 400, color: 'rgba(254,251,247,0.92)', margin: '12px 0 0', lineHeight: 1.6 }}>
                    {s.subtitle}
                  </p>
                )}
                {s.ctaLabel && s.ctaHref && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 20, background: 'var(--ys-purple, #51285F)', color: '#FEFBF7',
                    borderRadius: 9999, height: 44, padding: '0 24px', fontSize: 15, fontWeight: 700,
                  }}>
                    {s.ctaLabel}
                  </span>
                )}
              </Tag>
            </div>
          );
        })}
      </div>

      {/* ── נקודות ניווט ── */}
      {count > 1 && (
        <div style={{
          position: 'absolute', bottom: 16, insetInline: 0, zIndex: 3,
          display: 'flex', justifyContent: 'center', gap: 8,
        }}>
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`מעבר לבאנר ${i + 1}: ${s.title}`}
              aria-current={i === index}
              style={{
                width: i === index ? 26 : 9, height: 9, borderRadius: 9999,
                border: 'none', padding: 0, cursor: 'pointer',
                background: i === index ? '#FEFBF7' : 'rgba(254,251,247,0.5)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
