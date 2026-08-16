'use client';

// ─────────────────────────────────────────────────────────────────────────────
// "צפה במזכרות" — אזור מודולרי בדף /event-kippot
// באנר לכל קטגוריה → בלחיצה נפתחת חנות מיני עם:
// שבבי סינון (תת-קטגוריה) · מיון · סינון מחיר · סינון צבע · רשת מוצרים
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';
import type { Product } from '@/app/lib/types';
import { effectivePrice } from '@/app/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { EVENT_BANNERS, type EventBanner } from '@/app/constants/eventScrollSections';

const GOLD = 'var(--ys-accent)';
const NAVY = '#111d3a';
const PAGE_SIZE = 12;

type SortBy = 'relevant' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevant',   label: 'רלוונטי' },
  { value: 'price_asc',  label: 'מחיר: מהנמוך לגבוה' },
  { value: 'price_desc', label: 'מחיר: מהגבוה לנמוך' },
  { value: 'newest',     label: 'מהחדש לישן' },
  { value: 'oldest',     label: 'מהישן לחדש' },
];

// ── צבעים ────────────────────────────────────────────────────────────────────
const COLOR_SWATCH: Record<string, string> = {
  'לבן': '#FFFFFF', 'שמנת': '#F5EFE0', 'שנהב': '#F7F3E8', 'בז\'': '#D9C7A7',
  'זהב': '#C5A028', 'כסף': '#C0C4C9', 'נחושת': '#B87333', 'ברונזה': '#A97142',
  'שחור': '#1A1A1A', 'אפור': '#8B8F94', 'חום': '#7B4B29',
  'כחול': '#1E3A8A', 'תכלת': '#7FB6E8', 'טורקיז': '#2BB3A3', 'ירוק': '#3B7A57',
  'אדום': '#B3202E', 'בורדו': '#6E1220', 'ורוד': '#E8A6BC', 'סגול': '#6B4A9C',
  'צהוב': '#E8C33A', 'כתום': '#DE7A2C', 'צבעוני': 'linear-gradient(135deg,#E8425A,#E8C33A,#3B7A57,#1E3A8A)',
};
const COLOR_WORDS = Object.keys(COLOR_SWATCH);

function colorOf(p: Product): string | null {
  const attr = p.filterAttributes?.['צבע'];
  if (attr && attr.trim()) {
    const v = attr.trim();
    return COLOR_WORDS.find(c => v.includes(c)) ?? v;
  }
  const hay = `${p.name ?? ''} ${p.subCategory ?? ''}`;
  return COLOR_WORDS.find(c => hay.includes(c)) ?? null;
}

// ── מדרגות מחיר ──────────────────────────────────────────────────────────────
const PRICE_BUCKETS: { id: string; label: string; min: number; max: number }[] = [
  { id: 'p1', label: 'עד ₪20',    min: 0,   max: 20 },
  { id: 'p2', label: '₪20–₪50',   min: 20,  max: 50 },
  { id: 'p3', label: '₪50–₪100',  min: 50,  max: 100 },
  { id: 'p4', label: '₪100–₪250', min: 100, max: 250 },
  { id: 'p5', label: '₪250 ומעלה', min: 250, max: Infinity },
];

function isVisible(p: Product): boolean {
  return !p.hidden && !p.outOfStock && p.status !== 'inactive';
}

function inStockFirst(p: Product): number {
  return p.outOfStock ? 0 : 1;
}

