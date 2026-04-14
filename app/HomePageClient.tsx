'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import SmartHero from './components/SmartHero';
import ProductCard from '@/components/ui/ProductCard';
import { useShaliach } from './contexts/ShaliachContext';

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

interface SubItem {
  label: string;
  href: string;
  cat: string; // Firestore `cat` field value — used to look up an image
}

interface CardDef {
  title: string;
  href: string;
  ctaLabel: string;
  items: SubItem[];
}

// ── 8 Amazon-style category card definitions ──────────────────────────────────

const CARDS: CardDef[] = [
  {
    title: 'מזוזות',
    href: '/category/מזוזות',
    ctaLabel: 'לכל המזוזות ←',
    items: [
      { label: 'מזוזה אלומיניום', href: '/category/מזוזות?filter=אלומיניום', cat: 'מזוזות' },
      { label: 'מזוזה עץ',        href: '/category/מזוזות?filter=עץ',        cat: 'מזוזות' },
      { label: 'מזוזה כסף',       href: '/category/מזוזות?filter=כסף',       cat: 'מזוזות' },
      { label: 'מזוזה פולימר',    href: '/category/מזוזות?filter=פולימר',    cat: 'מזוזות' },
    ],
  },
  {
    title: 'תפילין',
    href: '/category/תפילין קומפלט',
    ctaLabel: 'לכל התפילין ←',
    items: [
      { label: 'תפילין אשכנז', href: '/category/תפילין קומפלט?filter=אשכנז', cat: 'תפילין קומפלט' },
      { label: 'תפילין ספרד',  href: '/category/תפילין קומפלט?filter=ספרד',  cat: 'תפילין קומפלט' },
      { label: 'תפילין חב"ד',  href: '/category/תפילין קומפלט?filter=חב"ד',  cat: 'תפילין קומפלט' },
      { label: 'כיסוי תפילין', href: '/category/כיסוי תפילין',              cat: 'כיסוי תפילין'  },
    ],
  },
  {
    title: 'בר מצווה',
    href: '/category/בר מצווה',
    ctaLabel: 'לכל מוצרי בר מצווה ←',
    items: [
      { label: 'סט בר מצווה',     href: '/category/בר מצווה?filter=סט', cat: 'בר מצווה'       },
      { label: 'טלית',            href: '/category/טליתות',              cat: 'טליתות'          },
      { label: 'תפילין',          href: '/category/תפילין קומפלט',      cat: 'תפילין קומפלט'  },
      { label: 'מתנה לבר מצווה', href: '/category/מתנות',               cat: 'מתנות'           },
    ],
  },
  {
    title: 'מתנות',
    href: '/category/מתנות',
    ctaLabel: 'לכל המתנות ←',
    items: [
      { label: 'מתנה לחתן',     href: '/category/מתנות?filter=לחתן',  cat: 'מתנות' },
      { label: 'מתנה לאישה',    href: '/category/מתנות?filter=לאישה', cat: 'מתנות' },
      { label: 'מתנה לגבר',     href: '/category/מתנות?filter=לגבר',  cat: 'מתנות' },
      { label: 'מתנה לבית חדש', href: '/category/מתנות?filter=בית',   cat: 'מתנות' },
    ],
  },
  {
    title: 'קלפים',
    href: '/category/קלפי מזוזה',
    ctaLabel: 'לכל הקלפים ←',
    items: [
      { label: 'קלפי מזוזה 10 ס"מ', href: '/category/קלפי מזוזה?filter=10', cat: 'קלפי מזוזה' },
      { label: 'קלפי מזוזה 12 ס"מ', href: '/category/קלפי מזוזה?filter=12', cat: 'קלפי מזוזה' },
      { label: 'קלפי תפילין',       href: '/category/קלפי תפילין',          cat: 'קלפי תפילין' },
      { label: 'קלפי מזוזה 15 ס"מ', href: '/category/קלפי מזוזה?filter=15', cat: 'קלפי מזוזה' },
    ],
  },
  {
    title: 'ספרי תורה ומגילות',
    href: '/category/ספרי תורה',
    ctaLabel: 'לכל הספרים ←',
    items: [
      { label: 'ספר תורה',    href: '/category/ספרי תורה', cat: 'ספרי תורה' },
      { label: 'מגילת אסתר', href: '/category/מגילות',    cat: 'מגילות'    },
      { label: 'מגילות',     href: '/category/מגילות',    cat: 'מגילות'    },
      { label: 'יודאיקה',    href: '/category/יודאיקה',   cat: 'יודאיקה'   },
    ],
  },
  {
    title: 'חגים ומועדים',
    href: '/category/חגים ומועדים',
    ctaLabel: 'לכל החגים ←',
    items: [
      { label: 'חנוכה',    href: '/category/חגים ומועדים?filter=חנוכה',    cat: 'חגים ומועדים' },
      { label: 'פסח',      href: '/category/חגים ומועדים?filter=פסח',      cat: 'חגים ומועדים' },
      { label: 'ראש השנה', href: '/category/חגים ומועדים?filter=ראש השנה', cat: 'חגים ומועדים' },
      { label: 'פורים',    href: '/category/חגים ומועדים?filter=פורים',    cat: 'חגים ומועדים' },
    ],
  },
  {
    title: 'טליתות וציצית',
    href: '/category/טליתות',
    ctaLabel: 'לכל הטליתות ←',
    items: [
      { label: 'סט טלית ותפילין', href: '/category/סט טלית תפילין', cat: 'סט טלית תפילין' },
      { label: 'טלית',            href: '/category/טליתות',          cat: 'טליתות'          },
      { label: 'ציצית',           href: '/category/טליתות',          cat: 'טליתות'          },
      { label: 'יודאיקה',         href: '/category/יודאיקה',         cat: 'יודאיקה'         },
    ],
  },
];

// Deduplicated list of Firestore `cat` values we need one image for
const ALL_CATS = [...new Set(CARDS.flatMap(c => c.items.map(i => i.cat)))];

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

function CategoryCard({ card, catImages }: { card: CardDef; catImages: Record<string, string> }) {
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
            imgUrl={catImages[item.cat] ?? ''}
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
  const [imagesReady, setImagesReady] = useState(false);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [newLoading, setNewLoading]   = useState(true);
  const cardsRef = useRef<HTMLDivElement>(null);
  const newRef   = useRef<HTMLDivElement>(null);
  const router   = useRouter();
  const { shaliach } = useShaliach();

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fetch data: one product image per unique cat + 8 newest products
  useEffect(() => {
    // One limit(1) query per unique cat — all fired in parallel
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
      setImagesReady(true);
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

    fetchCatImages();
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

      {/* ── 2. Category cards — 4 per row desktop, 2 mobile ── */}
      <div ref={cardsRef} style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '20px 12px' : '28px 16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          {imagesReady
            ? CARDS.map(card => (
                <CategoryCard key={card.href} card={card} catImages={catImages} />
              ))
            : Array.from({ length: 8 }).map((_, i) => <SkeletonCategoryCard key={i} />)
          }
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
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
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
          {shaliach && (
            <span style={{ fontSize: 11, color: '#888' }}>
              מוגש על ידי {shaliach.chabadName || shaliach.name}
            </span>
          )}
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
