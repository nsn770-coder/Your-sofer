'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface Sofer {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  description?: string;
  style?: string;
  categories: string[];
  imageUrl?: string;
  status: string;
}

export default function SoferimPage() {
  const router = useRouter();
  const [soferim, setSoferim] = useState<Sofer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('הכל');

  const filters = ['הכל', 'מזוזות', 'תפילין', 'מגילות', 'ספרי תורה'];

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, 'soferim'), where('status', '==', 'active'))
        );
        const data: Sofer[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Sofer));
        setSoferim(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = activeFilter === 'הכל'
    ? soferim
    : soferim.filter(s => s.categories?.includes(activeFilter));

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '24px 20px', textAlign: 'center' }}>
        <div onClick={() => router.push('/')}
          style={{ cursor: 'pointer', display: 'inline-block', marginBottom: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Your Sofer</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>הסופרים שלנו</h1>
        <p style={{ color: '#a8c8b4', marginTop: 8, fontSize: 15 }}>
          סופרים מוסמכים ומאומתים — בחר את הסופר שלך
        </p>
        <button
          onClick={() => router.push('/soferim/apply')}
          style={{ marginTop: 16, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ✍️ הצטרף כסופר
        </button>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 1000, margin: '24px auto 0', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                background: activeFilter === f ? '#1a3a2a' : '#fff',
                color: activeFilter === f ? '#fff' : '#333',
                border: activeFilter === f ? '1px solid #1a3a2a' : '1px solid #ddd',
                fontWeight: activeFilter === f ? 700 : 400,
              }}>
              {f}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>טוען סופרים...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
            <div style={{ fontSize: 18, color: '#555', marginBottom: 8 }}>אין סופרים עדיין</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>היה הראשון להצטרף לפלטפורמה</div>
            <button onClick={() => router.push('/soferim/apply')}
              style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              הצטרף כסופר
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, paddingBottom: 40 }}>
            {filtered.map(s => (
              <div key={s.id}
                style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #eee' }}>

                {/* תמונה */}
                <div style={{ height: 160, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div style={{ fontSize: 64 }}>✍️</div>
                  )}
                </div>

                {/* תוכן */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>{s.name}</h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: '#555', marginBottom: 10 }}>
                    {s.city && <span>📍 {s.city}</span>}
                    {s.style && <span>✍️ {s.style}</span>}
                  </div>

                  {s.description && (
                    <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 12,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {s.description}
                    </p>
                  )}

                  {/* קטגוריות */}
                  {s.categories?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {s.categories.map(cat => (
                        <span key={cat}
                          style={{ background: '#f0f7f3', color: '#1a3a2a', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* כפתורי קשר */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {s.whatsapp && (
                      <a href={`https://wa.me/972${s.whatsapp.replace(/\D/g, '').slice(1)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                        💬 וואטסאפ
                      </a>
                    )}
                    <button
                      onClick={() => router.push(`/?sofer=${s.id}`)}
                      style={{ flex: 1, background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      📜 המוצרים שלו
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
