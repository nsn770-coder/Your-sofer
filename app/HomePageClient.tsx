'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import SmartHero from './components/SmartHero';
import ProductCard from '@/components/ui/ProductCard';
import { useShaliach } from './contexts/ShaliachContext';
import {
  CARDS, ALL_CATS, CONFIG_COLLECTION, CONFIG_DOC, slotKey,
} from './constants/homepageCards';
import type { CardDef, SubItem } from './constants/homepageCards';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
}

// ── Sub-image slot ─────────────────────────────────────────────────────────────

function SubSlot({ imgUrl, label, href }: { imgUrl: string; label: string; href: string }) {
  return (
    <Link href={href} className="block group">
      <div
        className="relative aspect-square rounded-md overflow-hidden bg-gray-100 mb-1.5"
        style={{ borderRadius: 6 }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={label}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          // Placeholder: gray box with the first Hebrew letter
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span style={{ fontSize: 28, color: '#c0c0c0', fontWeight: 900 }}>
              {label.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <p
        className="text-right leading-tight line-clamp-2 group-hover:underline"
        style={{ fontSize: 11, color: '#555', direction: 'rtl' }}
      >
        {label}
      </p>
    </Link>
  );
}

// ── Single category card ───────────────────────────────────────────────────────

function CategoryCard({
  card,
  catImages,
  slotImages,
}: {
  card: CardDef;
  catImages: Record<string, string>;
  slotImages: Record<string, string>;
}) {
  return (
    <div
      dir="rtl"
      className="flex flex-col"
      style={{
        background: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: 16,
        height: '100%',
      }}
    >
      {/* Title */}
      <h3
        className="text-right mb-3"
        style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35', lineHeight: 1.2 }}
      >
        {card.title}
      </h3>

      {/* 2×2 subcategory image grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        {card.items.map(item => (
          <SubSlot
            key={item.href + item.label}
            imgUrl={slotImages[slotKey(card.title, item.label)] ?? catImages[item.cat] ?? ''}
            label={item.label}
            href={item.href}
          />
        ))}
      </div>

      {/* CTA link */}
      <Link
        href={card.href}
        className="mt-4 block text-right hover:underline"
        style={{ fontSize: 13, fontWeight: 700, color: '#b8972a' }}
      >
        {card.ctaLabel}
      </Link>
    </div>
  );
}

// ── Skeleton card for loading state ───────────────────────────────────────────

function SkeletonCategoryCard() {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: 16,
        height: '100%',
      }}
    >
      <div className="h-5 bg-gray-200 rounded w-2/3 mb-3 animate-pulse" style={{ marginRight: 'auto' }} />
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square bg-gray-200 rounded animate-pulse mb-1" />
            <div className="h-2.5 bg-gray-200 rounded w-4/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HomePageClient() {
  const [isMobile, setIsMobile]       = useState(false);
  const [catImages, setCatImages]     = useState<Record<string, string>>({});
  const [slotImages, setSlotImages]   = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [newLoading, setNewLoading]   = useState(true);
  const [cardWidth, setCardWidth]     = useState(0);
  const cardsRef       = useRef<HTMLDivElement>(null); // outer wrap — for scrollIntoView
  const carouselTrack  = useRef<HTMLDivElement>(null); // scrollable track
  const newRef         = useRef<HTMLDivElement>(null);
  const router         = useRouter();
  const { shaliach }   = useShaliach();

  // Mobile detection + carousel card-width computation
  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (cardsRef.current) {
        const w = cardsRef.current.clientWidth;
        const gap = 16;
        // Desktop: 3 cards exactly. Mobile: 1.5 cards (shows half of next).
        const visible = mobile ? 1.5 : 3;
        setCardWidth((w - gap * (Math.ceil(visible) - 1)) / visible);
      }
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function scrollCarousel(dir: 'prev' | 'next') {
    const track = carouselTrack.current;
    if (!track || cardWidth === 0) return;
    const amount = cardWidth + 16;
    track.scrollBy({ left: dir === 'next' ? amount : -amount, behavior: 'smooth' });
  }

  // Fetch data: homepage config + cat fallback images + 8 newest products
  useEffect(() => {
    // 1. Load admin-pinned product images from Firestore config
    async function fetchPinnedImages(): Promise<Record<string, string>> {
      try {
        const snap = await getDoc(doc(db, CONFIG_COLLECTION, CONFIG_DOC));
        if (!snap.exists()) return {};
        const configMap = snap.data() as Record<string, Record<string, string>>;

        // Collect all unique productIds that are pinned
        const idToSlots: Record<string, string[]> = {};
        for (const card of CARDS) {
          const cardConf = configMap[card.title] ?? {};
          for (const item of card.items) {
            const pid = cardConf[item.label];
            if (pid) {
              if (!idToSlots[pid]) idToSlots[pid] = [];
              idToSlots[pid].push(slotKey(card.title, item.label));
            }
          }
        }

        // Fetch each unique product doc in parallel
        const result: Record<string, string> = {};
        await Promise.all(
          Object.entries(idToSlots).map(async ([pid, keys]) => {
            try {
              const pSnap = await getDoc(doc(db, 'products', pid));
              if (pSnap.exists()) {
                const d = pSnap.data();
                const img = (d.imgUrl || d.image_url || '') as string;
                for (const k of keys) result[k] = img;
              }
            } catch { /* skip — slot falls back to catImages */ }
          }),
        );
        return result;
      } catch { return {}; }
    }

    // 2. One limit(1) query per unique cat for automatic fallback images
    async function fetchCatImages() {
      const pairs = await Promise.all(
        ALL_CATS.map(async cat => {
          try {
            const snap = await getDocs(
              query(collection(db, 'products'), where('cat', '==', cat), limit(1)),
            );
            if (!snap.empty) {
              const d = snap.docs[0].data();
              return [cat, (d.imgUrl || d.image_url || '') as string] as const;
            }
          } catch { /* ignore — placeholder shown */ }
          return [cat, ''] as const;
        }),
      );
      setCatImages(Object.fromEntries(pairs));
    }

    async function fetchNewProducts() {
      try {
        const snap = await getDocs(
          query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(8)),
        );
        setNewProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch { /* silently empty */ }
      finally { setNewLoading(false); }
    }

    // Run all in parallel; mark images ready once both image fetches complete
    Promise.all([
      fetchPinnedImages().then(pinned => setSlotImages(pinned)),
      fetchCatImages(),
    ]).finally(() => setImagesReady(true));

    fetchNewProducts();
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        fontFamily: "'Heebo', Arial, sans-serif",
      }}
    >
      {/* ── 1. SmartHero — unchanged ── */}
      <SmartHero
        isMobile={isMobile}
        onScrollToProducts={() => cardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onSelectCat={(cat: string) => router.push(`/category/${encodeURIComponent(cat)}`)}
      />

      {/* ── 2. Category cards — horizontal carousel ── */}
      <div
        ref={cardsRef}
        style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 0' : '28px 0' }}
      >
        {/* Outer wrapper: clips overflow, positions arrows */}
        <div style={{ position: 'relative' }}>

          {/* ← prev arrow */}
          <button
            onClick={() => scrollCarousel('prev')}
            aria-label="הקודם"
            style={{
              position: 'absolute', left: 0, top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10, width: 40, height: 40, borderRadius: '50%',
              background: '#0c1a35', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1,
              boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
              flexShrink: 0,
            }}
          >‹</button>

          {/* Scrollable track — LTR internally so scrollLeft math is simple */}
          <div
            ref={carouselTrack}
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              overflowY: 'visible',
              scrollSnapType: 'x mandatory',
              direction: 'ltr',           // avoid RTL scroll-direction quirks
              padding: `4px ${isMobile ? 12 : 52}px`, // lateral space for arrows on desktop
            }}
          >
            {imagesReady
              ? CARDS.map(card => (
                  <div
                    key={card.href}
                    style={{
                      flex: `0 0 ${cardWidth > 0 ? cardWidth : 320}px`,
                      width: cardWidth > 0 ? cardWidth : 320,
                      scrollSnapAlign: 'start',
                      direction: 'rtl',   // restore RTL inside each card
                    }}
                  >
                    <CategoryCard card={card} catImages={catImages} slotImages={slotImages} />
                  </div>
                ))
              : Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: `0 0 ${cardWidth > 0 ? cardWidth : 320}px`,
                      width: cardWidth > 0 ? cardWidth : 320,
                    }}
                  >
                    <SkeletonCategoryCard />
                  </div>
                ))
            }
          </div>

          {/* → next arrow */}
          <button
            onClick={() => scrollCarousel('next')}
            aria-label="הבא"
            style={{
              position: 'absolute', right: 0, top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10, width: 40, height: 40, borderRadius: '50%',
              background: '#0c1a35', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1,
              boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
              flexShrink: 0,
            }}
          >›</button>

        </div>
      </div>

      {/* ── 3. New products section ── */}
      <div ref={newRef} style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 12px 40px' : '0 16px 48px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: '#0c1a35', margin: 0 }}>
            המוצרים החדשים שלנו
          </h2>
          <Link
            href="/category/מזוזות"
            style={{ fontSize: 13, fontWeight: 700, color: '#b8972a', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}
          >
            לכל המוצרים ←
          </Link>
        </div>

        {/* Product grid */}
        {newLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? 10 : 16,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}
              >
                <div
                  style={{ paddingTop: '100%', background: '#e8e8e8', animation: 'pulse 1.5s infinite' }}
                />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, marginBottom: 8, width: '75%' }} />
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : newProducts.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? 10 : 16,
            }}
          >
            {newProducts.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                priority={p.priority}
                isBestSeller={p.isBestSeller}
                badge={p.badge}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── 4. Footer ── */}
      <footer style={{ background: '#0f1111', color: '#fff' }}>
        <div style={{ borderBottom: '1px solid #333', padding: '28px 16px' }}>
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: isMobile ? 16 : 32,
            }}
          >
            {[
              { title: 'קבלו מידע',     items: ['אודות Your Sofer', 'הצהרת נגישות', 'הצהרת פרטיות'] },
              { title: 'הרוויחו אתנו',  items: ['הצטרפו כסופר', 'הצטרפו כשליח'] },
              { title: 'שירות לקוחות', items: ['שאלות נפוצות', 'מדיניות החזרות', 'צרו קשר'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>{item}</div>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מידע ולמידה</div>
              {[
                { label: '📖 מדריך לקניית מזוזה', path: '/madrich' },
                { label: '✍️ מי הסופרים שלנו',    path: '/soferim' },
                { label: '❓ שאלות נפוצות',        path: '/madrich/faq' },
              ].map(link => (
                <div
                  key={link.label}
                  onClick={() => router.push(link.path)}
                  style={{ fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#999')}
                >
                  {link.label}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מסמכים משפטיים</div>
              {[
                { label: 'תקנון האתר',      path: '/legal/takanon' },
                { label: 'מדיניות החזרים', path: '/legal/returns' },
                { label: 'מדיניות פרטיות', path: '/legal/privacy' },
                { label: 'משלוחים',         path: '/legal/shipping' },
                { label: 'נגישות',          path: '/legal/accessibility' },
                { label: 'שאלות נפוצות',   path: '/legal/faq' },
              ].map(link => (
                <div
                  key={link.path}
                  onClick={() => router.push(link.path)}
                  style={{ fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.color = '#fff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.color = '#999')}
                >
                  {link.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, color: '#b8972a' }}>Your Sofer</span>
          <span style={{ fontSize: 11, color: '#555' }}>© 2025 Your Sofer — כל הזכויות שמורות</span>
        </div>
      </footer>

      {/* ── WhatsApp floating button ── */}
      <a
        href="https://wa.me/972552722228?text=שלום אני מעוניין בעזרה ופרטים נוספים"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 999,
          background: '#25D366',
          color: '#fff',
          borderRadius: 50,
          padding: isMobile ? '10px 16px' : '12px 20px',
          fontSize: isMobile ? 13 : 14,
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(37,211,102,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          direction: 'rtl',
          textDecoration: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
        {isMobile ? 'וואטסאפ' : 'שאלות? דברו איתנו'}
      </a>
    </div>
  );
}
