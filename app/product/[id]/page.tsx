'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  desc?: string;
  description?: string;
  imgUrl?: string;
  image_url?: string;
  img1?: string;
  img2?: string;
  img3?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  imgUrl4?: string;
  cat?: string;
  badge?: string;
  sofer?: string;
  soferId?: string;
  days?: string;
  stars?: number;
  reviews?: number;
}

function Stars({ n = 4.5, size = 16 }: { n?: number; size?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: size }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [zoomVisible, setZoomVisible] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'products', String(id)));
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product;
          setProduct(p);
          // טען מוצרים קשורים
          if (p.cat) {
            const relSnap = await getDocs(query(collection(db, 'products'), where('cat', '==', p.cat), limit(6)));
            const relData: Product[] = [];
            relSnap.forEach(d => { if (d.id !== p.id) relData.push({ id: d.id, ...d.data() } as Product); });
            setRelated(relData.slice(0, 4));
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 18, color: '#666' }}>טוען מוצר...</div>
    </div>
  );

  if (!product) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>מוצר לא נמצא</div>
      <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        חזרה לחנות
      </button>
    </div>
  );

  const imgs = [
    product.imgUrl || product.image_url,
    product.imgUrl2 || product.img1,
    product.imgUrl3 || product.img2,
    product.imgUrl4 || product.img3,
  ].filter(Boolean) as string[];

  const discount = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product!.id, name: product!.name, price: product!.price, imgUrl: product!.imgUrl || product!.image_url, quantity: 1 });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
          <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0e6ba8' }}>דף הבית</span>
          <span>›</span>
          {product.cat && <><span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0e6ba8' }}>{product.cat}</span><span>›</span></>}
          <span style={{ color: '#333', fontWeight: 600 }}>{product.name.slice(0, 40)}{product.name.length > 40 ? '...' : ''}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 24, alignItems: 'start' }}>

          {/* ══ גלריה ══ */}
          <div>
            {/* תמונה ראשית */}
            <div style={{ position: 'relative', background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 10, cursor: 'zoom-in' }}
              onClick={() => setZoomVisible(true)}>
              {imgs.length > 0 ? (
                <img src={imgs[activeImg]} alt={product.name}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', padding: 16, transition: 'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>📦</div>
              )}
              {discount > 0 && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#c0392b', color: '#fff', fontWeight: 700, fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
                  -{discount}%
                </div>
              )}
            </div>

            {/* ממוזערים */}
            {imgs.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {imgs.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#b8972a' : '#ddd'}`, background: '#fff', cursor: 'pointer', padding: 2, transition: 'border-color 0.15s' }}>
                    <img src={img} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ══ פרטי מוצר ══ */}
          <div>
            {product.badge && (
              <div style={{ display: 'inline-block', background: product.badge === 'מבצע' ? '#c0392b' : product.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, marginBottom: 10 }}>
                {product.badge}
              </div>
            )}

            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f1111', lineHeight: 1.4, marginBottom: 10 }}>
              {product.name}
            </h1>

            {/* דירוג */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #eee' }}>
              <Stars n={product.stars || 4.5} size={18} />
              <span style={{ fontSize: 13, color: '#0e6ba8', cursor: 'pointer' }}>({product.reviews || 0} ביקורות)</span>
              {product.cat && <span style={{ fontSize: 12, color: '#555', marginRight: 8 }}>| קטגוריה: <strong>{product.cat}</strong></span>}
            </div>

            {/* מחיר */}
            <div style={{ marginBottom: 16 }}>
              {product.was && (
                <div style={{ fontSize: 13, color: '#888' }}>
                  מחיר רגיל: <span style={{ textDecoration: 'line-through' }}>₪{product.was}</span>
                  <span style={{ color: '#c0392b', fontWeight: 700, marginRight: 8 }}>חסכת ₪{(product.was - product.price).toFixed(0)} ({discount}%)</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: '#555' }}>מחיר:</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#0c1a35' }}>₪{product.price}</span>
              </div>
              <div style={{ fontSize: 12, color: '#c7511f', marginTop: 2 }}>כולל מע״מ · משלוח חינם</div>
            </div>

            {/* סופר */}
            {product.sofer && (
              <div style={{ background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1a6b3c' }}>
                ✍️ <strong>נכתב בידי {product.sofer}</strong> — סופר מוסמך ומאומת
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>✓ בדיקת מחשב | ✓ תעודת כשרות | ✓ פיקוח רבני</div>
              </div>
            )}

            {/* תיאור */}
            {(product.desc || product.description) && (
              <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 16, paddingTop: 14, borderTop: '1px solid #eee' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f1111' }}>תיאור המוצר</div>
                {product.desc || product.description}
              </div>
            )}

            {/* מפרט */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f1111' }}>מידע חשוב</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#555' }}>זמן אספקה</span>
                  <span style={{ fontWeight: 700 }}>{product.days || '7-14'} ימי עסקים</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#555' }}>משלוח</span>
                  <span style={{ fontWeight: 700, color: '#1a6b3c' }}>חינם לכל הארץ 🚚</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#555' }}>ביטול</span>
                  <span style={{ fontWeight: 700 }}>עד 24 שעות מהרכישה</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#555' }}>אחריות</span>
                  <span style={{ fontWeight: 700 }}>אחריות פלטפורמה מלאה</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ תיבת קנייה ══ */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '20px 16px', position: 'sticky', top: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0c1a35', marginBottom: 4 }}>₪{product.price}</div>
            {product.was && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12 }}>חסכת {discount}% — ₪{(product.was - product.price).toFixed(0)}</div>}

            <div style={{ color: '#1a6b3c', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>✓ במלאי — משלוח חינם</div>

            {/* כמות */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>כמות:</label>
              <select value={qty} onChange={e => setQty(Number(e.target.value))}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '8px', fontSize: 13, background: '#f8f9fa', cursor: 'pointer' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <button onClick={handleAddToCart}
              style={{ width: '100%', background: added ? '#27ae60' : '#b8972a', color: added ? '#fff' : '#0c1a35', border: 'none', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8, transition: 'background 0.2s' }}>
              {added ? '✅ נוסף לסל!' : '🛒 הוסף לסל'}
            </button>

            <button onClick={() => { handleAddToCart(); router.push('/cart'); }}
              style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
              ⚡ קנה עכשיו
            </button>

            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <div>🔒 תשלום מאובטח ומוצפן</div>
              <div>↩️ ביטול עד 24 שעות</div>
              <div>🛡️ אחריות פלטפורמה מלאה</div>
              {product.sofer && <div>✍️ מהסופר ישירות אליך</div>}
            </div>
          </div>
        </div>

        {/* ══ מוצרים קשורים ══ */}
        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f1111', marginBottom: 16 }}>
              מוצרים דומים מקטגוריה "{product.cat}"
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {related.map(r => {
                const rImg = r.imgUrl || r.image_url;
                return (
                  <div key={r.id} onClick={() => router.push(`/product/${r.id}`)}
                    style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ paddingTop: '100%', position: 'relative', background: '#f7f8f8' }}>
                      {rImg ? (
                        <img src={rImg} alt={r.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
                      )}
                    </div>
                    <div style={{ padding: '10px 10px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.name}</div>
                      <Stars n={r.stars || 4.5} size={12} />
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0c1a35', marginTop: 4 }}>₪{r.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* זום תמונה */}
      {zoomVisible && imgs.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setZoomVisible(false)}>
          <img src={imgs[activeImg]} alt={product.name}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()} />
          <button onClick={() => setZoomVisible(false)}
            style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
