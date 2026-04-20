'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, orderBy, limit, getDocs, where,
} from 'firebase/firestore';
import { db } from '@/app/firebase';

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  was?: number | null;
  priority?: number;
  isBestSeller?: boolean;
  hidden?: boolean;
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="#b8972a" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function TrendingSection() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(
      query(
        collection(db, 'products'),
        where('isBestSeller', '==', true),
        orderBy('priority', 'desc'),
        limit(12),
      )
    ).then(snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.hidden !== true);
      if (items.length < 4) {
        return getDocs(query(collection(db, 'products'), orderBy('priority', 'desc'), limit(12)));
      }
      setProducts(items);
      setLoading(false);
      return null;
    }).then(fallback => {
      if (!fallback) return;
      setProducts(
        fallback.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => p.hidden !== true)
          .slice(0, 8),
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0c1a35 0%, #162d5a 100%)',
      padding: 'clamp(36px,5vw,64px) 0',
      direction: 'rtl',
      overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(184,151,42,0.18)', border: '1px solid rgba(184,151,42,0.4)', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#e6c84a', letterSpacing: '0.08em', marginBottom: 12 }}>
              <StarIcon /> הנמכרים ביותר
            </div>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 900, color: '#fff', margin: 0 }}>
              מוצרים פופולריים
            </h2>
          </div>
          <button
            onClick={() => router.push('/category/מזוזות')}
            style={{ background: 'none', border: '1.5px solid rgba(184,151,42,0.5)', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#e6c84a', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          >
            לכל המוצרים ←
          </button>
        </div>

        {/* Horizontal scroll row */}
        <div
          className="hide-scrollbar"
          style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 200, borderRadius: 14, overflow: 'hidden', background: 'rgba(255,255,255,0.07)' }}>
                  <div style={{ paddingTop: '100%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 8, width: '75%' }} />
                    <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))
            : products.map(p => {
                const img = p.imgUrl || p.image_url || '';
                const hasSale = typeof p.was === 'number' && p.was > p.price;
                const savePct = hasSale ? Math.round((1 - p.price / p.was!) * 100) : 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/product/${p.id}`)}
                    style={{
                      flexShrink: 0,
                      width: 'clamp(160px, 20vw, 210px)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(184,151,42,0.5)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden' }}>
                      {img ? (
                        <img src={img} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 40, opacity: 0.2 }}>📜</span>
                        </div>
                      )}
                      {hasSale && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: '#c0392b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>
                          -{savePct}%
                        </div>
                      )}
                      {p.isBestSeller && (
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#b8972a', color: '#0c1a35', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <StarIcon /> פופולרי
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0ece4', lineHeight: 1.4, flex: 1 }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#b8972a' }}>
                          ₪{p.price?.toLocaleString('he-IL')}
                        </span>
                        {hasSale && (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>
                            ₪{p.was?.toLocaleString('he-IL')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
