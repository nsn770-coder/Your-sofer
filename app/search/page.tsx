'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { algoliasearch } from 'algoliasearch';
import ProductCard from '@/components/ui/ProductCard';
import { search as pixelSearch } from '@/lib/metaPixel';

// ── Algolia client ─────────────────────────────────────────────────────────────

const APP_ID     = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID     ?? '';
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? '';
const algolia    = APP_ID && SEARCH_KEY ? algoliasearch(APP_ID, SEARCH_KEY) : null;

// ── Types ──────────────────────────────────────────────────────────────────────

type SortIndex = 'products' | 'products_price_asc' | 'products_price_desc' | 'products_newest';

interface AlgoliaHit {
  objectID: string;
  id: string;
  name: string;
  price: number;
  image: string;
  cat: string;
  subCategory: string;
  createdAt: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  priority?: number;
}

interface SearchState {
  query:    string;
  sort:     SortIndex;
  cat:      string;
  minPrice: string;
  maxPrice: string;
  page:     number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SortIndex; label: string }[] = [
  { value: 'products',           label: 'רלוונטיות' },
  { value: 'products_price_asc', label: 'מחיר: נמוך לגבוה' },
  { value: 'products_price_desc',label: 'מחיר: גבוה לנמוך' },
  { value: 'products_newest',    label: 'חדש באתר' },
];

// ── SVG Icons ──────────────────────────────────────────────────────────────────

