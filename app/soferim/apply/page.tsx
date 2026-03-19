'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const CATEGORIES = ['מזוזות', 'תפילין', 'מגילות', 'ספרי תורה', 'יודאיקה'];
const PRODUCT_TYPES = ['מזוזה', 'תפילין', 'מגילה', 'ספר תורה'];

interface ProductEntry {
  type: string;
  images: string[];
}

export default function SoferApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    city: '',
    phone: '',
    whatsapp: '',
    email: '',
    description: '',
    style: '',
    categories: [] as string[],
    imageUrl: '',
    writingSamples: [] as string[], // עד 4 תמונות דוגמת כתב
  });
  const [products, setProducts] = useState<ProductEntry[]>([]); // עד 4 מוצרים

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'שגיאה בהעלאה');
    return data.secure_url;
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField('profile');
    try {
      const url = await uploadToCloudinary(file);
      setForm(prev => ({ ...prev, imageUrl: url }));
    } catch {
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setUploadingField(null);
    }
  }

  async function handleWritingSampleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (form.writingSamples.length >= 4) { alert('ניתן להעלות עד 4 תמונות כתב'); return; }
    setUploadingField('writing');
    try {
      const url = await uploadToCloudinary(file);
      setForm(prev => ({ ...prev, writingSamples: [...prev.writingSamples, url] }));
    } catch {
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setUploadingField(null);
    }
  }

  function removeWritingSample(idx: number) {
    setForm(prev => ({ ...prev, writingSamples: prev.writingSamples.filter((_, i) => i !== idx) }));
  }

  function addProduct() {
    if (products.length >= 4) { alert('ניתן להוסיף עד 4 מוצרים'); return; }
    setProducts(prev => [...prev, { type: PRODUCT_TYPES[0], images: [] }]);
  }

  function removeProduct(idx: number) {
    setProducts(prev => prev.filter((_, i) => i !== idx));
  }

  function setProductType(idx: number, type: string) {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, type } : p));
  }

  async function handleProductImageUpload(productIdx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (products[productIdx].images.length >= 4) { alert('ניתן להעלות עד 4 תמונות למוצר'); return; }
    setUploadingField(`product_${productIdx}`);
    try {
      const url = await uploadToCloudinary(file);
      setProducts(prev => prev.map((p, i) => i === productIdx ? { ...p, images: [...p.images, url] } : p));
    } catch {
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setUploadingField(null);
    }
  }

  function removeProductImage(productIdx: number, imgIdx: number) {
    setProducts(prev => prev.map((p, i) => i === productIdx ? { ...p, images: p.images.filter((_, j) => j !== imgIdx) } : p));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleCategory(cat: string) {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.categories.length) {
      alert('נא למלא שם, טלפון וקטגוריה אחת לפחות');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'soferim_applications'), {
        ...form,
        products,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשליחה, נסה שוב');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a3a2a', marginBottom: 12 }}>הבקשה נשלחה!</h2>
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            קיבלנו את פרטיך. צוות YourSofer יבדוק ויחזור אליך בהקדם.
          </p>
          <button onClick={() => router.push('/')}
            style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '24px 20px', textAlign: 'center' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'inline-block', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>הצטרף כסופר</h1>
        <p style={{ color: '#a8c8b4', marginTop: 8, fontSize: 15 }}>מלא את הפרטים ונחזור אליך בהקדם</p>
      </div>

      <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit}>

          {/* פרטים אישיים */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>✍️ פרטים אישיים</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>שם מלא *</label>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="ר' ישראל ישראלי" style={inputStyle} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>עיר / מיקום *</label>
                <input name="city" value={form.city} onChange={handleChange}
                  placeholder="ירושלים" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>אימייל</label>
                <input name="email" value={form.email} onChange={handleChange}
                  placeholder="sofer@gmail.com" type="email" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>טלפון *</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  placeholder="050-0000000" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>וואטסאפ</label>
                <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
                  placeholder="050-0000000" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* קטגוריות */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>📜 קטגוריות כתיבה *</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '8px 18px', borderRadius: 20, fontSize: 14, cursor: 'pointer', fontWeight: 600,
                    background: form.categories.includes(cat) ? '#1a3a2a' : '#f3f4f4',
                    color: form.categories.includes(cat) ? '#fff' : '#333',
                    border: form.categories.includes(cat) ? '2px solid #1a3a2a' : '2px solid #ddd',
                  }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* תיאור */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>📝 תיאור וסגנון</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>תיאור קצר</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="ספר על עצמך, הניסיון שלך, הכשרה..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>סגנון כתיבה</label>
              <input name="style" value={form.style} onChange={handleChange}
                placeholder="בית יוסף, אשכנזי, ספרדי, חב״ד..." style={inputStyle} />
            </div>
          </div>

          {/* תמונת פנים */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>🖼️ תמונת פנים</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, background: '#fffbf0', border: '1px solid #e6d5a0', borderRadius: 8, padding: '10px 14px' }}>
              📸 <strong>העלה תמונת פנים ברורה שלך</strong> — הלקוחות רוצים להכיר את הסופר! תמונה אישית מגבירה אמון ומעלה את הסיכוי לרכישה.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.imageUrl && (
                <img src={form.imageUrl} alt="תמונת פנים"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1a3a2a', flexShrink: 0 }} />
              )}
              <div>
                <label style={{ display: 'inline-block', background: '#1a3a2a', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {uploadingField === 'profile' ? '⏳ מעלה...' : '📷 העלה תמונת פנים'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleProfileImageUpload} />
                </label>
                {form.imageUrl && (
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                    style={{ marginRight: 10, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13 }}>
                    הסר תמונה
                  </button>
                )}
                <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>JPG / PNG עד 5MB</p>
              </div>
            </div>
          </div>

          {/* דוגמאות כתב */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>✍️ דוגמאות כתב (עד 4 תמונות)</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, background: '#f0f7f3', border: '1px solid #c8e6d4', borderRadius: 8, padding: '10px 14px' }}>
              📜 <strong>חשוב מאוד!</strong> העלה תמונות של כתב איכותי — זה מה שהלקוחות יראו ויחליטו על פיו. תמונות ברורות ומוארות יגדילו מכירות.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
              {form.writingSamples.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={url} alt={`כתב ${idx + 1}`} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                  <button type="button" onClick={() => removeWritingSample(idx)}
                    style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(192,57,43,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              ))}

              {form.writingSamples.length < 4 && (
                <label style={{ border: '2px dashed #ccc', borderRadius: 8, aspectRatio: '3/4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fafafa', gap: 6 }}>
                  {uploadingField === 'writing' ? (
                    <span style={{ fontSize: 12, color: '#888' }}>⏳ מעלה...</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 24 }}>📷</span>
                      <span style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>הוסף תמונת כתב</span>
                    </>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleWritingSampleUpload} />
                </label>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#aaa' }}>{form.writingSamples.length}/4 תמונות הועלו</p>
          </div>

          {/* מוצרים */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>🛍️ המוצרים שלי (עד 4 מוצרים)</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              הוסף את המוצרים שאתה מציע — בחר סוג מוצר והעלה תמונות (עד 4 לכל מוצר).
            </p>

            {products.map((product, pIdx) => (
              <div key={pIdx} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 16, marginBottom: 14, background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1a3a2a' }}>מוצר {pIdx + 1}</span>
                    <select value={product.type} onChange={e => setProductType(pIdx, e.target.value)}
                      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 13, background: '#fff' }}>
                      {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeProduct(pIdx)}
                    style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    הסר ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {product.images.map((url, imgIdx) => (
                    <div key={imgIdx} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                      <img src={url} alt={`תמונה ${imgIdx + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                      <button type="button" onClick={() => removeProductImage(pIdx, imgIdx)}
                        style={{ position: 'absolute', top: 2, left: 2, background: 'rgba(192,57,43,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  ))}

                  {product.images.length < 4 && (
                    <label style={{ border: '2px dashed #ccc', borderRadius: 6, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', gap: 4 }}>
                      {uploadingField === `product_${pIdx}` ? (
                        <span style={{ fontSize: 11, color: '#888' }}>⏳</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 20 }}>+</span>
                          <span style={{ fontSize: 10, color: '#999' }}>תמונה</span>
                        </>
                      )}
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => handleProductImageUpload(pIdx, e)} />
                    </label>
                  )}
                </div>
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>{product.images.length}/4 תמונות</p>
              </div>
            ))}

            {products.length < 4 && (
              <button type="button" onClick={addProduct}
                style={{ width: '100%', border: '2px dashed #b8972a', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, color: '#b8972a', background: '#fffbf0', cursor: 'pointer' }}>
                ➕ הוסף מוצר ({products.length}/4)
              </button>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#888' : '#b8972a',
              color: '#0c1a35', border: 'none', borderRadius: 10,
              padding: '16px 0', fontSize: 17, fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 32,
            }}>
            {loading ? 'שולח...' : '✅ שלח בקשה להצטרפות'}
          </button>

        </form>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 17, fontWeight: 800, color: '#1a3a2a', marginBottom: 20,
  borderBottom: '2px solid #f0f0f0', paddingBottom: 10,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #ddd', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, color: '#333',
  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
};
