'use client';
import { useEffect, useState, useMemo } from 'react';
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
  stars?: number;
  status?: string;
  days?: string;
  sofer?: string;
  vendor?: string;
}

interface FilterState {
  minPrice: string;
  maxPrice: string;
  minRating: number;       // 0 | 3 | 4
  freeShipping: boolean;
  attrFilters: Record<string, string>;  // from filterAttributes field
  nameFilters: Record<string, string>;  // category-specific, match against product.name
}

const EMPTY_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  freeShipping: false,
  attrFilters: {},
  nameFilters: {},
};

const PAGE_SIZE = 12;

// Attribute keys to surface from filterAttributes field (shown only when data exists)
const ATTR_KEYS = ['חומר', 'גודל', 'כתב', 'כשרות', 'נוסח', 'צבע'];

// ─── Category-specific name-based filters ────────────────────────────────────
// Filtering is done by checking product.name.includes(value)

interface NameFilterSpec {
  key: string;
  label: string;
  options: string[];
}

const CAT_NAME_FILTERS: Record<string, NameFilterSpec[]> = {
  'מזוזות': [
    {
      key: 'חומר',
      label: 'חומר',
      options: ['אלומיניום', 'עץ', 'כסף', 'פלסטיק', 'מתכת', 'זכוכית', 'קרמיקה'],
    },
    {
      key: 'גודל',
      label: 'גודל',
      options: ['7 ס"מ', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ', '25 ס"מ', '30 ס"מ'],
    },
    {
      key: 'צבע',
      label: 'צבע',
      options: ['לבן', 'כסף', 'זהב', 'שחור', 'חום', 'צבעוני'],
    },
  ],
  'קלפי מזוזה': [
    {
      key: 'גודל',
      label: 'גודל',
      options: ['7 ס"מ', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ', '25 ס"מ', '30 ס"מ'],
    },
    {
      key: 'כתב',
      label: 'כתב',
      options: ['אשכנז', 'ספרד', 'חב"ד', 'תימני', 'פרדי'],
    },
    {
      key: 'כשרות',
      label: 'כשרות',
      options: ['מהודר', 'מהדרין', 'רגיל'],
    },
  ],
  'כיסוי תפילין': [
    {
      key: 'חומר',
      label: 'חומר',
      options: ['עור', 'דמוי עור', 'קטיפה', 'בד', 'פיו', 'פשתן', 'משי'],
    },
    {
      key: 'צבע',
      label: 'צבע',
      options: ['לבן', 'כסף', 'זהב', 'שחור', 'חום', 'צבעוני'],
    },
  ],
  'בר מצווה': [
    {
      key: 'סוג סט',
      label: 'סוג סט',
      options: ['עם תפילין', 'עם טלית', 'קומפלט'],
    },
    {
      key: 'רמת הידור',
      label: 'רמת הידור',
      options: ['רגיל', 'מהודר', 'מהדרין'],
    },
  ],
  'סט טלית תפילין': [
    {
      key: 'נוסח',
      label: 'נוסח',
      options: ['אשכנז', 'ספרד', 'ספרדי', 'חב"ד', 'תימני'],
    },
    {
      key: 'גודל טלית',
      label: 'גודל טלית',
      options: ['36x29', '45x36', '55x40'],
    },
    {
      key: 'רמת הידור',
      label: 'רמת הידור',
      options: ['רגיל', 'מהודר', 'מהדרין'],
    },
  ],
  'יודאיקה': [
    {
      key: 'חומר',
      label: 'חומר',
      options: ['מתכת', 'עץ', 'זכוכית', 'קרמיקה', 'כסף'],
    },
    {
      key: 'צבע',
      label: 'צבע',
      options: ['זהב', 'כסף', 'לבן', 'צבעוני'],
    },
  ],
  'מתנות': [
    {
      key: 'חומר',
      label: 'חומר',
      options: ['מתכת', 'עץ', 'זכוכית', 'קרמיקה', 'כסף'],
    },
    {
      key: 'צבע',
      label: 'צבע',
      options: ['זהב', 'כסף', 'לבן', 'צבעוני'],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasActiveFilters(f: FilterState) {
  return (
    f.minPrice !== '' ||
    f.maxPrice !== '' ||
    f.minRating > 0 ||
    f.freeShipping ||
    Object.values(f.attrFilters).some(v => v && v !== 'הכל') ||
    Object.values(f.nameFilters).some(v => v && v !== 'הכל')
  );
}

function applyFilters(products: Product[], f: FilterState): Product[] {
  return products.filter(p => {
    if (f.minPrice !== '' && p.price < Number(f.minPrice)) return false;
    if (f.maxPrice !== '' && p.price > Number(f.maxPrice)) return false;
    if (f.minRating > 0 && (p.stars ?? 0) < f.minRating) return false;
    if (f.freeShipping && p.days && !p.days.toLowerCase().includes('חינם')) return false;
    // filterAttributes-based filters
    for (const key of ATTR_KEYS) {
      const chosen = f.attrFilters[key];
      if (chosen && chosen !== 'הכל' && p.filterAttributes?.[key] !== chosen) return false;
    }
    // name-based filters: check product.name includes the chosen value
    for (const [, val] of Object.entries(f.nameFilters)) {
      if (val && val !== 'הכל' && !p.name.includes(val)) return false;
    }
    return true;
  });
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  );
}

// ─── FilterSidebar ────────────────────────────────────────────────────────────

interface SidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  products: Product[];
  category: string;
}

function FilterSidebar({ filters, onChange, products, category }: SidebarProps) {
  function set(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function setAttr(key: string, val: string) {
    onChange({ ...filters, attrFilters: { ...filters.attrFilters, [key]: val } });
  }

  function setNameFilter(key: string, val: string) {
    onChange({ ...filters, nameFilters: { ...filters.nameFilters, [key]: val } });
  }

  const catNameFilters = CAT_NAME_FILTERS[category] ?? [];

  // Dynamic unique values per attribute key
  function uniqueAttrValues(key: string): string[] {
    const seen = new Set<string>();
    for (const p of products) {
      const v = p.filterAttributes?.[key];
      if (v) seen.add(v);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'he'));
  }


  const active = hasActiveFilters(filters);

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-gray-200 p-4 text-sm">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-gray-800 text-base">סינון</span>
        {active && (
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
          >
            נקה הכל
          </button>
        )}
      </div>

      {/* ── Price range ── */}
      <Section title="טווח מחיר">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            placeholder="מינ׳"
            value={filters.minPrice}
            onChange={e => set({ minPrice: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#0c1a35]"
          />
          <span className="text-gray-400 flex-shrink-0">–</span>
          <input
            type="number"
            min={0}
            placeholder="מקס׳"
            value={filters.maxPrice}
            onChange={e => set({ maxPrice: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#0c1a35]"
          />
        </div>
      </Section>

      {/* ── Rating ── */}
      <Section title="דירוג לקוחות">
        {[
          { label: 'הכל', value: 0 },
          { label: '3 ★ ומעלה', value: 3 },
          { label: '4 ★ ומעלה', value: 4 },
        ].map(opt => (
          <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer group">
            <input
              type="radio"
              name="rating"
              checked={filters.minRating === opt.value}
              onChange={() => set({ minRating: opt.value })}
              className="accent-[#0c1a35]"
            />
            <span className={`text-xs ${filters.minRating === opt.value ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>
              {opt.label}
            </span>
          </label>
        ))}
      </Section>

      {/* ── Shipping ── */}
      <Section title="משלוח">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.freeShipping}
            onChange={e => set({ freeShipping: e.target.checked })}
            className="accent-[#0c1a35]"
          />
          <span className="text-xs text-gray-600">משלוח חינם</span>
        </label>
      </Section>

      {/* ── Category-specific name-based filters ── */}
      {catNameFilters.map(spec => {
        const current = filters.nameFilters[spec.key] ?? 'הכל';
        return (
          <Section key={`name-${spec.key}`} title={spec.label}>
            {['הכל', ...spec.options].map(opt => (
              <label key={opt} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                <input
                  type="radio"
                  name={`name-${spec.key}`}
                  checked={current === opt}
                  onChange={() => setNameFilter(spec.key, opt)}
                  className="accent-[#0c1a35]"
                />
                <span className={`text-xs ${current === opt ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {opt}
                </span>
              </label>
            ))}
          </Section>
        );
      })}

      {/* ── Dynamic attribute filters (from filterAttributes field) ── */}
      {ATTR_KEYS.map(key => {
        const vals = uniqueAttrValues(key);
        if (vals.length === 0) return null;
        const current = filters.attrFilters[key] ?? 'הכל';
        return (
          <Section key={key} title={key}>
            {['הכל', ...vals].map(opt => (
              <label key={opt} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                <input
                  type="radio"
                  name={`attr-${key}`}
                  checked={current === opt}
                  onChange={() => setAttr(key, opt)}
                  className="accent-[#0c1a35]"
                />
                <span className={`text-xs ${current === opt ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {opt}
                </span>
              </label>
            ))}
          </Section>
        );
      })}

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
  const [filters, setFilters]         = useState<FilterState>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen]   = useState(false);

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

  useEffect(() => {
    setAllLoaded([]);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    setFilters(EMPTY_FILTERS);
    fetchPage(null).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Apply URL filter once data loads
  useEffect(() => {
    if (!urlFilter || loading || allLoaded.length === 0) return;

    // 1. Try filterAttributes-based match
    for (const key of ATTR_KEYS) {
      const vals = new Set(allLoaded.map(p => p.filterAttributes?.[key]).filter(Boolean));
      if (vals.has(urlFilter)) {
        setFilters(prev => ({ ...prev, attrFilters: { ...prev.attrFilters, [key]: urlFilter } }));
        return;
      }
    }

    // 2. Try category-specific name-based match (e.g. ?filter=אלומיניום for מזוזות)
    const catFilters = CAT_NAME_FILTERS[category] ?? [];
    for (const spec of catFilters) {
      if (spec.options.includes(urlFilter)) {
        setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, [spec.key]: urlFilter } }));
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilter, loading, allLoaded.length]);

  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try { await fetchPage(cursor); }
    finally { setLoadingMore(false); }
  }

  // ── Filtered products ──────────────────────────────────────────────────────
  const filtered = useMemo(() => applyFilters(allLoaded, filters), [allLoaded, filters]);
  const active   = hasActiveFilters(filters);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-[#0c1a35] px-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white mb-1">{category}</h1>
        {!loading && (
          <p className="text-sm text-white/60">
            {filtered.length} מוצרים
            {allLoaded.length > filtered.length ? ` (מתוך ${allLoaded.length} שנטענו)` : ''}
          </p>
        )}
      </div>

      {/* ── Mobile filter button ── */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:border-[#0c1a35] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6M12 16h0" />
          </svg>
          סינון
          {active && <span className="w-2 h-2 rounded-full bg-[#b8972a]" />}
        </button>
        {!loading && <span className="text-xs text-gray-400">{filtered.length} תוצאות</span>}
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800">סינון</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              products={allLoaded}
              category={category}
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="mt-4 w-full py-3 bg-[#0c1a35] text-white rounded-full font-bold text-sm"
            >
              הצג {filtered.length} תוצאות
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-4">
          {!loading && (
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              products={allLoaded}
              category={category}
            />
          )}
        </aside>

        {/* ── Products area ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-500 text-lg mb-6">
                {active ? 'לא נמצאו מוצרים עם הסינון שנבחר' : 'אין מוצרים בקטגוריה זו כרגע'}
              </p>
              {active && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="px-6 py-2.5 bg-[#0c1a35] text-white rounded-full font-bold text-sm hover:bg-[#1a3060] transition-colors"
                >
                  נקה סינון
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-10 py-3 rounded-full font-bold text-sm border-2 border-[#0c1a35] text-[#0c1a35] hover:bg-[#0c1a35] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        טוען...
                      </span>
                    ) : 'טען עוד מוצרים'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
