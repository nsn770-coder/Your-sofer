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
  const [search, setSearch] = useState('');

  const filters = ['הכל', 'מזוזות', 'תפילין', 'מגילות', 'ספרי תורה'];

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'soferim'), where('status', '==', 'active')));
        const data: Sofer[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Sofer));
        setSoferim(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = soferim
    .filter(s => activeFilter === 'הכל' || s.categories?.includes(activeFilter))
    .filter(s => !search || s.name.includes(search) || s.city?.includes(search) || s.style?.includes(search));

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Navbar */}
      <div style={{ background: '#0c1a35', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: '#b8972a', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <div style={{ fontSize: 12, color: '#aaa' }}>› הסופרים שלנו</div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1a3a2a 100%)', padding: '40px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 8 }}>הסופרים שלנו</h1>
          <p style={{ color: '#a8c8b4', fontSize: 15, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            סופרים מוסמכים ומאומתים — כל סופר עבר בדיקה קפדנית עם פיקוח רבני ותעודת כשרות
          </p>

          {/* חיפוש */}
          <div style={{ display: 'flex', maxWidth: 480, margin: '0 auto 20px', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חפש סופר לפי שם, עיר או סגנון..."
              style={{ flex: 1, border: 'none', padding: '12px 16px', fontSize: 14, outline: 'none', color: '#333' }} />
            <button style={{ background: '#b8972a', border: 'none', padding: '0 20px', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>

          <button onClick={() => router.push('/soferim/apply')}
            style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            ✍️ הצטרף כסופר לפלטפורמה
          </button>
        </div>
      </div>

      {/* אותות אמון */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '12px 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
          <span>✓ <strong>פיקוח רבני</strong> על כל סופר</span>
          <span style={{ color: '#ddd' }}>|</span>
          <span>✓ <strong>בדיקת מחשב</strong> לכל מוצר</span>
          <span style={{ color: '#ddd' }}>|</span>
          <span>✓ <strong>תעודת כשרות</strong> מאושרת</span>
          <span style={{ color: '#ddd' }}>|</span>
          <span>✓ <strong>אחריות פלטפורמה</strong> מלאה</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>

        {/* פילטרים */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#555', fontWeight: 700 }}>סנן לפי:</span>
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: activeFilter === f ? '#1a3a2a' : '#fff', color: activeFilter === f ? '#fff' : '#333', border: activeFilter === f ? '1px solid #1a3a2a' : '1px solid #ddd', fontWeight: activeFilter === f ? 700 : 400, transition: 'all 0.15s' }}>
              {f}
            </button>
          ))}
          {(activeFilter !== 'הכל' || search) && (
            <button onClick={() => { setActiveFilter('הכל'); setSearch(''); }}
              style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: '#fff', color: '#c0392b', border: '1px solid #c0392b' }}>
              נקה ×
            </button>
          )}
          <span style={{ fontSize: 12, color: '#888', marginRight: 'auto' }}>{filtered.length} סופרים</span>
        </div>

        {/* גריד */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
            טוען סופרים...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✍️</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>אין סופרים עדיין</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>היה הראשון להצטרף לפלטפורמה</div>
            <button onClick={() => router.push('/soferim/apply')}
              style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              הצטרף כסופר
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, paddingBottom: 40 }}>
            {filtered.map(s => (
              <div key={s.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #eee', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}>

                {/* תמונה */}
                <div style={{ height: 180, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div style={{ fontSize: 72, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>✍️</div>
                  )}
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(26,107,60,0.9)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                    ✓ מאושר ומאומת
                  </div>
                </div>

                {/* תוכן */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>{s.name}</h3>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {'★★★★★'.split('').map((star, i) => (
                        <span key={i} style={{ color: '#e6a817', fontSize: 13 }}>{star}</span>
                      ))}
                    </div>
                  </div>

                  {/* עיר וסגנון בלבד — ללא טלפון/וואטסאפ */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#555', marginBottom: 10 }}>
                    {s.city && <span>📍 {s.city}</span>}
                    {s.style && <span>✍️ {s.style}</span>}
                  </div>

                  {s.description && (
                    <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {s.description}
                    </p>
                  )}

                  {/* קטגוריות */}
                  {s.categories?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {s.categories.map(cat => (
                        <span key={cat} style={{ background: '#f0f7f3', color: '#1a3a2a', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, border: '1px solid #c8e6d4' }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* כפתורים — רק "המוצרים שלו", ללא וואטסאפ */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => router.push(`/?soferId=${s.id}`)}
                      style={{ flex: 1, background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      📜 המוצרים שלו
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer style={{ background: '#0f1111', color: '#fff', padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#b8972a', marginBottom: 4 }}>✡ Your Sofer</div>
        <div style={{ fontSize: 12, color: '#666' }}>© 2025 Your Sofer — סת"מ מסופרים מוסמכים</div>
      </footer>
    </div>
  );
}
