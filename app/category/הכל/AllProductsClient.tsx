'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection, query, orderBy, limit, startAfter, getDocs,
  QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';

// ── Constants ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;  // docs per Firestore request (background loader)
const PAGE_SIZE  = 50;   // items revealed per "טען עוד" click

type SortBy = 'popular' | 'price_asc' | 'price_desc' | 'newest';

const SORT_LABELS: Record<SortBy, string> = {
  popular:    'הכי נמכר',
  price_asc:  'מחיר: נמוך לגבוה',
  price_desc: 'מחיר: גבוה לנמוך',
  newest:     'חדש לישן',
};

const CAT_LIST = [
  'בתי מזוזה', 'קלפי מזוזה', 'תפילין קומפלט', 'קלפי תפילין',
  'כיפות', 'יודאיקה',
  'טליתות וציציות', 'סט טלית תפילין', 'מגילות', 'ספרי תורה',
  'שבת', 'מתנות', 'בר מצווה',
];

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
  bundlePromo?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  eventsOnly?: boolean;
  status?: string;
  cat?: string;
  subCategory?: string;
  stars?: number;
  outOfStock?: boolean;
  comingSoon?: boolean;
  expectedArrivalDate?: string | null;
  hasKlafSelection?: boolean;
  soferId?: string;
  soferName?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function productInStock(p: Product): boolean {
  if (p.outOfStock === true) return false;
  return true; // AllProducts page doesn't filter by inStock count
}

function applySort(products: Product[], sort: SortBy): Product[] {
  return [...products].sort((a, b) => {
    // In-stock boost: always show available products before out-of-stock
    const aIn = productInStock(a);
    const bIn = productInStock(b);
    if (aIn !== bIn) return aIn ? -1 : 1;

    // Secondary: existing sort logic (unchanged)
    switch (sort) {
      case 'price_asc':  return (a.price ?? 0) - (b.price ?? 0);
      case 'price_desc': return (b.price ?? 0) - (a.price ?? 0);
      case 'newest':     return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      default:           return (b.priority ?? 0) - (a.priority ?? 0);
    }
  });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-none overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-100" />
      <div className="py-3 space-y-2">
        <div className="h-3 bg-gray-100 w-3/4" />
        <div className="h-3 bg-gray-100 w-1/2" />
        <div className="h-9 bg-gray-100 mt-3" />
      </div>
    </div>
  );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

interface FilterPanelProps {
  catFilter:    string;
  setCatFilter: (v: string) => void;
  priceMin:     string;
  setPriceMin:  (v: string) => void;
  priceMax:     string;
  setPriceMax:  (v: string) => void;
  anyActive:    boolean;
  onClear:      () => void;
}

