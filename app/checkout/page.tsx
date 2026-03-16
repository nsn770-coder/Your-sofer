'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useShaliach } from '../contexts/ShaliachContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { shaliach, refCode } = useShaliach();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'shipping' | 'review'>('shipping');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>הסל ריק</div>
          <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            חזרה לחנות
          </button>
        </div>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.phone || !form.address || !form.city) {
      alert('נא למלא את כל השדות החובה');
      return;
    }
    setLoading(true);
    try {
      const orderNumber = 'YS-' + Date.now().toString().slice(-6);
      const commissionPercent = shaliach?.commissionPercent || 0;
      const commissionAmount = commissionPercent > 0 ? Math.round(total * commissionPercent / 100 * 100) / 100 : 0;

      await addDoc(collection(db, 'orders'), {
        orderNumber,
        customerName: form.name,
        email: form.email,
        phone: form.phone,
        address: `${form.address}, ${form.city}`,
        notes: form.notes || '',
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total,
        status: 'new',
        createdAt: serverTimestamp(),
        shaliachRef: refCode || null,
        shaliachId: shaliach?.id || null,
        shaliachName: shaliach?.name || null,
        commissionPercent,
        commissionAmount,
      });

      clearCart();
      router.push(`/thank-you?order=${orderNumber}`);
    } catch (e) {
      alert('שגיאה בשליחת ההזמנה. נסה שוב.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const isShippingValid = form.name && form.email && form.phone && form.address && form.city;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: step === 'shipping' ? '#b8972a' : '#fff', fontWeight: step === 'shipping' ? 700 : 400 }}>1. פרטי משלוח</span>
          <span style={{ color: '#555' }}>›</span>
          <span style={{ color: step === 'review' ? '#b8972a' : '#aaa', fontWeight: step === 'review' ? 700 : 400 }}>2. אישור הזמנה</span>
        </div>
        <button onClick={() => router.push('/cart')} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer' }}>
          ← חזרה לסל
        </button>
      </div>

      {/* באנר שליח */}
      {shaliach && (
        <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a3a6a)', borderBottom: '2px solid #b8972a', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl' }}>
          <div style={{ fontSize: 20 }}>🤝</div>
          <div style={{ fontSize: 13, color: '#a8c0d8' }}>
            הזמנה זו מיוחסת לשליח: <strong style={{ color: '#fff' }}>{shaliach.chabadName || shaliach.name}</strong>
            {shaliach.city && <span style={{ color: '#b8972a' }}> · {shaliach.city}</span>}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* טופס */}
        <div>
          {step === 'shipping' ? (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#f8f9fa', borderBottom: '1px solid #ddd', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#b8972a', color: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>1</div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f1111' }}>פרטי משלוח</h2>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>שם מלא *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="ישראל ישראלי"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>טלפון *</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="050-0000000" type="tel"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>אימייל *</label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" type="email"
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>רחוב ומספר בית *</label>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="רחוב הרצל 5"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>עיר *</label>
                    <input name="city" value={form.city} onChange={handleChange} placeholder="תל אביב"
                      style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#333' }}>הערות למשלוח (אופציונלי)</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="הוראות מיוחדות, קומה, דירה..."
                    rows={2}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '10px 12px', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#ddd')} />
                </div>

                <button onClick={() => isShippingValid && setStep('review')}
                  style={{ width: '100%', background: isShippingValid ? '#b8972a' : '#ccc', color: isShippingValid ? '#0c1a35' : '#888', border: 'none', borderRadius: 20, padding: '13px', fontSize: 15, fontWeight: 700, cursor: isShippingValid ? 'pointer' : 'not-allowed' }}>
                  המשך לאישור ←
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* סיכום פרטי משלוח */}
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a6b3c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>פרטי משלוח</h3>
                  </div>
                  <button onClick={() => setStep('shipping')} style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer' }}>עריכה</button>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  <div><strong>{form.name}</strong> · {form.phone}</div>
                  <div>{form.email}</div>
                  <div>{form.address}, {form.city}</div>
                  {form.notes && <div style={{ color: '#888' }}>הערות: {form.notes}</div>}
                </div>
              </div>

              {/* פריטים */}
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>פריטים בהזמנה</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 50, height: 50, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee' }}>
                        {item.imgUrl ? (
                          <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                        )}
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: '#888' }}>כמות: {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>₪{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', background: loading ? '#888' : '#0c1a35', color: '#fff', border: 'none', borderRadius: 20, padding: '14px', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? '⏳ שולח הזמנה...' : '✅ אשר והזמן עכשיו'}
              </button>

              <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 10 }}>
                🔒 הזמנתך מאובטחת ומוצפנת
              </div>
            </div>
          )}
        </div>

        {/* סיכום */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '20px', position: 'sticky', top: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #eee' }}>סיכום הזמנה</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#555', flex: 1, paddingLeft: 8 }}>{item.name.slice(0, 30)}{item.name.length > 30 ? '...' : ''} × {item.quantity}</span>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>₪{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: '#555' }}>סכום ביניים:</span>
              <span>₪{total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12 }}>
              <span style={{ color: '#555' }}>משלוח:</span>
              <span style={{ color: '#1a6b3c', fontWeight: 700 }}>חינם</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900, paddingTop: 8, borderTop: '1px solid #eee' }}>
              <span>סה"כ:</span>
              <span style={{ color: '#0c1a35' }}>₪{total.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>כולל מע"מ</div>
          </div>

          {shaliach && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0f7ff', borderRadius: 6, fontSize: 12 }}>
              <div style={{ color: '#0e6ba8', fontWeight: 700 }}>🤝 דרך שליח: {shaliach.chabadName || shaliach.name}</div>
              <div style={{ color: '#888', marginTop: 2 }}>עמלה: {shaliach.commissionPercent}% = ₪{(total * (shaliach.commissionPercent || 0) / 100).toFixed(2)}</div>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: '#888', lineHeight: 2, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div>🔒 תשלום מאובטח</div>
            <div>🚚 משלוח חינם לכל הארץ</div>
            <div>↩️ ביטול עד 24 שעות</div>
            <div>🛡️ אחריות פלטפורמה</div>
          </div>
        </div>
      </div>
    </div>
  );
}
