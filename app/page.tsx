'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useCart } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import { useShaliach } from './contexts/ShaliachContext';
import { CATS, NAV_ITEMS } from './constants/categories';

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
  category?: string;   // ← הוסף את זה
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
  { name: 'מזוזות', img: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&q=80', sub: 'מכל הסוגים והגדלים' },
  { name: 'תפילין', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', sub: 'אשכנז, ספרד, חב״ד' },
  { name: 'מגילות', img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', sub: 'מגילת אסתר ועוד' },
  { name: 'יודאיקה', img: 'https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=400&q=80', sub: 'חנוכיות, כוסות ועוד' },
  { name: 'ספרי תורה', img: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400&q=80', sub: 'ספרי תורה מהודרים' },
  { name: 'מתנות', img: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80', sub: 'לכל אירוע ומועד' },
];

const FILTER_NUSACH = ['הכל', 'אשכנז', 'ספרד', 'חב"ד', 'תימני', 'פרדי'];
const FILTER_HIDUR = ['הכל', 'מהודר', 'מהודר מן המובחר', 'רגיל'];

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

  return (
    <div onClick={onClick} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}>
      <div style={{ position: 'relative', paddingTop: '100%', background: '#f7f8f8', overflow: 'hidden' }}>
        {imgs.length > 0 ? (
          <img src={imgs[imgIdx]} alt={p.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
        )}
        {imgs.length > 1 && (
          <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}
            onClick={e => e.stopPropagation()}>
            {imgs.map((_, i) => (
              <button key={i} onMouseEnter={() => setImgIdx(i)} onClick={() => setImgIdx(i)}
                style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, background: i === imgIdx ? '#0c1a35' : 'rgba(255,255,255,0.8)' }} />
            ))}
          </div>
        )}
        {p.badge && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: p.badge === 'מבצע' ? '#c0392b' : p.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{p.badge}</span>
        )}
      </div>
      <div style={{ padding: '10px 8px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {p.name}
        </div>
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
        <button onClick={e => { e.stopPropagation(); onAddToCart(); }}
          style={{ width: '100%', background: '#b8972a', border: '1px solid #a07820', color: '#0c1a35', borderRadius: 20, padding: '7px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          הוסף לסל
        </button>
      </div>
    </div>
  );
}

const ITEMS_PER_PAGE = 24;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('הכל');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('מומלצים');
  const [showHamburger, setShowHamburger] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [filterNusach, setFilterNusach] = useState('הכל');
  const [filterHidur, setFilterHidur] = useState('הכל');
  const [minRating, setMinRating] = useState(0);
  const [promoCats, setPromoCats] = useState<PromoCat[]>(PROMO_CATS_DEFAULT);
  const [homeContent, setHomeContent] = useState({
    heroTitle: 'רכישת סת"מ',
    heroSubtitle: 'ישירות מהסופר',
    heroText: 'בחר את הסופר שלך — דע מי כותב את המזוזה שלך. ללא מתווכים, ישירות מהמקור.',
  });

  const router = useRouter();
  const { count, addItem } = useCart();
  const { user, signInWithGoogle, logout } = useAuth();
  const { shaliach } = useShaliach();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        // מוצרים
        const snap = await getDocs(collection(db, 'products'));
        const data: Product[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
        setProducts(data);

        // תוכן דף הבית
        const contentSnap = await getDoc(doc(db, 'content', 'homepage'));
        if (contentSnap.exists()) setHomeContent(contentSnap.data() as any);

        // קטגוריות מ-Firestore
        const catsSnap = await getDocs(collection(db, 'categories'));
        const catsData: PromoCat[] = [];
        catsSnap.forEach(d => {
          const cat = d.data();
          if (cat.imgUrl) catsData.push({ name: cat.name, img: cat.imgUrl, sub: cat.sub || '' });
        });
        if (catsData.length > 0) {
          const order = ['מזוזות', 'תפילין', 'מגילות', 'יודאיקה', 'ספרי תורה', 'מתנות'];
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
if (activeCat !== 'הכל') r = r.filter(p => 
  (p.cat?.trim() || p.category?.trim()) === activeCat.trim()
);    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (priceMin) r = r.filter(p => p.price >= Number(priceMin));
    if (priceMax) r = r.filter(p => p.price <= Number(priceMax));
    if (minRating > 0) r = r.filter(p => (p.stars || 4.5) >= minRating);
    if (sortBy === 'מחיר: נמוך לגבוה') r.sort((a, b) => a.price - b.price);
    else if (sortBy === 'מחיר: גבוה לנמוך') r.sort((a, b) => b.price - a.price);
    else if (sortBy === 'דירוג') r.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    setFiltered(r);
    setPage(1);
  }, [activeCat, search, products, priceMin, priceMax, minRating, sortBy]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function goToPage(p: number) {
    setPage(p);
    mainRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* ══ באנר שליח ══ */}
      {shaliach && (
        <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a3a6a 100%)', borderBottom: '3px solid #b8972a', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, direction: 'rtl' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {shaliach.logoUrl ? (
              <img src={shaliach.logoUrl} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid #b8972a' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 10, background: '#b8972a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🟦</div>
            )}
            <div>
              <div style={{ fontSize: 11, color: '#b8972a', fontWeight: 700 }}>ברוכים הבאים — האתר הוגש על ידי</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{shaliach.chabadName || shaliach.name}</div>
              <div style={{ fontSize: 12, color: '#a8c0d8' }}>{shaliach.rabbiName}{shaliach.city && ` · ${shaliach.city}`}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 12, color: '#a8c0d8', textAlign: 'center' }}>
              <div>רכישה דרך הקישור שלנו</div>
              <div style={{ color: '#b8972a', fontWeight: 700 }}>תומכת ישירות בבית חבד</div>
            </div>
            {shaliach.phone && (
              <a href={`https://wa.me/972${shaliach.phone.replace(/\D/g, '').slice(1)}`} target="_blank" rel="noopener noreferrer"
                style={{ background: '#25D366', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                💬 צור קשר
              </a>
            )}
          </div>
        </div>
      )}

      {/* ══ NAVBAR ══ */}
      <header style={{ background: '#0c1a35', color: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowHamburger(!showHamburger)}
            style={{ background: 'none', border: '1px solid transparent', borderRadius: 4, color: '#fff', padding: '6px 8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
            <div style={{ width: 20, height: 2, background: '#fff', borderRadius: 2 }} />
          </button>

          <div onClick={() => router.push('/')} style={{ cursor: 'pointer', flexShrink: 0, border: '1px solid transparent', borderRadius: 4, padding: '4px 8px' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#b8972a')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>Your Sofer</div>
            <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
          </div>

          <div style={{ flex: 1, display: 'flex', maxWidth: 800, borderRadius: 8, overflow: 'hidden' }}>
            <select onChange={e => setActiveCat(e.target.value)} value={activeCat}
              style={{ background: '#e8e8e8', border: 'none', padding: '10px 10px', fontSize: 12, color: '#333', cursor: 'pointer', borderRadius: '0 8px 8px 0', minWidth: 120 }}>
              <option value="הכל">כל הקטגוריות</option>
              {CATS.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSearch(searchInput)}
              placeholder="חיפוש סת״ם ויודאיקה מאומתים..."
              style={{ flex: 1, border: 'none', padding: '10px 14px', fontSize: 14, color: '#333', outline: 'none' }} />
            <button onClick={() => setSearch(searchInput)}
              style={{ background: '#b8972a', border: 'none', padding: '0 18px', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginRight: 'auto' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #b8972a' }} />}
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: '#ccc', fontSize: 10 }}>שלום,</div>
                  <div style={{ fontWeight: 700 }}>{user.displayName?.split(' ')[0]}</div>
                </div>
                {user.role === 'admin' && <button onClick={() => router.push('/admin')} style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>👑 ניהול</button>}
                {user.role === 'sofer' && <button onClick={() => router.push('/sofer-dashboard')} style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✍️ פורטל</button>}
                {user.role === 'shaliach' && <button onClick={() => router.push('/shaliach-dashboard')} style={{ background: 'none', color: '#fff', border: '1px solid #b8972a', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🟦 פורטל</button>}
                <button onClick={logout} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>יציאה</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} style={{ background: 'none', border: '1px solid #555', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                התחבר
              </button>
            )}
            <div onClick={() => router.push('/cart')} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ position: 'relative' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {count > 0 && <span style={{ position: 'absolute', top: -4, left: -4, background: '#b8972a', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>}
              </div>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>סל ({count})</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#162444', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 14px', display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {NAV_ITEMS.map(item => (
              <button key={item.label} onClick={() => {
                if (item.cat) { setActiveCat(item.cat); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }
                else if (item.action === 'soferim') router.push('/soferim');
                else if (item.action === 'join') router.push('/join');
                else if (item.action === 'shluchim') router.push('/shluchim');
              }}
                style={{ background: 'none', border: 'none', color: item.cat && activeCat === item.cat ? '#b8972a' : '#fff', padding: '9px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: item.cat && activeCat === item.cat ? 700 : 400, borderBottom: item.cat && activeCat === item.cat ? '2px solid #b8972a' : '2px solid transparent', transition: 'color 0.15s' }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#1a3a2a', padding: '5px 14px', fontSize: 12, color: '#a8c8b4', display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <span>✍️ <strong style={{ color: '#fff' }}>ישירות מהסופר</strong> לביתך</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>🔒 <strong style={{ color: '#fff' }}>תשלום מאובטח</strong></span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>🛡️ <strong style={{ color: '#fff' }}>אחריות הפלטפורמה</strong> על כל רכישה</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>📦 <strong style={{ color: '#fff' }}>משלוח לכל הארץ</strong></span>
        </div>
      </header>

      {/* תפריט המבורגר */}
      {showHamburger && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setShowHamburger(false)}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 300, height: '100%', background: '#fff', boxShadow: '-4px 0 20px rgba(0,0,0,0.2)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#0c1a35', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>☰ כל הקטגוריות</span>
              <button onClick={() => setShowHamburger(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {CATS.map(cat => (
              <button key={cat} onClick={() => { setActiveCat(cat); setShowHamburger(false); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ display: 'block', width: '100%', padding: '14px 20px', textAlign: 'right', background: activeCat === cat ? '#f0f7ff' : 'none', border: 'none', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: activeCat === cat ? 700 : 400, color: activeCat === cat ? '#0e6ba8' : '#333', cursor: 'pointer' }}>
                {cat}
              </button>
            ))}
            <div style={{ padding: '12px 20px', borderTop: '2px solid #f0f0f0', marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 700, marginBottom: 8 }}>דפים נוספים</div>
              <button onClick={() => { router.push('/soferim'); setShowHamburger(false); }} style={{ display: 'block', width: '100%', padding: '10px 0', textAlign: 'right', background: 'none', border: 'none', fontSize: 14, color: '#0c1a35', cursor: 'pointer' }}>✍️ הסופרים שלנו</button>
              <button onClick={() => { router.push('/soferim/apply'); setShowHamburger(false); }} style={{ display: 'block', width: '100%', padding: '10px 0', textAlign: 'right', background: 'none', border: 'none', fontSize: 14, color: '#0c1a35', cursor: 'pointer' }}>🌟 הצטרף לפלטפורמה</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ HERO ══ */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: 300, background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 40%, #3d7a52 70%, #1a3a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6%', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>
              {shaliach ? <>רכישת סת&quot;ם<br /><span style={{ color: '#b8972a' }}>בית חבד {shaliach.city || ''}</span></> : <>{homeContent.heroTitle}<br /><span style={{ color: '#b8972a' }}>{homeContent.heroSubtitle}</span></>}
            </h1>
            <p style={{ fontSize: 15, color: '#a8c8b4', marginBottom: 24, maxWidth: 440, lineHeight: 1.6 }}>
              {shaliach ? `${shaliach.chabadName || shaliach.name} ממליץ על מוצרי סת״ם מסופרים מוסמכים ומאומתים.` : homeContent.heroText}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => mainRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ background: '#b8972a', color: '#0c1a35', fontSize: 14, fontWeight: 700, padding: '11px 28px', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {shaliach ? 'לקנייה עכשיו ←' : 'לקנייה ←'}
              </button>
              {!shaliach && (
                <button onClick={() => router.push('/soferim')}
                  style={{ background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 22px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 8, cursor: 'pointer' }}>
                  הסופרים שלנו
                </button>
              )}
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 2 }}>
            {shaliach?.logoUrl ? (
              <img src={shaliach.logoUrl} alt="" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 16 }} />
            ) : (
              <div style={{ fontSize: 90, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}>📜</div>
            )}
          </div>
        </div>
      </div>

      {/* ══ קטגוריות מ-Firestore ══ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '20px 0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f1111', marginBottom: 14 }}>קטגוריות מובילות</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {promoCats.map(c => (
              <div key={c.name} onClick={() => { setActiveCat(c.name); mainRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ height: 100, overflow: 'hidden', position: 'relative' }}>
                  <img src={c.img} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                </div>
                <div style={{ padding: '8px 10px', background: '#fff' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#0f1111' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#0e6ba8', marginTop: 2 }}>לכל המבחר ←</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div ref={mainRef} style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 12px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* סרגל סינון */}
        <div style={{ width: 220, flexShrink: 0, background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: '16px', position: 'sticky', top: 120 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0f1111', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #eee' }}>🔍 סינון תוצאות</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>טווח מחירים</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="מינ" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
              <input type="number" placeholder="מקס" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', fontSize: 12 }} />
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
          <button onClick={() => { setPriceMin(''); setPriceMax(''); setMinRating(0); setFilterNusach('הכל'); setFilterHidur('הכל'); }}
            style={{ width: '100%', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 6, padding: '8px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            נקה סינון
          </button>
        </div>

        {/* תוצאות */}
        <div style={{ flex: 1 }}>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: '#555' }}>
              {filtered.length} תוצאות עבור <strong style={{ color: '#0c1a35' }}>&quot;{activeCat === 'הכל' ? 'כל המוצרים' : activeCat}&quot;</strong>
              {search && <> · חיפוש: <strong>&quot;{search}&quot;</strong></>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#555' }}>מיין לפי:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ border: '1px solid #ddd', borderRadius: 6, padding: '5px 10px', fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                <option>מומלצים</option>
                <option>מחיר: נמוך לגבוה</option>
                <option>מחיר: גבוה לנמוך</option>
                <option>דירוג</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {CATS.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: activeCat === cat ? '#0c1a35' : '#fff', color: activeCat === cat ? '#fff' : '#333', border: activeCat === cat ? '1px solid #0c1a35' : '1px solid #ddd', fontWeight: activeCat === cat ? 700 : 400 }}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>טוען מוצרים...</div>
          ) : paginated.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>לא נמצאו מוצרים</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 12 }}>
              {paginated.map(p => (
                <ProductCard key={p.id} p={p}
                  onAddToCart={() => addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl || p.image_url, quantity: 1 })}
                  onClick={() => router.push(`/product/${p.id}`)} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontSize: 13 }}>
                ‹ הקודם
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let p2: number;
                if (totalPages <= 7) p2 = i + 1;
                else if (page <= 4) p2 = i + 1;
                else if (page >= totalPages - 3) p2 = totalPages - 6 + i;
                else p2 = page - 3 + i;
                return (
                  <button key={p2} onClick={() => goToPage(p2)}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid', borderColor: page === p2 ? '#0c1a35' : '#ddd', background: page === p2 ? '#0c1a35' : '#fff', color: page === p2 ? '#fff' : '#333', cursor: 'pointer', fontWeight: page === p2 ? 700 : 400, fontSize: 13 }}>
                    {p2}
                  </button>
                );
              })}
              <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontSize: 13 }}>
                הבא ›
              </button>
              <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>עמוד {page} מתוך {totalPages}</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ marginTop: 40, background: '#0f1111', color: '#fff' }}>
        <div style={{ borderBottom: '1px solid #333', padding: '30px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 30 }}>
            {[
              { title: 'קבלו מידע', items: ['אודות Your Sofer', 'השקעות ומשקיעים', 'הצהרת נגישות', 'הצהרת פרטיות'] },
              { title: 'הרוויחו אתנו', items: ['מכרו בפלטפורמה', 'הצטרפו כסופר', 'הצטרפו כשליח', 'פרסמו אצלנו'] },
              { title: 'שירות לקוחות', items: ['עזרה ושאלות נפוצות', 'עקבו אחר הזמנה', 'מדיניות החזרות', 'צרו קשר'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#ddd' }}>{col.title}</div>
                {col.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: '#999', marginBottom: 6, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#999')}>{item}</div>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#ddd' }}>פיקוח הלכתי</div>
              <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>כל מוצרי הסת"מ נכתבים על ידי סופרים מוסמכים, עם פיקוח רבני בפיקוח מחשב ותעודת כשרות.</div>
              <div style={{ marginTop: 12, background: '#1a3a2a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#a8c8b4', display: 'inline-block' }}>✓ מאושר ומפוקח הלכתית</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a' }}>✡ Your Sofer</div>
          {shaliach && <div style={{ fontSize: 12, color: '#888' }}>מוגש על ידי {shaliach.chabadName || shaliach.name}{shaliach.city && ` · ${shaliach.city}`}</div>}
          <div style={{ fontSize: 12, color: '#666' }}>© 2025 Your Sofer — כל הזכויות שמורות</div>
          <div style={{ fontSize: 12, color: '#666' }}>🔒 עסקאות מאובטחות | 🛡️ פיקוח הלכתי | 📦 משלוח לכל הארץ</div>
        </div>
      </footer>
    </div>
  );
}
