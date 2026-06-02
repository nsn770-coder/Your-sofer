'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';
import type { LifeEvent } from '@/data/lifeEvents';

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
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  cat?: string;
  subCategory?: string;
  filterAttributes?: Record<string, string>;
  hasKlafSelection?: boolean;
  soferId?: string;
  soferName?: string;
  soferPhoto?: string;
  stars?: number;
  outOfStock?: boolean;
}

const ATTR_KEYS = ['סוג חומר', 'חומר', 'צבע', 'סגנון'];

// ── Scroll-reveal wrapper ──────────────────────────────────────────────────────
function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,0.05)' }}>
      <div style={{ aspectRatio: '1/1', background: '#F0EAE0' }} className="moment-pulse" />
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ height: 13, background: '#EDE8DC', borderRadius: 3, width: '75%' }} className="moment-pulse" />
        <div style={{ height: 13, background: '#EDE8DC', borderRadius: 3, width: '55%' }} className="moment-pulse" />
        <div style={{ height: 22, background: '#EDE8DC', borderRadius: 3, width: '38%', marginTop: 6 }} className="moment-pulse" />
      </div>
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#3A2E1A' : 'transparent',
        color: active ? '#fff' : '#5A4F3E',
        border: `1.5px solid ${active ? '#3A2E1A' : '#D5CEC0'}`,
        borderRadius: 0,
        padding: '5px 15px',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#9C7B3F'; e.currentTarget.style.color = '#9C7B3F'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#D5CEC0'; e.currentTarget.style.color = '#5A4F3E'; } }}
    >
      {label}
    </button>
  );
}

