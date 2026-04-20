'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  was?: number | null;
  priority?: number;
  hidden?: boolean;
}

const TABS = [
  { label: 'מזוזות',         cat: 'קלפי מזוזה' },
  { label: 'תפילין',         cat: 'תפילין קומפלט' },
  { label: 'מתנות',          cat: 'מתנות' },
  { label: 'יודאיקה',        cat: 'יודאיקה' },
] as const;

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const img = product.imgUrl || product.image_url || '';
  const hasSale = typeof product.was === 'number' && product.was > product.price;
  const savePct = hasSale ? Math.round((1 - product.price / product.was!) * 100) : 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1.5px solid ${hovered ? '#b8972a' : '#ede8df'}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(184,151,42,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '100%', background: '#f5f1ea', overflow: 'hidden' }}>
        {img ? (
          <img
            src={img}
            alt={product.name}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.35s ease',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
          />
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
      </div>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35', lineHeight: 1.4, flex: 1 }}>
          {product.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#b8972a' }}>
            ₪{product.price?.toLocaleString('he-IL')}
          </span>
          {hasSale && (
            <span style={{ fontSize: 12, color: '#bbb', textDecoration: 'line-through' }}>
              ₪{product.was?.toLocaleString('he-IL')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductTabsSection() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState<Record<number, Product[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (products[activeTab]) return;
    setLoading(true);
    const cat = TABS[activeTab].cat;
    getDocs(
      query(collection(db, 'products'), where('cat', '==', cat), orderBy('priority', 'desc'), limit(8))
    ).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.hidden !== true)
        .slice(0, 8);
      setProducts(prev => ({ ...prev, [activeTab]: list }));
    }).catch(() => {
      setProducts(prev => ({ ...prev, [activeTab]: [] }));
    }).finally(() => setLoading(false));
  }, [activeTab]);  // eslint-disable-line react-hooks/exhaustive-deps

  const items = products[activeTab] ?? [];

  return (
    <div style={{ background: '#fff', padding: 'clamp(36px,5vw,60px) clamp(16px,4vw,40px)', direction: 'rtl' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 900, color: '#0c1a35', margin: '0 0 8px' }}>
            קנה לפי קטגוריה
          </h2>
          <p style={{ fontSize: 14, color: '#888', margin: 0 }}>
            מוצרי סת&quot;מ מאומתים — ישירות מהסופר
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                padding: '9px 22px',
                borderRadius: 30,
                border: `2px solid ${activeTab === i ? '#b8972a' : '#e0dbd0'}`,
                background: activeTab === i ? '#b8972a' : '#fff',
                color: activeTab === i ? '#0c1a35' : '#555',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 14, overflow: 'hidden', background: '#f5f5f5' }}>
                <div style={{ paddingTop: '100%', background: '#ebebeb', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: 14 }}>
                  <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, marginBottom: 8, width: '75%' }} />
                  <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'clamp(10px,1.5vw,18px)',
          }}>
            {items.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => router.push(`/product/${p.id}`)}
              />
            ))}
            {items.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', color: '#aaa', fontSize: 15 }}>
                אין מוצרים זמינים כרגע
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button
            onClick={() => router.push(`/category/${encodeURIComponent(TABS[activeTab].cat)}`)}
            style={{
              background: 'none',
              border: '2px solid #0c1a35',
              borderRadius: 12,
              padding: '11px 32px',
              fontSize: 14,
              fontWeight: 700,
              color: '#0c1a35',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#f0ebe0')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            לכל {TABS[activeTab].label} ←
          </button>
        </div>
      </div>
    </div>
  );
}
