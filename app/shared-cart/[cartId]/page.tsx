'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';

interface SharedItem {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  quantity: number;
  selectedKlafId?: string;
  selectedKlafName?: string;
  embroideryText?: string;
  selectedCover?: { id: string; name: string; imgUrl: string };
}

export default function SharedCartPage() {
  const { cartId } = useParams<{ cartId: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [items, setItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!cartId) return;
    getDoc(doc(db, 'savedCarts', cartId)).then(snap => {
      if (!snap.exists()) { setError('הקישור אינו תקף'); setLoading(false); return; }
      const data = snap.data();
      if (new Date(data.expiresAt) < new Date()) { setError('הקישור פג תוקף'); setLoading(false); return; }
      setItems(data.items || []);
      setLoading(false);
    }).catch(() => { setError('שגיאה בטעינה'); setLoading(false); });
  }, [cartId]);

  function addAll() {
    items.forEach(item => addItem({ ...item, quantity: item.quantity }));
    setAdded(true);
    setTimeout(() => router.push('/cart'), 800);
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'inherit' }} dir="rtl">
      <div style={{ fontSize: 16, color: '#888' }}>טוען...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }} dir="rtl">
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>{error}</div>
      <button onClick={() => router.push('/')} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>חזרה לחנות</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px', fontFamily: 'inherit' }} dir="rtl">
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', margin: 0 }}>עגלת קניות משותפת</h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{items.length} מוצרים · {formatPrice(total)}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {items.map((item, i) => {
          const img = item.imgUrl || item.image_url;
          return (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
              {img && <img src={optimizeCloudinaryUrl(img, 80)} alt={item.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#222', marginBottom: 2 }}>{item.name}</div>
                {item.embroideryText && <div style={{ fontSize: 11, color: '#666' }}>ריקמה: {item.embroideryText}</div>}
                {item.selectedKlafName && <div style={{ fontSize: 11, color: '#666' }}>קלף: {item.selectedKlafName}</div>}
              </div>
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{ fontWeight: 900, color: '#1a1a1a', fontSize: 14 }}>{formatPrice(item.price)}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>כמות: {item.quantity}</div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={addAll} disabled={added} style={{ width: '100%', background: added ? '#16a34a' : '#C9A227', color: added ? '#fff' : '#1F3D8F', border: 'none', borderRadius: 14, height: 52, fontSize: 15, fontWeight: 800, cursor: added ? 'default' : 'pointer', transition: 'background 0.2s' }}>
        {added ? '✓ נוסף לעגלה — מעביר...' : `הוסף לעגלה שלי (${formatPrice(total)})`}
      </button>

      <button onClick={() => router.push('/')} style={{ width: '100%', marginTop: 10, background: '#fff', color: '#1a1a1a', border: '1.5px solid #E7E2D8', borderRadius: 12, height: 44, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        המשך לקנות
      </button>
    </div>
  );
}
