'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';
import SmartHero from '@/app/components/SmartHero';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

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
    <div style={{ background: '#F5F0E8', padding: '12px 0' }}>
    <div style={{
      position: 'relative',
      width: '92%',
      margin: '0 auto',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    }}>
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        autoplay={false}
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
            {/* Mobile image (< 768px) */}
            <div className="block md:hidden" style={{ position: 'absolute', inset: 0 }}>
              <Image
                fill
                priority
                src="https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777151830/%D7%94%D7%A1%D7%95%D7%A4%D7%A8%D7%99%D7%9D_%D7%A9%D7%9C%D7%A0%D7%95_unt31g.png"
                alt="הסופרים שלנו"
                style={{ objectFit: 'cover' }}
                sizes="100vw"
              />
            </div>
            {/* Desktop image (≥ 768px) */}
            <div className="hidden md:block" style={{ position: 'absolute', inset: 0 }}>
              <Image
                fill
                priority
                src="https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777152174/%D7%94%D7%A1%D7%95%D7%A4%D7%A8%D7%99%D7%9D_%D7%A9%D7%9C%D7%A0%D7%95_1400_x_500_%D7%A4%D7%99%D7%A7%D7%A1%D7%9C_mbbahb.png"
                alt="הסופרים שלנו"
                style={{ objectFit: 'cover' }}
                sizes="100vw"
              />
            </div>
            <button
              onClick={e => { e.stopPropagation(); router.push('/soferim'); }}
              style={{
                position: 'absolute', bottom: 20, left: 20,
                background: 'rgba(255, 252, 240, 0.55)', border: '2px solid #1a2744',
                borderRadius: 8, padding: '10px 22px',
                fontSize: isMobile ? 12 : 13, fontWeight: 600, color: '#1a2744', cursor: 'pointer',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 252, 240, 0.75)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 252, 240, 0.55)'; }}
            >
              הכר את הסופרים ←
            </button>
          </div>
        </SwiperSlide>

        {/* Slide 3: יודאיקה */}
        <SwiperSlide>
          <div
            onClick={() => router.push('/category/יודאיקה')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {(heroImages.judaicaSlide || judaicaImg) ? (
              <Image fill loading="lazy" src={optimizeCloudinaryUrl(heroImages.judaicaSlide || judaicaImg, 1200)} alt="יודאיקה" style={{ objectFit: 'cover' }} sizes="100vw" />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#1a2d50' }} />
            )}
            <span style={{ position: 'absolute', bottom: 20, right: 20, color: '#fff', fontSize: isMobile ? 18 : 22, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.8)', textAlign: 'right' }}>
              יודאיקה
            </span>
          </div>
        </SwiperSlide>

        {/* Slide 4: מתנות */}
        <SwiperSlide>
          <div
            onClick={() => router.push('/category/מתנות')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {(heroImages.giftsSlide || giftsImg) ? (
              <Image fill loading="lazy" src={optimizeCloudinaryUrl(heroImages.giftsSlide || giftsImg, 1200)} alt="מתנות" style={{ objectFit: 'cover' }} sizes="100vw" />
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: '#2d1a50' }} />
            )}
            <span style={{ position: 'absolute', bottom: 20, right: 20, color: '#fff', fontSize: isMobile ? 18 : 22, fontWeight: 600, textShadow: '0 2px 12px rgba(0,0,0,0.8)', textAlign: 'right' }}>
              מתנות
            </span>
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
