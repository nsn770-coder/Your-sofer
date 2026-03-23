'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ShaliachApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    name: '',
    chabadName: '',
    city: '',
    phone: '',
    email: '',
    rabbiName: '',
    logoUrl: '',
  });

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('שגיאה בהעלאה');
    return data.secure_url;
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(prev => ({ ...prev, logoUrl: url }));
    } catch {
      alert('שגיאה בהעלאת הלוגו');
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.city) {
      alert('נא למלא שם, טלפון ועיר');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'shluchim_applications'), {
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
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0c1a35', marginBottom: 12 }}>הבקשה נשלחה!</h2>
          <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            קיבלנו את פרטיך. צוות YourSofer יבדוק ויחזור אליך בהקדם.
          </p>
          <button onClick={() => router.push('/')}
            style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '24px 20px', textAlign: 'center' }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'inline-block', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>הצטרף כרב קהילה</h1>
        <p style={{ color: '#a8c0d8', marginTop: 8, fontSize: 15 }}>מלא את הפרטים ונחזור אליך בהקדם</p>
      </div>

      <div style={{ maxWidth: 580, margin: '32px auto', padding: '0 16px' }}>
        <form onSubmit={handleSubmit}>

          {/* פרטי העמותה */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>🏛️ פרטי העמותה</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>שם רב הקהילה (שם מלא) *</label>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="הרב ישראל ישראלי" style={inputStyle} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>שם העמותה</label>
              <input name="chabadName" value={form.chabadName} onChange={handleChange}
                placeholder="עמותת קהילת ישראל תל אביב" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>עיר *</label>
                <input name="city" value={form.city} onChange={handleChange}
                  placeholder="תל אביב" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>שם הרב/הרבנית</label>
                <input name="rabbiName" value={form.rabbiName} onChange={handleChange}
                  placeholder="הרב כהן" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>טלפון *</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  placeholder="050-0000000" style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>אימייל</label>
                <input name="email" value={form.email} onChange={handleChange}
                  placeholder="info@amuta.org.il" type="email" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* לוגו */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>🖼️ לוגו העמותה</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, background: '#f0f4ff', border: '1px solid #c8d4f0', borderRadius: 8, padding: '10px 14px' }}>
              הלוגו יופיע בבאנר האתר כשלקוחות נכנסים דרך הלינק שלך — מומלץ להעלות לוגו ברור ומקצועי.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="לוגו"
                  style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '2px solid #0c1a35', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 10, background: '#e8eef8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                  🏛️
                </div>
              )}
              <div>
                <label style={{ display: 'inline-block', background: '#0c1a35', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {uploadingLogo ? '⏳ מעלה...' : '📷 העלה לוגו'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleLogoUpload} />
                </label>
                {form.logoUrl && (
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, logoUrl: '' }))}
                    style={{ marginRight: 10, background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13 }}>
                    הסר
                  </button>
                )}
                <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>PNG / JPG עד 2MB · מומלץ 200×200</p>
              </div>
            </div>
          </div>

          {/* מידע על תרומות */}
          <div style={{ background: '#f0f4ff', border: '1px solid #c8d4f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0c1a35', marginBottom: 10 }}>💰 מידע על תרומות</h3>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8 }}>
              <div>• <strong>10%</strong> מכל הזמנה דרך הלינק שלך יועברו לעמותה</div>
              <div>• תשלום חודשי ישירות לחשבון העמותה</div>
              <div>• דשבורד עם נתוני מכירות ותרומות בזמן אמת</div>
              <div>• לינק אישי עם ברנדינג של העמותה שלך</div>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? '#888' : '#0c1a35',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '16px 0', fontSize: 17, fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: 32,
            }}>
            {loading ? 'שולח...' : '✅ שלח בקשת הצטרפות'}
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
  fontSize: 17, fontWeight: 800, color: '#0c1a35', marginBottom: 20,
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
