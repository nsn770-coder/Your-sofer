'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD = '#C5A028';
const NAVY = '#111d3a';
const PAGE_SIZE = 16;

const MATERIAL_OPTIONS = ['בד', 'זמש', 'פשתן', 'ארטמן', 'משי', 'סרוגות'];

const SORT_LABELS: Record<SortBy, string> = {
  popular:    'הכי נמכר',
  price_asc:  'מחיר: נמוך לגבוה',
  price_desc: 'מחיר: גבוה לנמוך',
  newest:     'חדש לישן',
  oldest:     'ישן לחדש',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SortBy = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  hidden?: boolean;
  priority?: number;
  subCategory?: string;
  was?: number | null;
  isBestSeller?: boolean;
  badge?: string | null;
  bundlePromo?: string | null;
  createdAt?: { seconds: number } | null;
  cat?: string;
  soferName?: string;
  soferPhoto?: string;
  soferId?: string;
  stars?: number;
  outOfStock?: boolean;
  hasKlafSelection?: boolean;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface EventKippotConfig {
  heroTag:       string;
  heroTitle:     string;
  heroSubtitle:  string;
  promoBanner:   string;
  gridTitle:     string;
  ctaPrintTitle: string;
  ctaPrintBody:  string;
}

export const BAR_MITZVAH_CONFIG: EventKippotConfig = {
  heroTag:      '🎩 כיפות לאירועים',
  heroTitle:    'כיפות לבר מצווה\nואירועים במחירים מיוחדים',
  heroSubtitle: 'כיפות לאירועים עם הדפסה אישית — שם, תאריך ולוגו — מגוון ענק של סגנונות וצבעים',
  promoBanner:  '🎩 כיפות לבר מצווה ואירועים עם הדפסה אישית — הדמיה מיידית, אספקה בזמן לאירוע',
  gridTitle:    'כיפות לבר מצווה ואירועים',
  ctaPrintTitle:'הוסיפו הדפסה אישית לכיפות',
  ctaPrintBody: 'שם הבר מצווה, תאריך, לוגו — העלו תמונה, קבלו הדמיה, ומקבלים הדפסה מותאמת',
};

const BENEFITS = [
  '🔥 הדמיה ומחיר תוך 3 שניות',
  '🛡️ אספקה בזמן לאירוע — או פיצוי',
  '⭐ שירות מטורף',
  '👨‍👩‍👧‍👦 מעל 1,200 משפחות בחרו בנו',
  '📦 מבחר ענק של כיפות',
];

// ── Sort helper (copied from CategoryClient) ──────────────────────────────────

function applySort(products: Product[], sort: SortBy): Product[] {
  return [...products].sort((a, b) => {
    switch (sort) {
      case 'price_asc':  return (a.price ?? 0) - (b.price ?? 0);
      case 'price_desc': return (b.price ?? 0) - (a.price ?? 0);
      case 'newest':     return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      case 'oldest':     return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
      case 'popular':
      default:           return (b.priority ?? 0) - (a.priority ?? 0);
    }
  });
}

// ── RevealCard — scroll-reveal animation (copied from MomentClient) ───────────

function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'none' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-3/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="h-8 bg-gray-100 rounded-full mt-3" />
      </div>
    </div>
  );
}

// ── Pill button ───────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:  active ? NAVY : '#fff',
        color:       active ? '#fff' : '#555',
        border:      `1.5px solid ${active ? NAVY : '#D1D5DB'}`,
        borderRadius: 20,
        padding:     '5px 16px',
        fontSize:    13,
        fontWeight:  active ? 700 : 500,
        cursor:      'pointer',
        fontFamily:  'inherit',
        whiteSpace:  'nowrap',
        transition:  'all 0.15s',
        flexShrink:  0,
      }}
    >
      {label}
    </button>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  faqItems: FaqItem[];
  config?: EventKippotConfig;
}

