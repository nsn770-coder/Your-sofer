'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  collection, query, where, orderBy, limit,
  getDocs, documentId,
} from 'firebase/firestore';
import { db } from '../../firebase';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import SoferProductCard, { type SoferData } from '@/components/ui/SoferProductCard';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

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
  soferId?: string;
  soferName?: string;
  vendor?: string;
  createdAt?: { seconds: number };
  hidden?: boolean;
  cat?: string;
  subCategory?: string;
  nusach?: string;
  level?: string;
}

interface FilterState {
  minPrice: string;
  maxPrice: string;
  level: string;
  nusachFilter: string;
  minRating: number;
  freeShipping: boolean;
  attrFilters: Record<string, string>;
  nameFilters: Record<string, string>;
  sizeMin: number;
  sizeMax: number;
}

const EMPTY_FILTERS: FilterState = {
  minPrice: '',
  maxPrice: '',
  level: '',
  nusachFilter: '',
  minRating: 0,
  freeShipping: false,
  attrFilters: {},
  nameFilters: {},
  sizeMin: 0,
  sizeMax: 100,
};

const PAGE_SIZE = 16;
const ATTR_KEYS = ['חומר', 'כתב', 'כשרות', 'נוסח', 'צבע'];

// ─── Category-specific name-based filters ────────────────────────────────────

interface NameFilterSpec {
  key: string;
  label: string;
  options: string[];
}

