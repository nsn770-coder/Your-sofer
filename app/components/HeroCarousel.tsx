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
}

const INTERVAL_MS = 6000;

/**
 * גוף השקופית — נהיה <a> כשהוגדר יעד, אחרת <div>.
 * הכפתור בפנים הוא <span> מעוצב ולא קישור אמיתי, כדי לא לקנן קישורים.
 */
function SlideBody({ as, href, active, slide }: {
  as: 'a' | 'div';
  href?: string;
  active: boolean;
  slide: HeroSlide;
}) {
  const Tag = as as 'a';
  return (
    <Tag
      {...(as === 'a'
        ? {
            href,
            // שקופית שאינה פעילה יוצאת מסדר הטאב כדי לא ללכוד מקלדת
            tabIndex: active ? 0 : -1,
            'aria-hidden': !active,
          }
        : {})}
      className="ys-hero-content"
      style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        textDecoration: 'none',
        cursor: as === 'a' ? 'pointer' : 'default',
      }}
    >
      {slide.eyebrow && (
        <p style={{ fontSize: 11, fontWeight: 700, color: '#C5A028', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          {slide.eyebrow}
        </p>
      )}
      <p className="ys-hero-title" style={{
        fontWeight: 300, fontFamily: 'var(--font-cormorant), serif', color: '#FFFFFF',
        lineHeight: 1.2, textShadow: '0 2px 16px rgba(0,0,0,0.4)',
        margin: '0 0 14px', letterSpacing: '-0.02em',
      }}>
        {slide.title}
      </p>
      {slide.subtitle && (
        <p className="ys-hero-sub" style={{ fontWeight: 400, color: 'rgba(255,255,255,0.88)', marginTop: 0, marginBottom: slide.ctaLabel ? 22 : 0, lineHeight: 1.7 }}>
          {slide.subtitle}
        </p>
      )}
      {slide.ctaLabel && href && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          alignSelf: 'flex-start', background: '#C5A028', color: '#1a1a1a',
          height: 48, padding: '0 32px', fontSize: 15, fontWeight: 700,
        }}>
          {slide.ctaLabel}
        </span>
      )}
    </Tag>
  );
}

/**
 * קרוסלת Hero — החליפה את הווידאו (08/2026).
 *
 * הווידאו גרם ל-LCP של ~14.6 שניות: הוא התחיל להוריד מגה-בייטים מיד וחסם
 * את חלון ה-LCP, והפריים הראשון שלו נרשם כאלמנט ה-LCP. הפתרון הקודם היה
 * לדחות את הרכבתו ב-8 שניות — כלומר הווידאו ממילא כבר לא באמת פעל כמתוכנן.
 * באנרים מתחלפים פותרים את זה בשורש, וגם מאפשרים למקד כמה קהלים במקביל
 * במקום מסר אחד קבוע.
 *
 * LCP: השקופית הראשונה נטענת eager עם fetchPriority=high ומקבלת preload
 * ב-page.tsx (בשרת). כל השאר lazy.
 */
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = slides.length;
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    // כיבוד העדפת מערכת — משתמשים שביקשו פחות תנועה מקבלים שקופית סטטית
    if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    timerRef.current = setInterval(() => setIndex(i => (i + 1) % count), INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      dir="rtl"
      aria-roledescription="carousel"
      aria-label="באנרים ראשיים"
      className="ys-hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#1a1a1a' }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} מתוך ${count}`}
            aria-hidden={!active}
            style={{
              position: i === 0 ? 'relative' : 'absolute',
              inset: i === 0 ? undefined : 0,
              width: '100%',
              opacity: active ? 1 : 0,
              transition: 'opacity 0.6s ease',
              pointerEvents: active ? 'auto' : 'none',
            }}
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
                className="ys-hero-img"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </picture>

            {/* שכבת הכהיה — בגוון המותג ולא שחור נייטרלי */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(26,26,26,0.48)' }} />

            {/* כל שטח הבאנר הוא הקישור — לא רק הכפתור.
                לכן ה"כפתור" הוא <span> ולא <a>: קישור בתוך קישור הוא HTML
                לא תקין וקוראי מסך מכריזים עליו פעמיים. כשאין ctaHref
                השקופית נשארת <div> רגיל ולא לחיצה. */}
            <SlideBody
              as={s.ctaHref ? 'a' : 'div'}
              href={s.ctaHref}
              active={active}
              slide={s}
            />
          </div>
        );
      })}

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
                width: i === index ? 26 : 9, height: 9, borderRadius: 999,
                border: 'none', padding: 0, cursor: 'pointer',
                background: i === index ? '#C5A028' : 'rgba(255,255,255,0.55)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
