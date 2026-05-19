'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';

const CLOUDINARY_CLOUD  = 'dyxzq3ucy';
const CLOUDINARY_PRESET = 'yoursofer_upload';

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).secure_url as string;
}

const CATEGORIES = [
  'קלפי מזוזה',
  'קלפי תפילין',
  'ספרי תורה',
  'מגילות',
  'תפילין קומפלט',
  'מזוזות',
];

export default function AddProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName]               = useState('');
  const [desc, setDesc]               = useState('');
  const [price, setPrice]             = useState('');
  const [category, setCategory]       = useState('');
  const [nusach, setNusach]           = useState('');
  const [level, setLevel]             = useState('');
  const [size, setSize]               = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [images, setImages]           = useState<string[]>([]);
  const [uploading, setUploading]     = useState<number | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState('');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 20 }}>טוען...</div>
    </div>
  );

  if (!user || (user.role !== 'sofer' && user.role !== 'admin')) {
    if (typeof window !== 'undefined') router.push('/');
    return null;
  }

  async function handleUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(index);
    try {
      const url = await uploadToCloudinary(file);
      setImages(prev => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
    } catch {
      setError('שגיאה בהעלאת תמונה');
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  }

  function removeImage(index: number) {
    setImages(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price || !category) { setError('שם, מחיר וקטגוריה הם שדות חובה'); return; }
    setSaving(true);
    setError('');
    try {
      await addDoc(collection(db, 'products'), {
        name,
        desc,
        description: desc,
        price: Number(price),
        cat: category,
        category,
        nusach,
        level,
        size,
        deliveryDays,
        days: deliveryDays,
        soferId: user?.soferId ?? '',
        soferName: user?.displayName ?? '',
        imgUrl: images[0] || '',
        imgUrl2: images[1] || '',
        imgUrl3: images[2] || '',
        uploadedBySofer: true,
        status: 'pending',
        priority: 0,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError('שגיאה בשמירה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, direction: 'rtl',
    fontFamily: 'Heebo, Arial, sans-serif', boxSizing: 'border-box', background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 5,
  };

  if (saved) return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', maxWidth: 440 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#1a3a2a', marginBottom: 10 }}>המוצר נשלח לאישור!</div>
        <div style={{ fontSize: 14, color: '#555', marginBottom: 28, lineHeight: 1.7 }}>
          המוצר שלך נשמר ויוצג בחנות לאחר שהאדמין יאשר אותו.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => { setSaved(false); setName(''); setDesc(''); setPrice(''); setCategory(''); setNusach(''); setLevel(''); setSize(''); setDeliveryDays(''); setImages([]); }}
            style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ➕ הוסף מוצר נוסף
          </button>
          <button onClick={() => router.push('/sofer-dashboard')}
            style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ← חזרה לדשבורד
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4ff', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#2563EB', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>פורטל סופר</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>➕ הוספת מוצר חדש</div>
        </div>
        <button onClick={() => router.push('/sofer-dashboard')}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← חזרה לדשבורד
        </button>
      </div>

      {/* Notice */}
      <div style={{ maxWidth: 640, margin: '20px auto 0', padding: '0 16px' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
          ℹ️ המוצר יישלח לאישור האדמין ויוצג בחנות לאחר האישור.
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '16px auto 40px', padding: '0 16px' }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>שם המוצר *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required placeholder="מזוזה מהודרת 12 שורות..." />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }}
              value={desc} onChange={e => setDesc(e.target.value)} placeholder="תיאור מפורט של המוצר..." />
          </div>

          {/* Price */}
          <div>
            <label style={labelStyle}>מחיר ₪ *</label>
            <input type="number" min="0" style={{ ...inputStyle, maxWidth: 160 }}
              value={price} onChange={e => setPrice(e.target.value)} required placeholder="350" />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>קטגוריה *</label>
            <select style={{ ...inputStyle, background: '#fff' }} value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">-- בחר קטגוריה --</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Nusach + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>נוסח</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={nusach} onChange={e => setNusach(e.target.value)}>
                <option value="">-- בחר --</option>
                <option value="אשכנזי">אשכנזי</option>
                <option value="ספרדי">ספרדי</option>
                <option value={'אר"י'}>{'אר"י'}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>רמת כשרות</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">-- בחר --</option>
                <option value="פשוט">פשוט</option>
                <option value="מהודר">מהודר</option>
                <option value="מהודר בתכלית">מהודר בתכלית</option>
              </select>
            </div>
          </div>

          {/* Delivery days + Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>זמן אספקה (ימים)</label>
              <input style={inputStyle} value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} placeholder="7-14" />
            </div>
            <div>
              <label style={labelStyle}>גודל / מידה</label>
              <input style={inputStyle} value={size} onChange={e => setSize(e.target.value)} placeholder="12 שורות, גס..." />
            </div>
          </div>

          {/* Images */}
          <div>
            <label style={labelStyle}>תמונות (עד 3)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2].map(i => {
                const val = images[i] || '';
                const isDisabled = i > 0 && !images[i - 1];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {val ? (
                      <img src={val} alt={`תמונה ${i + 1}`}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🖼️</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ background: isDisabled ? '#9ca3af' : '#2563EB', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: (isDisabled || uploading !== null) ? 'not-allowed' : 'pointer', opacity: (isDisabled || uploading === i) ? 0.6 : 1 }}>
                        {uploading === i ? '⏳ מעלה...' : `📷 תמונה ${i + 1}`}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isDisabled || uploading !== null}
                          onChange={e => handleUpload(i, e)} />
                      </label>
                      {val && (
                        <button type="button" onClick={() => removeImage(i)}
                          style={{ background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                          הסר
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving || uploading !== null}
              style={{ flex: 1, background: (saving || uploading !== null) ? '#9ca3af' : '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: (saving || uploading !== null) ? 'not-allowed' : 'pointer' }}>
              {saving ? 'שולח...' : '📤 שלח לאישור'}
            </button>
            <button type="button" onClick={() => router.push('/sofer-dashboard')}
              style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              ביטול
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
