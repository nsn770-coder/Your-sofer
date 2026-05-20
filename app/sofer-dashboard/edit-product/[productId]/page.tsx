'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';

interface ProductDoc {
  name: string;
  desc?: string;
  description?: string;
  price: number;
  imgUrl?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  deliveryDays?: string;
  days?: string;
  nusach?: string;
  size?: string;
  level?: string;
  soferId?: string;
  uploadedBySofer?: boolean;
  cat?: string;
  category?: string;
  isExpertRecommended?: boolean;
}

const EXPERT_REC_CATS_SOFER = ['קלפי מזוזה', 'תפילין קומפלט', 'סט בר מצוה', 'סט בר מצווה'];

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

export default function EditProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params?.productId as string;

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [name, setName]               = useState('');
  const [desc, setDesc]               = useState('');
  const [price, setPrice]             = useState('');
  const [imgUrl, setImgUrl]           = useState('');
  const [imgUrl2, setImgUrl2]         = useState('');
  const [imgUrl3, setImgUrl3]         = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [nusach, setNusach]           = useState('');
  const [size, setSize]               = useState('');
  const [level, setLevel]             = useState('');
  const [cat, setCat]                 = useState('');
  const [isExpertRecommended, setIsExpertRecommended] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && user.role !== 'sofer' && user.role !== 'admin') router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (!user?.soferId || !productId) return;
    load();
  }, [user, productId]);

  async function load() {
    try {
      const snap = await getDoc(doc(db, 'products', productId));
      if (!snap.exists()) { setError('המוצר לא נמצא'); setPageLoading(false); return; }
      const d = snap.data() as ProductDoc;

      if (d.soferId !== user!.soferId) { setError('אין לך הרשאה לערוך מוצר זה'); setPageLoading(false); return; }
      if (!d.uploadedBySofer) { setError('מוצר זה אינו עריך על ידך'); setPageLoading(false); return; }

      setName(d.name ?? '');
      setDesc(d.desc ?? d.description ?? '');
      setPrice(String(d.price ?? ''));
      setImgUrl(d.imgUrl ?? '');
      setImgUrl2(d.imgUrl2 ?? '');
      setImgUrl3(d.imgUrl3 ?? '');
      setDeliveryDays(d.deliveryDays ?? d.days ?? '');
      setNusach(d.nusach ?? '');
      setSize(d.size ?? '');
      setLevel(d.level ?? '');
      setCat(d.cat ?? d.category ?? '');
      setIsExpertRecommended(d.isExpertRecommended ?? false);
    } catch (e) {
      console.error(e);
      setError('שגיאה בטעינת המוצר');
    } finally {
      setPageLoading(false);
    }
  }

  async function handleUpload(field: 'imgUrl' | 'imgUrl2' | 'imgUrl3', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(field);
    try {
      const url = await uploadToCloudinary(file);
      if (field === 'imgUrl') setImgUrl(url);
      if (field === 'imgUrl2') setImgUrl2(url);
      if (field === 'imgUrl3') setImgUrl3(url);
    } catch { setError('שגיאה בהעלאת תמונה'); }
    finally { setUploading(null); e.target.value = ''; }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) { setError('שם ומחיר הם שדות חובה'); return; }
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'products', productId), {
        name,
        desc,
        description: desc,
        price: Number(price),
        imgUrl: imgUrl || '',
        imgUrl2: imgUrl2 || '',
        imgUrl3: imgUrl3 || '',
        deliveryDays,
        days: deliveryDays,
        nusach,
        size,
        level,
        isExpertRecommended: EXPERT_REC_CATS_SOFER.includes(cat) ? isExpertRecommended : false,
      });
      setSaved(true);
      setTimeout(() => router.push('/sofer-dashboard'), 1500);
    } catch (e) {
      console.error(e);
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

  if (loading || pageLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 20 }}>טוען...</div>
    </div>
  );

  if (error && !name) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
        <div style={{ fontSize: 18, color: '#991b1b', fontWeight: 700, marginBottom: 20 }}>{error}</div>
        <button onClick={() => router.push('/sofer-dashboard')}
          style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ← חזרה לדשבורד
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: '#a8c8b4', marginBottom: 3 }}>פורטל סופר</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>✏️ עריכת מוצר</div>
        </div>
        <button onClick={() => router.push('/sofer-dashboard')}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← חזרה לדשבורד
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '28px auto', padding: '0 16px' }}>
        <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>שם המוצר *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical', lineHeight: 1.6 }}
              value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          {/* Price */}
          <div>
            <label style={labelStyle}>מחיר ₪ *</label>
            <input type="number" min="0" style={{ ...inputStyle, maxWidth: 160 }}
              value={price} onChange={e => setPrice(e.target.value)} required />
          </div>

          {/* Images */}
          <div>
            <label style={labelStyle}>תמונות</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['imgUrl', 'imgUrl2', 'imgUrl3'] as const).map((field, i) => {
                const val = field === 'imgUrl' ? imgUrl : field === 'imgUrl2' ? imgUrl2 : imgUrl3;
                return (
                  <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {val ? (
                      <img src={val} alt={`תמונה ${i + 1}`}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: 8, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🖼️</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ background: '#1a3a2a', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: uploading === field ? 'not-allowed' : 'pointer', opacity: uploading === field ? 0.6 : 1 }}>
                        {uploading === field ? '⏳ מעלה...' : `📷 תמונה ${i + 1}`}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={!!uploading}
                          onChange={e => handleUpload(field, e)} />
                      </label>
                      {val && (
                        <button type="button"
                          onClick={() => { if (field === 'imgUrl') setImgUrl(''); if (field === 'imgUrl2') setImgUrl2(''); if (field === 'imgUrl3') setImgUrl3(''); }}
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

          {/* Delivery days + Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>זמן אספקה (ימים)</label>
              <input style={inputStyle} value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} placeholder="7-14" />
            </div>
            <div>
              <label style={labelStyle}>גודל כתב</label>
              <input style={inputStyle} value={size} onChange={e => setSize(e.target.value)} placeholder="12 שורות, גס..." />
            </div>
          </div>

          {/* Nusach + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>נוסח</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={nusach} onChange={e => setNusach(e.target.value)}>
                <option value="">-- בחר --</option>
                <option value="אשכנזי">אשכנזי</option>
                <option value="ספרדי">ספרדי</option>
                <option value={'אדמוה"ז'}>{'אדמוה"ז'}</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>רמת כשרות</label>
              <select style={{ ...inputStyle, background: '#fff' }} value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">-- בחר --</option>
                <option value="כשר לכתחילה">כשר לכתחילה</option>
                <option value="מהודר">מהודר</option>
                <option value="מהודר בתכלית">מהודר בתכלית</option>
              </select>
            </div>
          </div>

          {/* Expert recommended checkbox — STaM categories only */}
          {EXPERT_REC_CATS_SOFER.includes(cat) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#EFF4FF', border: '1.5px solid #93C5FD', borderRadius: 10, padding: '12px 14px' }}>
              <input
                type="checkbox"
                checked={isExpertRecommended}
                onChange={e => setIsExpertRecommended(e.target.checked)}
                style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#1E3A8A' }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A' }}>
                ⭐ המוצר הכי מומלץ על ידי המומחים שלנו
              </span>
            </label>
          )}

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#065f46', fontWeight: 700 }}>
              ✅ המוצר עודכן בהצלחה! מועבר לדשבורד...
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving || !!uploading}
              style={{ flex: 1, background: (saving || !!uploading) ? '#9ca3af' : '#1a3a2a', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: (saving || !!uploading) ? 'not-allowed' : 'pointer' }}>
              {saving ? 'שומר...' : '💾 שמור שינויים'}
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