function IconFilter({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── URL helpers ────────────────────────────────────────────────────────────────

function stateFromParams(params: URLSearchParams): SearchState {
  return {
    query:    params.get('q')?.trim() ?? '',
    sort:     (params.get('sort') as SortIndex) || 'products',
    cat:      params.get('cat') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    page:     Math.max(1, parseInt(params.get('page') ?? '1', 10)),
  };
}

function buildParams(s: SearchState): URLSearchParams {
  const p = new URLSearchParams();
  if (s.query)    p.set('q', s.query);
  if (s.sort && s.sort !== 'products') p.set('sort', s.sort);
  if (s.cat)      p.set('cat', s.cat);
  if (s.minPrice) p.set('minPrice', s.minPrice);
  if (s.maxPrice) p.set('maxPrice', s.maxPrice);
  if (s.page > 1) p.set('page', String(s.page));
  return p;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SearchPage() {
  const rawParams   = useSearchParams();
  const router      = useRouter();
  const [state, setStateRaw] = useState<SearchState>(() => stateFromParams(rawParams));

  const [hits, setHits]           = useState<AlgoliaHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [facetCats, setFacetCats] = useState<{ value: string; count: number }[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // keep URL in sync when state changes
  const setState = useCallback((next: SearchState | ((prev: SearchState) => SearchState)) => {
    setStateRaw(prev => {
      const s = typeof next === 'function' ? next(prev) : next;
      const params = buildParams(s);
      router.replace(`/search?${params.toString()}`, { scroll: false });
      return s;
    });
  }, [router]);

  // sync URL → state when user presses back/forward
  useEffect(() => {
    const s = stateFromParams(rawParams);
    setStateRaw(s);
  }, [rawParams.toString()]);

  // ── Algolia search ───────────────────────────────────────────────────────────
  const searchId = useRef(0);

  useEffect(() => {
    if (!state.query || !algolia) {
      setHits([]); setTotalHits(0); setTotalPages(0); setFacetCats([]);
      return;
    }

    const id = ++searchId.current;
    setLoading(true);

    const numericFilters: string[] = [];
    if (state.minPrice) numericFilters.push(`price >= ${parseFloat(state.minPrice)}`);
    if (state.maxPrice) numericFilters.push(`price <= ${parseFloat(state.maxPrice)}`);

    const facetFilters: string[][] = [];
    if (state.cat) facetFilters.push([`cat:${state.cat}`]);

    algolia.searchSingleIndex({
      indexName: state.sort,
      searchParams: {
        query:         state.query,
        page:          state.page - 1,
        hitsPerPage:   PAGE_SIZE,
        numericFilters: numericFilters.length ? numericFilters : undefined,
        facetFilters:   facetFilters.length   ? facetFilters   : undefined,
        facets:        ['cat'],
        attributesToRetrieve: [
          'id', 'name', 'price', 'image', 'cat', 'subCategory',
          'createdAt', 'isBestSeller', 'badge', 'was', 'priority',
        ],
      },
    }).then(res => {
      if (id !== searchId.current) return;
      setHits(res.hits as unknown as AlgoliaHit[]);
      setTotalHits(res.nbHits ?? 0);
      setTotalPages(res.nbPages ?? 0);

      const cats = Object.entries(res.facets?.cat ?? {})
        .map(([value, count]) => ({ value, count: count as number }))
        .sort((a, b) => b.count - a.count);
      setFacetCats(cats);
    }).catch(err => {
      if (id !== searchId.current) return;
      console.error('[search] Algolia error:', err);
    }).finally(() => {
      if (id === searchId.current) setLoading(false);
    });
  }, [state.query, state.sort, state.cat, state.minPrice, state.maxPrice, state.page]);

  // Meta Pixel
  useEffect(() => { if (state.query) pixelSearch(state.query); }, [state.query]);

  // ── Filter helpers ───────────────────────────────────────────────────────────

  const hasActiveFilters = !!(state.cat || state.minPrice || state.maxPrice);

  function clearFilters() {
    setState(s => ({ ...s, cat: '', minPrice: '', maxPrice: '', page: 1 }));
  }

  function goPage(n: number) {
    setState(s => ({ ...s, page: n }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────────

  const sidebar = (
    <div dir="rtl" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
            <IconFilter size={14} />
          </div>
          <span className="font-bold text-gray-800 text-sm">סינון</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg"
          >
            <IconX size={10} />
            נקה הכל
          </button>
        )}
      </div>

      {/* Category facets */}
      {facetCats.length > 1 && (
        <SidebarSection title="קטגוריה">
          <div className="flex flex-wrap gap-1.5">
            {[{ value: '', count: totalHits }, ...facetCats].map(opt => {
              const label = opt.value === '' ? 'הכל' : opt.value;
              const active = (state.cat || '') === opt.value;
              return (
                <button
                  key={opt.value || '__all'}
                  onClick={() => setState(s => ({ ...s, cat: opt.value, page: 1 }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all border ${
                    active
                      ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                  }`}
                >
                  {label}
                  {opt.value !== '' && (
                    <span className={`mr-1 text-[10px] ${active ? 'text-gray-300' : 'text-gray-400'}`}>
                      ({opt.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SidebarSection>
      )}

      {/* Price range */}
      <SidebarSection title="טווח מחיר">
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} placeholder="מינ׳"
            value={state.minPrice}
            onChange={e => setState(s => ({ ...s, minPrice: e.target.value, page: 1 }))}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]/20 transition-all"
          />
          <span className="text-gray-300">-</span>
          <input
            type="number" min={0} placeholder="מקס׳"
            value={state.maxPrice}
            onChange={e => setState(s => ({ ...s, maxPrice: e.target.value, page: 1 }))}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#1a1a1a] focus:ring-1 focus:ring-[#1a1a1a]/20 transition-all"
          />
        </div>
      </SidebarSection>

    </div>
  );

  // ── Active filter pills ───────────────────────────────────────────────────────

  const pills: { label: string; onRemove: () => void }[] = [];
  if (state.cat)     pills.push({ label: `קטגוריה: ${state.cat}`, onRemove: () => setState(s => ({ ...s, cat: '', page: 1 })) });
  if (state.minPrice || state.maxPrice) pills.push({
    label: `מחיר: ${state.minPrice || '0'} - ${state.maxPrice || '∞'} ₪`,
    onRemove: () => setState(s => ({ ...s, minPrice: '', maxPrice: '', page: 1 })),
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 py-8" dir="rtl">

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#1a1a1a]">תוצאות חיפוש</h1>

        {/* Sort dropdown */}
        {state.query && (
          <div className="relative flex-shrink-0">
            <select
              value={state.sort}
              onChange={e => setState(s => ({ ...s, sort: e.target.value as SortIndex, page: 1 }))}
              className="appearance-none text-xs font-semibold border border-gray-200 rounded-lg px-3 py-2 pr-8 bg-white text-gray-700 cursor-pointer focus:outline-none focus:border-[#1a1a1a] hover:border-gray-400 transition-all"
              style={{ direction: 'rtl' }}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
              <IconChevronDown size={12} />
            </div>
          </div>
        )}
      </div>

      {/* Subtitle */}
      {state.query && (
        <p className="text-sm text-gray-500 mb-4">
          חיפוש: <span className="font-bold text-[#1a1a1a]">{state.query}</span>
          {!loading && (
            <span className="mr-2 text-gray-400">({totalHits.toLocaleString('he-IL')} תוצאות)</span>
          )}
        </p>
      )}

      {/* Active filter pills */}
      {pills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {pills.map(pill => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-[#1a1a1a] text-white px-2.5 py-1 rounded-lg"
            >
              {pill.label}
              <button onClick={pill.onRemove} className="hover:opacity-70 transition-opacity">
                <IconX size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Mobile filter button */}
      {state.query && (
        <button
          className="lg:hidden flex items-center gap-2 text-sm font-semibold border border-gray-200 rounded-xl px-4 py-2 mb-4 hover:border-gray-400 transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <div className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center">
            <IconFilter size={11} />
          </div>
          סינון
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[var(--ys-accent)]" />
          )}
        </button>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800">סינון</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <IconX size={16} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      {/* Empty state — no query */}
      {!state.query && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-bold text-gray-600">הקלד מילת חיפוש כדי להתחיל</p>
        </div>
      )}

      {/* Spinner */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--ys-accent)]" />
        </div>
      )}

      {/* No results */}
      {!loading && state.query && hits.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-bold text-gray-600">לא נמצאו תוצאות עבור &ldquo;{state.query}&rdquo;</p>
          {hasActiveFilters
            ? <p className="text-sm text-gray-400 mt-2">נסה לנקות את הסינון</p>
            : <p className="text-sm text-gray-400 mt-2">נסה מילת חיפוש אחרת</p>
          }
        </div>
      )}

      {/* Results layout: sidebar + grid */}
      {!loading && state.query && hits.length > 0 && (
        <div className="flex gap-6 items-start">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-4">
            {sidebar}
          </aside>

          {/* Product grid + pagination */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-7">
              {hits.map(hit => (
                <ProductCard
                  key={hit.objectID}
                  id={hit.id || hit.objectID}
                  name={hit.name}
                  price={hit.price}
                  images={[hit.image].filter(Boolean)}
                  isBestSeller={hit.isBestSeller}
                  badge={hit.badge}
                  was={hit.was} productDoc={hit}
                  priority={hit.priority}
                  cat={hit.cat}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => goPage(Math.max(1, state.page - 1))}
                  disabled={state.page === 1}
                  className="px-5 py-2 rounded-lg border border-[#1a1a1a] text-[#1a1a1a] font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  ← הקודם
                </button>

                <span className="text-sm font-semibold text-gray-600">
                  עמוד {state.page} מתוך {totalPages}
                </span>

                <button
                  onClick={() => goPage(Math.min(totalPages, state.page + 1))}
                  disabled={state.page === totalPages}
                  className="px-5 py-2 rounded-lg border border-[#1a1a1a] text-[#1a1a1a] font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1a1a] hover:text-white transition-colors"
                >
                  הבא ←
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Sidebar section helper ─────────────────────────────────────────────────────

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  );
}
