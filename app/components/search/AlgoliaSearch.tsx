'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { algoliasearch } from 'algoliasearch';

const APP_ID     = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID     ?? '';
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? '';

const algoliaClient = APP_ID && SEARCH_KEY ? algoliasearch(APP_ID, SEARCH_KEY) : null;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductHit {
  objectID: string;
  id:       string;
  name:     string;
  price:    number | null;
  cat:      string;
  image:    string;
}

interface CategoryHit {
  objectID:    string;
  name:        string;
  displayName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onNavigate?: () => void;
  autoFocus?:  boolean;
  style?:      React.CSSProperties;
}

export default function AlgoliaSearch({ onNavigate, autoFocus, style }: Props) {
  const [query,      setQuery]      = useState('');
  const [products,   setProducts]   = useState<ProductHit[]>([]);
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [open,       setOpen]       = useState(false);

  const router      = useRouter();
  const inputRef    = useRef<HTMLInputElement>(null);
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!algoliaClient) return;
    setLoading(true);
    try {
      const { results } = await algoliaClient.search({
        requests: [
          { indexName: 'products',   query: q, hitsPerPage: 7 },
          { indexName: 'categories', query: q, hitsPerPage: 4 },
        ],
      });
      setProducts(  (results[0] as unknown as { hits: ProductHit[]   }).hits ?? []);
      setCategories((results[1] as unknown as { hits: CategoryHit[] }).hits ?? []);
      setOpen(true);
    } catch (err) {
      console.error('[AlgoliaSearch]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setProducts([]); setCategories([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => runSearch(q), 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Enter' && query.trim().length >= 3) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onNavigate?.();
    }
  };

  const navigate = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
    onNavigate?.();
  };

  const showDropdown = open && query.length >= 3;
  const hasResults   = products.length > 0 || categories.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>

      {/* ── Input row ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderRadius: 'var(--ys-radius-input)', overflow: 'hidden', border: '1px solid var(--ys-border)' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.length >= 3 && hasResults) setOpen(true); }}
          placeholder='חיפוש סת"מ ויודאיקה...'
          autoComplete="off"
          dir="rtl"
          style={{
            flex:       1,
            border:     'none',
            padding:    '10px 12px',
            fontSize:   14,
            color:      '#111',
            background: 'var(--ys-surface)',
            outline:    'none',
            minWidth:   0,
            textAlign:  'right',
          }}
        />
        <button
          onClick={() => {
            if (query.trim().length >= 3) {
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              onNavigate?.();
            }
          }}
          style={{ background: 'var(--ys-plum)', border: 'none', padding: '0 16px', cursor: 'pointer', flexShrink: 0 }}
          aria-label="חפש"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FEFBF7" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* ── Dropdown ───────────────────────────────────────────────────── */}
      {showDropdown && (
        <div style={{
          position:   'absolute',
          top:        '100%',
          right:      0,
          left:       0,
          background: '#fff',
          border:     '1px solid #E9E4DC',
          borderTop:  'none',
          boxShadow:  '0 8px 32px rgba(0,0,0,0.12)',
          zIndex:     300,
          maxHeight:  480,
          overflowY:  'auto',
          direction:  'rtl',
        }}>
          {loading && (
            <div style={{ padding: '14px 16px', color: '#999', fontSize: 13, textAlign: 'right' }}>
              מחפש...
            </div>
          )}

          {!loading && !hasResults && (
            <div style={{ padding: '14px 16px', color: '#999', fontSize: 13, textAlign: 'right' }}>
              לא נמצאו תוצאות
            </div>
          )}

          {!loading && hasResults && (
            <>
              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--ys-purple)', letterSpacing: 1.5, textAlign: 'right', borderBottom: '1px solid #F0EDE8' }}>
                    קטגוריות
                  </div>
                  {categories.map(cat => (
                    <button
                      key={cat.objectID}
                      onClick={() => navigate(`/category/${encodeURIComponent(cat.name)}`)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ys-ink)', fontFamily: 'inherit', borderBottom: '1px solid #F7F5F0' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FBF9F4'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.displayName || cat.name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#51285F" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 3 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* Products */}
              {products.length > 0 && (
                <div>
                  <div style={{ padding: '10px 16px 6px', fontSize: 10, fontWeight: 700, color: 'var(--ys-purple)', letterSpacing: 1.5, textAlign: 'right', borderBottom: '1px solid #F0EDE8' }}>
                    מוצרים
                  </div>
                  {products.map(p => (
                    <button
                      key={p.objectID}
                      onClick={() => navigate(`/product/${p.id || p.objectID}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '9px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: '1px solid #F7F5F0' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FBF9F4'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <div style={{ width: 44, height: 44, flexShrink: 0, background: '#F0EDE8', overflow: 'hidden' }}>
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt=""
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </div>
                      <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ys-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                          {p.cat    && <span style={{ fontSize: 11, color: '#888' }}>{p.cat}</span>}
                          {p.price != null && <span style={{ fontSize: 12, fontWeight: 700, color: '#3B3B41' }}>₪{p.price}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* See all */}
              <div style={{ padding: '8px 16px', borderTop: '1px solid #F0EDE8' }}>
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                  style={{ background: 'none', border: 'none', color: '#3B3B41', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  הצג את כל התוצאות ←
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
