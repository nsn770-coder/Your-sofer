'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  cat?: string;
  badge?: string;
  stars?: number;
  reviews?: number;
  days?: string;
}

function Stars({ n = 4.5 }: { n?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: 12 }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

export default function CategoryClient({ category }: { category: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'products'), where('cat', '==', category));
        const snap = await getDocs(q);
        const data: Product[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
        setProducts(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  function handleAddToCart(p: Product) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl || p.image_url, quantity: 1 });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 2000);
  }

  const navy = '#0c1a35';
  const gold = '#b8972a';

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}>
          <a href="/" style={{ color: '#0e6ba8', fontWeight: 600, textDecoration: 'none' }}>דף הבית</a>
          <span style={{ color: '#ccc' }}>›</span>
          <span style={{ color: '#333', fontWeight: 600 }}>{category}</span>
        </div>
      </div>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${navy} 0%, #1a3060 100%)`, padding: '40px 24px 32px', textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 900, margin: '0 0 10px' }}>{category}</h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
          {loading ? '' : `${products.length} מוצרים זמינים`}
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888', fontSize: 16 }}>⏳ טוען מוצרים...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 18, color: '#666', marginBottom: 24 }}>אין מוצרים בקטגוריה זו כרגע</div>
            <button
              onClick={() => router.push('/')}
              style={{ background: gold, color: navy, border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              לחנות המלאה ←
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {products.map(p => {
              const discount = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
              const img = p.imgUrl || p.image_url;
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/product/${p.id}`)}
                  style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#f7f8f8' }}>
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>📦</div>
                    )}
                    {p.badge && (
                      <span style={{ position: 'absolute', top: 8, right: 8, background: p.badge === 'מבצע' ? '#c0392b' : p.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        {p.badge}
                      </span>
                    )}
                    {discount > 0 && (
                      <span style={{ position: 'absolute', top: p.badge ? 34 : 8, right: 8, background: '#c0392b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        -{discount}%
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Stars n={p.stars || 4.5} />
                      <span style={{ fontSize: 11, color: '#0e6ba8' }}>({p.reviews || 0})</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      {p.was && <div style={{ fontSize: 11, color: '#888', textDecoration: 'line-through' }}>₪{p.was}</div>}
                      <span style={{ fontSize: 18, fontWeight: 900, color: navy }}>₪{p.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#c7511f', marginBottom: 8 }}>🚚 משלוח חינם · {p.days || '7-14'} ימים</div>
                    <button
                      onClick={e => { e.stopPropagation(); handleAddToCart(p); }}
                      style={{ width: '100%', background: added === p.id ? '#27ae60' : gold, border: 'none', color: added === p.id ? '#fff' : navy, borderRadius: 20, padding: '7px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                      {added === p.id ? '✅ נוסף!' : 'הוסף לסל'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      {!loading && products.length > 0 && (
        <div style={{ background: navy, padding: '40px 24px', textAlign: 'center', color: '#fff' }}>
          <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>רוצים לראות עוד מוצרים?</p>
          <button
            onClick={() => router.push('/')}
            style={{ background: gold, color: navy, border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
            לחנות המלאה ←
          </button>
        </div>
      )}
    </div>
  );
}
