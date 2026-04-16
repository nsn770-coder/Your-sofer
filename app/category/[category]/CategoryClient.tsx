'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  collection, query, where, orderBy, limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortBy = 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';

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
  was?: number | null;
  filterAttributes?: Record<string, string>;
  stars?: number;
  status?: string;
  days?: string;
  sofer?: string;
  vendor?: string;
  createdAt?: { seconds: number };
  hidden?: boolean;
  cat?: string;
}

interface FilterState {
  minPrice: string;
  maxPrice: string;
  minRating: number;       // 0 | 3 | 4
  freeShipping: boolean;
  attrFilters: Record<string, string>;  // from filterAttributes field
  nameFilters: Record<string, string>;  // category-specific, match against product.name
  sizeMin: number;         // cm — 0 means no lower bound
  sizeMax: number;         // cm — 100 means no upper bound
}

const EMPTY_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  freeShipping: false,
  attrFilters: {},
  nameFilters: {},
  sizeMin: 0,
  sizeMax: 100,
};

const PAGE_SIZE = 12;

// Attribute keys to surface from filterAttributes field (shown only when data exists)
const ATTR_KEYS = ['חומר', 'כתב', 'כשרות', 'נוסח', 'צבע']; // 'גודל' handled by SizeRangeSlider

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
      options: ['אלומיניום', 'עץ', 'כסף', 'פלסטיק', 'מתכת', 'זכוכית', 'קרמיקה', 'פולימר', 'בטון וסמנט', 'שיש'],
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
    f.sizeMin > 0 ||
    f.sizeMax < 100 ||
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
    // Size range filter — parse numeric cm value from filterAttributes.גודל (e.g. "10 ס\"מ" → 10)
    if (f.sizeMin > 0 || f.sizeMax < 100) {
      const sizeStr = p.filterAttributes?.['גודל'] ?? '';
      const sizeNum = parseInt(sizeStr, 10);
      if (!isNaN(sizeNum)) {
        if (sizeNum < f.sizeMin || sizeNum > f.sizeMax) return false;
      }
    }
    for (const key of ATTR_KEYS) {
      const chosen = f.attrFilters[key];
      if (chosen && chosen !== 'הכל' && p.filterAttributes?.[key] !== chosen) return false;
    }
    for (const [, val] of Object.entries(f.nameFilters)) {
      if (val && val !== 'הכל' && !p.name.includes(val)) return false;
    }
    return true;
  });
}

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

// ─── Category scroll bar ─────────────────────────────────────────────────────

const CAT_SCROLL_ITEMS: { label: string; href?: string; imgKey?: string }[] = [
  { label: 'מזוזות' },
  { label: 'קלפי מזוזה' },
  { label: 'קלפי תפילין' },
  { label: 'תפילין קומפלט' },
  { label: 'כיסוי תפילין' },
  { label: 'סט טלית תפילין' },
  { label: 'יודאיקה' },
  { label: 'בר מצווה' },
  { label: 'מתנות' },
  { label: 'מגילות' },
  { label: 'כלי שולחן והגשה' },
  { label: 'עיצוב הבית' },
  { label: 'שבת וחגים', href: `/category/${encodeURIComponent('כלי שולחן והגשה')}?filter=${encodeURIComponent('שבת')}`, imgKey: 'כלי שולחן והגשה' },
];

