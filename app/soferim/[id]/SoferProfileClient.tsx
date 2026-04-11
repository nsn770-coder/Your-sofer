'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useCart } from '../../contexts/CartContext';

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
  writingSamples?: string[];
  status: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  imgUrl?: string;
  image_url?: string;
  cat?: string;
  badge?: string;
  days?: string;
}

const navy = '#0c1a35';
const gold = '#b8972a';
const green = '#1a3a2a';

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: 13 }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

export default function SoferProfileClient({ id }: { id: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [sofer, setSofer] = useState<Sofer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const soferSnap = await getDoc(doc(db, 'soferim', id));
        if (soferSnap.exists()) {
          setSofer({ id: soferSnap.id, ...soferSnap.data() } as Sofer);
        }
        const prodSnap = await getDocs(
          query(collection(db, 'products'), where('soferId', '==', id))
        );
        const prods: Product[] = [];
        prodSnap.forEach(d => prods.push({ id: d.id, ...d.data() } as Product));
        setProducts(prods);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleAddToCart(p: Product) {
    addItem({ id: p.id, name: p.name, price: p.price, imgUrl: p.imgUrl || p.image_url, quantity: 1 });
    setAdded(p.id);
    setTimeout(() => setAdded(null), 2000);
  }

  function buildWaLink(phone?: string) {
    const raw = (phone ?? '').replace(/\D/g, '');
    const normalized = raw.startsWith('0') ? '972' + raw.slice(1) : raw;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(`שלום ${sofer?.name ?? ''}, ראיתי את הפרופיל שלך ב-Your Sofer ואני מעוניין בפרטים נוספים`)}`;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✍️</div>
          <div style={{ color: '#666', fontSize: 16 }}>טוען פרופיל סופר...</div>
        </div>
      </div>
    );
  }

  if (!sofer) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>הסופר לא נמצא</div>
          <button onClick={() => router.push('/soferim')}
            style={{ background: navy, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            חזרה לרשימת הסופרים
          </button>
        </div>
      </div>
    );
  }

  const hasWhatsApp = sofer.whatsapp || sofer.phone;
  const hasPhone = sofer.phone;
  const hasSamples = sofer.writingSamples?.length;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', flexWrap: 'wrap' }}>
          <a href="/" style={{ color: '#0e6ba8', fontWeight: 600, textDecoration: 'none' }}>ראשי</a>
          <span style={{ color: '#ccc' }}>›</span>
          <a href="/soferim" style={{ color: '#0e6ba8', fontWeight: 600, textDecoration: 'none' }}>סופרים</a>
          <span style={{ color: '#ccc' }}>›</span>
          <span style={{ color: '#333', fontWeight: 600 }}>{sofer.name}</span>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{ background: `linear-gradient(135deg, ${green} 0%, #2d5a3d 60%, ${green} 100%)`, padding: isMobile ? '32px 20px 28px' : '48px 24px 40px', position: 'relative', overflow: 'hidden' }}>
        {/* texture overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e6a817'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: isMobile ? 20 : 36, flexWrap: 'wrap' }}>

          {/* Photo */}
          <div style={{ width: isMobile ? 90 : 120, height: isMobile ? 90 : 120, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', border: '3px solid rgba(184,151,42,0.6)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {sofer.imageUrl ? (
              <img src={sofer.imageUrl} alt={sofer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: isMobile ? 44 : 60 }}>✍️</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: '#fff', margin: 0 }}>{sofer.name}</h1>
              <span style={{ background: 'rgba(26,107,60,0.9)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>✓ מאושר ומאומת</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>
              {sofer.city && <span>📍 {sofer.city}</span>}
              {sofer.style && <span>✍️ {sofer.style}</span>}
              {products.length > 0 && <span>📦 {products.length} מוצרים</span>}
            </div>

            <div style={{ display: 'flex', gap: 2 }}>
              <Stars n={5} />
            </div>
          </div>

          {/* Desktop CTAs in hero */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {hasWhatsApp && (
                <a href={buildWaLink(sofer.whatsapp || sofer.phone)} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  וואטסאפ
                </a>
              )}
              {hasPhone && (
                <a href={`tel:${sofer.phone}`}
                  style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, backdropFilter: 'blur(4px)' }}>
                  📞 {sofer.phone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category tags strip */}
      {sofer.categories?.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 20px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>מתמחה ב:</span>
            {sofer.categories.map(cat => (
              <span key={cat} style={{ background: '#f0f7f3', color: green, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid #c8e6d4' }}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: 24 }}>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact card */}
          {(hasWhatsApp || hasPhone) && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: navy, marginBottom: 14, margin: '0 0 14px' }}>יצירת קשר</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hasWhatsApp && (
                  <a href={buildWaLink(sofer.whatsapp || sofer.phone)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25d366', color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 800, textDecoration: 'none', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1ebb58')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#25d366')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    שלח וואטסאפ
                  </a>
                )}
                {hasPhone && (
                  <a href={`tel:${sofer.phone}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: navy, color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 800, textDecoration: 'none', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a2f55')}
                    onMouseLeave={e => (e.currentTarget.style.background = navy)}>
                    📞 התקשר עכשיו
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Details card */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: navy, margin: '0 0 14px' }}>פרטים</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, color: '#444' }}>
              {sofer.city && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <div><span style={{ color: '#888', fontSize: 12 }}>עיר</span><br />{sofer.city}</div>
                </div>
              )}
              {sofer.style && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✍️</span>
                  <div><span style={{ color: '#888', fontSize: 12 }}>כתב</span><br />{sofer.style}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <div><span style={{ color: '#888', fontSize: 12 }}>סטטוס</span><br />מאושר ומאומת</div>
              </div>
              {products.length > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <div><span style={{ color: '#888', fontSize: 12 }}>מוצרים זמינים</span><br />{products.length} מוצרים</div>
                </div>
              )}
            </div>
          </div>

          {/* Trust card */}
          <div style={{ background: `linear-gradient(135deg, ${navy} 0%, #1a3060 100%)`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 800, color: gold, marginBottom: 10, fontSize: 14 }}>ערבות Your Sofer</div>
              {['פיקוח רבני על כל סופר', 'בדיקת מחשב לכל מוצר', 'תעודת כשרות מאושרת', 'אחריות פלטפורמה מלאה'].map(t => (
                <div key={t} style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
                  <span style={{ color: gold }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Bio */}
          {sofer.description && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: navy, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: gold }}>✍️</span> על הסופר
              </h2>
              <p style={{ fontSize: 15, color: '#444', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                {sofer.description}
              </p>
            </div>
          )}

          {/* Writing samples */}
          {hasSamples ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: navy, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: gold }}>🖊️</span> דוגמאות כתיבה
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {sofer.writingSamples!.map((url, i) => (
                  <div key={i}
                    onClick={() => setLightbox(url)}
                    style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in', border: '2px solid #e8e8e8', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = gold)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e8')}>
                    <img src={url} alt={`דוגמת כתיבה ${i + 1} — ${sofer.name}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#999', margin: '10px 0 0', textAlign: 'center' }}>לחץ על תמונה להגדלה</p>
            </div>
          ) : null}

          {/* Products */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: navy, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: gold }}>📜</span> המוצרים של {sofer.name}
              {products.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>({products.length})</span>}
            </h2>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 15 }}>אין מוצרים זמינים כרגע</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {products.map(p => {
                  const discount = p.was ? Math.round((1 - p.price / p.was) * 100) : 0;
                  const img = p.imgUrl || p.image_url;
                  return (
                    <div key={p.id}
                      onClick={() => router.push(`/product/${p.id}`)}
                      style={{ border: '1px solid #e8e8e8', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', background: '#fafafa' }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                      <div style={{ position: 'relative', paddingTop: '100%', background: '#f3f4f4' }}>
                        {img ? (
                          <img src={img} alt={p.name}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
                        )}
                        {p.badge && (
                          <span style={{ position: 'absolute', top: 8, right: 8, background: p.badge === 'מבצע' ? '#c0392b' : p.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                            {p.badge}
                          </span>
                        )}
                        {discount > 0 && (
                          <span style={{ position: 'absolute', top: p.badge ? 34 : 8, right: 8, background: '#c0392b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                            -{discount}%
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1111', marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {p.name}
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          {p.was && <div style={{ fontSize: 11, color: '#888', textDecoration: 'line-through' }}>₪{p.was}</div>}
                          <span style={{ fontSize: 18, fontWeight: 900, color: navy }}>₪{p.price}</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleAddToCart(p); }}
                          style={{ width: '100%', background: added === p.id ? '#27ae60' : gold, border: 'none', color: added === p.id ? '#fff' : navy, borderRadius: 20, padding: '7px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                          {added === p.id ? '✅ נוסף!' : 'הוסף לסל'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Sticky mobile CTA */}
      {isMobile && (hasWhatsApp || hasPhone) && (
        <div style={{ position: 'fixed', bottom: 0, right: 0, left: 0, background: '#fff', borderTop: '1px solid #e8e8e8', padding: '12px 16px', display: 'flex', gap: 10, zIndex: 100, boxShadow: '0 -4px 16px rgba(0,0,0,0.1)' }}>
          {hasWhatsApp && (
            <a href={buildWaLink(sofer.whatsapp || sofer.phone)} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#25d366', color: '#fff', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              וואטסאפ
            </a>
          )}
          {hasPhone && (
            <a href={`tel:${sofer.phone}`}
              style={{ flex: hasWhatsApp ? '0 0 auto' : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: navy, color: '#fff', borderRadius: 10, padding: '13px 16px', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
              📞 {hasWhatsApp ? '' : 'התקשר'}{sofer.phone}
            </a>
          )}
        </div>
      )}

      {/* Mobile padding to not hide content behind sticky bar */}
      {isMobile && (hasWhatsApp || hasPhone) && <div style={{ height: 80 }} />}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
          <img src={lightbox} alt="דוגמת כתיבה"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