export default function KippotEventClient({ faqItems, config = BAR_MITZVAH_CONFIG }: Props) {
  const [allProducts,    setAllProducts]    = useState<Product[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [isMobile,       setIsMobile]       = useState(false);
  const [openFaq,        setOpenFaq]        = useState<number | null>(null);
  const [sortBy,         setSortBy]         = useState<SortBy>('popular');
  const [subCatFilter,   setSubCatFilter]   = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [minPrice,       setMinPrice]       = useState('');
  const [maxPrice,       setMaxPrice]       = useState('');
  const [currentPage,    setCurrentPage]    = useState(1);

  const gridRef     = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Responsive ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(
            collection(db, 'products'),
            where('cat', '==', 'כיפות'),
            orderBy('priority', 'desc'),
            limit(500),
          ),
        );
        const prods = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.hidden !== true);
        setAllProducts(prods);
      } catch (e) {
        console.error('[KippotEventClient] fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Filter + sort (memoized) ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = allProducts;

    if (subCatFilter) {
      result = result.filter(p => p.subCategory === subCatFilter);
    }

    if (materialFilter) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(materialFilter.toLowerCase()) ||
        (materialFilter === 'סרוגות' && p.subCategory === 'כיפות סרוגות'),
      );
    }

    if (minPrice !== '') {
      result = result.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice !== '') {
      result = result.filter(p => p.price <= Number(maxPrice));
    }

    return applySort(result, sortBy);
  }, [allProducts, subCatFilter, materialFilter, minPrice, maxPrice, sortBy]);

  // ── Pagination ───────────────────────────────────────────────────────────────

  const paginated = filtered.slice(0, currentPage * PAGE_SIZE);
  const hasMore   = paginated.length < filtered.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [subCatFilter, materialFilter, minPrice, maxPrice, sortBy]);

  // ── Infinite scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore) setCurrentPage(p => p + 1); },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const anyFilterActive = !!(subCatFilter || materialFilter || minPrice || maxPrice);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`
        .ys-faq-btn:hover { background: #f9f7f2 !important; }
        .ys-kip-pill:hover { border-color: ${NAVY} !important; color: ${NAVY} !important; }
      `}</style>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          backgroundImage: 'url("https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780610159/%D7%91%D7%90%D7%A0%D7%A8_%D7%94%D7%93%D7%A4%D7%A1%D7%95%D7%AA_%D7%9B%D7%99%D7%A4%D7%95%D7%AA_j0gyh1.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          padding: isMobile ? '48px 20px 44px' : '80px 24px 72px',
          minHeight: isMobile ? 380 : 460,
        }}
      >
        {/* Dark overlay for text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55))',
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(197,160,40,0.14)', border: '1px solid rgba(197,160,40,0.4)',
            borderRadius: 20, padding: '6px 18px',
            fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 20,
          }}>
            {config.heroTag}
          </div>

          <h1 style={{
            fontSize: isMobile ? 28 : 46, fontWeight: 900,
            color: '#fff', lineHeight: 1.2, margin: '0 0 14px',
            whiteSpace: 'pre-line',
          }}>
            {config.heroTitle}
          </h1>

          <p style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(255,255,255,0.75)', marginBottom: 28, lineHeight: 1.7 }}>
            {config.heroSubtitle}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
            gap: 10, marginBottom: 32, textAlign: 'right',
          }}>
            {BENEFITS.map((b, i) => (
              <div key={b} style={{
                fontSize: i === 0 ? 14 : 13,
                color: i === 0 ? '#FACC15' : 'rgba(255,255,255,0.85)',
                background: i === 0 ? 'rgba(197,160,40,0.18)' : 'rgba(255,255,255,0.07)',
                padding: '8px 12px',
                fontWeight: i === 0 ? 900 : 600,
                border: i === 0 ? '1px solid rgba(197,160,40,0.55)' : 'none',
              }}>
                {b}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={scrollToGrid}
              style={{
                background: GOLD, color: NAVY, border: 'none',
                padding: '14px 32px', fontSize: 15, fontWeight: 900,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              בחרו כיפות ←
            </button>
            <a
              href="/print-order"
              style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'transparent', color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.5)',
                padding: '13px 32px', fontSize: 15, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              הוסיפו הדפסה 🖨️
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Promo banner ─────────────────────────────────────────────────── */}
      <div style={{ background: GOLD, padding: isMobile ? '14px 16px' : '16px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: isMobile ? 13 : 15, fontWeight: 800, color: NAVY, lineHeight: 1.5 }}>
          {config.promoBanner}
        </p>
      </div>

      {/* ── 3. Product grid ─────────────────────────────────────────────────── */}
      <section
        ref={gridRef}
        style={{
          maxWidth: 1280, margin: '0 auto',
          padding: isMobile ? '40px 16px' : '60px 24px',
          scrollMarginTop: 80,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: NAVY, margin: 0 }}>
            {config.gridTitle}
          </h2>
          {!loading && (
            <span style={{ fontSize: 13, color: '#888' }}>
              {filtered.length} מוצרים
            </span>
          )}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <div
          dir="rtl"
          style={{
            background: '#fff',
            border: '1px solid #E7E2D8',
            borderRadius: 12,
            padding: isMobile ? '12px 14px' : '14px 20px',
            marginBottom: 24,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {/* Subcategory pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
            {['הכל', 'כיפות מיוחדות', 'כיפות סרוגות'].map(sub => (
              <Pill
                key={sub}
                label={sub}
                active={subCatFilter === (sub === 'הכל' ? '' : sub)}
                onClick={() => setSubCatFilter(sub === 'הכל' ? '' : sub)}
              />
            ))}
          </div>

          <div style={{ width: 1, height: 28, background: '#E7E2D8', flexShrink: 0 }} />

          {/* Material filter */}
          <select
            value={materialFilter}
            onChange={e => setMaterialFilter(e.target.value)}
            style={{
              border: `1.5px solid ${materialFilter ? NAVY : '#D1D5DB'}`,
              borderRadius: 20, padding: '5px 12px',
              fontSize: 13, fontWeight: materialFilter ? 700 : 500,
              color: materialFilter ? NAVY : '#555',
              background: materialFilter ? '#EEF3FF' : '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              direction: 'rtl', outline: 'none',
            }}
          >
            <option value="">חומר: הכל</option>
            {MATERIAL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Price range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              placeholder="₪ מינ'"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              style={{
                width: 72, border: '1.5px solid #D1D5DB', borderRadius: 20,
                padding: '5px 10px', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            />
            <span style={{ color: '#aaa', fontSize: 13 }}>—</span>
            <input
              type="number"
              placeholder="₪ מקס'"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              style={{
                width: 72, border: '1.5px solid #D1D5DB', borderRadius: 20,
                padding: '5px 10px', fontSize: 13, outline: 'none',
                fontFamily: 'inherit', textAlign: 'center',
              }}
            />
          </div>

          <div style={{ width: 1, height: 28, background: '#E7E2D8', flexShrink: 0 }} />

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            style={{
              border: '1.5px solid #D1D5DB', borderRadius: 20,
              padding: '5px 12px', fontSize: 13, fontWeight: 500,
              color: '#555', background: '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              direction: 'rtl', outline: 'none', flexShrink: 0,
            }}
          >
            {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Clear filters */}
          {anyFilterActive && (
            <button
              onClick={() => { setSubCatFilter(''); setMaterialFilter(''); setMinPrice(''); setMaxPrice(''); }}
              style={{
                background: 'none', border: 'none', color: '#dc2626',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              נקה ✕
            </button>
          )}
        </div>

        {/* ── Grid ──────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#888' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎩</div>
            <p style={{ fontSize: 16, marginBottom: 16 }}>לא נמצאו כיפות תואמות לסינון</p>
            {anyFilterActive && (
              <button
                onClick={() => { setSubCatFilter(''); setMaterialFilter(''); setMinPrice(''); setMaxPrice(''); }}
                style={{
                  background: NAVY, color: '#fff', border: 'none',
                  padding: '10px 28px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                הצג את הכל
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginated.map((p, idx) => (
                <RevealCard key={p.id} delay={Math.min((idx % PAGE_SIZE) * 50, 300)}>
                  <ProductCard
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                    priority={p.priority}
                    isBestSeller={p.isBestSeller}
                    badge={p.badge}
                    bundlePromo={p.bundlePromo}
                    was={p.was} productDoc={p}
                    createdAt={p.createdAt}
                    aboveFold={idx < 4}
                    hasKlafSelection={p.hasKlafSelection}
                    cat={p.cat}
                    soferName={p.soferName}
                    soferPhoto={p.soferPhoto}
                    soferId={p.soferId}
                    stars={p.stars}
                    outOfStock={p.outOfStock}
                  />
                </RevealCard>
              ))}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: 1 }} />
          </>
        )}
      </section>

      {/* ── 4. Print CTA ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 16px 48px' : '0 24px 64px' }}>
        <a
          href="/print-order"
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: `linear-gradient(135deg, ${NAVY} 0%, #162a5c 100%)`,
            padding: isMobile ? '20px' : '28px 36px',
            textDecoration: 'none', border: `2px solid ${GOLD}`,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: isMobile ? 36 : 48, lineHeight: 1, flexShrink: 0 }}>🖨️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {config.ctaPrintTitle}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
              {config.ctaPrintBody}
            </div>
          </div>
          <div style={{ flexShrink: 0, background: GOLD, color: NAVY, fontWeight: 900, fontSize: 14, padding: '10px 22px' }}>
            להזמנת הדפסה ←
          </div>
        </a>
      </section>

      {/* ── 5. SEO Content ──────────────────────────────────────────────────── */}
      <section style={{ background: '#fff', padding: isMobile ? '48px 20px 40px' : '72px 24px 56px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', color: '#374151', lineHeight: 1.85, fontSize: isMobile ? 15 : 16 }}>

          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: NAVY, marginBottom: 16, marginTop: 0 }}>
            כיפות לבר מצווה — המדריך המלא להזמנה בכמות
          </h2>
          <p>
            הכיפה היא אחד מסמלי הזהות היהודית העמוקים ביותר, ובאירוע בר המצווה היא הופכת לפריט שכל אורח יקח איתו הביתה — זיכרון קטן שמשאיר רושם גדול. בחירת הכיפות לאירוע היא החלטה שמשלבת טעם אישי, תקציב, כמות האורחים ואפשרויות ההתאמה האישית. במדריך הזה תמצאו כל מה שצריך לדעת כדי לבחור נכון.
          </p>
          <p>
            כשמזמינים כיפות לבר מצווה חשוב לקחת בחשבון כמה פרמטרים: כמות האורחים הצפויה, הסגנון של האירוע, האם רוצים הדפסה אישית, ומה התקציב המוקצה לפריט הזה. הזמנה מוקדמת — לפחות שבועיים לפני האירוע — מאפשרת לכם זמן לאישור הדמיה, ייצור ומשלוח בלי לחץ.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            כיפות מודפסות — כשהפרט הקטן הופך לזיכרון גדול
          </h2>
          <p>
            כיפות מודפסות הפכו לאחד הטרנדים החמים ביותר באירועי בר מצווה. הרעיון פשוט: על כל כיפה מודפסת שם הבר מצווה, תאריך האירוע, ולפעמים גם פסוק, ציטוט, או לוגו של המשפחה. התוצאה היא פריט אישי ומיוחד שהאורחים שמחים לשמור.
          </p>
          <p>
            בהשוואה לכיפות רגילות, כיפות מודפסות מוסיפות ערך מוסף ניכר בעלות נמוכה יחסית. ההדפסה על כיפה עולה בדרך כלל החל מ־₪4.5 ליחידה בהזמנת 100 יחידות ומעלה — פחות מ-₪500 לכל סט הכיפות של אירוע של 100 אורחים.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            מה אפשר להדפיס על כיפות?
          </h3>
          <p>
            כמעט כל דבר! שם הבר מצווה ותאריך האירוע הם הבחירה הקלאסית, אבל אפשר ללכת הרבה יותר רחוק. משפחות רבות בוחרות להדפיס את שם הבר מצווה עם שם הפרשה, את הפסוק שהבר מצווה יקרא בתורה, ציור שהבר מצווה יצר בעצמו, לוגו של עסק משפחתי, או סתם עיצוב גרפי מגניב. כל קובץ תמונה ב-PNG עם רקע שקוף יתאים בצורה מושלמת.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            איך לבחור את הכיפה הנכונה לאירוע?
          </h2>
          <p>
            כיפות מגיעות בחומרים, גדלים וסגנונות שונים מאוד — ולכל אחד מהם יש יתרונות ייחודיים. הבחירה הנכונה תלויה בסגנון האירוע ובהעדפות האישיות.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת חומר הכיפה
          </h3>
          <p>
            <strong>כיפות בד ומשי</strong> — קלות ונוחות, מתאימות לאירועים קיציים ולכל סגנון. ניתנות להדפסה בצורה מעולה. זהו החומר הנפוץ ביותר לכיפות בר מצווה מודפסות.
          </p>
          <p>
            <strong>כיפות קטיפה</strong> — מלכותיות ומהודרות, מתאימות לאירועים חגיגיים יותר. הצבע עמוק ויפה, והמראה יוקרתי.
          </p>
          <p>
            <strong>כיפות פשתן וארטמן</strong> — טבעיות ונושמות, מתאימות לאירועים בחוץ ולאירועים בסגנון בוהו.
          </p>
          <p>
            <strong>כיפות סרוגות</strong> — הכיפה הישראלית הקלאסית, מתאימה לאירועים שבהם חלק מהאורחים מגיע עם כיפה משלו.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת הגודל
          </h3>
          <p>
            כיפות מגיעות בדרך כלל בקוטר 17, 18, 19 ו-20 ס"מ. עבור כיפות בר מצווה שכולם יוכלו לחבוש בנוחות, מידה 18-19 ס"מ היא הבחירה הנפוצה ביותר. אם מזמינים לקהל מגוון (כולל ילדים), אפשר לחלק בין גדלים שונים.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            בחירת צבעים
          </h3>
          <p>
            הצבע צריך להתאים לפלטת הצבעים של האירוע. כיפות לבן או קרם הן בחירה נייטרלית שמתאימה לכמעט כל אירוע. כיפות כחול, שחור או כחול-כסף — אלגנטיות ופורמליות. כיפות בצבעים חמים (חאקי, קפה, בורדו) מתאימות לאירועים בסגנון טבעי וחמים.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            הזמנה בכמויות — יתרונות ומחירים
          </h2>
          <p>
            הזמנה של כיפות בכמות גדולה מביאה ליתרונות כפולים: מחיר נמוך יותר ליחידה, וקבלת כמות מספקת לכל האורחים בלי דאגה. לאירועים גדולים — פנו אלינו לקבלת הצעת מחיר מיוחדת.
          </p>

          <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#1a1a1a', marginTop: 28, marginBottom: 12 }}>
            כמה כיפות להזמין?
          </h3>
          <p>
            כלל האצבע: כיפה לכל אורח מוזמן, פלוס 10-15% עודף. לאירוע של 150 אורחים, הזמינו 165-175 כיפות. העודף הולך לצלמים, למארגנים, לאורחים שמגיעים בלי הזמנה, ולמשפחה שתרצה לשמור כמה כזיכרון.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            זמני אספקה ומשלוח
          </h2>
          <p>
            זמן האספקה הכולל להזמנת כיפות עם הדפסה אישית הוא בדרך כלל 7–10 ימים מרגע התשלום, ולעיתים אף פחות. צריכים את הכיפות דחוף? כתבו לנו בוואטסאפ ונבדוק את לוח הייצור — נעשה מאמץ לעזור בהתאם לזמינות.
          </p>

          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: NAVY, marginTop: 40, marginBottom: 14 }}>
            רעיונות עיצוב לכיפות מודפסות
          </h2>
          <ul style={{ paddingRight: 24, margin: '12px 0' }}>
            <li style={{ marginBottom: 10 }}><strong>עיצוב מינימלי:</strong> שם הבר מצווה בכתב יד אלגנטי בצבע אחד, מרכוז, בלי הרבה אלמנטים.</li>
            <li style={{ marginBottom: 10 }}><strong>פסוק מהתורה:</strong> הפסוק שהבר מצווה יקרא, עם שם הפרשה ותאריך.</li>
            <li style={{ marginBottom: 10 }}><strong>עיצוב שיש:</strong> טקסטורת שיש בשחור-לבן עם שם הבר מצווה — נראה יוקרתי ומעניין.</li>
            <li style={{ marginBottom: 10 }}><strong>ציור ילדות:</strong> סריקת ציור שהבר מצווה עשה — תמיד מרגש ואנשים מדברים עליו כל הערב.</li>
            <li style={{ marginBottom: 10 }}><strong>לוגו ומיתוג:</strong> עסק משפחתי או עיצוב גרפי שמשקף את אישיות הבר מצווה.</li>
          </ul>
          <p>
            העצה שלנו: פשוט יותר הוא לרוב טוב יותר. עיצוב נקי עם שם ותאריך הוא תמיד בטוח ויפה.
          </p>

          <p style={{ marginTop: 32, padding: '16px 20px', background: '#FBF8F3', borderRight: `4px solid ${GOLD}`, fontSize: 14, color: '#555' }}>
            יש שאלות?{' '}
            <a href="https://wa.me/972587479933" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700, textDecoration: 'none' }}>
              כתבו לנו בוואטסאפ
            </a>{' '}
            — נשמח לעזור לכם לבחור את הכיפה המושלמת לאירוע.
          </p>
        </div>
      </section>

      {/* ── 6. FAQ Accordion ────────────────────────────────────────────────── */}
      <section style={{ background: '#FAF8F3', padding: isMobile ? '48px 20px 56px' : '72px 24px 80px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: NAVY, marginBottom: 32, textAlign: 'center' }}>
            שאלות נפוצות
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqItems.map((item, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E7E2D8', overflow: 'hidden' }}>
                <button
                  className="ys-faq-btn"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '16px 20px', background: 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'right',
                    fontFamily: 'inherit', transition: 'background 0.15s',
                  }}
                  aria-expanded={openFaq === i}
                >
                  <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: '#1a1a1a', flex: 1, textAlign: 'right' }}>
                    {item.q}
                  </span>
                  <span style={{
                    fontSize: 18, color: GOLD, flexShrink: 0, marginRight: 12,
                    transition: 'transform 0.25s',
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    display: 'inline-block',
                  }}>
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: isMobile ? 13 : 14, color: '#555', lineHeight: 1.75 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
