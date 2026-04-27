'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function HeroSwiper({ isMobile, onScrollToProducts, onSelectCat }: Props) {
  const router = useRouter();
  const [heroImages, setHeroImages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchImages() {
      try {
        const heroSnap = await getDoc(doc(db, 'settings', 'heroImages'));
        if (heroSnap.exists()) {
          setHeroImages(heroSnap.data() as Record<string, string>);
        }
      } catch { /* non-fatal */ }
    }
    fetchImages();
  }, []);

  const slideHeight = isMobile ? 260 : 500;

  return (
    <div style={{ background: '#F5F0E8', padding: '12px 0' }}>
      <div style={{
        position: 'relative',
        width: '92%',
        margin: '0 auto',
        height: slideHeight,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <SmartHero
          isMobile={isMobile}
          onScrollToProducts={onScrollToProducts}
          onSelectCat={onSelectCat}
          bgImage={heroImages.mainSlide}
        />
      </div>
    </div>
  );
}