function FilterPanel({
  catFilter, setCatFilter, priceMin, setPriceMin, priceMax, setPriceMax, anyActive, onClear,
}: FilterPanelProps) {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Category chips */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          קטגוריה
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['הכל', ...CAT_LIST].map(c => {
            const isActive = c === 'הכל' ? !catFilter : catFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCatFilter(c === 'הכל' ? '' : (catFilter === c ? '' : c))}
                style={{
                  fontSize: 12, padding: '4px 12px', borderRadius: 20,
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#1a1a1a' : '#fff',
                  color:      isActive ? '#fff'    : '#555',
                  border:     `1.5px solid ${isActive ? '#1a1a1a' : '#D1D5DB'}`,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          טווח מחיר
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number" placeholder="₪ מינ'" value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            style={{ width: 80, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
          />
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>—</span>
          <input
            type="number" placeholder="₪ מקס'" value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            style={{ width: 80, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }}
          />
        </div>
      </div>

      {anyActive && (
        <button
          onClick={onClear}
          style={{
            alignSelf: 'flex-start', background: 'none', border: 'none',
            color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            padding: '4px 0', fontFamily: 'inherit',
          }}
        >
          ✕ נקה סינון
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AllProductsClient() {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [allProducts,  setAllProducts]  = useState<Product[]>([]);
  const [loading,      setLoading]      = useState(true);   // first batch in-flight
  const [fullyLoaded,  setFullyLoaded]  = useState(false);  // all Firestore batches done

  // ── Display / filter / sort state ────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [sortBy,       setSortBy]       = useState<SortBy>('popular');
  const [catFilter,    setCatFilter]    = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [priceMin,     setPriceMin]     = useState('');
  const [priceMax,     setPriceMax]     = useState('');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Responsive ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset displayed page whenever filter / sort changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [sortBy, catFilter, searchQuery, priceMin, priceMax]);

  // ── Background loader: fetch ALL active products in BATCH_SIZE chunks ─────────
  // Filters run client-side, so we need the full catalog in memory.
  // First batch (500 docs) triggers loading=false so the grid appears immediately;
  // subsequent batches append silently in the background.
  useEffect(() => {
    let cancelled = false;
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
    let isFirst = true;

    async function fetchAll() {
      while (true) {
        const q = cursor
          ? query(collection(db, 'products'), orderBy('priority', 'desc'), startAfter(cursor), limit(BATCH_SIZE))
          : query(collection(db, 'products'), orderBy('priority', 'desc'), limit(BATCH_SIZE));

        try {
          const snap = await getDocs(q);
          if (cancelled) return;

          const prods = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Product))
            .filter(p => p.status === 'active' && p.hidden !== true && !p.eventsOnly);

          setAllProducts(prev => isFirst ? prods : [...prev, ...prods]);
          if (isFirst) { setLoading(false); isFirst = false; }

          if (snap.docs.length < BATCH_SIZE) {
            setFullyLoaded(true);
            return;
          }
          cursor = snap.docs[snap.docs.length - 1];
        } catch (e) {
          console.error('[AllProductsClient] Firestore fetch error:', e);
          if (!cancelled) { setLoading(false); setFullyLoaded(true); }
          return;
        }
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // ── Filtering + sorting (memoised) ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = allProducts;
    if (catFilter)   r = r.filter(p => p.cat === catFilter);
    if (searchQuery) r = r.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (priceMin)    r = r.filter(p => (p.price ?? 0) >= Number(priceMin));
    if (priceMax)    r = r.filter(p => (p.price ?? 0) <= Number(priceMax));
    return applySort(r, sortBy);
  }, [allProducts, catFilter, searchQuery, priceMin, priceMax, sortBy]);

  const paginated    = filtered.slice(0, displayCount);
  const hasMore      = displayCount < filtered.length;
  const nextCount    = Math.min(PAGE_SIZE, filtered.length - displayCount);

  const anyFilterActive = !!(catFilter || searchQuery || priceMin || priceMax);

  function clearAll() {
    setCatFilter(''); setSearchQuery(''); setPriceMin(''); setPriceMax('');
  }

  function handleSearchInput(value: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearchQuery(value), 250);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`@keyframes spin{from{transform-origin:center;transform:rotate(0)}to{transform-origin:center;transform:rotate(360deg)}}`}</style>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#FFFFFF', padding: '32px 20px 16px' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 400, color: '#1F2937', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            כל המוצרים
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
            {loading
              ? 'טוען מוצרים...'
              : `נמצאו ${filtered.length.toLocaleString('he-IL')}${!fullyLoaded ? '+' : ''} מוצרים`}
          </p>
        </div>
      </div>

      {/* ── Sticky toolbar (search + sort + mobile filter button) ───────────── */}
      <div
        className="sticky top-0 z-20"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #EDEDEF', padding: '8px 20px' }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', gap: 8, alignItems: 'center' }}>

          {/* Search */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <input
              type="text"
              placeholder="חיפוש מוצרים..."
              defaultValue={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              dir="rtl"
              style={{
                width: '100%', border: '1.5px solid #E7E2D8', borderRadius: 10,
                padding: '8px 12px 8px 34px', fontSize: 13, outline: 'none',
                background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--ys-accent)')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#E7E2D8')}
            />
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            style={{
              border: '1.5px solid #E7E2D8', borderRadius: 10, padding: '8px 10px',
              fontSize: 13, background: '#fff', cursor: 'pointer',
              fontFamily: 'inherit', direction: 'rtl', outline: 'none', flexShrink: 0,
            }}
          >
            {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {/* Filter button — mobile only */}
          {isMobile && (
            <button
              onClick={() => setDrawerOpen(true)}
              style={{
                border:    `1.5px solid ${anyFilterActive ? '#1a1a1a' : '#E7E2D8'}`,
                background: anyFilterActive ? '#1a1a1a' : '#fff',
                color:      anyFilterActive ? '#fff'    : '#374151',
                borderRadius: 10, padding: '8px 12px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
                minHeight: 38,
              }}
              aria-label="פתח סינון"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              סינון
              {anyFilterActive && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ys-accent)', display: 'inline-block' }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ─────────────────────────────────────────────── */}
      {isMobile && drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <FilterPanel
              catFilter={catFilter}    setCatFilter={v => { setCatFilter(v); setDrawerOpen(false); }}
              priceMin={priceMin}      setPriceMin={setPriceMin}
              priceMax={priceMax}      setPriceMax={setPriceMax}
              anyActive={anyFilterActive} onClear={clearAll}
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="mt-5 w-full py-4 bg-[#1a1a1a] text-white rounded-2xl font-bold text-sm"
            >
              הצג {filtered.length.toLocaleString('he-IL')}{!fullyLoaded ? '+' : ''} מוצרים
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: isMobile ? '16px 16px 56px' : '24px 20px 64px' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'start' }}>

          {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
          {!isMobile && (
            <aside style={{ width: 230, flexShrink: 0, position: 'sticky', top: 72 }}>
              <div style={{
                background: '#fff', borderRadius: 16, border: '1px solid #E7E2D8',
                padding: '18px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: 'var(--ys-text)', marginBottom: 18,
                  paddingBottom: 12, borderBottom: '1px solid #F0EDE8',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>סינון</span>
                  {anyFilterActive && (
                    <button
                      onClick={clearAll}
                      style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}
                    >
                      נקה ✕
                    </button>
                  )}
                </div>
                <FilterPanel
                  catFilter={catFilter}    setCatFilter={setCatFilter}
                  priceMin={priceMin}      setPriceMin={setPriceMin}
                  priceMax={priceMax}      setPriceMax={setPriceMax}
                  anyActive={anyFilterActive} onClear={clearAll}
                />
              </div>
            </aside>
          )}

          {/* ── Product grid ──────────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Loading skeletons — first batch in-flight */}
            {loading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-7">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ fontSize: 16, marginBottom: 20 }}>לא נמצאו מוצרים תואמים</p>
                {anyFilterActive && (
                  <button
                    onClick={clearAll}
                    style={{
                      background: 'var(--ys-dark-surface)', color: '#fff', border: 'none',
                      borderRadius: 10, padding: '10px 28px', fontSize: 14,
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    הצג את הכל
                  </button>
                )}
              </div>
            )}

            {/* Products */}
            {!loading && filtered.length > 0 && (
              <>
                {/* Background-loading notice — appears while more batches are in-flight */}
                {!fullyLoaded && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: '#9CA3AF' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.22-8.56" style={{ animation: 'spin 1s linear infinite' }} />
                    </svg>
                    טוען מוצרים נוספים ברקע…
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-7">
                  {paginated.map((p, idx) => (
                    <ProductCard
                      key={p.id}
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
                      aboveFold={idx < 8}
                      hasKlafSelection={p.hasKlafSelection}
                      cat={p.cat}
                      soferId={p.soferId}
                      soferName={p.soferName}
                      stars={p.stars}
                      outOfStock={p.outOfStock} comingSoon={p.comingSoon} expectedArrivalDate={p.expectedArrivalDate}
                    />
                  ))}
                </div>

                {/* Counter + load more */}
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                    מציג {paginated.length.toLocaleString('he-IL')} מתוך{' '}
                    {filtered.length.toLocaleString('he-IL')}{!fullyLoaded && !anyFilterActive ? '+' : ''} מוצרים
                  </p>

                  {hasMore ? (
                    <button
                      onClick={() => setDisplayCount(d => d + PAGE_SIZE)}
                      style={{
                        background: '#fff', color: 'var(--ys-text)',
                        border: '2px solid #1a1a1a', borderRadius: 12,
                        padding: isMobile ? '16px 36px' : '14px 48px',
                        fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'background 0.18s, color 0.18s',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        gap: 8, minWidth: isMobile ? 220 : 240, minHeight: 52,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a1a'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#1a1a1a'; }}
                    >
                      טען עוד {nextCount} מוצרים
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--ys-accent)', fontWeight: 700 }}>
                      ✓ הצגת את כל {filtered.length.toLocaleString('he-IL')} המוצרים
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
