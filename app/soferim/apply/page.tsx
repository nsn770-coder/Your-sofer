'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const CATEGORIES = ['מזוזות', 'תפילין', 'מגילות', 'ספרי תורה', 'יודאיקה'];

export default function SoferApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
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

      {/* Form */}
      <div style={{ maxWidth: 640, margin: '32px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit}>

          {/* פרטים אישיים */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a3a2a', marginBottom: 20, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
              ✍️ פרטים אישיים
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>שם מלא *</label>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="ר' ישראל ישראלי"
                style={inputStyle} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>עיר / מיקום *</label>
                <input name="city" value={form.city} onChange={handleChange}
                  placeholder="ירושלים"
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>אימייל</label>
                <input name="email" value={form.email} onChange={handleChange}
                  placeholder="sofer@gmail.com" type="email"
                  style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>טלפון *</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  placeholder="050-0000000"
                  style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>וואטסאפ</label>
                <input name="whatsapp" value={form.whatsapp} onChange={handleChange}
                  placeholder="050-0000000"
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* קטגוריות */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a3a2a', marginBottom: 16, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
              📜 קטגוריות כתיבה *
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button"
                  onClick={() => toggleCategory(cat)}
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
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a3a2a', marginBottom: 20, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
              📝 תיאור וסגנון
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>תיאור קצר</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                placeholder="ספר על עצמך, הניסיון שלך, הכשרה..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>סגנון כתיבה</label>
              <input name="style" value={form.style} onChange={handleChange}
                placeholder="בית יוסף, אשכנזי, ספרדי, חב״ד..."
                style={inputStyle} />
            </div>
          </div>

          {/* תמונה */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1a3a2a', marginBottom: 16, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
              🖼️ תמונה
            </h3>
            <div>
              <label style={labelStyle}>קישור לתמונה (URL)</label>
              <input name="imageUrl" value={form.imageUrl} onChange={handleChange}
                placeholder="https://..."
                style={inputStyle} />
              <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
                העלה תמונה ל-Google Drive / Cloudinary והדבק את הקישור כאן
              </p>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#888' : '#b8972a',
              color: '#0c1a35', border: 'none', borderRadius: 10,
              padding: '16px 0', fontSize: 17, fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 32
            }}>
            {loading ? 'שולח...' : '✅ שלח בקשה להצטרפות'}
          </button>

        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 700,
  color: '#333', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #ddd', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, color: '#333',
  outline: 'none', background: '#fafafa', boxSizing: 'border-box',
};
