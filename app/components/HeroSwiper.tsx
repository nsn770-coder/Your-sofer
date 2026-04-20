'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import SmartHero from '@/app/components/SmartHero';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface Props {
  isMobile: boolean;
  onScrollToProducts: () => void;
  onSelectCat: (cat: string) => void;
}

export default function HeroSwiper({ isMobile, onScrollToProducts, onSelectCat }: Props) {
  const router = useRouter();
  const [judaicaImg, setJudaicaImg] = useState('');
  const [giftsImg, setGiftsImg] = useState('');

  useEffect(() => {
    async function fetchImages() {
      try {
        const [judaicaSnap, giftsSnap] = await Promise.all([
          getDocs(query(collection(db, 'categories'), where('slug', '==', 'יודאיקה'), limit(1))),
          getDocs(query(collection(db, 'categories'), where('slug', '==', 'מתנות'), limit(1))),
        ]);
        if (!judaicaSnap.empty) {
          const d = judaicaSnap.docs[0].data();
          setJudaicaImg((d.imageUrl || d.imgUrl || '') as string);
        }
        if (!giftsSnap.empty) {
          const d = giftsSnap.docs[0].data();
          setGiftsImg((d.imageUrl || d.imgUrl || '') as string);
        }
      } catch { /* non-fatal */ }
    }
    fetchImages();
  }, []);

  const slideHeight = isMobile ? 260 : 360;

  return (
    <div style={{ position: 'relative' }}>
      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        spaceBetween={0}
        slidesPerView={1}
        dir="ltr"
        style={{ direction: 'ltr' } as React.CSSProperties}
      >
        <SwiperSlide>
          <SmartHero
            isMobile={isMobile}
            onScrollToProducts={onScrollToProducts}
            onSelectCat={onSelectCat}
          />
        </SwiperSlide>

        <SwiperSlide>
          <div
            onClick={() => router.push('/category/יודאיקה')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {judaicaImg ? (
              <img src={judaicaImg} alt="יודאיקה" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
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

        <SwiperSlide>
          <div
            onClick={() => router.push('/category/מתנות')}
            style={{ position: 'relative', width: '100%', height: slideHeight, cursor: 'pointer', overflow: 'hidden' }}
          >
            {giftsImg ? (
              <img src={giftsImg} alt="מתנות" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
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
      <style>{`
        .swiper-pagination-bullet { background: rgba(255,255,255,0.6) !important; }
        .swiper-pagination-bullet-active { background: #b8972a !important; }
        .swiper-pagination { bottom: 10px !important; }
      `}</style>
    </div>
  );
}