const CAT_NAME_FILTERS: Record<string, NameFilterSpec[]> = {
  'מזוזות': [
    { key: 'חומר', label: 'חומר', options: ['אלומיניום', 'עץ', 'כסף', 'פלסטיק', 'מתכת', 'זכוכית', 'קרמיקה', 'פולימר', 'בטון וסמנט', 'שיש'] },
    { key: 'גודל', label: 'גודל', options: ['7 ס"מ', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ', '25 ס"מ', '30 ס"מ'] },
    { key: 'צבע',  label: 'צבע',  options: ['לבן', 'כסף', 'זהב', 'שחור', 'חום', 'צבעוני'] },
  ],
  'קלפי מזוזה': [
    { key: 'גודל',   label: 'גודל',   options: ['7 ס"מ', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ', '25 ס"מ', '30 ס"מ'] },
    { key: 'כתב',    label: 'כתב',    options: ['אשכנז', 'ספרד', 'חב"ד', 'תימני', 'פרדי'] },
    { key: 'כשרות',  label: 'כשרות',  options: ['מהודר', 'מהדרין', 'פשוט'] },
  ],
  'כיסוי תפילין': [
    { key: 'חומר', label: 'חומר', options: ['עור', 'דמוי עור', 'קטיפה', 'בד', 'פיו', 'פשתן', 'משי'] },
    { key: 'צבע',  label: 'צבע',  options: ['לבן', 'כסף', 'זהב', 'שחור', 'חום', 'צבעוני'] },
  ],
  'בר מצווה': [
    { key: 'סוג סט',     label: 'סוג סט',     options: ['עם תפילין', 'עם טלית', 'קומפלט'] },
    { key: 'רמת הידור',  label: 'רמת הידור',  options: ['רגיל', 'מהודר', 'מהדרין'] },
  ],
  'סט טלית תפילין': [
    { key: 'נוסח',       label: 'נוסח',       options: ['אשכנז', 'ספרד', 'ספרדי', 'חב"ד', 'תימני'] },
    { key: 'גודל טלית',  label: 'גודל טלית',  options: ['36x29', '45x36', '55x40'] },
    { key: 'רמת הידור',  label: 'רמת הידור',  options: ['רגיל', 'מהודר', 'מהדרין'] },
  ],
  'יודאיקה': [
    { key: 'חומר', label: 'חומר', options: ['מתכת', 'עץ', 'זכוכית', 'קרמיקה', 'כסף'] },
    { key: 'צבע',  label: 'צבע',  options: ['זהב', 'כסף', 'לבן', 'צבעוני'] },
  ],
  'מתנות': [
    { key: 'חומר', label: 'חומר', options: ['מתכת', 'עץ', 'זכוכית', 'קרמיקה', 'כסף'] },
    { key: 'צבע',  label: 'צבע',  options: ['זהב', 'כסף', 'לבן', 'צבעוני'] },
  ],
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconHome({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconChevronLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconFilter({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function IconSort({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="9" y2="18" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSearch({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconStar({ size = 12, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#b8972a' : 'none'} stroke="#b8972a" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconTag({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function IconTruck({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasActiveFilters(f: FilterState) {
  return (
    f.minPrice !== '' || f.maxPrice !== '' || f.level !== '' || f.nusachFilter !== '' ||
    f.minRating > 0 || f.freeShipping ||
    f.sizeMin > 0 || f.sizeMax < 100 ||
    Object.values(f.attrFilters).some(v => v && v !== 'הכל') ||
    Object.values(f.nameFilters).some(v => v && v !== 'הכל')
  );
}

function applyFilters(products: Product[], f: FilterState): Product[] {
  return products.filter(p => {
    if (f.minPrice !== '' && p.price < Number(f.minPrice)) return false;
    if (f.maxPrice !== '' && p.price > Number(f.maxPrice)) return false;
    if (f.level) {
      // Normalise URL param: 'מהודר-בתכלית' → 'מהודר בתכלית'
      const wantedLevel = f.level === 'מהודר-בתכלית' ? 'מהודר בתכלית' : f.level;
      if (p.level && p.level !== '') {
        // Product has a level field — use exact match
        if (p.level !== wantedLevel) return false;
      } else {
        // Fallback: name-keyword matching for products without level field
        const name = p.name;
        if (wantedLevel === 'פשוט') {
          if (!['פשוט', 'כשרות לכתחילה', 'כשרות טובה', 'לכתחילה'].some(kw => name.includes(kw))) return false;
        } else if (wantedLevel === 'מהודר') {
          if (!(name.includes('מהודר') || name.includes('מהודרת')) || name.includes('בתכלית')) return false;
        } else if (wantedLevel === 'מהודר בתכלית') {
          if (!['מהודר בתכלית', 'מהודרת בתכלית', 'הידור בתכלית'].some(kw => name.includes(kw))) return false;
        }
      }
    }
    if (f.nusachFilter) {
      const sfarad = f.nusachFilter === 'ספרדי';
      const keywords = sfarad ? ['ספרד', 'ספרדי'] : ['אשכנז', 'אשכנזי'];
      // Check product.nusach field first, then name keywords, then filterAttributes
      const matches =
        (p.nusach != null && p.nusach !== '' && keywords.some(kw => p.nusach!.includes(kw))) ||
        keywords.some(kw => p.name.includes(kw)) ||
        (p.filterAttributes?.['נוסח'] != null && keywords.some(kw => p.filterAttributes!['נוסח'].includes(kw)));
      if (!matches) return false;
    }
    if (f.minRating > 0 && (p.stars ?? 0) < f.minRating) return false;
    if (f.freeShipping && p.days && !p.days.toLowerCase().includes('חינם')) return false;
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
      <div className="aspect-square bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-3/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        <div className="h-8 bg-gray-100 rounded-full mt-3" />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        {title}
      </h3>
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

function CategoryScrollBar({ catImages, currentCategory }: { catImages: Record<string, string>; currentCategory: string }) {
  return (
    <div
      className="hide-scrollbar"
      style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'visible', padding: '4px 4px 8px', direction: 'rtl' }}
    >
      {CAT_SCROLL_ITEMS.map(({ label, href, imgKey }) => {
        const img = catImages[imgKey ?? label] ?? '';
        const dest = href ?? `/category/${encodeURIComponent(label)}`;
        const isActive = label === currentCategory || (label === 'שבת וחגים' && currentCategory === 'כלי שולחן והגשה');
        return (
          <Link
            key={label}
            href={dest}
            style={{
              flexShrink: 0, width: 88, height: 114, borderRadius: 12, overflow: 'hidden',
              position: 'relative', display: 'block', textDecoration: 'none',
              background: img ? '#000' : 'linear-gradient(135deg, #0c1a35, #1a3060)',
              boxShadow: isActive ? '0 0 0 2.5px #b8972a, 0 4px 12px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          >
            {img && <img src={optimizeCloudinaryUrl(img, 100)} alt={label} width={88} height={114} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }} />
            {isActive && (
              <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#b8972a', boxShadow: '0 0 0 2px rgba(255,255,255,0.6)' }} />
            )}
            <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '8px 4px 7px', textAlign: 'center' }}>
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: 1.3, display: 'block', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
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

function SizeRangeSlider({ sizeMin, sizeMax, onChange }: { sizeMin: number; sizeMax: number; onChange: (min: number, max: number) => void }) {
  const MIN = 0, MAX = 100;
  const isActive = sizeMin > MIN || sizeMax < MAX;
  const leftPct  = (sizeMin / MAX) * 100;
  const rightPct = (sizeMax / MAX) * 100;
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.size-range{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0}.size-range::-webkit-slider-thumb{appearance:none;width:18px;height:18px}.size-range::-moz-range-thumb{width:18px;height:18px;border:none;background:transparent}` }} />
      <div className="flex justify-between items-center mb-2" dir="rtl">
        <span className="text-xs font-semibold text-[#0c1a35]">{isActive ? `${sizeMin} ס״מ — ${sizeMax} ס״מ` : 'כל הגדלים'}</span>
        {isActive && <button onClick={() => onChange(MIN, MAX)} className="text-[10px] text-red-400 hover:text-red-600">איפוס</button>}
      </div>
      <div className="relative h-6 flex items-center mx-1" style={{ direction: 'ltr' }}>
        <div className="absolute w-full h-1.5 rounded-full bg-gray-200" />
        <div className="absolute h-1.5 rounded-full pointer-events-none" style={{ background: '#0c1a35', left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
        <input type="range" min={MIN} max={MAX} step={1} value={sizeMin} onChange={e => onChange(Math.min(Number(e.target.value), sizeMax - 1), sizeMax)} className="size-range" style={{ zIndex: sizeMin > MAX - 10 ? 5 : 3 }} />
        <input type="range" min={MIN} max={MAX} step={1} value={sizeMax} onChange={e => onChange(sizeMin, Math.max(Number(e.target.value), sizeMin + 1))} className="size-range" style={{ zIndex: 4 }} />
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none" style={{ background: '#0c1a35', left: `calc(${leftPct}% - 8px)`, zIndex: 6, top: '50%', transform: 'translateY(-50%)' }} />
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow pointer-events-none" style={{ background: '#0c1a35', left: `calc(${rightPct}% - 8px)`, zIndex: 6, top: '50%', transform: 'translateY(-50%)' }} />
      </div>
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
  subCategoryFilter?: string;
  onSubCategoryFilter?: (v: string) => void;
  availableSubCategories?: string[];
}

function FilterSidebar({ filters, onChange, products, category, catFilter, onCatFilter, subCategoryFilter, onSubCategoryFilter, availableSubCategories }: SidebarProps) {
  function set(partial: Partial<FilterState>) { onChange({ ...filters, ...partial }); }
  function setAttr(key: string, val: string) { onChange({ ...filters, attrFilters: { ...filters.attrFilters, [key]: val } }); }
  function setNameFilter(key: string, val: string) { onChange({ ...filters, nameFilters: { ...filters.nameFilters, [key]: val } }); }

  const catNameFilters = CAT_NAME_FILTERS[category] ?? [];
  const attrOptions = useMemo(() =>
    ATTR_KEYS.reduce((acc, key) => {
      const seen = new Set<string>();
      for (const p of products) { const v = p.filterAttributes?.[key]; if (v) seen.add(v); }
      acc[key] = Array.from(seen).sort((a, b) => a.localeCompare(b, 'he'));
      return acc;
    }, {} as Record<string, string[]>),
    [products]
  );
  const active = hasActiveFilters(filters);

  return (
    <div dir="rtl" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0c1a35] flex items-center justify-center">
            <IconFilter size={14} />
          </div>
          <span className="font-bold text-gray-800 text-sm">סינון</span>
        </div>
        {active && (
          <button onClick={() => onChange(EMPTY_FILTERS)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg">
            <IconX size={10} />
            נקה הכל
          </button>
        )}
      </div>

      {/* Category filter (מתנות only) */}
      {category === 'מתנות' && onCatFilter && (
        <Section title="קטגוריה">
          {([{ value: 'הכל', label: 'הכל' }, { value: 'מתנות', label: 'מתנות לחתן ובר מצוה' }, { value: 'כלי שולחן והגשה', label: 'כלי שולחן והגשה' }, { value: 'עיצוב הבית', label: 'עיצוב הבית' }, { value: 'יודאיקה', label: 'יודאיקה' }] as { value: string; label: string }[]).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 py-1 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${(catFilter ?? 'הכל') === value ? 'border-[#0c1a35] bg-[#0c1a35]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                {(catFilter ?? 'הכל') === value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <input type="radio" name="cat-filter" checked={(catFilter ?? 'הכל') === value} onChange={() => onCatFilter(value)} className="sr-only" />
              <span className={`text-xs transition-colors ${(catFilter ?? 'הכל') === value ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>{label}</span>
            </label>
          ))}
        </Section>
      )}

      {/* SubCategory filter — shown when 2+ subCategories exist */}
      {onSubCategoryFilter && availableSubCategories && availableSubCategories.length >= 2 && (
        <Section title="תת-קטגוריה">
          <div className="flex flex-wrap gap-1.5">
            {['הכל', ...availableSubCategories].map(opt => (
              <button
                key={opt}
                onClick={() => onSubCategoryFilter(opt === 'הכל' ? '' : opt)}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all border ${
                  (subCategoryFilter || '') === (opt === 'הכל' ? '' : opt)
                    ? 'bg-[#0c1a35] text-white border-[#0c1a35]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Size range */}
      {products.some(p => p.filterAttributes?.['גודל']) && (
        <Section title="גודל (ס״מ)">
          <SizeRangeSlider sizeMin={filters.sizeMin} sizeMax={filters.sizeMax} onChange={(min, max) => onChange({ ...filters, sizeMin: min, sizeMax: max })} />
        </Section>
      )}

      {/* Price range */}
      <Section title="טווח מחיר">
        <div className="flex items-center gap-2">
          <input type="number" min={0} placeholder="מינ׳" value={filters.minPrice} onChange={e => set({ minPrice: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#0c1a35] focus:ring-1 focus:ring-[#0c1a35]/20 transition-all" />
          <span className="text-gray-300">—</span>
          <input type="number" min={0} placeholder="מקס׳" value={filters.maxPrice} onChange={e => set({ maxPrice: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:border-[#0c1a35] focus:ring-1 focus:ring-[#0c1a35]/20 transition-all" />
        </div>
      </Section>

      {/* Rating */}
      <Section title="דירוג לקוחות">
        {[{ label: 'הכל', value: 0 }, { label: '3 ★ ומעלה', value: 3 }, { label: '4 ★ ומעלה', value: 4 }].map(opt => (
          <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${filters.minRating === opt.value ? 'border-[#0c1a35] bg-[#0c1a35]' : 'border-gray-300 group-hover:border-gray-400'}`}>
              {filters.minRating === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <input type="radio" name="rating" checked={filters.minRating === opt.value} onChange={() => set({ minRating: opt.value })} className="sr-only" />
            <span className={`text-xs flex items-center gap-1 transition-colors ${filters.minRating === opt.value ? 'font-bold text-[#0c1a35]' : 'text-gray-600 group-hover:text-gray-900'}`}>
              {opt.value > 0 && <IconStar size={11} />}
              {opt.label}
            </span>
          </label>
        ))}
      </Section>

      {/* Shipping */}
      <Section title="משלוח">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            onClick={() => set({ freeShipping: !filters.freeShipping })}
            className={`w-9 h-5 rounded-full transition-all flex items-center cursor-pointer flex-shrink-0 ${filters.freeShipping ? 'bg-[#0c1a35]' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${filters.freeShipping ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className={`text-xs flex items-center gap-1 ${filters.freeShipping ? 'font-bold text-[#0c1a35]' : 'text-gray-600'}`}>
            <IconTruck size={12} />
            משלוח חינם
          </span>
        </label>
      </Section>

      {/* Category-specific name filters */}
      {catNameFilters.map(spec => {
        const current = filters.nameFilters[spec.key] ?? 'הכל';
        return (
          <Section key={`name-${spec.key}`} title={spec.label}>
            <div className="flex flex-wrap gap-1.5">
              {['הכל', ...spec.options].map(opt => (
                <button
                  key={opt}
                  onClick={() => setNameFilter(spec.key, opt)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all border ${
                    current === opt
                      ? 'bg-[#0c1a35] text-white border-[#0c1a35]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Section>
        );
      })}

      {/* Dynamic attribute filters */}
      {ATTR_KEYS.map(key => {
        const vals = attrOptions[key] ?? [];
        if (vals.length === 0) return null;
        const current = filters.attrFilters[key] ?? 'הכל';
        return (
          <Section key={key} title={key}>
            <div className="flex flex-wrap gap-1.5">
              {['הכל', ...vals].map(opt => (
                <button
                  key={opt}
                  onClick={() => setAttr(key, opt)}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all border ${
                    current === opt
                      ? 'bg-[#0c1a35] text-white border-[#0c1a35]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Section>
        );
      })}
    </div>
  );
}

// ─── Active filter pills (shown above product grid) ───────────────────────────

function ActiveFilterPills({ filters, onChange, subCategoryFilter, onSubCategoryFilter }: { filters: FilterState; onChange: (f: FilterState) => void; subCategoryFilter?: string; onSubCategoryFilter?: (v: string) => void }) {
  const pills: { label: string; onRemove: () => void }[] = [];

  if (subCategoryFilter && onSubCategoryFilter) {
    pills.push({ label: subCategoryFilter, onRemove: () => onSubCategoryFilter('') });
  }
  if (filters.minPrice || filters.maxPrice) {
    pills.push({
      label: `מחיר: ${filters.minPrice || '0'} — ${filters.maxPrice || '∞'} ₪`,
      onRemove: () => onChange({ ...filters, minPrice: '', maxPrice: '' }),
    });
  }
  if (filters.level) {
    const levelLabel = filters.level === 'מהודר-בתכלית' ? 'מהודר בתכלית' : filters.level;
    pills.push({ label: `רמה: ${levelLabel}`, onRemove: () => onChange({ ...filters, level: '' }) });
  }
  if (filters.nusachFilter) {
    pills.push({ label: `נוסח: ${filters.nusachFilter}`, onRemove: () => onChange({ ...filters, nusachFilter: '' }) });
  }
  if (filters.minRating > 0) {
    pills.push({ label: `${filters.minRating}★ ומעלה`, onRemove: () => onChange({ ...filters, minRating: 0 }) });
  }
  if (filters.freeShipping) {
    pills.push({ label: 'משלוח חינם', onRemove: () => onChange({ ...filters, freeShipping: false }) });
  }
  if (filters.sizeMin > 0 || filters.sizeMax < 100) {
    pills.push({
      label: `גודל: ${filters.sizeMin}–${filters.sizeMax} ס"מ`,
      onRemove: () => onChange({ ...filters, sizeMin: 0, sizeMax: 100 }),
    });
  }
  for (const [key, val] of Object.entries(filters.attrFilters)) {
    if (val && val !== 'הכל') {
      pills.push({ label: `${key}: ${val}`, onRemove: () => onChange({ ...filters, attrFilters: { ...filters.attrFilters, [key]: 'הכל' } }) });
    }
  }
  for (const [key, val] of Object.entries(filters.nameFilters)) {
    if (val && val !== 'הכל' && key !== '_url') {
      pills.push({ label: val, onRemove: () => onChange({ ...filters, nameFilters: { ...filters.nameFilters, [key]: 'הכל' } }) });
    }
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center" dir="rtl">
      <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
        <IconTag size={11} />
        פעיל:
      </span>
      {pills.map((pill, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 bg-[#0c1a35]/8 text-[#0c1a35] text-xs font-semibold px-3 py-1 rounded-full border border-[#0c1a35]/20">
          {pill.label}
          <button onClick={pill.onRemove} className="hover:text-red-500 transition-colors">
            <IconX size={10} />
          </button>
        </span>
      ))}
      <button onClick={() => onChange(EMPTY_FILTERS)} className="text-xs text-red-400 hover:text-red-600 font-semibold underline underline-offset-2 transition-colors">
        נקה הכל
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ active, onClear, relatedCats = [] }: { active: boolean; onClear: () => void; relatedCats?: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5 text-gray-300">
        <IconSearch size={40} />
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">
        {active ? 'לא נמצאו מוצרים' : 'אין מוצרים בקטגוריה זו'}
      </h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">
        {active
          ? 'נסה לשנות את הסינון או להרחיב את טווח החיפוש'
          : relatedCats.length > 0
            ? 'הקטגוריה אינה קיימת — נסה לחפש ב:'
            : 'הקטגוריה הזו תתמלא בקרוב. בינתיים — עיין בשאר הקטגוריות'}
      </p>
      {active ? (
        <button
          onClick={onClear}
          className="px-6 py-2.5 bg-[#0c1a35] text-white rounded-full font-bold text-sm hover:bg-[#1a3060] transition-colors"
        >
          נקה סינון
        </button>
      ) : relatedCats.length > 0 ? (
        <div className="flex flex-wrap gap-3 justify-center">
          {relatedCats.map(cat => (
            <Link
              key={cat}
              href={`/category/${encodeURIComponent(cat)}`}
              className="px-5 py-2.5 bg-[#0c1a35] text-white rounded-full text-sm font-bold hover:bg-[#1a3060] transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Pagination replaced by infinite scroll — see IntersectionObserver in main component

// ─── Main component ───────────────────────────────────────────────────────────

export default function CategoryClient({ category }: { category: string }) {
  const searchParams = useSearchParams();
  const urlFilter    = searchParams.get('filter') ?? null;
  const urlLevel     = searchParams.get('level')  ?? null;
  const urlNusach    = searchParams.get('nusach') ?? null;
  const urlSubcat    = searchParams.get('subcat') ?? null;

  const [allLoaded, setAllLoaded]               = useState<Product[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [filters, setFilters]                   = useState<FilterState>(EMPTY_FILTERS);
  const [sortBy, setSortBy]                     = useState<SortBy>('popular');
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const [currentPage, setCurrentPage]           = useState(1);
  const [catFilter, setCatFilter]               = useState('הכל');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [catImages, setCatImages]               = useState<Record<string, string>>({});
  const [soferMap, setSoferMap]                 = useState<Record<string, SoferData>>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  const SUBCATEGORY_PAGES = ['נטילת ידיים', 'שבת', 'חנוכה', 'פסח', 'סטים ומארזים', 'יודאיקה כללי'];
  const SUBCATEGORY_GROUPS: Record<string, string[]> = {
    'חגים': ['חנוכה', 'פסח'],
    'חגים ומועדים': ['חנוכה', 'פסח'],
  };

  // Case A: recognized ?filter= values that map to a direct subCategory query
  const SUBCAT_QUERY_OVERRIDES: Record<string, Record<string, string>> = {
    'יודאיקה': { 'נטילת ידיים': 'נטילת ידיים', 'נטלות': 'נטילת ידיים' },
  };

  // Case B: category slugs that don't exist as a cat field in Firestore
  const VIRTUAL_CATS: Record<string, { cats: string[]; subcatKeywords: string[] }> = {
    'שבתות וחגים':  { cats: ['יודאיקה', 'כלי שולחן והגשה'], subcatKeywords: ['שבת', 'חג', 'קידוש', 'חנוכה', 'פסח', 'הבדלה', 'נטילת ידיים'] },
    'שבתות-וחגים': { cats: ['יודאיקה', 'כלי שולחן והגשה'], subcatKeywords: ['שבת', 'חג', 'קידוש', 'חנוכה', 'פסח', 'הבדלה', 'נטילת ידיים'] },
  };

  // When this is non-null, fetchAll does a direct subCategory query and re-runs if
  // urlFilter changes away from the override (so the full category reloads cleanly).
  const subcatOverrideForFetch = SUBCAT_QUERY_OVERRIDES[category]?.[urlFilter ?? ''] ?? null;

  async function fetchAll() {
    // Case B: virtual category slug — no products have this as cat in Firestore
    const virtual = VIRTUAL_CATS[category];
    if (virtual) {
      const snaps = await Promise.all(
        virtual.cats.map(c =>
          getDocs(query(collection(db, 'products'), where('cat', '==', c), orderBy('priority', 'desc'), limit(1000)))
        )
      );
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const snap of snaps) {
        for (const d of snap.docs) {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            const p = { id: d.id, ...d.data() } as Product;
            const sub = (p.subCategory ?? '').toLowerCase();
            if (virtual.subcatKeywords.some(kw => sub.includes(kw.toLowerCase()))) {
              merged.push(p);
            }
          }
        }
      }
      setAllLoaded(merged.filter(p => p.hidden !== true));
      return;
    }

    // Case A: targeted subCategory query — skip loading the full category
    if (subcatOverrideForFetch) {
      const snap = await getDocs(
        query(collection(db, 'products'), where('subCategory', '==', subcatOverrideForFetch), limit(500))
      );
      setAllLoaded(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.hidden !== true));
      return;
    }

    if (category === 'מתנות') {
      const MATANOT_CATS = ['מתנות', 'כלי שולחן והגשה', 'עיצוב הבית', 'יודאיקה'];
      const snaps = await Promise.all(
        MATANOT_CATS.map(cat => getDocs(query(collection(db, 'products'), where('cat', '==', cat), orderBy('priority', 'desc'), limit(500))))
      );
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const snap of snaps) {
        for (const d of snap.docs) {
          if (!seen.has(d.id)) { seen.add(d.id); merged.push({ id: d.id, ...d.data() } as Product); }
        }
      }
      setAllLoaded(merged.filter(p => p.hidden !== true));
      return;
    }

    let snap;
    if (SUBCATEGORY_GROUPS[category]) {
      snap = await getDocs(query(collection(db, 'products'), where('subCategory', 'in', SUBCATEGORY_GROUPS[category]), limit(500)));
    } else if (SUBCATEGORY_PAGES.includes(category)) {
      snap = await getDocs(query(collection(db, 'products'), where('subCategory', '==', category), limit(500)));
    } else {
      const LARGE_CATS = new Set(['כלי שולחן והגשה', 'עיצוב הבית']);
      const fetchLimit = LARGE_CATS.has(category) ? 2000 : 1000;
      snap = await getDocs(query(collection(db, 'products'), where('cat', '==', category), orderBy('priority', 'desc'), limit(fetchLimit)));
    }
    setAllLoaded(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).filter(p => p.hidden !== true));
  }

  useEffect(() => {
    setAllLoaded([]); setLoading(true); setFilters(EMPTY_FILTERS); setSortBy('popular');
    setCurrentPage(1); setCatFilter('הכל'); setSubCategoryFilter('');
    fetchAll().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcatOverrideForFetch]);

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
      } catch { /* silent */ }
    }
    fetchCatImages();
  }, []);

  useEffect(() => {
    if (category !== 'קלפי מזוזה' || allLoaded.length === 0) return;
    const ids = [...new Set(allLoaded.map(p => p.soferId).filter(Boolean) as string[])];
    if (ids.length === 0) return;

    async function fetchSoferim() {
      const map: Record<string, SoferData> = {};
      for (let i = 0; i < ids.length; i += 10) {
        const chunk = ids.slice(i, i + 10);
        const snap = await getDocs(query(collection(db, 'soferim'), where(documentId(), 'in', chunk)));
        snap.forEach(d => { map[d.id] = d.data() as SoferData; });
      }
      setSoferMap(map);
    }
    fetchSoferim();
  }, [allLoaded, category]);

  useEffect(() => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  }, [urlFilter]);

  useEffect(() => {
    if (!urlFilter || loading || allLoaded.length === 0) return;
    // Check subCategory match first
    const subCatSet = new Set(allLoaded.map(p => p.subCategory).filter(Boolean) as string[]);
    if (subCatSet.has(urlFilter)) { setSubCategoryFilter(urlFilter); return; }
    for (const key of ATTR_KEYS) {
      const vals = new Set(allLoaded.map(p => p.filterAttributes?.[key]).filter(Boolean));
      if (vals.has(urlFilter)) { setFilters(prev => ({ ...prev, attrFilters: { ...prev.attrFilters, [key]: urlFilter } })); return; }
    }
    const catFilters = CAT_NAME_FILTERS[category] ?? [];
    for (const spec of catFilters) {
      if (spec.options.includes(urlFilter)) { setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, [spec.key]: urlFilter } })); return; }
    }
    setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, _url: urlFilter } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlFilter, loading, allLoaded.length]);

  // Apply nusach URL param after products load
  useEffect(() => {
    if (!urlNusach || loading || allLoaded.length === 0) return;
    if (category === 'קלפי מזוזה') {
      // Funnel sends 'ספרדי'/'אשכנזי'; the כתב name-filter uses 'ספרד'/'אשכנז'
      const map: Record<string, string> = { 'ספרדי': 'ספרד', 'אשכנזי': 'אשכנז' };
      const val = map[urlNusach] ?? urlNusach;
      setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, כתב: val } }));
    } else {
      // For תפילין and others: check product.nusach or name keywords
      setFilters(prev => ({ ...prev, nusachFilter: urlNusach }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlNusach, loading, allLoaded.length]);

  // Apply level URL param after products load
  useEffect(() => {
    if (!urlLevel || loading || allLoaded.length === 0) return;
    setFilters(prev => ({ ...prev, level: urlLevel }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLevel, loading, allLoaded.length]);

  // Apply ?subcat= URL param after products load
  useEffect(() => {
    if (!urlSubcat || loading || allLoaded.length === 0) return;
    setSubCategoryFilter(urlSubcat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSubcat, loading, allLoaded.length]);

  useEffect(() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [filters]);
  useEffect(() => { setCurrentPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [subCategoryFilter]);

  // Compute distinct subCategories from loaded products (sorted by frequency)
  const availableSubCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allLoaded) {
      if (p.subCategory) counts[p.subCategory] = (counts[p.subCategory] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([sub]) => sub);
  }, [allLoaded]);

  const filtered = useMemo(() => {
    let result = applyFilters(allLoaded, filters);
    if (subCategoryFilter) result = result.filter(p => p.subCategory === subCategoryFilter);
    if (category === 'מתנות' && catFilter !== 'הכל') result = result.filter(p => p.cat === catFilter);
    return applySort(result, sortBy);
  }, [allLoaded, filters, sortBy, catFilter, category, subCategoryFilter]);

  const attrOptionsDesktop = useMemo(() =>
    ATTR_KEYS.reduce((acc, key) => {
      const seen = new Set<string>();
      for (const p of allLoaded) { const v = p.filterAttributes?.[key]; if (v) seen.add(v); }
      acc[key] = Array.from(seen).sort((a, b) => a.localeCompare(b, 'he'));
      return acc;
    }, {} as Record<string, string[]>),
    [allLoaded]
  );

  const active      = hasActiveFilters(filters);
  const visibleCount = currentPage * PAGE_SIZE;
  const paginated   = filtered.slice(0, visibleCount);
  const hasMore     = visibleCount < filtered.length;

  // ── Infinite scroll ──
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setCurrentPage(p => p + 1); },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  const SORT_LABELS: Record<SortBy, string> = {
    popular: 'הכי נמכר', newest: 'חדש לישן', oldest: 'ישן לחדש',
    price_asc: 'מחיר: נמוך לגבוה', price_desc: 'מחיר: גבוה לנמוך',
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: '#f8f6f2' }}>

      {/* ── Breadcrumb ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5" dir="rtl">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-[#0c1a35] flex items-center gap-1 transition-colors font-medium">
            <IconHome size={12} />
            דף הבית
          </Link>
          <IconChevronLeft size={11} />
          <span className="text-[#0c1a35] font-semibold">{category}</span>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="bg-[#0c1a35] relative overflow-hidden">
        {/* Decorative background pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(184,151,42,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.03) 0%, transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
              {category === 'מתנות' ? 'מתנות ומוצרי בית' : category}
            </h1>
            <p className="text-white/50 text-sm font-medium">
              {loading ? 'טוען מוצרים...' : `${filtered.length.toLocaleString('he-IL')} מוצרים`}
            </p>
          </div>
          {/* Active filter count badge */}
          {active && (
            <div className="flex items-center gap-2 bg-[#b8972a]/20 border border-[#b8972a]/40 rounded-xl px-3 py-2">
              <IconFilter size={13} />
              <span className="text-[#b8972a] text-xs font-bold">סינון פעיל</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Subcategory banner (מתנות only) ── */}
      {category === 'מתנות' && (
        <div className="bg-white border-b border-gray-100 px-4 py-4" dir="rtl">
          <div className="max-w-7xl mx-auto flex gap-3 justify-end">
            <Link href="/category/כלי שולחן והגשה" className="group flex items-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-100 hover:border-amber-300 rounded-xl px-4 py-2.5 transition-all">
              <div className="text-right">
                <p className="font-bold text-gray-800 text-xs group-hover:text-amber-800">כלי שולחן והגשה</p>
                <p className="text-[10px] text-amber-600 mt-0.5">לצפייה ←</p>
              </div>
            </Link>
            <Link href="/category/עיצוב הבית" className="group flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-300 rounded-xl px-4 py-2.5 transition-all">
              <div className="text-right">
                <p className="font-bold text-gray-800 text-xs group-hover:text-blue-800">עיצוב הבית</p>
                <p className="text-[10px] text-blue-600 mt-0.5">לצפייה ←</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Mobile toolbar ── */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 transition-all"
          style={{
            background: active ? '#0c1a35' : '#f3f4f6',
            color: active ? '#fff' : '#374151',
            border: active ? '1.5px solid #0c1a35' : '1.5px solid #e5e7eb',
          }}
        >
          <IconFilter size={14} />
          סינון
          {active && <span className="w-2 h-2 rounded-full bg-[#b8972a]" />}
        </button>

        <div className="flex items-center gap-1.5 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2" style={{ direction: 'rtl' }}>
          <IconSort size={13} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="flex-1 bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
            style={{ direction: 'rtl' }}
          >
            {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {!loading && (
          <span className="text-xs text-gray-400 flex-shrink-0 font-medium">{filtered.length}</span>
        )}
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 pb-8 shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <FilterSidebar filters={filters} onChange={setFilters} products={allLoaded} category={category} catFilter={catFilter} onCatFilter={setCatFilter} subCategoryFilter={subCategoryFilter} onSubCategoryFilter={setSubCategoryFilter} availableSubCategories={availableSubCategories} />
            <button onClick={() => setDrawerOpen(false)} className="mt-5 w-full py-3.5 bg-[#0c1a35] text-white rounded-2xl font-bold text-sm hover:bg-[#1a3060] transition-colors">
              הצג {filtered.length} תוצאות
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-4">
          <FilterSidebar filters={filters} onChange={setFilters} products={allLoaded} category={category} catFilter={catFilter} onCatFilter={setCatFilter} subCategoryFilter={subCategoryFilter} onSubCategoryFilter={setSubCategoryFilter} availableSubCategories={availableSubCategories} />
        </aside>

        {/* Products area */}
        <div className="flex-1 min-w-0">

          {/* Desktop sort + filter bar */}
          <div className="hidden lg:flex items-center gap-2 mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3" style={{ direction: 'rtl' }}>
            <span className="text-sm text-gray-400 font-medium flex-shrink-0">
              {loading ? 'טוען...' : `${filtered.length} מוצרים`}
            </span>

            <div className="flex items-center gap-2 flex-1 overflow-x-auto">
              {(CAT_NAME_FILTERS[category] ?? []).map(spec => {
                const current = filters.nameFilters[spec.key] ?? 'הכל';
                const isActive = current && current !== 'הכל';
                return (
                  <button
                    key={`tb-name-${spec.key}`}
                    onClick={() => {/* open dropdown handled below */}}
                    className="relative flex-shrink-0"
                  >
                    <select
                      value={current}
                      onChange={e => setFilters(prev => ({ ...prev, nameFilters: { ...prev.nameFilters, [spec.key]: e.target.value } }))}
                      className="appearance-none border rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer focus:outline-none transition-all pr-7"
                      style={{ direction: 'rtl', borderColor: isActive ? '#0c1a35' : '#e5e7eb', color: isActive ? '#0c1a35' : '#6b7280', background: isActive ? '#f0f4ff' : '#fff' }}
                    >
                      <option value="הכל">{spec.label}: הכל</option>
                      {spec.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </button>
                );
              })}

              {/* Rating */}
              <select
                value={filters.minRating}
                onChange={e => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                className="flex-shrink-0 border rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer focus:outline-none transition-all"
                style={{ direction: 'rtl', borderColor: filters.minRating > 0 ? '#0c1a35' : '#e5e7eb', color: filters.minRating > 0 ? '#0c1a35' : '#6b7280', background: filters.minRating > 0 ? '#f0f4ff' : '#fff' }}
              >
                <option value={0}>דירוג: הכל</option>
                <option value={3}>3★ ומעלה</option>
                <option value={4}>4★ ומעלה</option>
              </select>

              {/* Dynamic attribute filters */}
              {ATTR_KEYS.map(key => {
                const vals = attrOptionsDesktop[key] ?? [];
                if (vals.length === 0) return null;
                const current = filters.attrFilters[key] ?? 'הכל';
                const isActive = current && current !== 'הכל';
                return (
                  <select
                    key={`tb-attr-${key}`}
                    value={current}
                    onChange={e => setFilters(prev => ({ ...prev, attrFilters: { ...prev.attrFilters, [key]: e.target.value } }))}
                    className="flex-shrink-0 border rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer focus:outline-none transition-all"
                    style={{ direction: 'rtl', borderColor: isActive ? '#0c1a35' : '#e5e7eb', color: isActive ? '#0c1a35' : '#6b7280', background: isActive ? '#f0f4ff' : '#fff' }}
                  >
                    <option value="הכל">{key}: הכל</option>
                    {vals.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                );
              })}

              {active && (
                <button onClick={() => setFilters(EMPTY_FILTERS)} className="flex-shrink-0 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl">
                  <IconX size={10} />
                  נקה
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 border-r border-gray-100 pr-3 flex-shrink-0">
              <IconSort size={13} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="border-0 text-xs font-semibold text-gray-700 bg-transparent cursor-pointer focus:outline-none"
                style={{ direction: 'rtl' }}
              >
                {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Active filter pills */}
          <ActiveFilterPills filters={filters} onChange={setFilters} subCategoryFilter={subCategoryFilter} onSubCategoryFilter={setSubCategoryFilter} />

          {/* Products grid / loading / empty */}
          {loading ? (
            <div className={category === 'קלפי מזוזה' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4'}>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              active={active}
              onClear={() => setFilters(EMPTY_FILTERS)}
              relatedCats={
                active
                  ? []
                  : (VIRTUAL_CATS[category]?.cats ?? ['יודאיקה', 'כלי שולחן והגשה', 'עיצוב הבית', 'מתנות'])
              }
            />
          ) : (
            <>
              {category === 'קלפי מזוזה' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginated.map(p => (
                    <SoferProductCard
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      price={p.price}
                      imgUrl={p.imgUrl || p.image_url}
                      badge={p.badge}
                      was={p.was}
                      sofer={p.soferId ? soferMap[p.soferId] : undefined}
                      soferName={p.soferName ?? p.sofer}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
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
              )}

              <div className="mt-8 mb-2">
                <CategoryScrollBar catImages={catImages} currentCategory={category} />
              </div>

              {hasMore ? (
                <div ref={sentinelRef} className="flex justify-center items-center py-10 gap-2 text-gray-400">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-[#0c1a35] animate-spin" />
                  <span className="text-sm">טוען עוד מוצרים...</span>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-gray-400 font-medium">
                  הצגת את כל {filtered.length} המוצרים
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
