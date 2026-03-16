'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, total } = useCart();

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginRight: 16 }}>🛒 סל הקניות</h1>
      </div>

      <div style={{ maxWidth: 1100, margin: '20px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {items.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>הסל שלך ריק</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>הוסף מוצרים מהחנות כדי להתחיל</div>
            <button onClick={() => router.push('/')}
              style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              המשך לקנות
            </button>
          </div>
        ) : (
          <>
            {/* רשימת מוצרים */}
            <div>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: '16px 20px', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f1111' }}>סל הקניות ({items.reduce((s, i) => s + i.quantity, 0)} פריטים)</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <div key={item.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                    {/* תמונה */}
                    <div style={{ width: 100, height: 100, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }}
                      onClick={() => router.push(`/product/${item.id}`)}>
                      {item.imgUrl ? (
                        <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📦</div>
                      )}
                    </div>

                    {/* פרטים */}
                    <div style={{ flex: 1 }}>
                      <div onClick={() => router.push(`/product/${item.id}`)}
                        style={{ fontSize: 15, fontWeight: 600, color: '#0f1111', marginBottom: 6, cursor: 'pointer', lineHeight: 1.4 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#0e6ba8')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#0f1111')}>
                        {item.name}
                      </div>

                      <div style={{ fontSize: 12, color: '#1a6b3c', marginBottom: 10 }}>✓ במלאי · משלוח חינם</div>

                      {/* כמות + הסר */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                          <button onClick={() => updateQty(item.id, item.quantity - 1)}
                            style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>
                            −
                          </button>
                          <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd', lineHeight: '32px' }}>
                            {item.quantity}
                          </span>
                          <button onClick={() => updateQty(item.id, item.quantity + 1)}
                            style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>
                            +
                          </button>
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

                    {/* מחיר */}
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
                  </div>
                ))}
              </div>

              {/* המשך קנייה */}
              <div style={{ marginTop: 12 }}>
                <button onClick={() => router.push('/')}
                  style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                  ← המשך לקנות
                </button>
              </div>
            </div>

            {/* סיכום הזמנה */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '20px', position: 'sticky', top: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#555' }}>סכום ביניים ({items.reduce((s, i) => s + i.quantity, 0)} פריטים):</span>
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

              <button onClick={() => router.push('/checkout')}
                style={{ width: '100%', background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 20, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
                המשך לתשלום →
              </button>

              <button onClick={() => router.push('/')}
                style={{ width: '100%', background: '#fff', color: '#0c1a35', border: '1px solid #ddd', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                המשך לקנות
              </button>

              {/* ביטחון */}
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