function applySort(list: Product[], sort: SortBy): Product[] {
  return [...list].sort((a, b) => {
    const stockDiff = inStockFirst(b) - inStockFirst(a);
    if (stockDiff !== 0) return stockDiff;
    switch (sort) {
      case 'price_asc':  return effectivePrice(a) - effectivePrice(b);
      case 'price_desc': return effectivePrice(b) - effectivePrice(a);
      case 'newest':     return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
      case 'oldest':     return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
      case 'relevant':
      default: {
        const bs = (p: Product) => (p.isBestSeller ? 1 : 0);
        const d = bs(b) - bs(a);
        if (d !== 0) return d;
        return (b.priority ?? 0) - (a.priority ?? 0);
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function EventSouvenirsBrowser({ products }: { products: Product[] }) {
  const [openId, setOpenId]     = useState<string | null>(null);
  const [sub, setSub]           = useState<string | null>(null);
  const [color, setColor]       = useState<string | null>(null);
  const [bucket, setBucket]     = useState<string | null>(null);
  const [sortBy, setSortBy]     = useState<SortBy>('relevant');
  const [limit, setLimit]       = useState(PAGE_SIZE);
  // מוצרים מקטגוריות החנות — נטענים רק בלחיצה על הבאנר (לא בטעינת העמוד)
  const [extra, setExtra]       = useState<Record<string, Product[]>>({});
  const [loading, setLoading]   = useState(false);
  const panelRef                = useRef<HTMLDivElement>(null);

  // מוצרי הבאנר שכבר קיימים בעמוד (שויכו באדמין)
  const assigned = useCallback((b: EventBanner): Product[] => {
    if (b.isCatchAll) {
      return products.filter(p => (p.isEventProduct || p.eventsOnly) && !p.eventScrollSection);
    }
    return products.filter(p => p.eventScrollSection === b.id);
  }, [products]);

  // ספירה לתצוגה על הבאנר (כולל מה שכבר נטען מהקטגוריות)
  const countOf = useCallback((b: EventBanner) => {
    const ids = new Set(assigned(b).map(p => p.id));
    (extra[b.id] ?? []).forEach(p => ids.add(p.id));
    return ids.size;
  }, [assigned, extra]);

  const banners = useMemo(
    () => EVENT_BANNERS.filter(b => countOf(b) > 0 || (b.extraSource?.length ?? 0) > 0),
    [countOf],
  );

  const openBanner = banners.find(b => b.id === openId) ?? null;

  // ── טעינת קטגוריות החנות המצורפות לבאנר ────────────────────────────────────
  async function loadExtra(b: EventBanner) {
    if (!b.extraSource?.length || extra[b.id]) return;
    setLoading(true);
    try {
      const snaps = await Promise.all(
        b.extraSource.map(src => getDocs(query(collection(db, 'products'), where('cat', '==', src.cat)))),
      );
      const byId = new Map<string, Product>();
      snaps.forEach((snap, i) => {
        const subs = b.extraSource?.[i]?.subCategories;
        snap.docs.forEach(d => {
          const p = { id: d.id, ...d.data() } as Product;
          if (!isVisible(p)) return;
          if (subs?.length && !subs.includes(p.subCategory ?? '')) return;
          byId.set(p.id, p);
        });
      });
      setExtra(prev => ({ ...prev, [b.id]: Array.from(byId.values()) }));
    } catch (e) {
      console.error('[EventSouvenirs] extra load:', e);
      setExtra(prev => ({ ...prev, [b.id]: [] }));
    } finally {
      setLoading(false);
    }
  }

  function toggleBanner(b: EventBanner) {
    const closing = openId === b.id;
    setOpenId(closing ? null : b.id);
    setSub(null); setColor(null); setBucket(null); setSortBy('relevant'); setLimit(PAGE_SIZE);
    if (!closing) void loadExtra(b);
  }

  // גלילה רכה לפאנל שנפתח
  useEffect(() => {
    if (!openId || !panelRef.current) return;
    const t = setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    return () => clearTimeout(t);
  }, [openId]);

  // ── מאגר המוצרים של הבאנר הפתוח ────────────────────────────────────────────
  const pool = useMemo(() => {
    if (!openBanner) return [] as Product[];
    const byId = new Map<string, Product>();
    assigned(openBanner).forEach(p => byId.set(p.id, p));
    (extra[openBanner.id] ?? []).forEach(p => byId.set(p.id, p));
    return Array.from(byId.values());
  }, [openBanner, assigned, extra]);

  // שבבי תת-קטגוריה — נגזרים מהמוצרים עצמם (מתעדכן אוטומטית)
  const subOptions = useMemo(() => {
    const counts = new Map<string, number>();
    pool.forEach(p => {
      const key = (p.subCategory || p.cat || '').trim();
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [pool]);

  const colorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    pool.forEach(p => {
      const c = colorOf(p);
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label]) => label);
  }, [pool]);

  const bucketOptions = useMemo(
    () => PRICE_BUCKETS.filter(bk => pool.some(p => {
      const v = effectivePrice(p);
      return v >= bk.min && v < bk.max;
    })),
    [pool],
  );

  const filtered = useMemo(() => {
    let list = pool;
    if (sub)   list = list.filter(p => (p.subCategory || p.cat || '').trim() === sub);
    if (color) list = list.filter(p => colorOf(p) === color);
    if (bucket) {
      const bk = PRICE_BUCKETS.find(x => x.id === bucket);
      if (bk) list = list.filter(p => { const v = effectivePrice(p); return v >= bk.min && v < bk.max; });
    }
    return applySort(list, sortBy);
  }, [pool, sub, color, bucket, sortBy]);

  const hasFilters = !!(sub || color || bucket);

  if (banners.length === 0) return null;

  return (
    <div style={{ marginTop: 48, borderTop: '1px solid #E5E0D5', paddingTop: 32 }}>
      <style>{`
        .ys-evb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        @media (max-width: 420px) { .ys-evb-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
        .ys-evb-banner { position: relative; display: block; width: 100%; padding: 0; border: none; background: none;
          cursor: pointer; font-family: inherit; overflow: hidden; text-align: right; transition: transform .18s, box-shadow .18s; }
        .ys-evb-banner:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(0,0,0,.14); }
        .ys-evb-chip { border: 1px solid #E5E0D5; background: #fff; color: #4B5563; font-family: inherit;
          font-size: 12.5px; font-weight: 600; padding: 7px 13px; cursor: pointer; white-space: nowrap; transition: all .15s; }
        .ys-evb-chip:hover { border-color: var(--ys-accent); color: #1a1a1a; }
        .ys-evb-chip[data-on="1"] { background: #111d3a; border-color: #111d3a; color: #fff; }
        .ys-evb-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch;
          scrollbar-width: thin; scrollbar-color: var(--ys-accent) #F3EFE6; }
        .ys-evb-row::-webkit-scrollbar { height: 5px; }
        .ys-evb-row::-webkit-scrollbar-track { background: #F3EFE6; }
        .ys-evb-row::-webkit-scrollbar-thumb { background: var(--ys-accent); }
      `}</style>

      <div style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 900, color: NAVY, marginBottom: 4 }}>
        צפו במזכרות לאירוע
      </div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 18 }}>
        בחרו קטגוריה — ואז סננו לפי סוג, מחיר וצבע. הכל נשלח יחד עם הכיפות במשלוח אחד.
      </div>

      {/* ── באנרים ── */}
      <div className="ys-evb-grid">
        {banners.map(b => {
          const list  = assigned(b);
          const img   = b.img || list.find(p => p.imgUrl || p.image_url)?.imgUrl || list.find(p => p.image_url)?.image_url || '';
          const isOn  = openId === b.id;
          const count = countOf(b);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => toggleBanner(b)}
              className="ys-evb-banner"
              aria-expanded={isOn}
              style={{ border: isOn ? `2px solid ${GOLD}` : '2px solid transparent' }}
            >
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#EDE7DA' }}>
                {img ? (
                  <img
                    src={optimizeCloudinaryUrl(img, 400)}
                    alt={b.label}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>{b.emoji}</div>
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,29,58,.86) 0%, rgba(17,29,58,.35) 45%, rgba(17,29,58,.05) 100%)' }} />
                <div style={{ position: 'absolute', insetInline: 0, bottom: 0, padding: '10px 12px' }}>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
                    {b.emoji} {b.label}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                    {isOn ? 'סגירה ×' : count > 0 ? `${count} פריטים · צפייה ←` : 'צפייה ←'}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── פאנל הקטגוריה הפתוחה ── */}
      {openBanner && (
        <div ref={panelRef} style={{ marginTop: 18, background: '#fff', border: '1px solid #E5E0D5', padding: 'clamp(14px, 2.4vw, 22px)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: NAVY }}>{openBanner.emoji} {openBanner.label}</div>
              <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>{openBanner.blurb}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="סגירה"
              style={{ background: 'none', border: '1px solid #E5E0D5', width: 30, height: 30, fontSize: 18, color: '#6B7280', cursor: 'pointer', lineHeight: 1, flexShrink: 0, fontFamily: 'inherit' }}
            >×</button>
          </div>

          {/* שבבי סינון — סוג המוצר */}
          {subOptions.length > 1 && (
            <div className="ys-evb-row" style={{ marginBottom: 10 }}>
              <button type="button" className="ys-evb-chip" data-on={sub === null ? '1' : '0'} onClick={() => { setSub(null); setLimit(PAGE_SIZE); }}>
                הכל ({pool.length})
              </button>
              {subOptions.map(o => (
                <button key={o.label} type="button" className="ys-evb-chip" data-on={sub === o.label ? '1' : '0'} onClick={() => { setSub(sub === o.label ? null : o.label); setLimit(PAGE_SIZE); }}>
                  {o.label} ({o.count})
                </button>
              ))}
            </div>
          )}

          {/* מדרגות מחיר */}
          {bucketOptions.length > 1 && (
            <div className="ys-evb-row" style={{ marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#9C7B3F', alignSelf: 'center', whiteSpace: 'nowrap' }}>מחיר:</span>
              {bucketOptions.map(bk => (
                <button key={bk.id} type="button" className="ys-evb-chip" data-on={bucket === bk.id ? '1' : '0'} onClick={() => { setBucket(bucket === bk.id ? null : bk.id); setLimit(PAGE_SIZE); }}>
                  {bk.label}
                </button>
              ))}
            </div>
          )}

          {/* צבעים */}
          {colorOptions.length > 1 && (
            <div className="ys-evb-row" style={{ marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#9C7B3F', alignSelf: 'center', whiteSpace: 'nowrap' }}>צבע:</span>
              {colorOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  className="ys-evb-chip"
                  data-on={color === c ? '1' : '0'}
                  onClick={() => { setColor(color === c ? null : c); setLimit(PAGE_SIZE); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #D5CDBB', background: COLOR_SWATCH[c] ?? '#EEE', display: 'inline-block', flexShrink: 0 }} />
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* שורת מיון + ספירה + ניקוי */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #F1EDE3', paddingTop: 12, marginTop: 4 }}>
            <span style={{ fontSize: 12.5, color: '#6B7280', flex: 1, minWidth: 90 }}>
              {loading ? 'טוען מוצרים…' : `${filtered.length} מוצרים`}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSub(null); setColor(null); setBucket(null); setLimit(PAGE_SIZE); }}
                style={{ background: 'none', border: 'none', color: '#B3202E', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >
                ניקוי סינון
              </button>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#6B7280' }}>
              מיון:
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value as SortBy); setLimit(PAGE_SIZE); }}
                style={{ background: '#fff', border: '1px solid #E5E0D5', fontSize: 12.5, color: '#1F2937', cursor: 'pointer', direction: 'rtl', outline: 'none', fontFamily: 'inherit', padding: '6px 8px' }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>

          {/* רשת מוצרים */}
          {filtered.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" style={{ marginTop: 16 }}>
                {filtered.slice(0, limit).map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    id={p.id} name={p.name} price={p.price}
                    images={[p.imgUrl, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                    was={p.was} productDoc={p} badge={p.badge} isBestSeller={p.isBestSeller}
                    outOfStock={p.outOfStock} cat={p.cat} eventsOnly={p.eventsOnly}
                    createdAt={p.createdAt} isBundle={!!p.bundleComponentCodes?.length}
                    aboveFold={idx < 2}
                  />
                ))}
              </div>
              {filtered.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit(l => l + PAGE_SIZE)}
                  style={{ display: 'block', width: '100%', marginTop: 16, background: '#fff', border: `1.5px solid ${GOLD}`, color: NAVY, fontWeight: 800, fontSize: 14, padding: '12px 20px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  הצג עוד {Math.min(PAGE_SIZE, filtered.length - limit)} מוצרים
                </button>
              )}
            </>
          ) : (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#9C7B3F', fontSize: 13.5 }}>
              {loading ? 'טוען…' : 'לא נמצאו מוצרים בסינון הזה — נסו לנקות את הסינון.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
