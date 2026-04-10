'use client';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useCart } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import { useShaliach } from './contexts/ShaliachContext';
import { CATS } from './constants/categories';
import SmartHero from './components/SmartHero';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  cat?: string;
  category?: string;
  badge?: string;
  stars?: number;
  reviews?: number;
  days?: string;
}

interface PromoCat {
  name: string;
  img: string;
  sub: string;
}

const PROMO_CATS_DEFAULT: PromoCat[] = [
  { name: 'מזוזות',          img: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&q=80', sub: 'מכל הסוגים והגדלים' },
  { name: 'כיסוי תפילין',    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', sub: 'אשכנז, ספרד, חב״ד' },
  { name: 'תפילין קומפלט',   img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', sub: 'סט קומפלט — קלף, בתים, רצועות' },
  { name: 'טליתות',          img: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=400&q=80', sub: 'טלית קטן, טלית צמר' },
  { name: 'מגילות',          img: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&q=80', sub: 'מגילת אסתר ועוד' },
  { name: 'יודאיקה',         img: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=400&q=80', sub: 'חנוכיות, כוסות ועוד' },
  { name: 'ספרי תורה',       img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', sub: 'ספרי תורה מהודרים' },
  { name: 'בר מצווה',        img: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', sub: 'סטים וחבילות מיוחדות' },
  { name: 'מתנות',           img: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', sub: 'לכל אירוע ומועד' },
  { name: 'קלפים',           img: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&q=80', sub: 'קלפי מזוזה מסופרים' },
];

const FILTER_NUSACH = ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני', 'פרדי'];
const FILTER_HIDUR = ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'];

// ── פילטרים מבוססים על נתונים אמיתיים מהמוצרים ──
const CAT_FILTERS: Record<string, { label: string; options: string[] }[]> = {
  'מזוזות': [
    { label: 'גודל', options: ['הכל', '7 ס"מ', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ', '25 ס"מ', '30 ס"מ'] },
    { label: 'חומר', options: ['הכל', 'פולימר', 'בטון', 'פלסטיק', 'אלומיניום', 'מתכת', 'עץ', 'זכוכית', 'שיש', 'סמנט'] },
  ],
  'כיסוי תפילין': [
    { label: 'חומר', options: ['הכל', 'דמוי עור', 'עור', 'פיו', 'פשתן', 'בד', 'קטיפה', 'טרמי', 'משי'] },
    { label: 'סגנון', options: ['הכל', 'מהודר', 'רגיל', 'מעוצב'] },
  ],
  'תפילין קומפלט': [
    { label: 'נוסח', options: ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
  ],
  'טליתות': [
    { label: 'סוג', options: ['הכל', 'טלית קטן', 'טלית גדולה'] },
    { label: 'חומר', options: ['הכל', 'צמר', 'משי', 'פוליאסטר', 'כותנה'] },
    { label: 'גודל', options: ['הכל', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  ],
  'מגילות': [
    { label: 'סוג', options: ['הכל', 'מגילת אסתר', 'מגילת רות', 'שיר השירים', 'קהלת', 'איכה'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
    { label: 'גודל', options: ['הכל', 'קטן', 'בינוני', 'גדול'] },
  ],
  'קלפים': [
    { label: 'סוג', options: ['הכל', 'קלפי מזוזה', 'קלפי תפילין'] },
    { label: 'נוסח', options: ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
  ],
  'קלפי מזוזה': [
    { label: 'גודל', options: ['הכל', '10 ס"מ', '12 ס"מ', '15 ס"מ', '20 ס"מ'] },
    { label: 'נוסח', options: ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
  ],
  'קלפי תפילין': [
    { label: 'נוסח', options: ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
  ],
  'יודאיקה': [
    { label: 'סוג', options: ['הכל', 'חנוכיות', 'כוסות קידוש', 'מנורות', 'בשמים', 'מזכרות'] },
    { label: 'חומר', options: ['הכל', 'כסף', 'מתכת', 'זכוכית', 'עץ', 'קרמיקה'] },
  ],
  'ספרי תורה': [
    { label: 'גודל', options: ['הכל', 'קטן', 'בינוני', 'גדול'] },
    { label: 'רמת הידור', options: ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'] },
  ],
  'בר מצווה': [
    { label: 'סוג', options: ['הכל', 'סט תפילין', 'טלית וכיסוי', 'סט שלם', 'מתנות'] },
  ],
  'מתנות': [
    { label: 'אירוע', options: ['הכל', 'בר מצווה', 'חתונה', 'ברית', 'חנוכת בית', 'ראש השנה'] },
    { label: 'טווח מחיר', options: ['הכל', 'עד 100 ₪', '100-300 ₪', '300-500 ₪', 'מעל 500 ₪'] },
  ],
};

function Stars({ n = 4.5 }: { n?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: 12 }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

function ProductCard({ p, onAddToCart, onClick }: { p: Product; onAddToCart: () => void; onClick: () => void }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = [p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[];

  function prevImg(e: React.MouseEvent) { e.stopPropagation(); setImgIdx(i => (i - 1 + imgs.length) % imgs.length); }
  function nextImg(e: React.MouseEvent) { e.stopPropagation(); setImgIdx(i => (i + 1) % imgs.length); }

  return (
    <div onClick={onClick} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}>
      <div style={{ position: 'relative', paddingTop: '100%', background: '#f7f8f8', overflow: 'hidden' }}>
        {imgs.length > 0 ? (
          <img src={imgs[imgIdx]} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
        )}
        {imgs.length > 1 && (
          <>
            <button onClick={prevImg} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>‹</button>
            <button onClick={nextImg} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>›</button>
            <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 2 }}>
              {imgs.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setImgIdx(i); }} style={{ width: 6, height: 6, borderRadius: '50%', background: i === imgIdx ? '#0c1a35' : 'rgba(255,255,255,0.8)', cursor: 'pointer' }} />
              ))}
            </div>
          </>
        )}
        {p.badge && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: p.badge === 'מבצע' ? '#c0392b' : p.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, zIndex: 2 }}>{p.badge}</span>
        )}
      </div>
      <div style={{ padding: '10px 8px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Stars n={p.stars || 4.5} />
          <span style={{ fontSize: 11, color: '#0e6ba8' }}>({p.reviews || 0})</span>
        </div>
        <div style={{ marginBottom: 6 }}>
          {p.was && <div style={{ fontSize: 11, color: '#888', textDecoration: 'line-through' }}>₪{p.was}</div>}
          <span style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>₪{p.price}</span>
          {p.was && <span style={{ fontSize: 11, color: '#c0392b', marginRight: 6 }}>({Math.round((1 - p.price / p.was) * 100)}% הנחה)</span>}
        </div>
        <div style={{ fontSize: 11, color: '#c7511f', marginBottom: 8 }}>🚚 משלוח חינם · {p.days || '7-14'} ימים</div>
        <button onClick={e => { e.stopPropagation(); onAddToCart(); }} style={{ width: '100%', background: '#b8972a', border: '1px solid #a07820', color: '#0c1a35', borderRadius: 20, padding: '7px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          הוסף לסל
        </button>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 24;

function HomeContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('הכל');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('מומלצים');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [filterNusach, setFilterNusach] = useState('הכל');
  const [filterHidur, setFilterHidur] = useState('הכל');
  const [minRating, setMinRating] = useState(0);
  const [promoCats, setPromoCats] = useState<PromoCat[]>(PROMO_CATS_DEFAULT);
  const [soferIdFilter, setSoferIdFilter] = useState<string | null>(null);
  const [catFilters, setCatFilters] = useState<Record<string, string>>({});

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const { shaliach } = useShaliach();
  const mainRef = useRef<HTMLDivElement>(null);
  const catsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const soferId = searchParams.get('soferId');
    if (soferId) setSoferIdFilter(soferId);
    const cat = searchParams.get('cat');
    if (cat) {
      setActiveCat(decodeURIComponent(cat));
      setTimeout(() => mainRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } else {
      setActiveCat('הכל');
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const data: Product[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
        setProducts(data);

        const catsSnap = await getDocs(collection(db, 'categories'));
        const catsData: PromoCat[] = [];
        catsSnap.forEach(d => {
          const cat = d.data();
          if (cat.imgUrl) catsData.push({ name: cat.name, img: cat.imgUrl, sub: cat.sub || '' });
        });
        if (catsData.length > 0) {
          const order = ['מזוזות', 'כיסוי תפילין', 'תפילין קומפלט', 'טליתות', 'מגילות', 'יודאיקה', 'ספרי תורה', 'בר מצווה', 'מתנות', 'קלפים'];
          catsData.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
          setPromoCats(catsData);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    let r = [...products];
    if (soferIdFilter) r = r.filter(p => (p as any).soferId === soferIdFilter);
    if (activeCat !== 'הכל') r = r.filter(p => (p.cat?.trim() || p.category?.trim()) === activeCat.trim());
    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (priceMin) r = r.filter(p => p.price >= Number(priceMin));
    if (priceMax) r = r.filter(p => p.price <= Number(priceMax));
    if (minRating > 0) r = r.filter(p => (p.stars || 4.5) >= minRating);
    Object.entries(catFilters).forEach(([label, val]) => {
      if (val && val !== 'הכל') {
        r = r.filter(p => {
          const searchIn = [p.name, (p as any).desc, (p as any).material, (p as any).size, (p as any).nusach, (p as any).badge].filter(Boolean).join(' ').toLowerCase();
          return searchIn.includes(val.toLowerCase());
        });
      }
    });
    if (sortBy === 'מחיר: נמוך לגבוה') r.sort((a, b) => a.price - b.price);
    else if (sortBy === 'מחיר: גבוה לנמוך') r.sort((a, b) => b.price - a.price);
    else if (sortBy === 'דירוג') r.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    setFiltered(r);
    setPage(1);
  }, [activeCat, search, products, priceMin, priceMax, minRating, sortBy, soferIdFilter, catFilters]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function goToPage(p: number) { setPage(p); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }
  function scrollCats(dir: 'right' | 'left') {
    catsScrollRef.current?.scrollBy({ left: dir === 'left' ? 200 : -200, behavior: 'smooth' });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      <SmartHero
        isMobile={isMobile}
        onScrollToProducts={() => mainRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onSelectCat={(cat: string) => { setActiveCat(cat); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
      />

      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '16px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: '#0f1111' }}>קטגוריות מובילות</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => scrollCats('right')} style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              <button onClick={() => scrollCats('left')} style={{ background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            </div>
          </div>
          <div ref={catsScrollRef} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
            {promoCats.map(c => (
              <div key={c.name} onClick={() => { setActiveCat(c.name); setCatFilters({}); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid #ddd', transition: 'box-shadow 0.2s', flexShrink: 0, width: isMobile ? 130 : 180 }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ height: isMobile ? 100 : 140, overflow: 'hidden', position: 'relative' }}>
                  <img src={c.img} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, padding: '8px 10px' }}>
                    <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 15, color: '#fff' }}>{c.name}</div>
                    {c.sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{c.sub}</div>}
                  </div>
                </div>
                <div style={{ padding: '8px 10px', background: '#fff' }}>
                  <div style={{ fontSize: 11, color: '#0e6ba8' }}>לכל המבחר ←</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div ref={mainRef} style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '12px 8px' : '16px 12px' }}>
        {isMobile && (
          <button onClick={() => setShowSidebar(!showSidebar)} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            🔍 סינון תוצאות {showSidebar ? '▲' : '▼'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {(!isMobile || showSidebar) && (
            <div style={{ width: isMobile ? '100%' : 220, flexShrink: 0, background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: '16px', position: isMobile ? 'relative' : 'sticky', top: isMobile ? 'auto' : 120, marginBottom: isMobile ? 12 : 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0f1111', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                🔍 סינון תוצאות
                {isMobile && <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>✕</button>}
              </div>
              {isMobile && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>קטגוריה</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATS.map(cat => (
                      <button key={cat} onClick={() => { setActiveCat(cat); setShowSidebar(false); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                        style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: activeCat === cat ? '#0c1a35' : '#f5f5f5', color: activeCat === cat ? '#fff' : '#333', border: activeCat === cat ? '1px solid #0c1a35' : '1px solid #ddd', fontWeight: activeCat === cat ? 700 : 400 }}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>טווח מחירים</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="מינ" value={priceMin} onChange={e => setPriceMin(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
                  <input type="number" placeholder="מקס" value={priceMax} onChange={e => setPriceMax(e.target.value)} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>דירוג מינימלי</div>
                {[4, 3, 2, 0].map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
                    <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} />
                    {r > 0 ? <><span style={{ color: '#e6a817' }}>{'★'.repeat(r)}</span> ומעלה</> : 'הכל'}
                  </label>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נוסח</div>
                {FILTER_NUSACH.map(n => (
                  <label key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
                    <input type="radio" name="nusach" checked={filterNusach === n} onChange={() => setFilterNusach(n)} />
                    {n}
                  </label>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>רמת הידור</div>
                {FILTER_HIDUR.map(h => (
                  <label key={h} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
                    <input type="radio" name="hidur" checked={filterHidur === h} onChange={() => setFilterHidur(h)} />
                    {h}
                  </label>
                ))}
              </div>
              {CAT_FILTERS[activeCat]?.map(filter => (
                <div key={filter.label} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#0c1a35' }}>{filter.label}</div>
                  {filter.options.map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12 }}>
                      <input type="radio" name={`cf_${filter.label}`} checked={(catFilters[filter.label] || 'הכל') === opt} onChange={() => setCatFilters(prev => ({ ...prev, [filter.label]: opt }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              ))}
              <button onClick={() => { setPriceMin(''); setPriceMax(''); setMinRating(0); setFilterNusach('הכל'); setFilterHidur('הכל'); setCatFilters({}); }}
                style={{ width: '100%', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, padding: '8px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                נקה סינון
              </button>
            </div>
          )}
          {(!isMobile || !showSidebar) && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ fontSize: isMobile ? 12 : 13, color: '#555' }}>
                  {filtered.length} תוצאות — <strong style={{ color: '#0c1a35' }}>{activeCat === 'הכל' ? 'כל המוצרים' : activeCat}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#555' }}>מיין:</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                    <option>מומלצים</option>
                    <option>מחיר: נמוך לגבוה</option>
                    <option>מחיר: גבוה לנמוך</option>
                    <option>דירוג</option>
                  </select>
                </div>
              </div>
              {!isMobile && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {CATS.map(cat => (
                    <button key={cat} onClick={() => setActiveCat(cat)}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: activeCat === cat ? '#0c1a35' : '#fff', color: activeCat === cat ? '#fff' : '#333', border: activeCat === cat ? '1px solid #0c1a35' : '1px solid #ddd', fontWeight: activeCat === cat ? 700 : 400 }}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>טוען מוצרים...</div>
              ) : paginated.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>לא נמצאו מוצרים</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(195px, 1fr))', gap: isMobile ? 8 : 12 }}>
                  {paginated.map(p => (
                    <ProductCard key={p.id} p={p}
                      onAddToCart={() => addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl || p.image_url, quantity: 1 })}
                      onClick={() => router.push(`/product/${p.id}`)} />
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 24, flexWrap: 'wrap' }}>
                  <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontSize: 13 }}>‹ הקודם</button>
                  {Array.from({ length: Math.min(isMobile ? 5 : 7, totalPages) }, (_, i) => {
                    let p2: number;
                    if (totalPages <= 7) p2 = i + 1;
                    else if (page <= 4) p2 = i + 1;
                    else if (page >= totalPages - 3) p2 = totalPages - 6 + i;
                    else p2 = page - 3 + i;
                    return (
                      <button key={p2} onClick={() => goToPage(p2)} style={{ padding: '7px 11px', borderRadius: 6, border: '1px solid', borderColor: page === p2 ? '#0c1a35' : '#ddd', background: page === p2 ? '#0c1a35' : '#fff', color: page === p2 ? '#fff' : '#333', cursor: 'pointer', fontWeight: page === p2 ? 700 : 400, fontSize: 13 }}>{p2}</button>
                    );
                  })}
                  <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontSize: 13 }}>הבא ›</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <footer style={{ marginTop: 40, background: '#0f1111', color: '#fff' }}>
        <div style={{ borderBottom: '1px solid #333', padding: '24px 16px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 16 : 30 }}>
            {[
              { title: 'קבלו מידע', items: ['אודות Your Sofer', 'הצהרת נגישות', 'הצהרת פרטיות'] },
              { title: 'הרוויחו אתנו', items: ['הצטרפו כסופר', 'הצטרפו כשליח'] },
              { title: 'שירות לקוחות', items: ['שאלות נפוצות', 'מדיניות החזרות', 'צרו קשר'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: '#999', marginBottom: 5, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#999')}>{item}</div>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#ddd' }}>מידע ולמידה</div>
              {[{ label: '📖 מדריך לקניית מזוזה', path: '/madrich' }, { label: '✍️ מי הסופרים שלנו', path: '/soferim' }, { label: '❓ שאלות נפוצות', path: '/madrich' }].map(link => (
                <div key={link.label} onClick={() => router.push(link.path)} style={{ fontSize: 12, color: '#999', marginBottom: 5, cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#999')}>{link.label}</div>
              ))}
              {!isMobile && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>כל מוצרי הסת"מ נכתבים על ידי סופרים מוסמכים עם פיקוח רבני.</div>
                  <div style={{ marginTop: 10, background: '#1a3a2a', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#a8c8b4', display: 'inline-block' }}>✓ מאושר ומפוקח הלכתית</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="logo" style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)' }} onError={e => (e.currentTarget.style.display = 'none')} />
            <span style={{ fontSize: 18, fontWeight: 900, color: '#b8972a' }}>Your Sofer</span>
          </div>
          {shaliach && <div style={{ fontSize: 11, color: '#888' }}>מוגש על ידי {shaliach.chabadName || shaliach.name}</div>}
          <div style={{ fontSize: 11, color: '#666' }}>© 2025 Your Sofer — כל הזכויות שמורות</div>
        </div>
      </footer>

      <a href="https://wa.me/972584877770" target="_blank" rel="noopener noreferrer"
        style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 999, background: '#25D366', color: '#fff', borderRadius: 50, padding: isMobile ? '10px 16px' : '12px 20px', fontSize: isMobile ? 13 : 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.5)', display: 'flex', alignItems: 'center', gap: 8, direction: 'rtl', textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37,211,102,0.7)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37,211,102,0.5)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.286a.75.75 0 00.92.92l5.427-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.5-5.25-1.377l-.376-.217-3.898 1.059 1.059-3.898-.217-.376A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        {isMobile ? 'וואטסאפ' : 'שאלות? דברו איתנו בוואטסאפ'}
      </a>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
