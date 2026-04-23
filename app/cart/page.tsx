'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, total } = useCart();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f4',
      direction: 'rtl',
      fontFamily: "'Heebo', Arial, sans-serif",
      overflowX: 'hidden',
      maxWidth: '100vw',
    }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginRight: 16 }}>🛒 סל הקניות</h1>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1100,
        margin: '20px auto',
        padding: isMobile ? '0 12px' : '0 16px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: 20,
        alignItems: 'start',
        boxSizing: 'border-box',
        width: '100%',
      }}>

        {items.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: isMobile ? 32 : 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>הסל שלך ריק</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>הוסף מוצרים מהחנות כדי להתחיל</div>
            <button onClick={() => router.push('/')}
              style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>
              המשך לקנות
            </button>
          </div>
        ) : (
          <>
            {/* ── Product list ── */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: '14px 16px', marginBottom: 12 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f1111', margin: 0 }}>סל הקניות ({totalItems} פריטים)</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: isMobile ? '12px' : '16px 20px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 10 : 16,
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                  }}>

                    {isMobile ? (
                      /* ── Mobile card layout ── */
                      <>
                        {/* Top row: image + name + price */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          {/* Image */}
                          <div
                            onClick={() => router.push(`/product/${item.id}`)}
                            style={{ width: 80, height: 80, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }}>
                            {item.imgUrl ? (
                              <img src={optimizeCloudinaryUrl(item.imgUrl, 100)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => (e.currentTarget.style.display = 'none')} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📦</div>
                            )}
                          </div>

                          {/* Name + price */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              onClick={() => router.push(`/product/${item.id}`)}
                              style={{ fontSize: 14, fontWeight: 600, color: '#0f1111', lineHeight: 1.4, cursor: 'pointer', marginBottom: 4 }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#1a6b3c', marginBottom: 2 }}>✓ במלאי · משלוח חינם</div>
                          {item.embroideryText && (
                            <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>✍️ ריקמה: {item.embroideryText}</div>
                          )}
                            <div style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35' }}>
                              ₪{(item.price * item.quantity).toFixed(2)}
                            </div>
                            {item.quantity > 1 && (
                              <div style={{ fontSize: 11, color: '#888' }}>₪{item.price} × {item.quantity}</div>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: qty controls + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                          {/* Qty stepper */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                            <button onClick={() => updateQty(item.id, item.quantity - 1)}
                              style={{ width: 34, height: 34, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>−</button>
                            <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd', lineHeight: '34px' }}>
                              {item.quantity}
                            </span>
                            <button onClick={() => updateQty(item.id, item.quantity + 1)}
                              style={{ width: 34, height: 34, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>+</button>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => removeItem(item.id)}
                              style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                              הסר
                            </button>
                            <button onClick={() => router.push(`/product/${item.id}`)}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                              פרטים
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* ── Desktop row layout ── */
                      <>
                        {/* Image */}
                        <div style={{ width: 100, height: 100, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }}
                          onClick={() => router.push(`/product/${item.id}`)}>
                          {item.imgUrl ? (
                            <img src={optimizeCloudinaryUrl(item.imgUrl, 100)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📦</div>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => router.push(`/product/${item.id}`)}
                            style={{ fontSize: 15, fontWeight: 600, color: '#0f1111', marginBottom: 6, cursor: 'pointer', lineHeight: 1.4 }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#0e6ba8')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#0f1111')}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#1a6b3c', marginBottom: item.embroideryText ? 4 : 10 }}>✓ במלאי · משלוח חינם</div>
                          {item.embroideryText && (
                            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 6 }}>✍️ ריקמה: {item.embroideryText}</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                              <button onClick={() => updateQty(item.id, item.quantity - 1)}
                                style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>−</button>
                              <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd', lineHeight: '32px' }}>
                                {item.quantity}
                              </span>
                              <button onClick={() => updateQty(item.id, item.quantity + 1)}
                                style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>+</button>
                            </div>
                            <span style={{ color: '#ddd' }}>|</span>
                            <button onClick={() => removeItem(item.id)}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#0e6ba8')}>
                              הסר
                            </button>
                            <button onClick={() => router.push(`/product/${item.id}`)}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                              פרטי מוצר
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>
                            ₪{(item.price * item.quantity).toFixed(2)}
                          </div>
                          {item.quantity > 1 && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                              ₪{item.price} × {item.quantity}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={() => router.push('/')}
                  style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                  ← המשך לקנות
                </button>
              </div>
            </div>

            {/* ── Order summary ── */}
            <div style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '20px',
              position: isMobile ? 'static' : 'sticky',
              top: 20,
            }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#555' }}>סכום ביניים ({totalItems} פריטים):</span>
                  <span style={{ fontWeight: 700 }}>₪{total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#555' }}>משלוח:</span>
                  <span style={{ fontWeight: 700, color: '#1a6b3c' }}>חינם</span>
                </div>
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900 }}>
                    <span>סה"כ לתשלום:</span>
                    <span style={{ color: '#0c1a35' }}>₪{total.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>כולל מע"מ</div>
                </div>
              </div>

              <button
                onClick={() => {
                  window.gtag?.('event', 'begin_checkout', {
                    currency: 'ILS',
                    value: total,
                    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
                  });
                  router.push('/checkout');
                }}
                style={{ width: '100%', background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 20, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                המשך לתשלום →
              </button>

              <button onClick={() => router.push('/')}
                style={{ width: '100%', background: '#fff', color: '#0c1a35', border: '1px solid #ddd', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                המשך לקנות
              </button>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #eee', fontSize: 11, color: '#888', lineHeight: 2 }}>
                <div>🔒 תשלום מאובטח ומוצפן</div>
                <div>🚚 משלוח חינם לכל הארץ</div>
                <div>↩️ ביטול עד 24 שעות</div>
                <div>🛡️ אחריות פלטפורמה מלאה</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
