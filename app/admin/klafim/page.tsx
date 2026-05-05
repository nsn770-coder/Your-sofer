'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

const KLAF_CATS = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות'];

interface Product {
  id: string;
  name: string;
  cat?: string;
  category?: string;
  imgUrl?: string;
  image_url?: string;
}

interface ProductWithCount extends Product {
  availableCount: number;
}

export default function KlafimIndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCount[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const stamProducts: Product[] = [];
        snap.forEach(d => {
          const p = { id: d.id, ...d.data() } as Product;
          const cat = p.cat ?? p.category ?? '';
          if (KLAF_CATS.some(c => cat.includes(c))) stamProducts.push(p);
        });

        // For each product count available klafim
        const withCounts = await Promise.all(
          stamProducts.map(async p => {
            try {
              const kSnap = await getDocs(
                query(collection(db, 'klafim'), where('productId', '==', p.id), where('status', '==', 'available'))
              );
              return { ...p, availableCount: kSnap.size };
            } catch {
              return { ...p, availableCount: 0 };
            }
          })
        );

        withCounts.sort((a, b) => b.availableCount - a.availableCount);
        setProducts(withCounts);
      } catch (e) {
        console.error(e);
      } finally {
        setPageLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading || pageLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', color: '#888' }}>
        טוען...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0c1a35', borderBottom: '3px solid #b8972a', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a' }}>📜 ניהול קלפים</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>בחר מוצר לניהול הקלפים שלו</div>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← חזרה לדשבורד
        </Link>
      </div>

      {/* Products grid */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 16px' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 15, paddingTop: 48 }}>
            לא נמצאו מוצרי סת״מ.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
            {products.map(p => (
              <Link
                key={p.id}
                href={`/admin/klafim/${p.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#fff', borderRadius: 12, overflow: 'hidden',
                  border: '1.5px solid #e8e0d0', cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {/* Image */}
                  <div style={{ height: 140, background: '#f0ece0', overflow: 'hidden', position: 'relative' }}>
                    {(p.imgUrl ?? p.image_url) ? (
                      <img
                        src={p.imgUrl ?? p.image_url}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#c8b89a' }}>
                        📜
                      </div>
                    )}
                    {/* Count badge */}
                    <div style={{
                      position: 'absolute', bottom: 8, right: 8,
                      background: p.availableCount > 0 ? '#15803d' : '#9ca3af',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      borderRadius: 20, padding: '3px 10px',
                    }}>
                      {p.availableCount} זמינים
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#0c1a35', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>{p.cat ?? p.category}</div>
                    <div style={{
                      marginTop: 10, background: '#0c1a35', color: '#b8972a',
                      borderRadius: 7, padding: '6px 0', textAlign: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      ניהול קלפים →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
