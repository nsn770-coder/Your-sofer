'use client';
import { useEffect, useState } from 'react';
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
  was?: number;
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
}

interface KlafItem {
  id: string;
  name: string;
  imageUrl: string;
  status: string;
}

function Stars({ n = 4.5, size = 16 }: { n?: number; size?: number }) {
  return (
    <span style={{ color: '#e6a817', fontSize: size }}>
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5 - Math.floor(n))}
    </span>
  );
}

// ══ גלריית קלפים — קוראת מ-Firestore, מציגה רק available ══
function KlafGallery({
  productId,
  onSelect,
}: {
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
        const q = query(
          collection(db, 'klafim'),
          where('productId', '==', productId),
          where('status', '==', 'available')
        );
        const snap = await getDocs(q);
        const items: KlafItem[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() } as KlafItem));
        setKlafImages(items);
      } catch (e) {
        console.error('שגיאה בטעינת קלפים:', e);
      } finally {
        setLoading(false);
      }
    }
    loadKlafim();
  }, [productId]);

  function handleSelect(img: KlafItem) {
    const newVal  = selected === img.id ? null : img.id;
    const newName = selected === img.id ? null : img.name;
    setSelected(newVal);
    onSelect(newVal, newName);
  }

  if (loading) return (
    <div style={{ padding: '16px 0', color: '#888', fontSize: 13 }}>⏳ טוען קלפים זמינים...</div>
  );
  if (!klafImages.length) return null;

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px solid #f0f0f0' }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: '#0f1111', marginBottom: 4 }}>📜 בחר את הקלף שלך</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        {klafImages.length} קלפים זמינים — כל קלף ייחודי וכתוב ביד
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
        {klafImages.map(img => (
          <div key={img.id}
            style={{ border: `2px solid ${selected === img.id ? '#b8972a' : '#ddd'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: selected === img.id ? '#fffbf0' : '#fff', transition: 'all 0.15s', position: 'relative' }}>
            <div onClick={() => handleSelect(img)}>
              <img src={img.imageUrl} alt={img.name}
                style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} />
              {selected === img.id && (
                <div style={{ position: 'absolute', top: 4, right: 4, background: '#b8972a', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>✓</div>
              )}
            </div>
            <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{img.name}</span>
              <button onClick={() => setZoomImg(img.imageUrl)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '0 2px', color: '#0e6ba8', flexShrink: 0 }}>🔍</button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 14, background: '#fffbf0', border: '1px solid #b8972a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#0c1a35', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          ✅ בחרת קלף — הוא ישמר בהזמנה שלך
          <button onClick={() => { setSelected(null); onSelect(null, null); }}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, marginRight: 'auto' }}>ביטול</button>
        </div>
      )}
      {zoomImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="קלף" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomImg(null)}
            style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ══ מודל עריכה ══
function EditModal({ product, onClose, onSave }: {
  product: Product;
  onClose: () => void;
  onSave: (updated: Partial<Product>) => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [was, setWas] = useState(String(product.was || ''));
  const [desc, setDesc] = useState(product.desc || product.description || '');
  const [cat, setCat] = useState(product.cat || '');
  const [imgUrl, setImgUrl] = useState(product.imgUrl || product.image_url || '');
  const [imgUrl2, setImgUrl2] = useState(product.imgUrl2 || '');
  const [imgUrl3, setImgUrl3] = useState(product.imgUrl3 || '');
  const [badge, setBadge] = useState(product.badge || '');
  const [days, setDays] = useState(product.days || '7-14');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'main' | 'img2' | 'img3') {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadToCloudinary(file);
      if (field === 'main') setImgUrl(url);
      else if (field === 'img2') setImgUrl2(url);
      else setImgUrl3(url);
    } catch {
      alert('שגיאה בהעלאת תמונה — בדוק את הגדרות Cloudinary');
    } finally {
      setUploadingImg(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      onSave({ name, price: Number(price), was: was ? Number(was) : undefined, desc, cat, imgUrl, imgUrl2, imgUrl3, badge, days });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>✏️ עריכת מוצר</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>שם מוצר</label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>מחיר ₪</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>מחיר לפני הנחה ₪</label>
              <input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="לא חובה"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>קטגוריה</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
              {CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>תווית</label>
              <select value={badge} onChange={e => setBadge(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                <option value="">ללא</option>
                <option value="חדש">חדש</option>
                <option value="מבצע">מבצע</option>
                <option value="פופולרי">פופולרי</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>זמן אספקה</label>
              <input value={days} onChange={e => setDays(e.target.value)} placeholder="7-14"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>תיאור</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>תמונות</label>
            {(['main', 'img2', 'img3'] as const).map((field, idx) => {
              const currentUrl = field === 'main' ? imgUrl : field === 'img2' ? imgUrl2 : imgUrl3;
              const setUrl = field === 'main' ? setImgUrl : field === 'img2' ? setImgUrl2 : setImgUrl3;
              const label = field === 'main' ? 'תמונה ראשית' : `תמונה ${idx + 1} (אופציונלי)`;
              return (
                <div key={field} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {currentUrl && <img src={currentUrl} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }} />}
                    <label style={{ background: field === 'main' ? '#0c1a35' : '#555', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      📷 העלה
                      <input type="file" accept="image/*"  style={{ display: 'none' }}
                        onChange={e => handleImageUpload(e, field)} />
                    </label>
                    <input value={currentUrl} onChange={e => setUrl(e.target.value)} placeholder="או URL"
                      style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 12, minWidth: 0 }} />
                  </div>
                </div>
              );
            })}
            {uploadingImg && <div style={{ fontSize: 12, color: '#0e6ba8', marginTop: 8 }}>⏳ מעלה תמונה...</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ שומר...' : '💾 שמור שינויים'}
          </button>
          <button onClick={onClose}
            style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>
            ביטול
          </button>
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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(updated: Partial<Product>) {
  if (!product) return;
  console.log('מנסה לשמור:', product.id, updated);
  try {
    await updateDoc(doc(db, 'products', product.id), updated as any);
    setProduct(prev => prev ? { ...prev, ...updated } : prev);
    setShowEdit(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  } catch {
    alert('שגיאה בשמירה');
  }
}

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 18, color: '#666' }}>טוען מוצר...</div>
    </div>
  );

  if (!product) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>מוצר לא נמצא</div>
      <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
        חזרה לחנות
      </button>
    </div>
  );

  const imgs = [
    product.imgUrl || product.image_url,
    product.imgUrl2 || product.img1,
    product.imgUrl3 || product.img2,
    product.imgUrl4 || product.img3,
  ].filter(Boolean) as string[];

  const discount = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;

  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: product!.id,
        name: product!.name,
        price: product!.price,
        imgUrl: product!.imgUrl || product!.image_url,
        quantity: 1,
        selectedKlafId: selectedKlafId || undefined,
        selectedKlafName: selectedKlafName || undefined,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {saveSuccess && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#27ae60', color: '#fff', padding: '12px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          ✅ המוצר עודכן בהצלחה!
        </div>
      )}

      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '10px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
            <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0e6ba8' }}>דף הבית</span>
            <span>›</span>
            {product.cat && <><span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0e6ba8' }}>{product.cat}</span><span>›</span></>}
            <span style={{ color: '#333', fontWeight: 600 }}>{product.name.slice(0, 40)}{product.name.length > 40 ? '...' : ''}</span>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowEdit(true)}
              style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ✏️ עריכת מוצר
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 24, alignItems: 'start' }}>
          <div>
            <div style={{ position: 'relative', background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 10, cursor: 'zoom-in' }}
              onClick={() => setZoomVisible(true)}>
              {imgs.length > 0 ? (
                <img src={imgs[activeImg]} alt={product.name}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', padding: 16, transition: 'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>📦</div>
              )}
              {discount > 0 && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#c0392b', color: '#fff', fontWeight: 700, fontSize: 13, padding: '4px 10px', borderRadius: 4 }}>
                  -{discount}%
                </div>
              )}
            </div>
            {imgs.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {imgs.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#b8972a' : '#ddd'}`, background: '#fff', cursor: 'pointer', padding: 2 }}>
                    <img src={img} alt={`${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => (e.currentTarget.style.display = 'none')} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.badge && (
              <div style={{ display: 'inline-block', background: product.badge === 'מבצע' ? '#c0392b' : product.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4, marginBottom: 10 }}>
                {product.badge}
              </div>
            )}
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f1111', lineHeight: 1.4, marginBottom: 10 }}>{product.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #eee' }}>
              <Stars n={product.stars || 4.5} size={18} />
              <span style={{ fontSize: 13, color: '#0e6ba8' }}>({product.reviews || 0} ביקורות)</span>
              {product.cat && <span style={{ fontSize: 12, color: '#555', marginRight: 8 }}>| קטגוריה: <strong>{product.cat}</strong></span>}
            </div>
            <div style={{ marginBottom: 16 }}>
              {product.was && (
                <div style={{ fontSize: 13, color: '#888' }}>
                  מחיר רגיל: <span style={{ textDecoration: 'line-through' }}>₪{product.was}</span>
                  <span style={{ color: '#c0392b', fontWeight: 700, marginRight: 8 }}>חסכת ₪{(product.was - product.price).toFixed(0)} ({discount}%)</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: '#555' }}>מחיר:</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#0c1a35' }}>₪{product.price}</span>
              </div>
              <div style={{ fontSize: 12, color: '#c7511f', marginTop: 2 }}>כולל מע״מ · משלוח חינם</div>
            </div>
            {product.sofer && (
              <div style={{ background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1a6b3c' }}>
                ✍️ <strong>נכתב בידי {product.sofer}</strong> — סופר מוסמך ומאומת
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>✓ בדיקת מחשב | ✓ תעודת כשרות | ✓ פיקוח רבני</div>
              </div>
            )}
            {(product.desc || product.description) && (
              <div style={{ fontSize: 14, color: '#444', lineHeight: 1.7, marginBottom: 16, paddingTop: 14, borderTop: '1px solid #eee' }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f1111' }}>תיאור המוצר</div>
                {product.desc || product.description}
              </div>
            )}

            <KlafGallery
              productId={product.id}
              onSelect={(klafId, klafName) => {
                setSelectedKlafId(klafId);
                setSelectedKlafName(klafName);
              }}
            />

            {selectedKlafName && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#1a6b3c', background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 6, padding: '8px 12px' }}>
                📜 קלף נבחר: <strong>{selectedKlafName}</strong> — יצורף להזמנה
              </div>
            )}

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '14px 16px', fontSize: 13, marginTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: '#0f1111' }}>מידע חשוב</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  ['זמן אספקה', `${product.days || '7-14'} ימי עסקים`],
                  ['משלוח', 'חינם לכל הארץ 🚚'],
                  ['ביטול', 'עד 24 שעות מהרכישה'],
                  ['אחריות', 'אחריות פלטפורמה מלאה'],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: i < arr.length - 1 ? 6 : 0, borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none' }}>
                    <span style={{ color: '#555' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: k === 'משלוח' ? '#1a6b3c' : undefined }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '20px 16px', position: 'sticky', top: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0c1a35', marginBottom: 4 }}>₪{product.price}</div>
            {product.was && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12 }}>חסכת {discount}% — ₪{(product.was - product.price).toFixed(0)}</div>}
            <div style={{ color: '#1a6b3c', fontWeight: 700, fontSize: 13, marginBottom: selectedKlafName ? 8 : 16 }}>✓ במלאי — משלוח חינם</div>
            {selectedKlafName && (
              <div style={{ fontSize: 11, color: '#1a6b3c', background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 6, padding: '6px 10px', marginBottom: 12 }}>
                📜 {selectedKlafName}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>כמות:</label>
              <select value={qty} onChange={e => setQty(Number(e.target.value))}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 6, padding: '8px', fontSize: 13, background: '#f8f9fa', cursor: 'pointer' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <button onClick={handleAddToCart}
              style={{ width: '100%', background: added ? '#27ae60' : '#b8972a', color: added ? '#fff' : '#0c1a35', border: 'none', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8, transition: 'background 0.2s' }}>
              {added ? '✅ נוסף לסל!' : '🛒 הוסף לסל'}
            </button>
            <button onClick={() => { handleAddToCart(); router.push('/cart'); }}
              style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 20, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
              ⚡ קנה עכשיו
            </button>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.8, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <div>🔒 תשלום מאובטח ומוצפן</div>
              <div>↩️ ביטול עד 24 שעות</div>
              <div>🛡️ אחריות פלטפורמה מלאה</div>
              {product.sofer && <div>✍️ מהסופר ישירות אליך</div>}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f1111', marginBottom: 16 }}>
              מוצרים דומים מקטגוריה &quot;{product.cat}&quot;
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {related.map(r => (
                <div key={r.id} onClick={() => router.push(`/product/${r.id}`)}
                  style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ paddingTop: '100%', position: 'relative', background: '#f7f8f8' }}>
                    {(r.imgUrl || r.image_url) ? (
                      <img src={r.imgUrl || r.image_url} alt={r.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
                    )}
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f1111', marginBottom: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.name}</div>
                    <Stars n={r.stars || 4.5} size={12} />
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#0c1a35', marginTop: 4 }}>₪{r.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {zoomVisible && imgs.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setZoomVisible(false)}>
          <img src={imgs[activeImg]} alt={product.name}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomVisible(false)}
            style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44 }}>✕</button>
        </div>
      )}

      {showEdit && (
        <EditModal product={product} onClose={() => setShowEdit(false)} onSave={handleSave} />
      )}
    </div>
  );
}
