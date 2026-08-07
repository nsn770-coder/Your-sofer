'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ProductCard from '@/components/ui/ProductCard';

interface SaleProduct {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  outOfStock?: boolean;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  clearanceDiscount?: boolean;
  clearanceSalePrice?: number;
  originalPrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  salePercent?: number;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
}

function discountPct(p: SaleProduct): number {
  if (p.clearanceDiscount && p.clearanceSalePrice && p.price)
    return Math.round((1 - p.clearanceSalePrice / p.price) * 100);
  if (p.salePercent) return p.salePercent;
  if (p.salePrice && p.price)
    return Math.round((1 - p.salePrice / p.price) * 100);
  return 0;
}

export default function SaleClient() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [snapSale, snapClearance] = await Promise.all([
          getDocs(query(collection(db, 'products'), where('isOnSale', '==', true))),
          getDocs(query(collection(db, 'products'), where('clearanceDiscount', '==', true))),
        ]);
        const seen = new Set<string>();
        const all: SaleProduct[] = [];
        [...snapSale.docs, ...snapClearance.docs].forEach(d => {
          if (seen.has(d.id)) return;
          seen.add(d.id);
          all.push({ id: d.id, ...d.data() } as SaleProduct);
        });
        all
          .filter(p => p.hidden !== true)
          .sort((a, b) => discountPct(b) - discountPct(a));
        setProducts(all.filter(p => p.hidden !== true).sort((a, b) => discountPct(b) - discountPct(a)));
      } catch (e) {
        console.error('[SaleClient]', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main dir="rtl" style={{ background: '#FFFFFF', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Hero */}
      <div style={{ background: '#1a1a1a', color: '#fff', padding: '48px 24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#C9A227', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
          מחירים מוזלים לזמן מוגבל
        </p>
        <h1 style={{ fontSize: 38, fontWeight: 300, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
          מבצעים
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto' }}>
          כל המוצרים שבהנחה — יודאיקה, כיפות, מזוזות ועוד.
          המחיר המוצג כבר כולל את ההנחה.
        </p>
      </div>

      {/* Badge strip */}
      <div style={{ background: '#3B3B41', padding: '10px 24px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>
        המחירים המוזלים מוצגים ישירות על המוצר &nbsp;·&nbsp; ההנחה מחושבת אוטומטית בעגלה
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#888', fontSize: 15 }}>
            טוען מבצעים...
          </div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
              אין מבצעים פעילים כרגע
            </div>
            <div style={{ fontSize: 15, color: '#888', marginBottom: 28 }}>
              חזרו בקרוב — מבצעים חדשים מתחלפים מדי שבוע
            </div>
            <a href="/" style={{ background: '#1a1a1a', color: '#fff', padding: '12px 28px', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              לחנות הראשית ←
            </a>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24, textAlign: 'right' }}>
              נמצאו {products.length} מוצרים במבצע
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-7">
              {products.map((p, i) => {
                const images = [p.imgUrl || p.image_url].filter(Boolean) as string[];
                // Normalize isOnSale products to clearance fields so ProductCard renders the discount
                const clearanceProps = p.clearanceDiscount
                  ? { clearanceDiscount: true as const, clearanceSalePrice: p.clearanceSalePrice, originalPrice: p.originalPrice }
                  : p.isOnSale && p.salePrice
                    ? { clearanceDiscount: true as const, clearanceSalePrice: p.salePrice, originalPrice: p.price }
                    : {};
                return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    images={images}
                    cat={p.cat}
                    outOfStock={p.outOfStock}
                    isBestSeller={p.isBestSeller}
                    badge={p.badge}
                    was={p.was} productDoc={p}
                    createdAt={p.createdAt}
                    aboveFold={i < 8}
                    {...clearanceProps}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
