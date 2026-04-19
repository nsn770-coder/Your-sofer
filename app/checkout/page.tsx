'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../contexts/CartContext';
import { useShaliach } from '../contexts/ShaliachContext';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconLock({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}
function IconTruck({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
}
function IconReturn({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
}
function IconShield({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/></svg>;
}
function IconCheck({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function IconCart({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
}
function IconCreditCard({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
}
function IconTag({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function IconX({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IconChevron({ size = 10, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function IconLoader() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.22-8.56" style={{animation:'spin 1s linear infinite'}}/><style>{`@keyframes spin{from{transform-origin:center;transform:rotate(0)}to{transform-origin:center;transform:rotate(360deg)}}`}</style></svg>;
}
function IconHandshake({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>;
}

// ── Input component ───────────────────────────────────────────────────────────

function Input({ label, name, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#c0392b' }}>*</span>}
      </label>
      <input
        name={name} value={value} onChange={onChange} placeholder={placeholder} type={type}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', border: `1.5px solid ${focused ? '#b8972a' : '#e0e0e0'}`,
          borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.15s',
          background: '#fafafa',
        }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { shaliach, refCode } = useShaliach();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'shipping' | 'review'>('shipping');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', notes: '' });
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl', background: '#f8f6f2' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#ccc' }}><IconCart size={48} /></div>
          <div style={{ fontSize: 18, color: '#888', marginBottom: 20 }}>הסל ריק</div>
          <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 24, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            חזרה לחנות
          </button>
        </div>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true); setCouponError('');
    try {
      const snap = await getDoc(doc(db, 'coupons', code));
      if (!snap.exists()) { setCouponError('קוד קופון לא נמצא'); return; }
      const data = snap.data();
      if (!data.active || data.usedBy) { setCouponError('קוד הקופון כבר שומש או אינו פעיל'); return; }
      setAppliedCoupon({ code, discount: data.discount });
      setCouponInput('');
    } catch { setCouponError('שגיאה בבדיקת הקופון'); }
    finally { setCouponLoading(false); }
  }

  const discountAmount = appliedCoupon ? Math.round(total * appliedCoupon.discount / 100 * 100) / 100 : 0;
  const finalTotal = total - discountAmount;

  async function handleSubmit() {
    if (!form.name || !form.email || !form.phone || !form.address || !form.city) {
      alert('נא למלא את כל השדות החובה'); return;
    }
    setLoading(true);
    try {
      const orderNumber = 'YS-' + Date.now().toString().slice(-6);
      const commissionPercent = shaliach?.commissionPercent || 0;
      const commissionAmount = commissionPercent > 0 ? Math.round(total * commissionPercent / 100 * 100) / 100 : 0;

      const orderRef = await addDoc(collection(db, 'orders'), {
        orderNumber, customerName: form.name, email: form.email, phone: form.phone,
        address: `${form.address}, ${form.city}`, notes: form.notes || '',
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, selectedKlafId: i.selectedKlafId || null, selectedKlafName: i.selectedKlafName || null, embroideryText: i.embroideryText || null })),
        total: finalTotal, couponCode: appliedCoupon?.code || null, couponDiscount: appliedCoupon ? discountAmount : null,
        status: 'pending_payment', createdAt: serverTimestamp(),
        shaliachRef: refCode || null, shaliachId: shaliach?.id || null, shaliachName: shaliach?.name || null,
        commissionPercent, commissionAmount,
      });

      if (appliedCoupon) {
        await updateDoc(doc(db, 'coupons', appliedCoupon.code), { active: false, usedBy: form.email || form.name, usedAt: serverTimestamp() });
      }

      const klafUpdates = items.filter(i => i.selectedKlafId).map(i =>
        updateDoc(doc(db, 'klafim', i.selectedKlafId!), { status: 'reserved', orderId: orderRef.id, reservedAt: new Date().toISOString() })
      );
      if (klafUpdates.length > 0) await Promise.all(klafUpdates);

      const baseUrl = window.location.origin;
      const paymentRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })), total: finalTotal, customer: { name: form.name, email: form.email, phone: form.phone }, orderNumber, orderId: orderRef.id, baseUrl }),
      });

      const paymentData = await paymentRes.json();
      if (paymentData.url) {
        window.location.href = paymentData.url;
      } else {
        throw new Error(paymentData.error || 'שגיאה בקבלת דף תשלום');
      }
    } catch (e: any) {
      alert('שגיאה: ' + (e.message || 'נסה שוב'));
      console.error(e);
      setLoading(false);
    }
  }

  const isShippingValid = form.name && form.email && form.phone && form.address && form.city;

  // ── Order Summary (reusable) ──────────────────────────────────────────────

  const OrderSummary = () => (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', padding: 20, position: 'sticky', top: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0c1a35', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f0ebe0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconCart size={15} color="#0c1a35" /> סיכום הזמנה
      </h3>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f8f6f2', flexShrink: 0, border: '1px solid #e8e2d8' }}>
              {item.imgUrl
                ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCart size={18} color="#ccc" /></div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0c1a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#999' }}>כמות: {item.quantity}</div>
              {item.selectedKlafName && (
                <div style={{ fontSize: 10, color: '#1a6b3c', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <IconCheck size={9} color="#1a6b3c" /> {item.selectedKlafName}
                </div>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35', flexShrink: 0 }}>₪{(item.price * item.quantity).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #f0ebe0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#777' }}>
          <span>סכום ביניים</span><span>₪{total.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#777' }}>משלוח</span>
          <span style={{ color: '#1a6b3c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><IconTruck size={12} color="#1a6b3c" /> חינם</span>
        </div>
        {appliedCoupon && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconTag size={12} color="#1a6b3c" /> קופון ({appliedCoupon.discount}%)</span>
            <span>-₪{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 900, color: '#0c1a35', borderTop: '1px solid #f0ebe0', paddingTop: 10, marginTop: 4 }}>
          <span>סה"כ לתשלום</span><span>₪{finalTotal.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa' }}>כולל מע"מ</div>
      </div>

      {/* Coupon */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconTag size={12} color="#555" /> קוד קופון
        </div>
        {appliedCoupon ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconCheck size={12} color="#15803d" /> {appliedCoupon.code} — {appliedCoupon.discount}% הנחה
            </span>
            <button onClick={() => setAppliedCoupon(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' }}><IconX size={14} /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={couponInput} onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
              onKeyDown={e => e.key === 'Enter' && applyCoupon()}
              placeholder="הזן קוד קופון"
              style={{ flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: 'ltr', letterSpacing: 1, fontFamily: 'inherit' }} />
            <button onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
              style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: couponLoading || !couponInput.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {couponLoading ? '...' : 'החל'}
            </button>
          </div>
        )}
        {couponError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 5 }}>{couponError}</div>}
      </div>

      {/* Trust */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f0ebe0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { icon: <IconLock size={13} color="#555" />, text: 'תשלום מאובטח' },
          { icon: <IconTruck size={13} color="#555" />, text: 'משלוח חינם' },
          { icon: <IconReturn size={13} color="#555" />, text: 'ביטול 24 שעות' },
          { icon: <IconShield size={13} color="#555" />, text: 'אחריות מלאה' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#777' }}>
            {item.icon} {item.text}
          </div>
        ))}
      </div>

      {/* Shaliach */}
      {shaliach && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0f7ff', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconHandshake size={13} color="#0e6ba8" />
          <div>
            <div style={{ color: '#0e6ba8', fontWeight: 700 }}>דרך: {shaliach.chabadName || shaliach.name}</div>
            <div style={{ color: '#555', marginTop: 1 }}>10% מהרכישה יועברו כתרומה</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8f6f2', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700, letterSpacing: 1 }}>ישראל ✡</div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: step === 'shipping' ? '#b8972a' : '#1a6b3c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
              {step === 'review' ? <IconCheck size={11} color="#fff" /> : '1'}
            </div>
            <span style={{ color: step === 'shipping' ? '#b8972a' : '#fff', fontWeight: step === 'shipping' ? 700 : 400 }}>פרטי משלוח</span>
          </div>
          <IconChevron size={10} color="#555" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: step === 'review' ? '#b8972a' : 'rgba(255,255,255,0.15)', color: step === 'review' ? '#0c1a35' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>2</div>
            <span style={{ color: step === 'review' ? '#b8972a' : '#555', fontWeight: step === 'review' ? 700 : 400 }}>אישור ותשלום</span>
          </div>
        </div>

        <button onClick={() => router.push('/cart')} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#aaa', fontSize: 12, cursor: 'pointer', borderRadius: 8, padding: '5px 12px' }}>
          חזרה לסל
        </button>
      </div>

      {/* Shaliach banner */}
      {shaliach && (
        <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a3a6a)', borderBottom: '2px solid #b8972a', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconHandshake size={16} color="#b8972a" />
          <div style={{ fontSize: 13, color: '#a8c0d8' }}>
            הזמנה זו מיוחסת לרב הקהילה: <strong style={{ color: '#fff' }}>{shaliach.chabadName || shaliach.name}</strong>
            {shaliach.city && <span style={{ color: '#b8972a' }}> · {shaliach.city}</span>}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ maxWidth: 1000, margin: '28px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>

        {/* Left: Form */}
        <div>
          {step === 'shipping' ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', overflow: 'hidden' }}>
              <div style={{ background: '#f8f6f2', borderBottom: '1px solid #e8e2d8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#b8972a', color: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>1</div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0c1a35', margin: 0 }}>פרטי משלוח</h2>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Input label="שם מלא" name="name" value={form.name} onChange={handleChange} placeholder="ישראל ישראלי" required />
                  <Input label="טלפון" name="phone" value={form.phone} onChange={handleChange} placeholder="050-0000000" type="tel" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <Input label="אימייל" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" type="email" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
                  <Input label="רחוב ומספר בית" name="address" value={form.address} onChange={handleChange} placeholder="רחוב הרצל 5" required />
                  <Input label="עיר" name="city" value={form.city} onChange={handleChange} placeholder="תל אביב" required />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 5 }}>הערות למשלוח</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="הוראות מיוחדות, קומה, דירה..."
                    rows={2}
                    style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafafa', transition: 'border-color 0.15s' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#b8972a')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')} />
                </div>
                <button
                  onClick={() => isShippingValid && setStep('review')}
                  style={{ width: '100%', background: isShippingValid ? '#b8972a' : '#e0e0e0', color: isShippingValid ? '#0c1a35' : '#999', border: 'none', borderRadius: 24, padding: '14px', fontSize: 15, fontWeight: 800, cursor: isShippingValid ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
                >
                  המשך לאישור ←
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Shipping summary */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconCheck size={12} color="#fff" />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', margin: 0 }}>פרטי משלוח</h3>
                  </div>
                  <button onClick={() => setStep('shipping')} style={{ background: 'none', border: 'none', color: '#b8972a', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>עריכה</button>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  <div><strong style={{ color: '#0c1a35' }}>{form.name}</strong> · {form.phone}</div>
                  <div>{form.email}</div>
                  <div>{form.address}, {form.city}</div>
                  {form.notes && <div style={{ color: '#888' }}>{form.notes}</div>}
                </div>
              </div>

              {/* Items */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8e2d8', padding: '16px 20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconCart size={14} color="#0c1a35" /> פריטים בהזמנה
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, background: '#f8f6f2', borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid #e8e2d8' }}>
                        {item.imgUrl
                          ? <img src={item.imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCart size={18} color="#ccc" /></div>
                        }
                      </div>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: '#0c1a35' }}>{item.name}</div>
                        <div style={{ color: '#888', fontSize: 12 }}>כמות: {item.quantity}</div>
                        {item.selectedKlafName && (
                          <div style={{ color: '#1a6b3c', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <IconCheck size={9} color="#1a6b3c" /> קלף: {item.selectedKlafName}
                          </div>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0c1a35' }}>₪{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment info */}
              <div style={{ background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconLock size={16} color="#1a6b3c" />
                <div>
                  <div style={{ fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>תשלום מאובטח</div>
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>לאחר לחיצה תועבר לדף תשלום מאובטח — ויזה, מסטרקארד, ביט ועוד</div>
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={loading}
                style={{ width: '100%', background: loading ? '#888' : '#0c1a35', color: '#fff', border: 'none', borderRadius: 24, padding: '15px', fontSize: 16, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
                {loading ? <><IconLoader /> מכין תשלום...</> : <><IconCreditCard size={16} color="#fff" /> המשך לתשלום ←</>}
              </button>
              <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <IconLock size={11} color="#aaa" /> תשלום מאובטח · ויזה · מסטרקארד · ביט
              </div>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <OrderSummary />
      </div>
    </div>
  );
}