// ── Main client component ──────────────────────────────────────────────────────
export default function MomentClient({ event }: { event: LifeEvent }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [catFilter, setCatFilter] = useState('הכל');
  const [attrFilters, setAttrFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    setCatFilter('הכל');
    setAttrFilters({});

    (async () => {
      try {
        // 1. Unique cats → one Firestore query per cat
        const uniqueCats = [...new Set(event.relatedCategories.map(cf => cf.category))];

        const snapshots = await Promise.all(
          uniqueCats.map(cat =>
            getDocs(query(collection(db, 'products'), where('cat', '==', cat)))
          )
        );

        // 2. Build cat → allowed-subCategory set (or 'all')
        const catSubMap = new Map<string, 'all' | Set<string>>();
        for (const cf of event.relatedCategories) {
          if (cf.subCategories === 'all') {
            catSubMap.set(cf.category, 'all');
          } else {
            const existing = catSubMap.get(cf.category);
            if (existing === 'all') continue;
            if (!existing) {
              catSubMap.set(cf.category, new Set(cf.subCategories as string[]));
            } else {
              for (const s of cf.subCategories as string[]) (existing as Set<string>).add(s);
            }
          }
        }

        // 3. Collect products with dedup
        const seen = new Set<string>();
        const all: Product[] = [];

        for (let i = 0; i < uniqueCats.length; i++) {
          const cat = uniqueCats[i];
          const allowedSubs = catSubMap.get(cat);

          for (const snap of snapshots[i].docs) {
            if (seen.has(snap.id)) continue;
            const p = { id: snap.id, ...snap.data() } as Product;
            if (p.hidden === true) continue;

            if (allowedSubs !== 'all') {
              const subs = allowedSubs as Set<string>;
              if (!p.subCategory || !subs.has(p.subCategory)) continue;
            }

            seen.add(snap.id);
            all.push(p);
          }
        }

        all.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
        setProducts(all);
      } catch (err) {
        console.error('[moment] fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category tabs — derived from fetched products
  const availableCats = useMemo(
    () => [...new Set(products.map(p => p.cat).filter(Boolean) as string[])],
    [products]
  );

  // filterAttributes with 2+ distinct values
  const availableAttrs = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const p of products) {
      for (const key of ATTR_KEYS) {
        const val = p.filterAttributes?.[key];
        if (val) {
          if (!map[key]) map[key] = new Set();
          map[key].add(val);
        }
      }
    }
    return Object.fromEntries(
      Object.entries(map)
        .filter(([, v]) => v.size >= 2)
        .map(([k, v]) => [k, [...v].sort()])
    );
  }, [products]);

  const filtered = useMemo(() => {
    let r = products;
    if (catFilter !== 'הכל') r = r.filter(p => p.cat === catFilter);
    for (const [key, val] of Object.entries(attrFilters)) {
      if (val) r = r.filter(p => p.filterAttributes?.[key] === val);
    }
    return r;
  }, [products, catFilter, attrFilters]);

  const hasActiveFilter = catFilter !== 'הכל' || Object.values(attrFilters).some(Boolean);

  const uniqueCategoryLinks = [
    ...new Map(
      event.relatedCategories.map(cf => [cf.category, `/category/${encodeURIComponent(cf.category)}`])
    ).entries(),
  ];

  const showFilterBar = !loading && (availableCats.length > 1 || Object.keys(availableAttrs).length > 0);

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif" }}>
      <style>{`
        .moment-pulse { animation: momentPulse 1.6s ease-in-out infinite; }
        @keyframes momentPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      {showFilterBar && (
        <div style={{ background: '#FDFAF5', borderBottom: '1px solid #EDE8DC', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px' }}>

            {/* Category tabs */}
            {availableCats.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: Object.keys(availableAttrs).length > 0 ? 12 : 0 }}>
                <Pill label="הכל" active={catFilter === 'הכל'} onClick={() => setCatFilter('הכל')} />
                {availableCats.map(cat => (
                  <Pill key={cat} label={cat} active={catFilter === cat} onClick={() => setCatFilter(cat)} />
                ))}
              </div>
            )}

            {/* filterAttribute rows */}
            {Object.entries(availableAttrs).map(([key, vals]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#9A8F82', whiteSpace: 'nowrap', minWidth: 60 }}>
                  {key}:
                </span>
                <Pill label="הכל" active={!attrFilters[key]} onClick={() => setAttrFilters(prev => { const n = {...prev}; delete n[key]; return n; })} />
                {vals.map(v => (
                  <Pill key={v} label={v} active={attrFilters[key] === v} onClick={() => setAttrFilters(prev => ({...prev, [key]: v}))} />
                ))}
              </div>
            ))}

            {/* Count + clear */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: showFilterBar ? 10 : 0, borderTop: '1px solid #EDE8DC' }}>
              <span style={{ fontSize: 13, color: '#9A8F82' }}>
                {filtered.length.toLocaleString('he-IL')} מוצרים
              </span>
              {hasActiveFilter && (
                <button
                  onClick={() => { setCatFilter('הכל'); setAttrFilters({}); }}
                  style={{ background: 'none', border: 'none', color: '#C5A028', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  נקה סינון ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Product grid ────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px 72px' }}>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20 }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9A8F82' }}>
            <p style={{ fontSize: 18, marginBottom: 16 }}>לא נמצאו מוצרים תואמים</p>
            {hasActiveFilter && (
              <button
                onClick={() => { setCatFilter('הכל'); setAttrFilters({}); }}
                style={{ background: '#3A2E1A', color: '#F5EFE4', border: 'none', padding: '11px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                הצג את הכל
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20 }}>
            {filtered.map((p, i) => (
              <RevealCard key={p.id} delay={Math.min((i % 12) * 50, 300)}>
                <ProductCard
                  id={p.id}
                  name={p.name}
                  price={p.price}
                  images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
                  priority={p.priority}
                  isBestSeller={p.isBestSeller}
                  badge={p.badge}
                  was={p.was}
                  createdAt={p.createdAt}
                  hidden={p.hidden}
                  hasKlafSelection={p.hasKlafSelection}
                  cat={p.cat}
                  soferId={p.soferId}
                  soferName={p.soferName}
                  soferPhoto={p.soferPhoto}
                  stars={p.stars}
                  outOfStock={p.outOfStock}
                />
              </RevealCard>
            ))}
          </div>
        )}

        {/* External links (e.g. הדפסות לאירועים) */}
        {!loading && (event.externalLinks ?? []).length > 0 && (
          <div style={{ marginTop: 64, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {(event.externalLinks ?? []).map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'inline-block',
                  color: '#1E3A8A',
                  border: '1.5px solid #1E3A8A',
                  padding: '12px 28px',
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3A2E1A'; e.currentTarget.style.color = '#F5EFE4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3A2E1A'; }}
              >
                {link.label} ←
              </a>
            ))}
          </div>
        )}

        {/* Links to full category pages */}
        {!loading && (
          <div style={{ marginTop: 72, paddingTop: 40, borderTop: '1px solid #EDE8DC', textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#B0A898', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>
              לקטלוגים המלאים
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {uniqueCategoryLinks.map(([cat, href]) => (
                <a
                  key={cat}
                  href={href}
                  style={{
                    fontSize: 13,
                    color: '#6B5E4A',
                    textDecoration: 'none',
                    padding: '6px 16px',
                    border: '1px solid #D5CEC0',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#C5A028'; e.currentTarget.style.color = '#C5A028'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#D5CEC0'; e.currentTarget.style.color = '#6B5E4A'; }}
                >
                  כל {cat} ←
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
