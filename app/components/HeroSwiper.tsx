'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import SmartHero from '@/app/components/SmartHero';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface Props {
  isMobile: boolean;
  onScrollToProducts: () => void;
  onSelectCat: (cat: string) => void;
}

const ARROW: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  background: 'rgba(0,0,0,0.35)',
  border: 'none',
  color: '#fff',
  width: 36,
  height: 36,
  borderRadius: '50%',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
  transition: 'background 0.2s',
};

export default function HeroSwiper({ isMobile, onScrollToProducts, onSelectCat }: Props) {
  const router = useRouter();
  const swiperRef = useRef<SwiperType | null>(null);
  const [judaicaImg, setJudaicaImg] = useState('');
  const [giftsImg, setGiftsImg] = useState('');
  const [heroImages, setHeroImages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchImages() {
      try {
        const [judaicaSnap, giftsSnap, heroSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('slug', '==', 'יודאיקה'), limit(1))),
          getDocs(query(collection(db, 'categories'), where('slug', '==', 'מתנות'), limit(1))),
          getDoc(doc(db, 'settings', 'heroImages')),
        ]);
        if (!judaicaSnap.empty) {
          const d = judaicaSnap.docs[0].data();
          setJudaicaImg((d.imageUrl || d.imgUrl || '') as string);
        }
        if (!giftsSnap.empty) {
          const d = giftsSnap.docs[0].data();
          setGiftsImg((d.imageUrl || d.imgUrl || '') as string);
        }
        if (heroSnap.exists()) {
          setHeroImages(heroSnap.data() as Record<string, string>);
        }
      } catch { /* non-fatal */ }
    }
    fetchImages();
  }, []);

  const slideHeight = isMobile ? 260 : 360;

  return (
    <div style={{ background: '#ffffff', padding: '12px 0' }}>
    <div style={{
      position: 'relative',
      width: '92%',
      margin: '0 auto',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        spaceBetween={0}
        slidesPerView={1}
        dir="ltr"
        style={{ direction: 'ltr' } as React.CSSProperties}
        onSwiper={swiper => { swiperRef.current = swiper; }}
      >
        {/* Slide 1: SmartHero */}
        <SwiperSlide>
          <SmartHero
            isMobile={isMobile}
            onScrollToProducts={onScrollToProducts}
            onSelectCat={onSelectCat}
            bgImage={heroImages.mainSlide}
          />
        </SwiperSlide>

        {/* Slide 2: הסופרים שלנו */}
        <SwiperSlide>
          <div style={{
            position: 'relative', width: '100%', height: slideHeight, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl',
          }}>
            {/* Background: uploaded image or fallback gradient */}
            {heroImages.soferimSlide ? (
              <img src={heroImages.soferimSlide} alt="הסופרים שלנו" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0c1a35 0%, #1a3a2a 100%)' }} />
            )}
            {/* Dark overlay for text legibility */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
            <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px' }}>
              <h2 style={{ fontSize: isMobile ? 28 : 44, fontWeight: 900, color: '#fff', marginBottom: 12, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                הסופרים שלנו
              </h2>
              <p style={{ fontSize: isMobile ? 13 : 16, color: 'rgba(220,235,215,0.85)', marginBottom: 24 }}>
                סופרים מוסמכים ומנוסים ברחבי הארץ
              </p>
              <button
                onClick={() => router.push('/soferim')}
                style={{
                  background: 'linear-gradient(135deg, #b8972a, #e6c84a)',
                  border: 'none', borderRadius: 10,
                  padding: isMobile ? '10px 24px' : '13px 32px',
                  fontSize: isMobile ? 14 : 16, fontWeight: 900, color: '#0c1a35', cursor: 'pointer',
                }}
              >
                הכר את הסופרים ←
              </button>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 3: יודאיקה */}
        <SwiperSlide>
          <div
            onClick={() => router.push('/category/יודאיקה')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {(heroImages.judaicaSlide || judaicaImg) ? (
              <img src={heroImages.judaicaSlide || judaicaImg} alt="יודאיקה" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#1a2d50' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: isMobile ? 32 : 48, fontWeight: 900, textShadow: '0 2px 20px rgba(0,0,0,0.5)', direction: 'rtl' }}>
                יודאיקה
              </span>
            </div>
          </div>
        </SwiperSlide>

        {/* Slide 4: מתנות */}
        <SwiperSlide>
          <div
            onClick={() => router.push('/category/מתנות')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {(heroImages.giftsSlide || giftsImg) ? (
              <img src={heroImages.giftsSlide || giftsImg} alt="מתנות" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#2d1a50' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: isMobile ? 32 : 48, fontWeight: 900, textShadow: '0 2px 20px rgba(0,0,0,0.5)', direction: 'rtl' }}>
                מתנות
              </span>
            </div>
          </div>
        </SwiperSlide>
      </Swiper>

      {/* Left arrow → previous slide */}
      <button
        style={{ ...ARROW, left: 8 }}
        onClick={() => swiperRef.current?.slidePrev()}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,151,42,0.75)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
        aria-label="הקודם"
      >◄</button>

      {/* Right arrow → next slide */}
      <button
        style={{ ...ARROW, right: 8 }}
        onClick={() => swiperRef.current?.slideNext()}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(184,151,42,0.75)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
        aria-label="הבא"
      >►</button>

      <style>{`
        .swiper-pagination-bullet { background: rgba(255,255,255,0.6) !important; }
        .swiper-pagination-bullet-active { background: #b8972a !important; }
        .swiper-pagination { bottom: 10px !important; }
      `}</style>
    </div>
    </div>
  );
}
