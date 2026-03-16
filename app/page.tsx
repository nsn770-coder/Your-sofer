'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useCart } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';
import { CATS, NAV_ITEMS } from './constants/categories';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  badge?: string;
  stars?: number;
  reviews?: number;
  days?: string;
}

const PROMO_CATS = [
  { name: 'מזוזות',    emoji: '📜', sub: 'מכל הסוגים והגדלים' },
  { name: 'תפילין',   emoji: '🕯️', sub: 'אשכנז, ספרד, חב״ד' },
  { name: 'מגילות',   emoji: '📖', sub: 'מגילת אסתר ועוד' },
  { name: 'יודאיקה',  emoji: '✡️', sub: 'חנוכיות, כוסות ועוד' },
];

function Stars({ n = 4.5 }: { n?: number }) {
  return (
    <span className="text-[#e6a817] text-xs">
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('הכל');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { count, addItem } = useCart();
  const { user, signInWithGoogle, logout } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const data: Product[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
        setProducts(data);
        setFiltered(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    let r = products;
    if (activeCat !== 'הכל') r = r.filter(p => p.cat === activeCat);
    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(r);
  }, [activeCat, search, products]);

  return (
    <div className="min-h-screen" style={{ background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* ══ NAVBAR ══ */}
      <header style={{ background: '#0c1a35', color: '#fff', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Logo */}
          <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', lineHeight: 1.1, flexShrink: 0 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</span>
            <span style={{ fontSize: 10, color: '#b8972a', fontWeight: 700 }}>ישראל</span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, display: 'flex', maxWidth: 700 }}>
            <select style={{ background: '#f3f4f4', border: 'none', padding: '9px 10px', fontSize: 12, color: '#333', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
              <option>כל הקטגוריות</option>
              {CATS.slice(1).map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש סת״ם ויודאיקה מאומתים..."
              style={{ flex: 1, border: 'none', padding: '9px 12px', fontSize: 14, color: '#333', outline: 'none' }}
            />
            <button
              onClick={() => {}}
              style={{ background: '#b8972a', border: 'none', padding: '0 14px', cursor: 'pointer', borderRadius: '8px 0 0 8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginRight: 'auto' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #b8972a' }} />}
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: '#ccc', fontSize: 11 }}>שלום,</div>
                  <div style={{ fontWeight: 700 }}>{user.displayName?.split(' ')[0]}</div>
                </div>
                {user.role === 'admin' && (
                  <button onClick={() => router.push('/admin')}
                    style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    👑 ניהול
                  </button>
                )}
                <button onClick={logout} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>יציאה</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle}
                style={{ background: 'none', border: '1px solid #555', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                התחבר
              </button>
            )}

            {/* הזמנות */}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#ccc', cursor: 'pointer' }}>
              <div>הזמנות</div>
              <div style={{ fontWeight: 700 }}>שלי</div>
            </div>

            {/* Cart */}
            <div onClick={() => router.push('/cart')} style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -4, left: -4, background: '#b8972a', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#ccc' }}>
                <div>הזמנות</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>סל ({count})</div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav2 */}
        <div style={{ background: '#162444', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button style={{ background: 'none', border: 'none', color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              ☰ כל הקטגוריות
            </button>
            {NAV_ITEMS.map(item => (
              <button key={item.label}
                onClick={() => {
  if (item.cat) setActiveCat(item.cat);
  else if (item.action === 'soferim') router.push('/soferim');
  else if (item.action === 'join') router.push('/join');
  else if (item.action === 'shluchim') router.push('/shluchim');
}}
                style={{
                  background: 'none', border: 'none',
                  color: item.cat && activeCat === item.cat ? '#b8972a' : '#fff',
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontWeight: item.cat && activeCat === item.cat ? 700 : 400,
                  borderBottom: item.cat && activeCat === item.cat ? '2px solid #b8972a' : '2px solid transparent'
                }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Benefits bar */}
        <div style={{ background: '#1a3a2a', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', padding: '5px 14px', fontSize: 12, color: '#a8c8b4', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <span>✍️ <strong style={{ color: '#fff' }}>ישירות מהסופר</strong> לביתך</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>🔒 <strong style={{ color: '#fff' }}>תשלום מאובטח</strong></span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>🛡️ <strong style={{ color: '#fff' }}>אחריות הפלטפורמה</strong> על כל רכישה</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span>📦 <strong style={{ color: '#fff' }}>משלוח לכל הארץ</strong></span>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width: '100%', height: 320,
          background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 40%, #3d7a52 70%, #1a3a2a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 6%', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817' fill-opacity='1'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 10 }}>
              רכישת סת&quot;ם<br /><span style={{ color: '#b8972a' }}>ישירות מהסופר</span>
            </h2>
            <p style={{ fontSize: 16, color: '#a8c8b4', marginBottom: 24, maxWidth: 440, lineHeight: 1.6 }}>
              בחר את הסופר שלך — דע מי כותב את המזוזה שלך, מי כתב את התפילין שלך. ללא מתווכים, ישירות מהמקור.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={{ background: '#b8972a', color: '#0c1a35', fontSize: 14, fontWeight: 700, padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                בחר את הסופר שלך ←
              </button>
              <button style={{ background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px 22px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 8, cursor: 'pointer' }}>
                הצטרף כסופר
              </button>
            </div>
          </div>
          <div style={{ fontSize: 100, position: 'relative', zIndex: 2, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))' }}>📜</div>
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 12px' }}>

        {/* Results bar */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
          <div style={{ color: '#555' }}>
            1–{filtered.length} תוצאות עבור <span style={{ color: '#0e6ba8', fontWeight: 600 }}>&quot;{activeCat === 'הכל' ? 'כל המוצרים' : activeCat}&quot;</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#555' }}>מיין לפי:</span>
            <select style={{ border: '1px solid #ddd', borderRadius: 8, padding: '5px 10px', fontSize: 13, background: '#fff', cursor: 'pointer', direction: 'rtl' }}>
              <option>מומלצים</option>
              <option>מחיר: נמוך לגבוה</option>
              <option>מחיר: גבוה לנמוך</option>
              <option>חדשים ביותר</option>
            </select>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATS.map(cat => (
            <button key={cat}
              onClick={() => setActiveCat(cat)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                background: activeCat === cat ? '#0c1a35' : '#fff',
                color: activeCat === cat ? '#fff' : '#333',
                border: activeCat === cat ? '1px solid #0c1a35' : '1px solid #ddd',
                fontWeight: activeCat === cat ? 700 : 400
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Promo categories */}
        {activeCat === 'הכל' && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f1111', marginBottom: 12 }}>קטגוריות מובילות</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {PROMO_CATS.map(c => (
                <div key={c.name}
                  onClick={() => setActiveCat(c.name)}
                  style={{
                    background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                    overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}>
                  <div style={{ height: 120, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }}>
                    {c.emoji}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>{c.sub}</div>
                    <span style={{ color: '#0e6ba8', fontSize: 13 }}>לכל המבחר ←</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 18, color: '#666' }}>טוען מוצרים...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>לא נמצאו מוצרים בקטגוריה זו</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {filtered.map(p => {
              const img = p.imgUrl || p.image_url;
              return (
                <div key={p.id}
                  onClick={() => router.push(`/product/${p.id}`)}
                  style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                  {/* Image */}
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#f7f8f8', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={p.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
                    )}
                    {p.badge && (
                      <span style={{
                        position: 'absolute', top: 8, right: 8,
                        background: p.badge === 'מבצע' ? '#c0392b' : p.badge === 'חדש' ? '#2980b9' : '#27ae60',
                        color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4
                      }}>{p.badge}</span>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: p.id, name: p.name, price: p.price, imgUrl: img, quantity: 1 });
                      }}
                      style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: 0 }}
                      className="quick-add">
                      + הוסף לסל
                    </button>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '10px 8px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.name}
                    </div>
                    <Stars n={p.stars || 4.5} />
                    <span style={{ fontSize: 11, color: '#555', marginRight: 4 }}>{p.reviews || 0}</span>
                    <div style={{ marginTop: 6 }}>
                      {p.was && <div style={{ fontSize: 12, color: '#888', textDecoration: 'line-through' }}>₪{p.was}</div>}
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>₪{p.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#c7511f', marginTop: 2 }}>
                      משלוח חינם · מגיע תוך <strong>{p.days || '7-14'} ימים</strong>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        addItem({ id: p.id, name: p.name, price: p.price, imgUrl: img, quantity: 1 });
                      }}
                      style={{ marginTop: 8, width: '100%', background: '#b8972a', border: '1px solid #a07820', color: '#0c1a35', borderRadius: 6, padding: '6px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      הוסף לסל
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/product/${p.id}`); }}
                      style={{ marginTop: 4, width: '100%', background: '#fff', border: '1px solid #b8972a', color: '#0c1a35', borderRadius: 6, padding: '5px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      קנה עכשיו
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <footer style={{ marginTop: 40, background: '#162444', color: '#fff', padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a', marginBottom: 6 }}>✡ Your Sofer</div>
        <div style={{ fontSize: 13, color: '#8899aa' }}>סת&quot;מ מסופרים מוסמכים — כל הזכויות שמורות © 2025</div>
      </footer>
    </div>
  );
}