function CategoryScrollBar({
  catImages,
  currentCategory,
}: {
  catImages: Record<string, string>;
  currentCategory: string;
}) {
  return (
    <div
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        overflowY: 'visible',
        padding: '4px 4px 8px',
        direction: 'rtl',
      }}
    >
      {CAT_SCROLL_ITEMS.map(({ label, href, imgKey }) => {
        const img  = catImages[imgKey ?? label] ?? '';
        const dest = href ?? `/category/${encodeURIComponent(label)}`;
        const isActive = label === currentCategory ||
          (label === 'שבת וחגים' && currentCategory === 'כלי שולחן והגשה');
        return (
          <Link
            key={label}
            href={dest}
            style={{
              flexShrink: 0,
              width: 88,
              height: 114,
              borderRadius: 10,
              overflow: 'hidden',
              position: 'relative',
              display: 'block',
              textDecoration: 'none',
              background: img ? '#000' : 'linear-gradient(to bottom right, #92400e, #b45309)',
              boxShadow: isActive
                ? '0 0 0 2.5px #f59e0b, 0 2px 8px rgba(0,0,0,0.18)'
                : '0 2px 8px rgba(0,0,0,0.13)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {img && (
              <img
                src={img}
                alt={label}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* Dark gradient overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
            }} />
            {/* Label */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0, left: 0,
              padding: '8px 4px 6px', textAlign: 'center',
            }}>
              <span style={{
                color: '#fff', fontSize: 10, fontWeight: 800,
                lineHeight: 1.3, display: 'block',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}>
                {label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── SizeRangeSlider ──────────────────────────────────────────────────────────

function SizeRangeSlider({
  sizeMin, sizeMax, onChange,
}: {
  sizeMin: number; sizeMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const MIN = 0, MAX = 100;
  const isActive = sizeMin > MIN || sizeMax < MAX;
  const leftPct  = (sizeMin / MAX) * 100;
  const rightPct = (sizeMax / MAX) * 100;

  return (
    <>
      {/* Inject thumb styles once */}
      <style dangerouslySetInnerHTML={{ __html: `
        .size-range { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; margin:0; }
        .size-range::-webkit-slider-thumb { appearance:none; width:18px; height:18px; }
        .size-range::-moz-range-thumb { width:18px; height:18px; border:none; background:transparent; }
      `}} />

      {/* Label row */}
      <div className="flex justify-between items-center mb-2" dir="rtl">
        <span className="text-xs font-semibold text-[#0c1a35]">
          {isActive ? `${sizeMin} ס״מ — ${sizeMax} ס״מ` : 'כל הגדלים'}
        </span>
        {isActive && (
          <button
            onClick={() => onChange(MIN, MAX)}
            className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
          >
            איפוס
          </button>
        )}
      </div>

      {/* Slider track */}
      <div className="relative h-6 flex items-center mx-1" style={{ direction: 'ltr' }}>
        {/* Full track */}
        <div className="absolute w-full h-1.5 rounded-full bg-gray-200" />
        {/* Active range */}
        <div
          className="absolute h-1.5 rounded-full pointer-events-none"
          style={{ background: '#b45309', left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        {/* Invisible range inputs — handle pointer events */}
        <input
          type="range" min={MIN} max={MAX} step={1} value={sizeMin}
          onChange={e => onChange(Math.min(Number(e.target.value), sizeMax - 1), sizeMax)}
          className="size-range"
          style={{ zIndex: sizeMin > MAX - 10 ? 5 : 3 }}
        />
        <input
          type="range" min={MIN} max={MAX} step={1} value={sizeMax}
          onChange={e => onChange(sizeMin, Math.max(Number(e.target.value), sizeMin + 1))}
          className="size-range"
          style={{ zIndex: 4 }}
        />
        {/* Visual thumbs */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
          style={{ background: '#b45309', left: `calc(${leftPct}% - 8px)`, zIndex: 6, top: '50%', transform: 'translateY(-50%)' }}
        />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none"
          style={{ background: '#b45309', left: `calc(${rightPct}% - 8px)`, zIndex: 6, top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-[9px] text-gray-400 mt-1 mx-1" style={{ direction: 'ltr' }}>
        {[0, 25, 50, 75, 100].map(v => <span key={v}>{v}</span>)}
      </div>
    </>
  );
}

// ─── FilterSidebar ────────────────────────────────────────────────────────────

interface SidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  products: Product[];
  category: string;
  catFilter?: string;
  onCatFilter?: (v: string) => void;
}

function FilterSidebar({ filters, onChange, products, category, catFilter, onCatFilter }: SidebarProps) {
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

      {/* ── Category filter (מתנות page only) ── */}
      {category === 'מתנות' && onCatFilter && (
        <Section title="קטגוריה">
          {([
            { value: 'הכל',              label: 'הכל' },
            { value: 'מתנות',            label: 'מתנות לחתן ובר מצוה' },
            { value: 'כלי שולחן והגשה', label: 'כלי שולחן והגשה' },
            { value: 'עיצוב הבית',       label: 'עיצוב הבית' },
            { value: 'יודאיקה',          label: 'יודאיקה' },
          ] as { value: string; label: string }[]).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 py-0.5 cursor-pointer group">
              <input
                type="radio"
                name="cat-filter"
                checked={(catFilter ?? 'הכל') === value}
                onChange={() => onCatFilter(value)}
                className="accent-[#0c1a35]"
              />
              <span className={`text-xs ${(catFilter ?? 'הכל') === value ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>
                {label}
              </span>
            </label>
          ))}
        </Section>
      )}

      {/* ── Size range slider (shown when any product has filterAttributes.גודל) ── */}
      {products.some(p => p.filterAttributes?.['גודל']) && (
        <Section title="גודל (ס״מ)">
          <SizeRangeSlider
            sizeMin={filters.sizeMin}
            sizeMax={filters.sizeMax}
            onChange={(min, max) => onChange({ ...filters, sizeMin: min, sizeMax: max })}
          />
        </Section>
      )}

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

  const [allLoaded, setAllLoaded] = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState<FilterState>(EMPTY_FILTERS);
  const [sortBy, setSortBy]       = useState<SortBy>('popular');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [catFilter, setCatFilter]   = useState('הכל');
  const [catImages, setCatImages]   = useState<Record<string, string>>({});

  // ── Fetch ALL products for this category at once ───────────────────────────
  // Client-side pagination is used so filters always apply across the full set.
  //
  // Some pages (יודאיקה sub-pages) don't have their own `cat` value — products
  // keep cat:"יודאיקה" and store the subcategory in `subCategory`.
  // "חגים" is a virtual group covering subCategory חנוכה + פסח.

  // Categories stored as subCategory (products keep cat:"יודאיקה")
  const SUBCATEGORY_PAGES = [
    'נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי',
  ];
  // Virtual group pages: map category → subCategory values to fetch
  const SUBCATEGORY_GROUPS: Record<string, string[]> = {
    'חגים':        ['חנוכה', 'פסח'],
    'חגים ומועדים': ['חנוכה', 'פסח'],  // legacy slug alias
  };

  async function fetchAll() {
    // ── מתנות: merge products from 4 categories in parallel ──────────────────
    if (category === 'מתנות') {
      const MATANOT_CATS = ['מתנות', 'כלי שולחן והגשה', 'עיצוב הבית', 'יודאיקה'];
      const snaps = await Promise.all(
        MATANOT_CATS.map(cat =>
          getDocs(query(collection(db, 'products'), where('cat', '==', cat), orderBy('priority', 'desc'), limit(500)))
        )
      );
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const snap of snaps) {
        for (const d of snap.docs) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            merged.push({ id: d.id, ...d.data() } as Product);
          }
        }
      }
      setAllLoaded(merged.filter(p => p.hidden !== true));
      return;
    }

    let snap;
    if (SUBCATEGORY_GROUPS[category]) {
      // e.g. /category/חגים → fetch subCategory in ['חנוכה','פסח']
      snap = await getDocs(
        query(
          collection(db, 'products'),
          where('subCategory', 'in', SUBCATEGORY_GROUPS[category]),
          limit(500),
        ),
      );
    } else if (SUBCATEGORY_PAGES.includes(category)) {
      // e.g. /category/חנוכה → fetch subCategory == 'חנוכה'
      snap = await getDocs(
        query(
          collection(db, 'products'),
          where('subCategory', '==', category),
          limit(500),
        ),
      );
    } else {
      // Default: query by cat field
      // Note: adding where('hidden', '!=', true) here requires a composite Firestore index:
      //   hidden ASC + priority DESC — create in Firebase Console if needed.
      //   Filtering client-side instead to avoid index requirement and support legacy docs
      //   (existing products without the hidden field should remain visible).
      // Large categories (כלי שולחן והגשה ~1887, עיצוב הבית) need a higher cap.
      const LARGE_CATS = new Set(['כלי שולחן והגשה', 'עיצוב הבית']);
      const fetchLimit = LARGE_CATS.has(category) ? 2000 : 1000;
      snap = await getDocs(
        query(
          collection(db, 'products'),
          where('cat', '==', category),
          orderBy('priority', 'desc'),
          limit(fetchLimit),
        ),
      );
    }
    // Filter out hidden products client-side (handles docs without the hidden field correctly)
    setAllLoaded(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.hidden !== true));
  }

  useEffect(() => {
    setAllLoaded([]);
    setLoading(true);
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
    setCatFilter('הכל');
    fetchAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Fetch category images for the scroll bar (once per mount)
  useEffect(() => {
    async function fetchCatImages() {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        if (!snap.empty) {
          const map: Record<string, string> = {};
          snap.forEach(d => {
            const r = d.data();
            const key = (r.slug || r.name || '') as string;
            const img = (r.imageUrl || r.imgUrl || '') as string;
            if (key) map[key] = img;
          });
          setCatImages(map);
        }
      } catch { /* ignore — scroll bar shows amber gradient fallback */ }
    }
    fetchCatImages();
  }, []);

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

    // 3. Fallback: apply as a name-contains filter (catches ?filter=מגש, ?filter=פמוט, etc.)
    setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, _url: urlFilter } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilter, loading, allLoaded.length]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ── Filtered + paginated products ─────────────────────────────────────────
  const filtered   = useMemo(() => {
    let result = applyFilters(allLoaded, filters);
    if (category === 'מתנות' && catFilter !== 'הכל') {
      result = result.filter(p => p.cat === catFilter);
    }
    return applySort(result, sortBy);
  }, [allLoaded, filters, sortBy, catFilter, category]);
  const active     = hasActiveFilters(filters);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb bar ── */}
      <div className="bg-white px-4 py-2 flex items-center gap-2 text-sm text-gray-500" dir="rtl">
        <Link href="/" className="hover:text-gray-800 flex items-center gap-1">
          ← דף הבית
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{category}</span>
      </div>

      {/* ── Header ── */}
      <div className="bg-[#0c1a35] px-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white mb-1">{category === 'מתנות' ? 'מתנות ומוצרי בית' : category}</h1>
        {!loading && (
          <p className="text-sm text-white/60">{filtered.length} מוצרים</p>
        )}
      </div>

      {/* ── Subcategory banner — shown only on מתנות page ── */}
      {category === 'מתנות' && (
        <div className="bg-white border-b border-gray-100 px-4 py-5" dir="rtl">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-right">קטגוריות בתוך מתנות</p>
            <div className="flex gap-3 justify-end">
              <Link href="/category/כלי שולחן והגשה" className="group flex items-center gap-3 bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-300 rounded-xl px-5 py-3 transition-all duration-200">
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-sm group-hover:text-amber-800">כלי שולחן והגשה 🍽️</p>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">לצפייה ←</p>
                </div>
              </Link>
              <Link href="/category/עיצוב הבית" className="group flex items-center gap-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-300 rounded-xl px-5 py-3 transition-all duration-200">
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-sm group-hover:text-blue-800">עיצוב הבית 🏠</p>
                  <p className="text-xs text-blue-700 font-medium mt-0.5">לצפייה ←</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar: filter + sort (mobile = sticky, shown below header; desktop = hidden here, shown above products) ── */}
      <div className="lg:hidden sticky top-0 z-20 bg-[#0c1a35] px-3 py-2 flex items-center gap-2 shadow-md">
        {/* Filter button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm flex-shrink-0 transition-colors"
          style={{ background: active ? '#b8972a' : 'rgba(255,255,255,0.12)', color: '#fff', border: active ? '1.5px solid #b8972a' : '1.5px solid rgba(255,255,255,0.25)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
          </svg>
          סינון ☰
          {active && <span className="w-2 h-2 rounded-full bg-white" />}
        </button>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="flex-1 rounded-full text-sm font-semibold px-3 py-2 focus:outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', direction: 'rtl' }}
        >
          <option value="popular"    style={{ color: '#000', background: '#fff' }}>הכי נמכר</option>
          <option value="newest"     style={{ color: '#000', background: '#fff' }}>חדש לישן</option>
          <option value="oldest"     style={{ color: '#000', background: '#fff' }}>ישן לחדש</option>
          <option value="price_asc"  style={{ color: '#000', background: '#fff' }}>מחיר: נמוך לגבוה</option>
          <option value="price_desc" style={{ color: '#000', background: '#fff' }}>מחיר: גבוה לנמוך</option>
        </select>

        {!loading && <span className="text-xs text-white/60 flex-shrink-0">{filtered.length}</span>}
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 pb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800">סינון</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterSidebar filters={filters} onChange={setFilters} products={allLoaded} category={category} catFilter={catFilter} onCatFilter={setCatFilter} />
            <button onClick={() => setDrawerOpen(false)} className="mt-4 w-full py-3 bg-[#0c1a35] text-white rounded-full font-bold text-sm">
              הצג {filtered.length} תוצאות
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">

        {/* ── Desktop sidebar — always visible, no loading gate ── */}
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-4">
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            products={allLoaded}
            category={category}
            catFilter={catFilter}
            onCatFilter={setCatFilter}
          />
        </aside>

        {/* ── Products area ── */}
        <div className="flex-1 min-w-0">

          {/* Desktop filter+sort bar (hidden on mobile — mobile toolbar above handles it) */}
          <div className="hidden lg:block mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ direction: 'rtl' }}>

              {/* Result count */}
              <span className="text-sm text-gray-500 flex-shrink-0 ml-1">
                {loading ? 'טוען...' : `${filtered.length} מוצרים`}
              </span>

              {/* Category-specific name filters */}
              {(CAT_NAME_FILTERS[category] ?? []).map(spec => {
                const current = filters.nameFilters[spec.key] ?? 'הכל';
                return (
                  <select
                    key={`toolbar-name-${spec.key}`}
                    value={current}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      nameFilters: { ...prev.nameFilters, [spec.key]: e.target.value },
                    }))}
                    className="flex-shrink-0 border rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer focus:outline-none transition-colors"
                    style={{
                      direction: 'rtl',
                      borderColor: current && current !== 'הכל' ? '#0c1a35' : '#e5e7eb',
                      color:       current && current !== 'הכל' ? '#0c1a35' : '#374151',
                      background: '#fff',
                    }}
                  >
                    <option value="הכל">{spec.label}: הכל</option>
                    {spec.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                );
              })}

              {/* Rating filter */}
              <select
                value={filters.minRating}
                onChange={e => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                className="flex-shrink-0 border rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer focus:outline-none transition-colors"
                style={{
                  direction: 'rtl',
                  borderColor: filters.minRating > 0 ? '#0c1a35' : '#e5e7eb',
                  color:       filters.minRating > 0 ? '#0c1a35' : '#374151',
                  background: '#fff',
                }}
              >
                <option value={0}>דירוג: הכל</option>
                <option value={3}>3 ★ ומעלה</option>
                <option value={4}>4 ★ ומעלה</option>
              </select>

              {/* Dynamic attribute filters (only keys with actual data) */}
              {ATTR_KEYS.map(key => {
                const seen = new Set<string>();
                for (const p of allLoaded) { const v = p.filterAttributes?.[key]; if (v) seen.add(v); }
                const vals = Array.from(seen).sort((a, b) => a.localeCompare(b, 'he'));
                if (vals.length === 0) return null;
                const current = filters.attrFilters[key] ?? 'הכל';
                return (
                  <select
                    key={`toolbar-attr-${key}`}
                    value={current}
                    onChange={e => setFilters(prev => ({
                      ...prev,
                      attrFilters: { ...prev.attrFilters, [key]: e.target.value },
                    }))}
                    className="flex-shrink-0 border rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer focus:outline-none transition-colors"
                    style={{
                      direction: 'rtl',
                      borderColor: current && current !== 'הכל' ? '#0c1a35' : '#e5e7eb',
                      color:       current && current !== 'הכל' ? '#0c1a35' : '#374151',
                      background: '#fff',
                    }}
                  >
                    <option value="הכל">{key}: הכל</option>
                    {vals.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                );
              })}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Clear all — only when filters are active */}
              {active && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-semibold px-2 transition-colors"
                >
                  נקה הכל ✕
                </button>
              )}

              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="flex-shrink-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white cursor-pointer focus:outline-none focus:border-[#0c1a35]"
                style={{ direction: 'rtl' }}
              >
                <option value="popular">הכי נמכר</option>
                <option value="newest">חדש לישן</option>
                <option value="oldest">ישן לחדש</option>
                <option value="price_asc">מחיר: נמוך לגבוה</option>
                <option value="price_desc">מחיר: גבוה לנמוך</option>
              </select>

            </div>
          </div>

          {/* ── Category scroll bar — above products ── */}
          <div className="mb-4">
            <CategoryScrollBar catImages={catImages} currentCategory={category} />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-0">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-0">
                {paginated.map(p => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                    priority={p.priority}
                    isBestSeller={p.isBestSeller}
                    badge={p.badge}
                    was={p.was}
                    createdAt={p.createdAt}
                  />
                ))}
              </div>

              {/* ── Category scroll bar — below products ── */}
              <div className="mt-8 mb-2">
                <CategoryScrollBar catImages={catImages} currentCategory={category} />
              </div>

              {/* ── Page navigation ── */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:border-[#0c1a35] hover:text-[#0c1a35] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    הקודם
                  </button>

                  {(() => {
                    const pages: (number | '...')[] = [];
                    const add = (p: number) => { if (!pages.includes(p)) pages.push(p); };
                    // Always show first 2
                    for (let p = 1; p <= Math.min(2, totalPages); p++) add(p);
                    // Window around current page
                    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) add(p);
                    // Always show last 2
                    for (let p = Math.max(1, totalPages - 1); p <= totalPages; p++) add(p);
                    // Sort and insert ellipses
                    const sorted = (pages.filter(p => p !== '...') as number[]).sort((a, b) => a - b);
                    const withDots: (number | '...')[] = [];
                    sorted.forEach((p, i) => {
                      if (i > 0 && p - sorted[i - 1] > 1) withDots.push('...');
                      withDots.push(p);
                    });
                    return withDots.map((p, i) =>
                      p === '...'
                        ? <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none">…</span>
                        : <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${
                              currentPage === p
                                ? 'bg-[#0c1a35] text-white'
                                : 'border border-gray-200 text-gray-600 hover:border-[#0c1a35] hover:text-[#0c1a35]'
                            }`}
                          >{p}</button>
                    );
                  })()}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:border-[#0c1a35] hover:text-[#0c1a35] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    הבא
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
