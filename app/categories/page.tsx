'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

const CATEGORIES = [
  { name: 'קלף מזוזה',       slug: 'קלפי מזוזה',       emoji: '📜', href: '/category/קלפי מזוזה',      staticImg: '' },
  { name: 'תפילין קומפלט',   slug: 'תפילין קומפלט',    emoji: '🖊️', href: '/category/תפילין קומפלט',   staticImg: '' },
  { name: 'בתי מזוזה',        slug: 'מזוזות',            emoji: '🏠', href: '/category/בתי מזוזה',        staticImg: '' },
  { name: 'סט בר מצווה',     slug: 'בר מצווה',          emoji: '✡️', href: '/category/בר מצווה',         staticImg: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777989198/fqm7twz1berprum03u7u.png' },
  { name: 'יודאיקה',          slug: 'יודאיקה',           emoji: '✡️', href: '/category/יודאיקה',          staticImg: '' },
  { name: 'סט טלית תפילין',  slug: 'סט טלית תפילין',   emoji: '🕍', href: '/category/סט טלית תפילין',  staticImg: '' },
  { name: 'טליתות וציציות',  slug: 'טליתות וציציות',   emoji: '🕍', href: '/category/טליתות וציציות',  staticImg: '' },
  { name: 'כיפות',            slug: 'כיפות',             emoji: '🎩', href: '/category/כיפות',             staticImg: '' },
  { name: 'מגילות',           slug: 'מגילות',            emoji: '📖', href: '/category/מגילות',            staticImg: '' },
  { name: 'ספרי תורה',        slug: 'ספרי תורה',         emoji: '📜', href: '/category/ספרי תורה',         staticImg: '' },
  { name: 'פסח',              slug: 'פסח',               emoji: '🍷', href: '/category/פסח',               staticImg: '' },
  { name: 'שבתות וחגים',     slug: 'שבתות וחגים',      emoji: '🕯️', href: '/category/שבתות וחגים',      staticImg: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_800/v1776635301/lsgvbw3tbwfbnv626xv7_ebthks.png' },
];

export default function CategoriesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [catImages, setCatImages] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function loadImages() {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const map: Record<string, string> = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const slug = data.slug || data.name || d.id;
          const img = data.imgUrl || data.image_url || data.imageUrl || '';
          if (slug && img) map[slug] = img;
        });
        setCatImages(map);
      } catch { /* non-fatal */ }
    }
    loadImages();
  }, []);

  return (
    <div dir="rtl" style={{ background: '#FAF8F3', minHeight: '100vh', padding: isMobile ? '28px 16px 48px' : '48px 32px 64px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 800, color: '#1F2937', textAlign: 'center', marginBottom: 8 }}>
          כל הקטגוריות
        </h1>
        <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 36 }}>
          גלה את כל מגוון המוצרים שלנו
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? 14 : 20,
        }}>
          {CATEGORIES.map(cat => {
            const raw = cat.staticImg || catImages[cat.slug] || '';
            const imgSrc = raw ? optimizeCloudinaryUrl(raw, 400) : '';
            return (
              <div
                key={cat.slug}
                onClick={() => router.push(cat.href)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e8e4da',
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{ height: 180, background: imgSrc ? '#111' : '#f0ede6', position: 'relative', overflow: 'hidden' }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={cat.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      {cat.emoji}
                    </div>
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>{cat.name}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
