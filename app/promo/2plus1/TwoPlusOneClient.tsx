'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '@/app/lib/utils';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import Link from 'next/link';

interface PromoProduct {
  id: string;
  name: string;
  price: number;
  promoPrice: number;
  promoPlan: string;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  hidden?: boolean;
}

const PAGE_SIZE = 24;

export default function TwoPlusOneClient() {
  const [products, setProducts] = useState<PromoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();

  const fetchPage = useCallback(async (after: QueryDocumentSnapshot | null) => {
    setLoading(true);
    try {
      // orderBy('price') alongside where() on a different field requires a composite
      // Firestore index. To avoid that requirement we sort client-side instead.
      const q = after
        ? query(collection(db, 'products'), where('promoPlan', '==', '2+1'), limit(PAGE_SIZE), startAfter(after))
        : query(collection(db, 'products'), where('promoPlan', '==', '2+1'), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as PromoProduct))
        .filter(p => p.hidden !== true)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      setProducts(prev => after ? [...prev, ...docs] : docs);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('[2+1] fetchPage error:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(null); }, [fetchPage]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) fetchPage(lastDoc); }, { threshold: 0.1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, lastDoc, fetchPage]);

  function handleAdd(p: PromoProduct) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl || p.image_url, quantity: 1, promoPlan: '2+1', promoPrice: p.promoPrice } as any);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  const imgOf = (p: PromoProduct) => {
    const raw = p.imgUrl || p.image_url || '';
    return raw ? optimizeCloudinaryUrl(raw, 400) : '';
  };

  return (
    <main dir="rtl" style={{ background: '#F8F6F1', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      {/* Hero banner */}
      <div style={{ background: 'var(--ys-dark-surface)', color: '#fff', padding: '48px 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ys-accent)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
          מבצע מיוחד
        </p>
        <h1 style={{ fontSize: 38, fontWeight: 300, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          קנו 3, שלמו על 2
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto 0' }}>
          הוסיפו 3 מוצרים מהרשימה לעגלה — המוצר הזול ביותר יחושב <strong style={{ color: 'var(--ys-accent)' }}>חינם</strong> אוטומטית.
        </p>
      </div>

      {/* Badge strip */}
      <div style={{ background: 'var(--ys-accent)', padding: '10px 24px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#FEFBF7' }}>
        🎁 המבצע תקף לכל המוצרים המסומנים &nbsp;·&nbsp; ניתן לשלב גדלים וצבעים שונים
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px' }}>
        {products.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#888', fontSize: 16, marginTop: 60 }}>לא נמצאו מוצרים במבצע.</p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {products.map(p => {
            const img = imgOf(p);
            return (
              <div key={p.id} style={{ background: '#fff', borderRadius: 0, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* 2+1 badge */}
                <div style={{ position: 'absolute', top: 10, right: 10, background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, zIndex: 1, letterSpacing: '0.03em' }}>
                  2+1
                </div>
                <Link href={`/product/${p.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ height: 200, background: '#f3f3f3', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🕍</div>
                    )}
                  </div>
                </Link>
                <div style={{ padding: '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Link href={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'var(--ys-text)', fontSize: 13, fontWeight: 600, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                  </Link>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ys-text)' }}>{formatPrice(p.price)}</div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>קנו 3, שלמו על 2</div>
                  <button
                    onClick={() => handleAdd(p)}
                    style={{ marginTop: 'auto', background: addedId === p.id ? '#15803d' : '#2563EB', color: '#fff', border: 'none', padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', borderRadius: 0 }}
                  >
                    {addedId === p.id ? '✓ נוסף לעגלה' : 'הוסף לעגלה'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 40, marginTop: 20 }} />
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: 14 }}>טוען מוצרים...</div>
        )}
        {!hasMore && products.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: 13 }}>הצגנו את כל {products.length} המוצרים במבצע</div>
        )}
      </div>
    </main>
  );
}
