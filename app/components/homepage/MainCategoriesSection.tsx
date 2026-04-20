'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface CatItem {
  slug: string;
  label: string;
  href: string;
  img: string;
}

const SATAM: CatItem[] = [
  { slug: 'מזוזות',        label: 'מזוזות',        href: '/category/מזוזות',        img: '' },
  { slug: 'קלפי מזוזה',   label: 'קלפי מזוזה',   href: '/category/קלפי מזוזה',   img: '' },
  { slug: 'תפילין קומפלט',label: 'תפילין קומפלט', href: '/category/תפילין קומפלט', img: '' },
  { slug: 'קלפי תפילין',  label: 'קלפי תפילין',  href: '/category/קלפי תפילין',  img: '' },
  { slug: 'מגילות',        label: 'מגילות',        href: '/category/מגילות',        img: '' },
  { slug: 'ספרי תורה',    label: 'ספרי תורה',    href: '/category/ספרי תורה',    img: '' },
];

const JUDAICA: CatItem[] = [
  { slug: 'כלי שולחן והגשה', label: 'שבת וחגים',  href: '/category/כלי שולחן והגשה', img: '' },
  { slug: 'עיצוב הבית',      label: 'פמוטים',     href: '/category/עיצוב הבית',      img: '' },
  { slug: 'כלי שולחן והגשה', label: 'מגשי חלה',   href: '/category/כלי שולחן והגשה', img: '' },
  { slug: 'יודאיקה',         label: 'חנוכיות',    href: '/category/יודאיקה',         img: '' },
  { slug: 'מתנות',           label: 'מתנות',      href: '/category/מתנות',           img: '' },
  { slug: 'בר מצווה',        label: 'בר מצווה',   href: '/category/בר מצווה',        img: '' },
];

const GRADIENTS: string[] = [
  'linear-gradient(135deg,#1a3a6b,#0c2040)',
  'linear-gradient(135deg,#3a1a0c,#6b2e0c)',
  'linear-gradient(135deg,#0c2d1a,#1a5c30)',
  'linear-gradient(135deg,#2d0c3a,#5c1a6b)',
  'linear-gradient(135deg,#1a2d0c,#3a5c1a)',
  'linear-gradient(135deg,#2d1a0c,#6b3a0c)',
];

function CatCard({ item, fallbackGradient }: { item: CatItem; fallbackGradient: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => router.push(item.href)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        aspectRatio: '4/3',
        background: item.img ? '#000' : fallbackGradient,
        cursor: 'pointer',
        boxShadow: hovered ? '0 10px 32px rgba(0,0,0,0.22)' : '0 2px 10px rgba(0,0,0,0.1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.22s ease',
      }}
    >
      {item.img && (
        <img
          src={item.img}
          alt={item.label}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            transform: hovered ? 'scale(1.07)' : 'scale(1)',
            transition: 'transform 0.35s ease',
          }}
        />
      )}
      {/* dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)',
      }} />
      {/* gold border on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16,
          border: '2px solid rgba(184,151,42,0.7)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{
        position: 'absolute', bottom: 0, right: 0, left: 0,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {item.label}
        </span>
        <span style={{ color: '#b8972a', fontSize: 16, opacity: hovered ? 1 : 0.7, transition: 'opacity 0.2s' }}>←</span>
      </div>
    </div>
  );
}

function Group({ title, items, catImgMap }: { title: string; items: CatItem[]; catImgMap: Record<string, string> }) {
  const enriched = items.map(it => ({ ...it, img: catImgMap[it.slug] ?? '' }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <h3 style={{ fontSize: 'clamp(16px,2vw,22px)', fontWeight: 900, color: '#0c1a35', margin: 0 }}>{title}</h3>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #ede8df)' }} />
      </div>
      <style>{`
        .main-cat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(10px, 1.5vw, 18px);
        }
        @media (min-width: 768px) {
          .main-cat-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
      <div className="main-cat-grid">
        {enriched.map((item, i) => (
          <CatCard key={item.label + i} item={item} fallbackGradient={GRADIENTS[i % GRADIENTS.length]} />
        ))}
      </div>
    </div>
  );
}

export default function MainCategoriesSection() {
  const [catImgMap, setCatImgMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getDocs(collection(db, 'categories')).then(snap => {
      if (snap.empty) return;
      const map: Record<string, string> = {};
      snap.forEach(d => {
        const r = d.data();
        const key = (r.slug || r.name || '') as string;
        const img = (r.imageUrl || r.imgUrl || '') as string;
        if (key) map[key] = img;
      });
      setCatImgMap(map);
    }).catch(() => {});
  }, []);

  return (
    <div style={{
      background: '#f9f7f4',
      padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,40px)',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.1em', marginBottom: 10 }}>
            ✦ כל הקטגוריות
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#0c1a35', margin: 0 }}>
            גלה את המגוון המלא
          </h2>
        </div>
        <Group title='סת"מ' items={SATAM} catImgMap={catImgMap} />
        <Group title="יודאיקה" items={JUDAICA} catImgMap={catImgMap} />
      </div>
    </div>
  );
}
