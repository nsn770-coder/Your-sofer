'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import ProductCard from '@/components/ui/ProductCard';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

const FETCH_CATS = ['יודאיקה', 'כלי שולחן והגשה', 'עיצוב הבית', 'מתנות', 'בר מצווה'];

const INCLUDE_KEYWORDS = [
  'פמוט','פמוטים','גביע','קידוש','פסח','חנוכה','חנוכיה','הבדלה',
  'בשמים','מלחיה','מלחיות','חלה','חלות','אירוח','שולחן שבת',
  'מתנה','מתנות','שבת','חג','נטלה','נטלות','נטילת ידיים',
  'מגש מצה','קערת פסח','סביבון','נר שבת','נרות שבת',
];

const EXCLUDE_KEYWORDS = [
  'מזוזה','מזוזות','תפילין','קלף','קלפי','ספר תורה',
  'מגילה','מגילות','טלית','כיסוי תפילין','כיסוי טלית','תיק','תיקי',
];

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  hidden?: boolean;
  status?: string;
  cat?: string;
  subCategory?: string;
  tags?: string[];
  createdAt?: { seconds: number };
}

function matchesShabbat(p: Product): boolean {
  const text = `${p.name || ''} ${p.cat || ''} ${p.subCategory || ''}`;
  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) return false;
  return INCLUDE_KEYWORDS.some(kw => text.includes(kw));
}

export default function ShabbatHolidaysClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const seen = new Set<string>();
        const all: Product[] = [];

        // Primary query: products by category, then keyword-filtered client-side
        const catSnap = await getDocs(
          query(collection(db, 'products'), where('cat', 'in', FETCH_CATS))
        );
        catSnap.forEach(d => {
          const p = { id: d.id, ...d.data() } as Product;
          if (!p.hidden && p.status !== 'inactive' && !seen.has(p.id) && matchesShabbat(p)) {
            seen.add(p.id);
            all.push(p);
          }
        });

        // Secondary query: products tagged 'shabbat'
        try {
          const tagSnap = await getDocs(
            query(collection(db, 'products'), where('tags', 'array-contains', 'shabbat'))
          );
          tagSnap.forEach(d => {
            const p = { id: d.id, ...d.data() } as Product;
            if (!p.hidden && p.status !== 'inactive' && !seen.has(p.id) && matchesShabbat(p)) {
              seen.add(p.id);
              all.push(p);
            }
          });
        } catch { /* tags index may not exist yet — non-fatal */ }

        // Sort by priority desc
        all.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        setProducts(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const getImages = (p: Product) =>
    [p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3]
      .filter(Boolean)
      .map(u => optimizeCloudinaryUrl(u as string, 600)) as string[];

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Heebo', Arial, sans-serif", color: '#888', fontSize: 16 }}>
        טוען מוצרים...
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8f8f6', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Page header */}
      <div style={{ background: '#0c1a35', padding: isMobile ? '32px 20px 28px' : '48px 24px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 900, color: '#ffffff', marginBottom: 10, lineHeight: 1.3 }}>
          שבתות וחגים
        </h1>
        <p style={{ fontSize: isMobile ? 14 : 17, color: 'rgba(255,255,255,0.7)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          מוצרים נבחרים לשבת, חג ואירוח יהודי
        </p>
        {products.length > 0 && (
          <p style={{ fontSize: 13, color: '#b8972a', marginTop: 12, fontWeight: 600 }}>
            {products.length} מוצרים
          </p>
        )}
      </div>

      {/* Products grid */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '24px 12px' : '32px 24px' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888', fontSize: 15 }}>
            לא נמצאו מוצרים בקטגוריה זו
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: isMobile ? 12 : 20,
          }}>
            {products.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                images={getImages(p)}
                priority={p.priority}
                isBestSeller={p.isBestSeller}
                badge={p.badge}
                was={p.was}
                createdAt={p.createdAt}
                hidden={p.hidden}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
