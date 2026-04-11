'use client';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { CATS } from '../../constants/categories';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number | null;
  desc?: string;
  description?: string;
  imgUrl?: string;
  image_url?: string;
  img1?: string;
  img2?: string;
  img3?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  imgUrl4?: string;
  cat?: string;
  badge?: string;
  sofer?: string;
  soferId?: string;
  days?: string;
  stars?: number;
  reviews?: number;
  videoUrl?: string;
}

interface KlafItem {
  id: string;
  name: string;
  imageUrl: string;
  status: string;
}

function Stars({ n = 4.5, size = 16 }: { n?: number; size?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

function KlafGallery({ productId, onSelect }: {
  productId: string;
  onSelect: (klafId: string | null, klafName: string | null) => void;
}) {
  const [klafImages, setKlafImages] = useState<KlafItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  useEffect(() => {
    async function loadKlafim() {
      try {
        const q = query(collection(db, 'klafim'), where('productId', '==', productId), where('status', '==', 'available'));
        const snap = await getDocs(q);
        const items: KlafItem[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as KlafItem));
        setKlafImages(items);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadKlafim();
  }, [productId]);

  function handleSelect(img: KlafItem) {
    const newVal = selected === img.id ? null : img.id;
    const newName = selected === img.id ? null : img.name;
    setSelected(newVal);
    onSelect(newVal, newName);
  }

  if (loading) return <div style={{ padding: '12px 0', color: '#888', fontSize: 13 }}>⏳ טוען קלפים...</div>;
  if (!klafImages.length) return null;

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#0f1111', marginBottom: 4 }}>📜 בחר את הקלף שלך</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{klafImages.length} קלפים זמינים — כל קלף כתוב ביד</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
        {klafImages.map(img => (
          <div key={img.id} style={{ border: `2px solid ${selected === img.id ? '#b8972a' : '#e0e0e0'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: selected === img.id ? '#fffbf0' : '#fff', transition: 'all 0.15s', position: 'relative' }}>
            <div onClick={() => handleSelect(img)}>
              <img src={img.imageUrl} alt={img.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} />
              {selected === img.id && <div style={{ position: 'absolute', top: 4, right: 4, background: '#b8972a', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>}
            </div>
            <div style={{ padding: '3px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{img.name}</span>
              <button onClick={() => setZoomImg(img.imageUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '0 2px', color: '#0e6ba8', flexShrink: 0 }}>🔍</button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 10, background: '#fffbf0', border: '1px solid #b8972a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0c1a35', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ קלף נבחר
          <button onClick={() => { setSelected(null); onSelect(null, null); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, marginRight: 'auto' }}>ביטול</button>
        </div>
      )}
      {zoomImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="קלף" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomImg(null)} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>✕</button>
        </div>
      )}
    </div>
  );
}

function EditModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (updated: Partial<Product>) => void; }) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [was, setWas] = useState(String(product.was || ''));
  const [desc, setDesc] = useState(product.desc || product.description || '');
  const [cat, setCat] = useState(product.cat || '');
  const [imgUrl, setImgUrl] = useState(product.imgUrl || product.image_url || '');
  const [imgUrl2, setImgUrl2] = useState(product.imgUrl2 || '');
  const [imgUrl3, setImgUrl3] = useState(product.imgUrl3 || '');
  const [videoUrl, setVideoUrl] = useState(product.videoUrl || '');
  const [badge, setBadge] = useState(product.badge || '');
  const [days, setDays] = useState(product.days || '7-14');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  async function uploadToCloudinary(file: File, isVideo = false): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const type = isVideo ? 'video' : 'image';
    const res = await fetch(`https://api.cloudinary.com/v1_1/dyxzq3ucy/${type}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(field);
    try {
      const isVideo = file.type.startsWith('video/');
      const url = await uploadToCloudinary(file, isVideo);
      if (field === 'main') setImgUrl(url);
      else if (field === 'img2') setImgUrl2(url);
      else if (field === 'img3') setImgUrl3(url);
      else if (field === 'video') setVideoUrl(url);
    } catch { alert('שגיאה בהעלאה'); }
    finally { setUploadingImg(null); }
  }

  async function handleSave() {
    setSaving(true);
    try { onSave({ name, price: Number(price), was: was ? Number(was) : null, desc, cat, imgUrl, imgUrl2, imgUrl3, videoUrl, badge, days }); }
    finally { setSaving(false); }
  }

  const inputS: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };
  const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>✏️ עריכת מוצר</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={labelS}>שם מוצר</label><input value={name} onChange={e => setName(e.target.value)} style={inputS} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelS}>מחיר ₪</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>מחיר מקורי ₪</label><input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="לא חובה" style={inputS} /></div>
          </div>
          <div><label style={labelS}>קטגוריה</label><select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputS, background: '#fff' }}>{CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelS}>תווית</label><select value={badge} onChange={e => setBadge(e.target.value)} style={{ ...inputS, background: '#fff' }}><option value="">ללא</option><option value="חדש">חדש</option><option value="מבצע">מבצע</option><option value="פופולרי">פופולרי</option></select></div>
            <div><label style={labelS}>זמן אספקה</label><input value={days} onChange={e => setDays(e.target.value)} placeholder="7-14" style={inputS} /></div>
          </div>
          <div><label style={labelS}>תיאור</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ ...inputS, resize: 'vertical' }} /></div>

          {/* מדיה */}
          <div>
            <label style={labelS}>תמונות וסרטון</label>
            {(['main', 'img2', 'img3'] as const).map((field, idx) => {
              const cur = field === 'main' ? imgUrl : field === 'img2' ? imgUrl2 : imgUrl3;
              const set = field === 'main' ? setImgUrl : field === 'img2' ? setImgUrl2 : setImgUrl3;
              return (
                <div key={field} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  {cur && <img src={cur} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }} />}
                  <label style={{ background: '#0c1a35', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {uploadingImg === field ? '⏳...' : `📷 תמונה ${idx + 1}`}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, field)} />
                  </label>
                  <input value={cur} onChange={e => set(e.target.value)} placeholder="URL" style={{ flex: 1, border: '1px solid #ddd', borderRadius: 7, padding: '7px 10px', fontSize: 12, minWidth: 0 }} />
                </div>
              );
            })}
            {/* וידאו */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              {videoUrl && <div style={{ width: 44, height: 44, background: '#111', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>▶️</div>}
              <label style={{ background: '#7c3aed', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {uploadingImg === 'video' ? '⏳...' : '🎬 סרטון'}
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'video')} />
              </label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="URL סרטון (אופציונלי)" style={{ flex: 1, border: '1px solid #ddd', borderRadius: 7, padding: '7px 10px', fontSize: 12, minWidth: 0 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{saving ? '⏳ שומר...' : '💾 שמור שינויים'}</button>
          <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedKlafId, setSelectedKlafId] = useState<string | null>(null);
  const [selectedKlafName, setSelectedKlafName] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'products', String(id)));
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product;
          setProduct(p);
          if (p.cat) {
            const relSnap = await getDocs(query(collection(db, 'products'), where('cat', '==', p.cat), limit(6)));
            const relData: Product[] = [];
            relSnap.forEach(d => { if (d.id !== p.id) relData.push({ id: d.id, ...d.data() } as Product); });
            setRelated(relData.slice(0, 4));
          }
        }
      } finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function handleSave(updated: Partial<Product>) {
    if (!product) return;
    try {
      const cleanData = Object.fromEntries(Object.entries(updated).filter(([_, v]) => v !== undefined));
      await updateDoc(doc(db, 'products', product.id), cleanData);
      setProduct(prev => prev ? { ...prev, ...updated } : prev);
      setShowEdit(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { console.error(err); alert('שגיאה בשמירה'); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 16, color: '#666' }}>טוען מוצר...</div>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>מוצר לא נמצא</div>
      <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>חזרה לחנות</button>
    </div>
  );

  const allMedia = [
    ...[product.imgUrl || product.image_url, product.imgUrl2 || product.img1, product.imgUrl3 || product.img2, product.imgUrl4 || product.img3].filter(Boolean) as string[],
  ];
  const hasVideo = !!product.videoUrl;
  const discount = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product!.id, name: product!.name, price: product!.price, imgUrl: product!.imgUrl || product!.image_url, quantity: 1, selectedKlafId: selectedKlafId || undefined, selectedKlafName: selectedKlafName || undefined });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  // ── Buy Box (shared between desktop sidebar and mobile bottom) ──
  const BuyBox = ({ compact = false }: { compact?: boolean }) => (
    <div style={{ background: '#fff', border: compact ? 'none' : '1px solid #ddd', borderRadius: compact ? 0 : 10, padding: compact ? '12px 16px' : '20px 18px' }}>
      {!compact && (
        <>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0c1a35', marginBottom: 2 }}>₪{product.price}</div>
          {product.was && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10, fontWeight: 600 }}>חסכת {discount}% — ₪{(product.was - product.price).toFixed(0)}</div>}
        </>
      )}
      <div style={{ color: '#1a6b3c', fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a6b3c', display: 'inline-block' }} />
        במלאי — משלוח חינם לכל הארץ
      </div>
      {selectedKlafName && (
        <div style={{ fontSize: 11, color: '#1a6b3c', background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>📜 {selectedKlafName}</div>
      )}
      {!compact && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>כמות:</label>
          <select value={qty} onChange={e => setQty(Number(e.target.value))} style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '8px 10px', fontSize: 13, background: '#f8f9fa', cursor: 'pointer' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
      <button onClick={handleAddToCart} style={{ width: '100%', background: added ? '#27ae60' : '#b8972a', color: added ? '#fff' : '#0c1a35', border: 'none', borderRadius: 24, padding: compact ? '10px' : '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {added ? '✅ נוסף לסל!' : '🛒 הוסף לסל'}
      </button>
      <button onClick={() => { handleAddToCart(); router.push('/cart'); }} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 24, padding: compact ? '10px' : '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: compact ? 0 : 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        ⚡ קנה עכשיו
      </button>
      {!compact && (
        <div style={{ fontSize: 11, color: '#666', lineHeight: 2, borderTop: '1px solid #eee', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <div>🔒 תשלום מאובטח</div>
          <div>↩️ ביטול עד 24 שעות</div>
          <div>🛡️ אחריות פלטפורמה</div>
          {product.sofer && <div>✍️ ישירות מהסופר</div>}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {saveSuccess && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#27ae60', color: '#fff', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ המוצר עודכן!
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: isMobile ? '8px 14px' : '10px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#555', flexWrap: 'wrap' }}>
            <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0e6ba8', fontWeight: 600 }}>דף הבית</span>
            <span style={{ color: '#ccc' }}>›</span>
            {product.cat && <><span onClick={() => router.push(`/?cat=${product.cat}`)} style={{ cursor: 'pointer', color: '#0e6ba8' }}>{product.cat}</span><span style={{ color: '#ccc' }}>›</span></>}
            <span style={{ color: '#333' }}>{product.name.slice(0, isMobile ? 30 : 50)}{product.name.length > (isMobile ? 30 : 50) ? '...' : ''}</span>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowEdit(true)} style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>✏️ עריכת מוצר</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px 0' : '20px 16px' }}>

        {/* ── Main Grid ── */}
        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 20, alignItems: 'start', background: isMobile ? '#fff' : 'transparent' }}>

          {/* ── Column 1: Images ── */}
          <div style={{ background: '#fff', borderRadius: isMobile ? 0 : 10, overflow: 'hidden', border: isMobile ? 'none' : '1px solid #e8e8e8' }}>

            {/* Main Image / Video */}
            <div style={{ position: 'relative', background: '#fafafa', cursor: 'zoom-in' }}>
              {showVideo && hasVideo ? (
                <video controls autoPlay style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#000' }}>
                  <source src={product.videoUrl} />
                </video>
              ) : (
                <img
                  src={allMedia[activeImg] || '/placeholder.png'}
                  alt={product.name}
                  onClick={() => setZoomVisible(true)}
                  style={{ width: '100%', aspectRatio: isMobile ? '4/3' : '1', objectFit: 'contain', padding: isMobile ? 8 : 20, display: 'block' }}
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
              {discount > 0 && !showVideo && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#c0392b', color: '#fff', fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>-{discount}%</div>
              )}
              {product.badge && !showVideo && (
                <div style={{ position: 'absolute', top: discount > 0 ? 44 : 12, right: 12, background: product.badge === 'מבצע' ? '#c0392b' : product.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>{product.badge}</div>
              )}
            </div>

            {/* Thumbnails */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #f0f0f0' }}>
              {allMedia.map((img, i) => (
                <button key={i} onClick={() => { setActiveImg(i); setShowVideo(false); }}
                  style={{ width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, flexShrink: 0, borderRadius: 6, overflow: 'hidden', border: `2px solid ${activeImg === i && !showVideo ? '#b8972a' : '#e0e0e0'}`, background: '#fff', cursor: 'pointer', padding: 2, transition: 'border-color 0.15s' }}>
                  <img src={img} alt={`תמונה ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                </button>
              ))}
              {hasVideo && (
                <button onClick={() => setShowVideo(true)}
                  style={{ width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, flexShrink: 0, borderRadius: 6, border: `2px solid ${showVideo ? '#7c3aed' : '#e0e0e0'}`, background: showVideo ? '#f5f0ff' : '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, transition: 'border-color 0.15s' }}>
                  ▶️
                </button>
              )}
            </div>
          </div>

          {/* ── Column 2: Details ── */}
          <div style={{ background: '#fff', borderRadius: isMobile ? 0 : 10, border: isMobile ? 'none' : '1px solid #e8e8e8', padding: isMobile ? '16px 14px' : '24px 20px', marginTop: isMobile ? 8 : 0 }}>

            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#0f1111', lineHeight: 1.4, marginBottom: 10 }}>{product.name}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
              <Stars n={product.stars || 4.5} size={16} />
              <span style={{ fontSize: 13, color: '#0e6ba8' }}>({product.reviews || 0} ביקורות)</span>
              {product.cat && <span style={{ fontSize: 12, color: '#888' }}>| <strong>{product.cat}</strong></span>}
            </div>

            {/* Price (mobile only — shows here) */}
            {isMobile && (
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                {product.was && <div style={{ fontSize: 12, color: '#888' }}>מחיר רגיל: <span style={{ textDecoration: 'line-through' }}>₪{product.was}</span> <span style={{ color: '#c0392b', fontWeight: 700 }}>({discount}% הנחה)</span></div>}
                <div style={{ fontSize: 30, fontWeight: 900, color: '#0c1a35', marginTop: 2 }}>₪{product.price}</div>
                <div style={{ fontSize: 12, color: '#c7511f' }}>כולל מע״מ · משלוח חינם</div>
              </div>
            )}

            {/* Sofer badge */}
            {product.sofer && (
              <div style={{ background: 'linear-gradient(135deg, #f0faf4, #e8f5ed)', border: '1px solid #b7e4c7', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#1a6b3c', fontWeight: 700 }}>✍️ נכתב בידי {product.sofer}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>✓ בדיקת מחשב</span>
                  <span>✓ תעודת כשרות</span>
                  <span>✓ פיקוח רבני</span>
                </div>
              </div>
            )}

            {/* Description */}
            {(product.desc || product.description) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1111', marginBottom: 6 }}>תיאור המוצר</div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.75 }}>{product.desc || product.description}</div>
              </div>
            )}

            {/* Info table */}
            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f1111', marginBottom: 8 }}>מידע חשוב</div>
              {[
                ['זמן אספקה', `${product.days || '7-14'} ימי עסקים`],
                ['משלוח', 'חינם לכל הארץ 🚚'],
                ['ביטול', 'עד 24 שעות מהרכישה'],
                ['אחריות', 'אחריות פלטפורמה מלאה'],
              ].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingBottom: i < arr.length - 1 ? 6 : 0, marginBottom: i < arr.length - 1 ? 6 : 0, borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none' }}>
                  <span style={{ color: '#666' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: k === 'משלוח' ? '#1a6b3c' : '#333' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Klaf gallery */}
            <KlafGallery productId={product.id} onSelect={(klafId, klafName) => { setSelectedKlafId(klafId); setSelectedKlafName(klafName); }} />

            {/* Mobile buy box */}
            {isMobile && (
              <div style={{ marginTop: 16 }}>
                <BuyBox />
              </div>
            )}
          </div>

          {/* ── Column 3: Buy Box (desktop only) ── */}
          {!isMobile && (
            <div ref={buyBoxRef} style={{ position: 'sticky', top: 20 }}>
              {product.was && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: 10, padding: '10px 14px', marginBottom: 10, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#c0392b' }}>⚡ מבצע מיוחד!</div>
                  <div style={{ color: '#555', fontSize: 12 }}>חסכת ₪{(product.was - product.price).toFixed(0)} ({discount}%)</div>
                </div>
              )}
              <div style={{ border: '1px solid #e0e0e0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #0c1a35, #1a2d50)', padding: '14px 18px' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>₪{product.price}</div>
                  {product.was && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through' }}>₪{product.was}</div>}
                </div>
                <BuyBox />
              </div>
            </div>
          )}
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div style={{ marginTop: 28, background: '#fff', borderRadius: isMobile ? 0 : 10, border: isMobile ? 'none' : '1px solid #e8e8e8', padding: isMobile ? '16px 14px' : '20px 20px', borderTop: isMobile ? '8px solid #f3f4f4' : undefined }}>
            <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#0f1111', marginBottom: 14 }}>מוצרים דומים מקטגוריה &quot;{product.cat}&quot;</h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 10 : 14 }}>
              {related.map(r => (
                <div key={r.id} onClick={() => router.push(`/product/${r.id}`)}
                  style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}>
                  <div style={{ paddingTop: '100%', position: 'relative', background: '#f7f8f8' }}>
                    {(r.imgUrl || r.image_url) ? (
                      <img src={r.imgUrl || r.image_url} alt={r.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📦</div>
                    )}
                  </div>
                  <div style={{ padding: isMobile ? '8px' : '10px 10px 12px' }}>
                    <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.name}</div>
                    <Stars n={r.stars || 4.5} size={11} />
                    <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 900, color: '#0c1a35', marginTop: 3 }}>₪{r.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Zoom Modal ── */}
      {zoomVisible && allMedia.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomVisible(false)}>
          <img src={allMedia[activeImg]} alt={product.name} style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomVisible(false)} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>✕</button>
          {allMedia.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % allMedia.length); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>‹</button>
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + allMedia.length) % allMedia.length); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>›</button>
            </>
          )}
        </div>
      )}

      {showEdit && <EditModal product={product} onClose={() => setShowEdit(false)} onSave={handleSave} />}
    </div>
  );
}
