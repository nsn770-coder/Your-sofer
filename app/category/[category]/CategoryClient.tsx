'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import ProductCard from '@/components/ui/ProductCard';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  filterAttributes?: Record<string, string>;
}

// ─── Filter config ────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

interface FilterSpec { key: string; label: string }

function getFilterSpecs(category: string): FilterSpec[] {
  if (category === 'קלפי מזוזה' || category === 'קלפי תפילין') {
    return [
      { key: 'גודל',    label: 'גודל'    },
      { key: 'כתב',     label: 'כתב'     },
      { key: 'כשרות',   label: 'כשרות'   },
    ];
  }
  if (category === 'כיסוי תפילין') {
    return [
      { key: 'חומר', label: 'חומר' },
      { key: 'צבע',  label: 'צבע'  },
    ];
  }
  return [];
}

const PRICE_RANGES = [
  { label: 'הכל',          min: 0,    max: Infinity },
  { label: 'עד ₪200',      min: 0,    max: 200      },
  { label: '₪200–₪500',    min: 200,  max: 500      },
  { label: '₪500–₪1,000',  min: 500,  max: 1000     },
  { label: '₪1,000+',      min: 1000, max: Infinity },
];

// ─── Pill button ──────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
        active
          ? 'bg-[#0c1a35] text-white border-[#0c1a35]'
          : 'bg-white text-gray-600 border-gray-300 hover:border-[#0c1a35] hover:text-[#0c1a35]'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-8 bg-gray-200 rounded-full mt-3" />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CategoryClient({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const urlFilter    = searchParams.get('filter') ?? null;

  const [allLoaded, setAllLoaded]     = useState<Product[]>([]);
  const [cursor, setCursor]           = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore]         = useState(true);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [priceIdx, setPriceIdx]       = useState(0);
  const [attrFilters, setAttrFilters] = useState<Record<string, string>>({});

  const filterSpecs = getFilterSpecs(category);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchPage(after: QueryDocumentSnapshot | null) {
    const constraints: Parameters<typeof query>[1][] = [
      where('cat', '==', category),
      orderBy('priority', 'desc'),
      limit(PAGE_SIZE),
    ];
    if (after) constraints.push(startAfter(after));

    const snap = await getDocs(query(collection(db, 'products'), ...constraints));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    setAllLoaded(prev => after ? [...prev, ...docs] : docs);
    setCursor(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
  }

  // Reset and load on category change
  useEffect(() => {
    setAllLoaded([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    setPriceIdx(0);
    setAttrFilters({});

    fetchPage(null).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Apply URL filter param once data is loaded
  useEffect(() => {
    if (!urlFilter || loading || allLoaded.length === 0) return;

    // Try to match urlFilter to a price range label
    const priceMatch = PRICE_RANGES.findIndex(r => r.label === urlFilter);
    if (priceMatch !== -1) {
      setPriceIdx(priceMatch);
      return;
    }

    // Try to match urlFilter to a value in any filterSpec key
    for (const spec of filterSpecs) {
      const vals = new Set(
        allLoaded.map(p => p.filterAttributes?.[spec.key]).filter(Boolean)
      );
      if (vals.has(urlFilter)) {
        setAttrFilters(prev => ({ ...prev, [spec.key]: urlFilter }));
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilter, loading, allLoaded.length]);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(cursor);
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Dynamic filter options (built from loaded data) ───────────────────────

  function uniqueValues(key: string): string[] {
    const seen = new Set<string>();
    for (const p of allLoaded) {
      const v = p.filterAttributes?.[key];
      if (v) seen.add(v);
    }
    return ['הכל', ...Array.from(seen).sort((a, b) => a.localeCompare(b, 'he'))];
  }

  function setAttr(key: string, val: string) {
    setAttrFilters(prev => ({ ...prev, [key]: val }));
  }

  // ── Client-side filtering ──────────────────────────────────────────────────

  const pr = PRICE_RANGES[priceIdx];
  const filtered = allLoaded.filter(p => {
    if (p.price < pr.min || p.price > pr.max) return false;
    for (const spec of filterSpecs) {
      const chosen = attrFilters[spec.key];
      if (chosen && chosen !== 'הכל' && p.filterAttributes?.[spec.key] !== chosen) return false;
    }
    return true;
  });

  const hasActiveFilters =
    priceIdx !== 0 ||
    filterSpecs.some(s => attrFilters[s.key] && attrFilters[s.key] !== 'הכל');

  function resetFilters() {
    setPriceIdx(0);
    setAttrFilters({});
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-[Heebo,Arial,sans-serif]">

      {/* ── Header ── */}
      <div className="bg-[#0c1a35] px-6 py-10 text-center">
        <h1 className="text-3xl font-black text-white mb-1">{category}</h1>
        {!loading && (
          <p className="text-sm text-white/60">
            {filtered.length} מוצרים
            {allLoaded.length > filtered.length ? ` (מתוך ${allLoaded.length} שנטענו)` : ''}
          </p>
        )}
      </div>

      {/* ── Filter bar ── */}
      {!loading && (
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-x-6 gap-y-3 items-start">

            {/* Attribute filters */}
            {filterSpecs.map(spec => {
              const opts = uniqueValues(spec.key);
              if (opts.length <= 1) return null;
              const current = attrFilters[spec.key] ?? 'הכל';
              return (
                <div key={spec.key} className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                    {spec.label}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {opts.map(opt => (
                      <Pill
                        key={opt}
                        label={opt}
                        active={current === opt}
                        onClick={() => setAttr(spec.key, opt)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Price filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                מחיר
              </span>
              <div className="flex flex-wrap gap-1">
                {PRICE_RANGES.map((range, i) => (
                  <Pill
                    key={range.label}
                    label={range.label}
                    active={priceIdx === i}
                    onClick={() => setPriceIdx(i)}
                  />
                ))}
              </div>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="self-end mb-0.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                ✕ נקה פילטרים
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg mb-6">
              {hasActiveFilters ? 'לא נמצאו מוצרים עם הפילטרים שנבחרו' : 'אין מוצרים בקטגוריה זו כרגע'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-[#0c1a35] text-white rounded-full font-bold text-sm hover:bg-[#1a3060] transition-colors"
              >
                נקה פילטרים
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
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

            {/* Load more */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="
                    px-10 py-3 rounded-full font-bold text-sm border-2
                    border-[#0c1a35] text-[#0c1a35]
                    hover:bg-[#0c1a35] hover:text-white
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-200
                  "
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      טוען...
                    </span>
                  ) : (
                    'טען עוד מוצרים'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
