'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';

interface ShluchimDoc {
  id: string;
  uid: string;
  refCode: string;
  name: string;
  bannerImage?: string;
  commissionPercent?: number;
}

interface SoferDoc {
  id: string;
  name: string;
  city?: string;
  imageUrl?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  imageUrl?: string;
  cat?: string;
  status?: string;
  soferId?: string;
  badge?: string;
  days?: string;
  level?: string;
  nusach?: string;
  desc?: string;
}

const PAGE_SIZE = 12;

export default function SoferStorePage() {
  const params = useParams();
  const refCode = params?.refCode as string;

  const [shliach, setShliach] = useState<ShluchimDoc | null>(null);
  const [sofer, setSofer] = useState<SoferDoc | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (refCode) load();
  }, [refCode]);

  async function load() {
    setLoading(true);
    try {
      // Look up shluchim doc by refCode field
      const shliachSnap = await getDocs(
        query(collection(db, 'shluchim'), where('refCode', '==', refCode), where('isPersonalStore', '==', true))
      );
      if (shliachSnap.empty) { setNotFound(true); setLoading(false); return; }

      const shliachDocSnap = shliachSnap.docs[0];
      const shliachData = { id: shliachDocSnap.id, ...shliachDocSnap.data() } as ShluchimDoc;
      setShliach(shliachData);

      // Part 5: wire ref tracking — set full doc ID (= uid) so ShaliachContext can find it
      if (typeof window !== 'undefined') {
        localStorage.setItem('shaliachRef', shliachDocSnap.id);
      }

      // Fetch soferim doc by uid
      const soferSnap = await getDocs(
        query(collection(db, 'soferim'), where('uid', '==', shliachData.uid))
      );
      if (!soferSnap.empty) {
        setSofer({ id: soferSnap.docs[0].id, ...soferSnap.docs[0].data() } as SoferDoc);
      }

      // Fetch products by soferId = uid
      const productsSnap = await getDocs(
        query(collection(db, 'products'), where('soferId', '==', shliachData.uid), where('status', '==', 'active'))
      );
      const productList: Product[] = [];
      productsSnap.forEach(d => productList.push({ id: d.id, ...d.data() } as Product));
      setProducts(productList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 22, color: '#555' }}>טוען...</div>
    </div>
  );

  if (notFound) return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#333' }}>החנות לא נמצאה</div>
        <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>הקישור שגוי או שהחנות אינה פעילה</div>
      </div>
    </div>
  );

  const visibleProducts = products.slice(0, page * PAGE_SIZE);
  const hasMore = visibleProducts.length < products.length;

  const whatsappNumber = sofer?.whatsapp || sofer?.phone || '';
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`שלום ${shliach?.name || ''}, הגעתי מהחנות שלך`)}`
    : '';

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f4f4', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Banner */}
      {shliach?.bannerImage ? (
        <div style={{ width: '100%', maxHeight: 340, overflow: 'hidden', position: 'relative' }}>
          <img src={shliach.bannerImage} alt={shliach.name}
            style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45))' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: 200, background: 'linear-gradient(135deg, #1a3a2a 0%, #3d7a52 100%)' }} />
      )}

      {/* Sofer info card */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginTop: shliach?.bannerImage ? -48 : -40,
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          {sofer?.imageUrl ? (
            <img src={sofer.imageUrl} alt={sofer.name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e8f4ec', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e8f4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>✍️</div>
          )}

          {/* Name + info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a3a2a', marginBottom: 4 }}>
              {shliach?.name || sofer?.name}
            </div>
            {sofer?.city && (
              <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>📍 {sofer.city}</div>
            )}
            {sofer?.description && (
              <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>{sofer.description}</div>
            )}
          </div>

          {/* WhatsApp button */}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#25D366', color: '#fff',
                borderRadius: 12, padding: '12px 20px',
                fontSize: 14, fontWeight: 800,
                textDecoration: 'none', flexShrink: 0,
              }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.903.53 3.68 1.449 5.193L2 22l4.95-1.42A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.522 2 12 2zm0 18.182a8.182 8.182 0 110-16.363 8.182 8.182 0 010 16.363z"/>
              </svg>
              דבר עם הסופר
            </a>
          )}
        </div>

        {/* Products grid */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a3a2a', marginBottom: 20 }}>
            המוצרים של {shliach?.name || sofer?.name} ({products.length})
          </div>

          {products.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
              <div style={{ fontSize: 16, color: '#888' }}>אין מוצרים זמינים כרגע</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
                {visibleProducts.map((p, idx) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    images={[p.imgUrl || p.imageUrl].filter(Boolean) as string[]}
                    badge={p.badge}
                    was={p.was}
                    aboveFold={idx < 4}
                  />
                ))}
              </div>

              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 24 }}>
                  <button onClick={() => setPage(prev => prev + 1)}
                    style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 36px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                    טען עוד מוצרים
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}
