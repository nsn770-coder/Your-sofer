'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface HeroSliderProps {
  onScrollToQuiz?: () => void;
}

const SLIDES = [
  {
    id: 'tefillin',
    bg: 'linear-gradient(140deg, #0a1628 0%, #162d5a 55%, #0c2040 100%)',
    tag: 'תפילין מהודרים',
    title: 'תפילין מהודרים — ישירות מהסופר',
    bullets: [
      'קלפי תפילין מאומתים על ידי מגיה מוסמך',
      'בחירה לפי נוסח: אשכנז, ספרד, חב"ד, תימני',
      'כיסויים מובחרים — עור, קטיפה, פיו ועוד',
    ],
    cta: 'ראה תפילין מהודרים',
    href: '/category/תפילין קומפלט',
  },
  {
    id: 'matanot',
    bg: 'linear-gradient(140deg, #2a0d04 0%, #5c2208 55%, #3a1405 100%)',
    tag: 'מתנות מיוחדות',
    title: 'מתנות לאישה, לחתן ולבר מצווה',
    bullets: [
      'כלי שבת מעוצבים לכל בית',
      'מתנות חתן ובר מצווה מהודרות',
      'אריזות מתנה מיוחדות בהתאמה אישית',
    ],
    cta: 'לכל המתנות',
    href: '/category/מתנות',
  },
  {
    id: 'itzuv',
    bg: 'linear-gradient(140deg, #061a0e 0%, #0e3a1e 55%, #091c10 100%)',
    tag: 'עיצוב הבית',
    title: 'עיצוב לבית היהודי',
    bullets: [
      'פמוטים לשבת ויום טוב',
      'מגשי חלה וכלי שולחן מעוצבים',
      'חנוכיות ונטלות מובחרות',
    ],
    cta: 'לכל הקטגוריות',
    href: '/',
  },
  {
    id: 'mezuzah',
    bg: 'linear-gradient(140deg, #130828 0%, #251050 55%, #160c35 100%)',
    tag: 'מצא את המזוזה שלך',
    title: 'מזוזה שמתאימה בדיוק לבית שלך',
    bullets: [
      'לפי גודל הדלת — 7 עד 30 ס"מ',
      'לפי סגנון הבית — מודרני, מסורתי ועוד',
      'לפי כל תקציב — עם אחריות כשרות',
    ],
    cta: 'מצא את המזוזה שלך',
    href: null,
  },
] as const;

function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function HeroSlider({ onScrollToQuiz }: HeroSliderProps) {
  const router  = useRouter();
  const { count } = useCart();
  const { user }  = useAuth();

  function handleCTA(slide: typeof SLIDES[number]) {
    if (!slide.href) {
      onScrollToQuiz?.();
    } else {
      router.push(slide.href);
    }
  }

  return (
    <>
      <style>{`
        .ys-hero-slider .swiper-pagination {
          bottom: 20px !important;
        }
        .ys-hero-slider .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background: rgba(255,255,255,0.45);
          opacity: 1;
          transition: all 0.3s ease;
          border-radius: 5px;
        }
        .ys-hero-slider .swiper-pagination-bullet-active {
          background: #b8972a;
          width: 28px;
        }
      `}</style>

      <div
        className="ys-hero-slider"
        style={{ width: '100%', direction: 'rtl', overflow: 'hidden' }}
      >
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={{ clickable: true }}
          loop
          style={{ width: '100%' }}
        >
          {SLIDES.map(slide => (
            <SwiperSlide key={slide.id}>
              <div
                style={{
                  background: slide.bg,
                  height: 'clamp(420px, 55vw, 560px)',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 0,
                }}
              >
                {/* radial glow */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 0,
                  backgroundImage: [
                    'radial-gradient(ellipse at 75% 40%, rgba(184,151,42,0.08) 0%, transparent 55%)',
                    'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.03) 0%, transparent 40%)',
                  ].join(', '),
                }} />

                {/* left-side dark vignette */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 0,
                  background: 'linear-gradient(to left, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.68) 100%)',
                }} />

                {/* bottom gold line */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, zIndex: 10,
                  background: 'linear-gradient(to right, transparent 0%, #b8972a 25%, #e6c84a 50%, #b8972a 75%, transparent 100%)',
                }} />

                {/* slide content */}
                <div style={{
                  position: 'relative', zIndex: 2,
                  width: '100%',
                  maxWidth: 760,
                  margin: '0 auto',
                  padding: 'clamp(28px, 5vw, 60px) clamp(20px, 4vw, 56px)',
                }}>
                  {/* tag pill */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(184,151,42,0.18)',
                    border: '1px solid rgba(184,151,42,0.45)',
                    borderRadius: 20,
                    padding: '5px 14px',
                    marginBottom: 18,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#e6c84a',
                    letterSpacing: '0.08em',
                    backdropFilter: 'blur(4px)',
                  }}>
                    ✦ {slide.tag}
                  </div>

                  {/* title */}
                  <h2 style={{
                    fontSize: 'clamp(22px, 3.8vw, 42px)',
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.2,
                    marginBottom: 20,
                    textShadow: '0 2px 28px rgba(0,0,0,0.55)',
                    letterSpacing: '-0.5px',
                    margin: '0 0 20px',
                  }}>
                    {slide.title}
                  </h2>

                  {/* bullets */}
                  <ul style={{
                    listStyle: 'none',
                    margin: '0 0 28px',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>
                    {slide.bullets.map((b, i) => (
                      <li key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 'clamp(12px, 1.5vw, 15px)',
                        color: 'rgba(228,228,210,0.9)',
                        lineHeight: 1.5,
                      }}>
                        <span style={{
                          width: 20, height: 20,
                          borderRadius: '50%',
                          background: 'rgba(184,151,42,0.2)',
                          border: '1.5px solid rgba(184,151,42,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <IconCheck />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <button
                    onClick={() => handleCTA(slide)}
                    style={{
                      background: 'linear-gradient(135deg, #b8972a 0%, #e6c84a 100%)',
                      color: '#0c1a35',
                      border: 'none',
                      borderRadius: 12,
                      padding: 'clamp(12px, 1.5vw, 15px) clamp(22px, 3vw, 36px)',
                      fontSize: 'clamp(13px, 1.4vw, 15px)',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: '0 4px 18px rgba(184,151,42,0.4)',
                      fontFamily: 'inherit',
                      letterSpacing: '-0.2px',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget;
                      el.style.background = 'linear-gradient(135deg, #d4a832 0%, #f0d860 100%)';
                      el.style.transform = 'translateY(-2px)';
                      el.style.boxShadow = '0 8px 28px rgba(184,151,42,0.5)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget;
                      el.style.background = 'linear-gradient(135deg, #b8972a 0%, #e6c84a 100%)';
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = '0 4px 18px rgba(184,151,42,0.4)';
                    }}
                  >
                    {slide.cta} ←
                  </button>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </>
  );
}
