'use client';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection, getDocs, query, where, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { CATS } from '../../constants/categories';
import { trackViewItem, trackOpenSoferProfile, trackOpenKashrutCertificate } from '@/lib/analytics';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number | null;
  desc?: string;
  description?: string;
  imgUrl?: string;
  image_url?: string;
  img1?: string; img2?: string; img3?: string;
  imgUrl2?: string; imgUrl3?: string; imgUrl4?: string;
  cat?: string;
  badge?: string;
  sofer?: string;
  soferId?: string;
  days?: string;
  stars?: number;
  reviews?: number;
  videoUrl?: string;
  level?: string;
}

interface KlafItem { id: string; name: string; imageUrl: string; status: string; }
interface ReviewItem {
  id: string; productId: string; productName: string;
  reviewerName: string; stars: number; text: string;
  mediaUrl?: string; mediaType?: 'image' | 'video';
  approved: boolean; createdAt?: { seconds: number };
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Icon = {
  Medal:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Lock:     () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  Truck:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Pen:      () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Check:    (p?: {size?:number;color?:string}) => <svg width={p?.size??14} height={p?.size??14} viewBox="0 0 24 24" fill="none" stroke={p?.color??"currentColor"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        (p?: {size?:number}) => <svg width={p?.size??14} height={p?.size??14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Eye:      () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Lightning:() => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Cart:     (p?: {size?:number;color?:string}) => <svg width={p?.size??16} height={p?.size??16} viewBox="0 0 24 24" fill="none" stroke={p?.color??"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  Zap:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Search:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Shield:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/></svg>,
  ShieldCheck:() => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Package:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Return:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  CreditCard:()=><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Star:     (p?: {filled?:boolean;size?:number}) => <svg width={p?.size??16} height={p?.size??16} viewBox="0 0 24 24" fill={p?.filled!==false?"#e6a817":"none"} stroke="#e6a817" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Edit:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Home:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
  Chevron:  () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Clock:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Tag:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Camera:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Video:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  Send:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Save:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  Scroll:   () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c8b898" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>,
  Play:     () => <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  Sad:      () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  Loader:   () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.22-8.56" style={{animation:'spin 1s linear infinite'}} /><style>{`@keyframes spin{from{transform-origin:center;transform:rotate(0)}to{transform-origin:center;transform:rotate(360deg)}}`}</style></svg>,
  Coupon:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
};

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ n = 4.5, size = 14 }: { n?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <Icon.Star key={i} filled={i <= Math.round(n)} size={size} />
      ))}
    </span>
  );
}

// ─── Installment Badge ────────────────────────────────────────────────────────

function InstallmentBadge({ price }: { price: number }) {
  if (price <= 99) return null;
  const monthly3 = Math.ceil(price / 3);
  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #bde0ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#0c1a35', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#0e6ba8', flexShrink: 0 }}><Icon.CreditCard /></span>
      <span><strong>3 תשלומים של ₪{monthly3}</strong> ללא ריבית</span>
      {price >= 400 && <span style={{ color: '#888', fontSize: 11, marginRight: 'auto' }}>· עד 12 תשלומים בתוספת ריבית</span>}
    </div>
  );
}

// ─── Trust Icons ──────────────────────────────────────────────────────────────

function TrustIcons({ hasSofer }: { hasSofer?: boolean }) {
  const items = [
    { icon: <Icon.Medal />, text: 'איכות בינלאומית' },
    { icon: <Icon.Lock />,  text: 'תשלום מאובטח' },
    { icon: <Icon.Truck />, text: 'משלוח חינם' },
    ...(hasSofer ? [{ icon: <Icon.Pen />, text: 'ישירות מהסופר' }] : []),
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length},1fr)`, gap: 6, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 14, marginTop: 10 }}>
      {items.map(item => (
        <div key={item.text} style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: '#0c1a35', opacity: 0.7 }}>{item.icon}</div>
          {item.text}
        </div>
      ))}
    </div>
  );
}

// ─── Trust Block ─────────────────────────────────────────────────────────────

function TrustBlock() {
  const items = [
    'תעודת כשרות',
    'תעודת הסמכה של הסופר',
    'נבדק לפני מסירה',
    'צילום קלף אמיתי',
    'אפשרות להחזר כספי מלא',
    'משלוח מאובטח',
    'זמן אספקה ברור',
  ];
  return (
    <div dir="rtl" style={{ borderRight: '3px solid #27ae60', background: '#f0fdf4', borderRadius: 8, padding: '10px 12px 6px 10px', marginTop: 14 }}>
      {items.map(item => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#1a6b3c', marginBottom: 5 }}>
          <Icon.Check size={12} color="#27ae60" /> {item}
        </div>
      ))}
    </div>
  );
}

// ─── Sofer Card ───────────────────────────────────────────────────────────────

interface SoferProfile {
  name?: string;
  profileImage?: string;
  yearsOfExperience?: number;
  scriptType?: string;
  certifications?: string[];
}

function SoferCard({ soferId }: { soferId: string }) {
  const [sofer, setSofer] = useState<SoferProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    getDoc(doc(db, 'soferim', soferId)).then(snap => {
      if (snap.exists()) setSofer(snap.data() as SoferProfile);
    });
  }, [soferId]);

  if (!sofer) return null;

  return (
    <div dir="rtl" style={{ marginTop: 20, background: 'linear-gradient(135deg, #f8faff, #eef3fb)', border: '1px solid #bcd0ee', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>הסופר שכתב</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        {sofer.profileImage
          ? <img src={sofer.profileImage} alt={sofer.name} loading="lazy" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #b8972a', flexShrink: 0 }} />
          : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8972a', fontSize: 22, flexShrink: 0 }}>✍️</div>
        }
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0c1a35' }}>{sofer.name}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
            {sofer.yearsOfExperience != null && (
              <span style={{ fontSize: 11, color: '#555' }}>{sofer.yearsOfExperience} שנות ניסיון</span>
            )}
            {sofer.scriptType && (
              <span style={{ fontSize: 11, color: '#555' }}>כתב {sofer.scriptType}</span>
            )}
          </div>
        </div>
      </div>
      {sofer.certifications?.length ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {sofer.certifications.map(cert => (
            <span key={cert} style={{ background: '#e8f0fb', color: '#1a3a6b', fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '3px 9px' }}>{cert}</span>
          ))}
        </div>
      ) : null}
      <button
        onClick={() => { trackOpenSoferProfile(soferId); router.push(`/soferim/${soferId}`); }}
        style={{ background: '#0c1a35', color: '#b8972a', border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
      >
        ראה פרופיל מלא
      </button>
    </div>
  );
}

// ─── Klaf Gallery ─────────────────────────────────────────────────────────────

function KlafGallery({ productId, onSelect }: { productId: string; onSelect: (id: string | null, name: string | null) => void }) {
  const [klafImages, setKlafImages] = useState<KlafItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<string | null>(null);
  const [zoomImg, setZoomImg]       = useState<string | null>(null);

  useEffect(() => {
    async function loadKlafim() {
      try {
        const snap = await getDocs(query(collection(db, 'klafim'), where('productId', '==', productId), where('status', '==', 'available')));
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
    setSelected(newVal);
    onSelect(newVal, newVal ? img.name : null);
  }

  if (loading) return (
    <div style={{ padding: '12px 0', color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon.Loader /> טוען קלפים...
    </div>
  );
  if (!klafImages.length) return null;

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon.Scroll />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#0f1111' }}>בחר את הקלף שלך</span>
      </div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{klafImages.length} קלפים זמינים — כל קלף כתוב ביד</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
        {klafImages.map(img => (
          <div key={img.id} style={{ border: `2px solid ${selected === img.id ? '#b8972a' : '#e0e0e0'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: selected === img.id ? '#fffbf0' : '#fff', transition: 'all 0.15s', position: 'relative' }}>
            <div onClick={() => handleSelect(img)}>
              <img src={img.imageUrl} alt={img.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }} />
              {selected === img.id && (
                <div style={{ position: 'absolute', top: 4, right: 4, background: '#b8972a', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Check size={11} color="#fff" />
                </div>
              )}
            </div>
            <div style={{ padding: '3px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{img.name}</span>
              <button onClick={() => setZoomImg(img.imageUrl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0e6ba8', flexShrink: 0, display: 'flex', padding: '0 2px' }}>
                <Icon.Search />
              </button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ marginTop: 10, background: '#fffbf0', border: '1px solid #b8972a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0c1a35', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Check size={14} color="#b8972a" />
          קלף נבחר
          <button onClick={() => { setSelected(null); onSelect(null, null); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 12, marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon.X size={11} /> ביטול
          </button>
        </div>
      )}
      {zoomImg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="קלף" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomImg(null)} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (updated: Partial<Product>) => void }) {
  const [name, setName]         = useState(product.name);
  const [price, setPrice]       = useState(String(product.price));
  const [was, setWas]           = useState(String(product.was || ''));
  const [desc, setDesc]         = useState(product.desc || product.description || '');
  const [cat, setCat]           = useState(product.cat || '');
  const [level, setLevel]       = useState(product.level || '');
  const [imgUrl, setImgUrl]     = useState(product.imgUrl || product.image_url || '');
  const [imgUrl2, setImgUrl2]   = useState(product.imgUrl2 || '');
  const [imgUrl3, setImgUrl3]   = useState(product.imgUrl3 || '');
  const [videoUrl, setVideoUrl] = useState(product.videoUrl || '');
  const [badge, setBadge]       = useState(product.badge || '');
  const [days, setDays]         = useState(product.days || '7-14');
  const [saving, setSaving]     = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  async function uploadToCloudinary(file: File, isVideo = false): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch(`https://api.cloudinary.com/v1_1/dyxzq3ucy/${isVideo ? 'video' : 'image'}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(field);
    try {
      const url = await uploadToCloudinary(file, file.type.startsWith('video/'));
      if (field === 'main') setImgUrl(url);
      else if (field === 'img2') setImgUrl2(url);
      else if (field === 'img3') setImgUrl3(url);
      else if (field === 'video') setVideoUrl(url);
    } catch { alert('שגיאה בהעלאה'); }
    finally { setUploadingImg(null); }
  }

  async function handleSave() {
    setSaving(true);
    try { onSave({ name, price: Number(price), was: was ? Number(was) : null, desc, cat, level: ['קלפי מזוזה', 'תפילין קומפלט'].includes(cat) ? level : '', imgUrl, imgUrl2, imgUrl3, videoUrl, badge, days }); }
    finally { setSaving(false); }
  }

  const inputS: React.CSSProperties = { width: '100%', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
  const labelS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8972a' }}><Icon.Edit /></div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: 0 }}>עריכת מוצר</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex' }}><Icon.X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div><label style={labelS}>שם מוצר</label><input value={name} onChange={e => setName(e.target.value)} style={inputS} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelS}>מחיר ₪</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>מחיר מקורי ₪</label><input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="לא חובה" style={inputS} /></div>
          </div>
          <div><label style={labelS}>קטגוריה</label><select value={cat} onChange={e => { setCat(e.target.value); if (!['קלפי מזוזה', 'תפילין קומפלט'].includes(e.target.value)) setLevel(''); }} style={{ ...inputS, background: '#fff' }}>{CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          {['קלפי מזוזה', 'תפילין קומפלט'].includes(cat) && (
            <div><label style={labelS}>רמת הידור</label><select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputS, background: '#fff' }}><option value="">לא מוגדר</option><option value="פשוט">פשוט</option><option value="מהודר">מהודר</option><option value="מהודר בתכלית">מהודר בתכלית</option></select></div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelS}>תווית</label><select value={badge} onChange={e => setBadge(e.target.value)} style={{ ...inputS, background: '#fff' }}><option value="">ללא</option><option value="חדש">חדש</option><option value="מבצע">מבצע</option><option value="פופולרי">פופולרי</option></select></div>
            <div><label style={labelS}>זמן אספקה</label><input value={days} onChange={e => setDays(e.target.value)} placeholder="7-14" style={inputS} /></div>
          </div>
          <div><label style={labelS}>תיאור</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ ...inputS, resize: 'vertical' }} /></div>
          <div>
            <label style={labelS}>תמונות וסרטון</label>
            {(['main', 'img2', 'img3'] as const).map((field, idx) => {
              const cur = field === 'main' ? imgUrl : field === 'img2' ? imgUrl2 : imgUrl3;
              const set = field === 'main' ? setImgUrl : field === 'img2' ? setImgUrl2 : setImgUrl3;
              return (
                <div key={field} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  {cur && <img src={cur} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }} />}
                  <label style={{ background: '#0c1a35', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {uploadingImg === field ? <Icon.Loader /> : <Icon.Camera />}
                    תמונה {idx + 1}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, field)} />
                  </label>
                  <input value={cur} onChange={e => set(e.target.value)} placeholder="URL" style={{ flex: 1, border: '1px solid #ddd', borderRadius: 7, padding: '7px 10px', fontSize: 12, minWidth: 0 }} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              {videoUrl && <div style={{ width: 44, height: 44, background: '#111', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon.Play /></div>}
              <label style={{ background: '#7c3aed', color: '#fff', borderRadius: 7, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                {uploadingImg === 'video' ? <Icon.Loader /> : <Icon.Video />}
                סרטון
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'video')} />
              </label>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="URL סרטון (אופציונלי)" style={{ flex: 1, border: '1px solid #ddd', borderRadius: 7, padding: '7px 10px', fontSize: 12, minWidth: 0 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {saving ? <><Icon.Loader /> שומר...</> : <><Icon.Save /> שמור שינויים</>}
          </button>
          <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Stars ─────────────────────────────────────────────────────────────

function ReviewStars({ value, onChange, hover, onHover }: { value: number; onChange?: (n: number) => void; hover?: number; onHover?: (n: number) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2, cursor: onChange ? 'pointer' : 'default', userSelect: 'none' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= (hover || value) ? '#e6a817' : '#ddd', transition: 'color 0.1s', fontSize: 22 }}
          onClick={() => onChange?.(n)} onMouseEnter={() => onHover?.(n)} onMouseLeave={() => onHover?.(0)}>★</span>
      ))}
    </span>
  );
}

// ─── Reviews Section ──────────────────────────────────────────────────────────

function ReviewsSection({ productId, productName }: { productId: string; productName: string }) {
  const [reviews, setReviews]           = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitted, setSubmitted]       = useState<'no_media' | 'with_coupon' | null>(null);
  const [earnedCoupon, setEarnedCoupon] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [name, setName]                 = useState('');
  const [stars, setStars]               = useState(5);
  const [hoverStar, setHoverStar]       = useState(0);
  const [text, setText]                 = useState('');
  const [mediaUrl, setMediaUrl]         = useState('');
  const [mediaType, setMediaType]       = useState<'image' | 'video' | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'reviews'), where('productId', '==', productId)));
        const data: ReviewItem[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as ReviewItem));
        setReviews(data.filter(r => r.approved).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      } catch (e) { console.error(e); }
      finally { setLoadingReviews(false); }
    }
    load();
  }, [productId]);

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'yoursofer_upload');
      const res = await fetch(`https://api.cloudinary.com/v1_1/dyxzq3ucy/${isVideo ? 'video' : 'image'}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.secure_url) throw new Error('שגיאה');
      setMediaUrl(data.secure_url);
      setMediaType(isVideo ? 'video' : 'image');
    } catch { alert('שגיאה בהעלאת הקובץ'); }
    finally { setUploading(false); }
  }

  async function handleSubmit() {
    if (!name.trim() || !text.trim()) { alert('נא למלא שם וטקסט ביקורת'); return; }
    setSubmitting(true);
    try {
      const hasMedia = !!mediaUrl;
      await addDoc(collection(db, 'reviews'), { productId, productName, reviewerName: name.trim(), stars, text: text.trim(), mediaUrl: mediaUrl || null, mediaType: mediaType || null, approved: false, createdAt: serverTimestamp() });
      if (hasMedia) {
        const code = 'REVIEW-' + Math.random().toString(36).toUpperCase().slice(2, 7);
        await setDoc(doc(db, 'coupons', code), { code, discount: 5, type: 'percent', active: true, usedBy: null, createdAt: serverTimestamp() });
        setEarnedCoupon(code);
        setSubmitted('with_coupon');
      } else { setSubmitted('no_media'); }
      setShowForm(false);
      setName(''); setStars(5); setText(''); setMediaUrl(''); setMediaType(null);
    } catch (e) { console.error(e); alert('שגיאה בשליחת הביקורת'); }
    finally { setSubmitting(false); }
  }

  const avgStars = reviews.length > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
      <div style={{ marginTop: 28, background: '#fff', borderRadius: 14, border: '1px solid #e8e8e8', padding: '24px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f1111', marginBottom: 6, margin: '0 0 6px' }}>ביקורות לקוחות</h2>
            {reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stars n={avgStars} size={16} />
                <span style={{ fontSize: 13, color: '#555' }}>{avgStars.toFixed(1)} מתוך 5 · {reviews.length} ביקורות</span>
              </div>
            )}
          </div>
          <button onClick={() => setShowForm(true)} style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <Icon.Pen /> כתוב ביקורת
          </button>
        </div>

        {submitted === 'no_media' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon.Check size={16} color="#15803d" /> תודה! הביקורת ממתינה לאישור.
          </div>
        )}
        {submitted === 'with_coupon' && (
          <div style={{ background: '#fffbeb', border: '2px solid #b8972a', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0c1a35', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.Coupon /> תודה על הביקורת! קיבלת קוד הנחה:
            </div>
            <div style={{ background: '#0c1a35', color: '#b8972a', fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 3, padding: '10px 16px', borderRadius: 8, display: 'inline-block', marginBottom: 8 }}>{earnedCoupon}</div>
            <div style={{ fontSize: 13, color: '#555' }}>5% הנחה על הזמנה הבאה · הזן את הקוד בעמוד התשלום</div>
          </div>
        )}

        {loadingReviews ? (
          <div style={{ color: '#888', fontSize: 13, padding: '12px 0', display: 'flex', alignItems: 'center', gap: 8 }}><Icon.Loader /> טוען ביקורות...</div>
        ) : reviews.length === 0 ? (
          <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>עדיין אין ביקורות — היה הראשון!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0c1a35', color: '#b8972a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                    {r.reviewerName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f1111' }}>{r.reviewerName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stars n={r.stars} size={12} />
                      {r.createdAt && <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(r.createdAt.seconds * 1000).toLocaleDateString('he-IL')}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7, marginBottom: r.mediaUrl ? 10 : 0 }}>{r.text}</div>
                {r.mediaUrl && (
                  r.mediaType === 'video'
                    ? <video controls style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, border: '1px solid #eee' }}><source src={r.mediaUrl} /></video>
                    : <img src={r.mediaUrl} alt="ביקורת" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowForm(false)}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0c1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b8972a' }}><Icon.Pen /></div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35', margin: 0 }}>כתוב ביקורת</h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex' }}><Icon.X size={20} /></button>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>שמך *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 8 }}>דירוג *</label>
                  <ReviewStars value={stars} onChange={setStars} hover={hoverStar} onHover={setHoverStar} />
                  <span style={{ fontSize: 12, color: '#888', marginRight: 8 }}>{['', 'גרוע', 'לא טוב', 'סביר', 'טוב', 'מצוין'][stars]}</span>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>הביקורת שלך *</label>
                  <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="שתף את חוויתך עם המוצר..." style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>
                    תמונה או סרטון
                    <span style={{ fontSize: 11, color: '#b8972a', fontWeight: 600, marginRight: 6 }}>(מקבלים קוד הנחה 5%)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f5f5f5', border: '1.5px dashed #ccc', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: '#555' }}>
                    {uploading ? <><Icon.Loader /> מעלה...</> : mediaUrl ? <><Icon.Check size={13} color="#27ae60" /> הועלה בהצלחה</> : <><Icon.Camera /> בחר קובץ</>}
                    <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaUpload} disabled={uploading} />
                  </label>
                  {mediaUrl && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {mediaType === 'image' && <img src={mediaUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />}
                      {mediaType === 'video' && <div style={{ width: 60, height: 60, background: '#111', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Play /></div>}
                      <button onClick={() => { setMediaUrl(''); setMediaType(null); }} style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon.X size={11} /> הסר
                      </button>
                    </div>
                  )}
                  {mediaUrl && (
                    <div style={{ marginTop: 8, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon.Coupon /> שלח ביקורת עם מדיה וקבל קוד הנחה 5%!
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleSubmit} disabled={submitting || uploading} style={{ width: '100%', background: submitting ? '#aaa' : '#0c1a35', color: '#fff', border: 'none', borderRadius: 24, padding: '13px', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><Icon.Loader /> שולח...</> : <><Icon.Send /> שלח ביקורת</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductClient() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct]           = useState<Product | null>(null);
  const [related, setRelated]           = useState<Product[]>([]);
  const [embroideryText, setEmbroideryText] = useState('');
  const [loading, setLoading]           = useState(true);
  const [activeImg, setActiveImg]       = useState(0);
  const [added, setAdded]               = useState(false);
  const [qty, setQty]                   = useState(1);
  const [zoomVisible, setZoomVisible]   = useState(false);
  const [showEdit, setShowEdit]         = useState(false);
  const [saveSuccess, setSaveSuccess]   = useState(false);
  const [selectedKlafId, setSelectedKlafId]     = useState<string | null>(null);
  const [selectedKlafName, setSelectedKlafName] = useState<string | null>(null);
  const [isMobile, setIsMobile]         = useState(false);
  const [showVideo, setShowVideo]       = useState(false);
  const [activeTab, setActiveTab]       = useState<'details' | 'kashrut' | 'shipping'>('details');
  const [currentViewers, setCurrentViewers] = useState(2);
  const [stockCount] = useState(() => {
    const pid = Array.isArray(id) ? id[0] : (id ?? '');
    let hash = 0;
    for (let i = 0; i < pid.length; i++) hash = (hash * 31 + pid.charCodeAt(i)) & 0xffffffff;
    return (Math.abs(hash) % 8) + 12;
  });
  const buyBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setCurrentViewers(Math.floor(Math.random() * 5) + 2);
    let timer: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      timer = setTimeout(() => { setCurrentViewers(Math.floor(Math.random() * 5) + 2); scheduleNext(); }, Math.floor(Math.random() * 20000) + 20000);
    }
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'products', String(id)));
        if (snap.exists()) {
          const p = { id: snap.id, ...snap.data() } as Product;
          setProduct(p);
          trackViewItem({ item_id: p.id, item_name: p.name, price: p.price, item_category: p.cat });
          if (p.cat) {
            const relSnap = await getDocs(query(collection(db, 'products'), where('cat', '==', p.cat), orderBy('priority', 'desc'), limit(5)));
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
      await updateDoc(doc(db, 'products', product.id), Object.fromEntries(Object.entries(updated).filter(([, v]) => v !== undefined)));
      setProduct(prev => prev ? { ...prev, ...updated } : prev);
      setShowEdit(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { console.error(err); alert('שגיאה בשמירה'); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <Icon.Loader />
        <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}>טוען מוצר...</div>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, fontFamily: 'Heebo, Arial, sans-serif' }}>
      <Icon.Sad />
      <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>מוצר לא נמצא</div>
      <button onClick={() => router.push('/')} style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>חזרה לחנות</button>
    </div>
  );

  const allMediaRaw = [product.imgUrl || product.image_url, product.imgUrl2 || product.img1, product.imgUrl3 || product.img2, product.imgUrl4 || product.img3].filter(Boolean) as string[];
  // Show AI-generated image (index 1) as primary when available
  const allMedia = allMediaRaw.length >= 2 ? [allMediaRaw[1], allMediaRaw[0], ...allMediaRaw.slice(2)] : allMediaRaw;
  const allMediaOptimized = allMedia.map(u => optimizeCloudinaryUrl(u, 800));
  const allMediaThumb     = allMedia.map(u => optimizeCloudinaryUrl(u, 100));
  const hasVideo = !!product.videoUrl;
  const discount = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;

  const EMBROIDERY_CATEGORIES = ['כיסוי תפילין', 'כיסוי טלית', 'סט טלית תפילין', 'בר מצווה', 'סט לבר מצוה', 'סט לחתן'];
const KASHRUT_CATEGORIES = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות'];
  function handleAddToCart() {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product!.id, name: product!.name, price: product!.price, imgUrl: product!.imgUrl || product!.image_url, quantity: 1, selectedKlafId: selectedKlafId || undefined, selectedKlafName: selectedKlafName || undefined, embroideryText: embroideryText || undefined });
    }
    window.gtag?.('event', 'add_to_cart', { currency: 'ILS', value: product!.price * qty, items: [{ item_id: product!.id, item_name: product!.name, price: product!.price, quantity: qty }] });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  // ── Buy Box ──────────────────────────────────────────────────────────────────
  const BuyBox = ({ compact = false }: { compact?: boolean }) => (
    <div style={{ background: '#fff', borderRadius: compact ? 0 : 12, padding: compact ? '12px 16px' : '20px 18px' }}>
      {!compact && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#0c1a35' }}>₪{product.price}</span>
            {product.was && <span style={{ fontSize: 16, textDecoration: 'line-through', color: '#bbb' }}>₪{product.was}</span>}
            {discount > 0 && <span style={{ background: '#c0392b', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>-{discount}%</span>}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon.Truck /> כולל מע״מ · משלוח חינם לכל הארץ
          </div>
          <InstallmentBadge price={product.price} />
        </div>
      )}

      {/* Urgency — directly above CTA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#15803d', fontWeight: 700 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
          במלאי
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff4f4', border: '1px solid #ffc0c0', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#c0392b', fontWeight: 700 }}>
          <Icon.Lightning />
          נשארו {stockCount} בלבד
        </span>
      </div>

      {selectedKlafName && (
        <div style={{ fontSize: 11, color: '#1a6b3c', background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 8, padding: '6px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon.Check size={11} color="#1a6b3c" /> {selectedKlafName}
        </div>
      )}

      {!compact && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>כמות:</label>
          <select value={qty} onChange={e => setQty(Number(e.target.value))} style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: '#f8f9fa', cursor: 'pointer' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      {product.cat && EMBROIDERY_CATEGORIES.includes(product.cat) && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon.Pen /> טקסט לריקמה אישית
          </label>
          <input type="text" value={embroideryText} onChange={e => setEmbroideryText(e.target.value)} placeholder="לדוגמה: אליהו בן יוסף" maxLength={30}
            style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 13, textAlign: 'right', direction: 'rtl', outline: 'none', boxSizing: 'border-box', fontFamily: 'Heebo, Arial, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = '#b8972a')} onBlur={e => (e.target.style.borderColor = '#e0e0e0')} />
          <p style={{ fontSize: 11, color: '#999', marginTop: 3 }}>הטקסט יירקם על המוצר — עד 30 תווים</p>
        </div>
      )}

      {/* PRIMARY: Buy Now */}
      <button onClick={() => { handleAddToCart(); router.push('/cart'); }}
        style={{ width: '100%', background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 14, padding: compact ? '11px' : '14px', fontSize: compact ? 14 : 16, fontWeight: 900, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.01em' }}>
        <Icon.Zap /> קנה עכשיו
      </button>

      {/* SECONDARY: Add to Cart */}
      <button onClick={handleAddToCart}
        style={{ width: '100%', background: added ? '#f0fdf4' : 'transparent', color: added ? '#15803d' : '#0c1a35', border: `1.5px solid ${added ? '#86efac' : '#0c1a35'}`, borderRadius: 14, padding: compact ? '10px' : '12px', fontSize: compact ? 13 : 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        {added ? <><Icon.Check size={15} color="#15803d" /> נוסף לסל!</> : <><Icon.Cart size={15} color="#0c1a35" /> הוסף לסל</>}
      </button>

      {/* Micro-trust row */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 11, color: '#999', marginBottom: compact ? 0 : 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Shield /> רכישה מאובטחת</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Return /> החזר 14 יום</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Truck /> משלוח חינם</span>
      </div>

      {!compact && <TrustBlock />}
    </div>
  );

  // ── Kashrut tab rows ─────────────────────────────────────────────────────────
  const kashrutRows = [
    { icon: <Icon.Check size={16} color="#0c1a35" />, title: 'בדיקת מחשב',         desc: 'כל מוצר עובר בדיקה ממוחשבת לאיתור שגיאות כתיב' },
    { icon: <Icon.Search />,                          title: 'פיקוח מגיה מוסמך',   desc: 'מגיה מוסמך בודק כל יחידה לפני משלוח' },
    { icon: <Icon.Tag />,                             title: 'תעודת כשרות',         desc: 'כל מוצר מגיע עם תעודת כשרות מוסמכת' },
    { icon: <Icon.ShieldCheck />,                     title: 'עמידה בתקן הלכתי',   desc: 'כתיבה לפי הלכה, על פי פסיקת הרב' },
  ];

  const shippingRows = [
    { icon: <Icon.Truck />,   k: 'משלוח',  v: `חינם לכל הארץ · ${product.days || '7-14'} ימי עסקים` },
    { icon: <Icon.Package />, k: 'אריזה',  v: 'אריזה מוגנת ומהודרת לכל הזמנה' },
    { icon: <Icon.Return />,  k: 'החזרות', v: 'ניתן להחזיר תוך 14 יום ממועד קבלת המוצר' },
    { icon: <Icon.X size={14} />, k: 'ביטול', v: 'ביטול אפשרי עד 24 שעות מהרכישה ללא עלות' },
    { icon: <Icon.Shield />,  k: 'אחריות', v: 'אחריות פלטפורמה מלאה על כל מוצר' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', paddingBottom: isMobile ? 80 : 0 }}>

      {/* Save toast */}
      {saveSuccess && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#27ae60', color: '#fff', padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon.Check size={16} color="#fff" /> המוצר עודכן!
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: isMobile ? '8px 14px' : '10px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
            <span onClick={() => router.push('/')} style={{ cursor: 'pointer', color: '#0c1a35', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon.Home /> דף הבית
            </span>
            <Icon.Chevron />
            {product.cat && (
              <><span onClick={() => router.push(`/category/${encodeURIComponent(product.cat!)}`)} style={{ cursor: 'pointer', color: '#0c1a35', fontWeight: 500 }}>{product.cat}</span><Icon.Chevron /></>
            )}
            <span style={{ color: '#555', fontWeight: 500 }}>{product.name.slice(0, isMobile ? 28 : 48)}{product.name.length > (isMobile ? 28 : 48) ? '…' : ''}</span>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => setShowEdit(true)} style={{ background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <Icon.Edit /> עריכת מוצר
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '12px 0' : '20px 16px' }}>
        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: 20, alignItems: 'start', background: isMobile ? '#fff' : 'transparent' }}>

          {/* ── Column 1: Images ── */}
          <div style={{ background: '#fff', borderRadius: isMobile ? 0 : 12, overflow: 'hidden', border: isMobile ? 'none' : '1px solid #e8e8e8' }}>
            <div style={{ position: 'relative', background: '#fafafa', cursor: 'zoom-in' }}>
              {showVideo && hasVideo ? (
                <video controls autoPlay style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', background: '#000' }}>
                  <source src={product.videoUrl} />
                </video>
              ) : (
                <img src={allMediaOptimized[activeImg] || '/placeholder.png'} alt={product.name} onClick={() => setZoomVisible(true)}
                  style={{ width: '100%', aspectRatio: isMobile ? '4/3' : '1', objectFit: 'contain', padding: isMobile ? 8 : 20, display: 'block' }}
                  onError={e => (e.currentTarget.style.display = 'none')} />
              )}
              {discount > 0 && !showVideo && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#c0392b', color: '#fff', fontWeight: 800, fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>-{discount}%</div>
              )}
              {product.badge && !showVideo && (
                <div style={{ position: 'absolute', top: discount > 0 ? 46 : 12, right: 12, background: product.badge === 'מבצע' ? '#c0392b' : product.badge === 'חדש' ? '#2980b9' : '#27ae60', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{product.badge}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #f0f0f0' }}>
              {allMedia.map((img, i) => (
                <button key={i} onClick={() => { setActiveImg(i); setShowVideo(false); }}
                  style={{ width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: `2px solid ${activeImg === i && !showVideo ? '#b8972a' : '#e0e0e0'}`, background: '#fff', cursor: 'pointer', padding: 2, transition: 'border-color 0.15s' }}>
                  <img src={allMediaThumb[i]} alt={`תמונה ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />
                </button>
              ))}
              {hasVideo && (
                <button onClick={() => setShowVideo(true)}
                  style={{ width: isMobile ? 52 : 60, height: isMobile ? 52 : 60, flexShrink: 0, borderRadius: 8, border: `2px solid ${showVideo ? '#7c3aed' : '#e0e0e0'}`, background: showVideo ? '#f5f0ff' : '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s' }}>
                  <Icon.Play />
                </button>
              )}
            </div>
          </div>

          {/* ── Column 2: Details ── */}
          <div style={{ background: '#fff', borderRadius: isMobile ? 0 : 12, border: isMobile ? 'none' : '1px solid #e8e8e8', padding: isMobile ? '16px 14px' : '24px 20px', marginTop: isMobile ? 8 : 0 }}>
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: '#0f1111', lineHeight: 1.4, marginBottom: 10 }}>{product.name}</h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
              <Stars n={product.stars || 4.5} size={15} />
              <span style={{ fontSize: 13, color: '#0e6ba8' }}>({product.reviews || 0} ביקורות)</span>
              {product.cat && <span style={{ fontSize: 12, color: '#888' }}>| <strong>{product.cat}</strong></span>}
            </div>

            {/* Social proof badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#eff8ff', border: '1px solid #bde0ff', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#0e6ba8', fontWeight: 700 }}>
                <Icon.Eye />
                <span key={currentViewers}>{currentViewers} צופים עכשיו</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff4f4', border: '1px solid #ffc0c0', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#c0392b', fontWeight: 700 }}>
                <Icon.Lightning />
                נשארו {stockCount} פריטים
              </div>
            </div>

            {/* Mobile price */}
            {isMobile && (
              <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                {product.was && <div style={{ fontSize: 12, color: '#888' }}>מחיר רגיל: <span style={{ textDecoration: 'line-through' }}>₪{product.was}</span> <span style={{ color: '#c0392b', fontWeight: 700 }}>({discount}% הנחה)</span></div>}
                <div style={{ fontSize: 30, fontWeight: 900, color: '#0c1a35', marginTop: 2 }}>₪{product.price}</div>
                <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><Icon.Truck /> כולל מע״מ · משלוח חינם</div>
                <InstallmentBadge price={product.price} />
              </div>
            )}

            {/* Sofer badge */}
            {product.sofer && (
              <div style={{ background: 'linear-gradient(135deg, #f0faf4, #e8f5ed)', border: '1px solid #b7e4c7', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#1a6b3c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon.Pen /> נכתב בידי {product.sofer}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {['בדיקת מחשב', 'תעודת כשרות', 'פיקוח רבני'].map(t => (
                    <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Icon.Check size={11} color="#1a6b3c" /> {t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Info tabs */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', marginBottom: 14 }}>
                {([
                  { key: 'details',  label: 'פרטי המוצר' },
                  ...(product.cat && KASHRUT_CATEGORIES.includes(product.cat) ? [{ key: 'kashrut' as const, label: 'כשרות ואיכות' }] : []),

                  { key: 'shipping', label: 'משלוח והחזרות' },
                ] as { key: typeof activeTab; label: string }[]).map(tab => (
                  <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'kashrut') trackOpenKashrutCertificate(product.id); }}
                    style={{ flex: 1, background: 'none', border: 'none', padding: '9px 6px', fontSize: isMobile ? 12 : 13, fontWeight: activeTab === tab.key ? 800 : 600, color: activeTab === tab.key ? '#0c1a35' : '#888', borderBottom: `2px solid ${activeTab === tab.key ? '#b8972a' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'details' && (
                <div>
                  {(product.desc || product.description) ? (
                    <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8, marginBottom: 12 }}>{product.desc || product.description}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>אין תיאור למוצר זה.</div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', background: '#f8f9fa', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                    <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><Icon.Clock /> זמן אספקה</span>
                    <span style={{ fontWeight: 600 }}>{product.days || '7-14'} ימי עסקים</span>
                    <span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><Icon.Tag /> קטגוריה</span>
                    <span style={{ fontWeight: 600 }}>{product.cat || '—'}</span>
                  </div>
                </div>
              )}

              {activeTab === 'kashrut' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {kashrutRows.map(row => (
                    <div key={row.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8f9fa', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ color: '#0c1a35', flexShrink: 0, marginTop: 1 }}>{row.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0c1a35', fontSize: 13 }}>{row.title}</div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{row.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div style={{ fontSize: 13 }}>
                  {shippingRows.map(row => (
                    <div key={row.k} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ color: '#0c1a35', flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ fontWeight: 700, color: '#333', minWidth: 55 }}>{row.k}</span>
                      <span style={{ color: '#555' }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <KlafGallery productId={product.id} onSelect={(klafId, klafName) => { setSelectedKlafId(klafId); setSelectedKlafName(klafName); }} />

            {product.soferId && <SoferCard soferId={product.soferId} />}

            {isMobile && <div style={{ marginTop: 16 }}><BuyBox /></div>}
          </div>

          {/* ── Column 3: Buy Box desktop ── */}
          {!isMobile && (
            <div ref={buyBoxRef} style={{ position: 'sticky', top: 20 }}>
              <div style={{ border: '1px solid #e0e0e0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <BuyBox />
              </div>
            </div>
          )}
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop: 28, background: '#fff', borderRadius: isMobile ? 0 : 12, border: isMobile ? 'none' : '1px solid #e8e8e8', padding: isMobile ? '16px 14px' : '24px 20px', borderTop: isMobile ? '8px solid #f3f4f4' : undefined }}>
            <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: '#0f1111', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon.Cart size={18} color="#0f1111" /> לקוחות שקנו זאת קנו גם
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: isMobile ? 10 : 14 }}>
              {related.map(r => {
                const rImg = optimizeCloudinaryUrl(r.imgUrl || r.image_url || '', 400) || undefined;
                return (
                  <div key={r.id} onClick={() => router.push(`/product/${r.id}`)}
                    style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}>
                    <div style={{ paddingTop: '100%', position: 'relative', background: '#f7f8f8' }}>
                      {rImg
                        ? <img src={rImg} alt={r.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.style.display = 'none')} />
                        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon.Package /></div>}
                    </div>
                    <div style={{ padding: isMobile ? '8px' : '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#0f1111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.name}</div>
                      <Stars n={r.stars || 4.5} size={11} />
                      <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 900, color: '#0c1a35' }}>₪{r.price}</div>
                      <button onClick={e => { e.stopPropagation(); addItem({ id: r.id, name: r.name, price: r.price, imgUrl: rImg ?? undefined, quantity: 1 }); }}
                        style={{ marginTop: 'auto', width: '100%', padding: isMobile ? '5px 0' : '6px 0', borderRadius: 20, background: '#b8972a', color: '#0c1a35', border: 'none', fontWeight: 700, fontSize: isMobile ? 11 : 12, cursor: 'pointer' }}>
                        הוסף לסל
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ReviewsSection productId={product.id} productName={product.name} />

      {/* Zoom Modal */}
      {zoomVisible && allMedia.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setZoomVisible(false)}>
          <img src={allMedia[activeImg]} alt={product.name} style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={() => setZoomVisible(false)} style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.X size={18} />
          </button>
          {allMedia.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % allMedia.length); }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>‹</button>
              <button onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + allMedia.length) % allMedia.length); }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>›</button>
            </>
          )}
        </div>
      )}

      {/* Sticky mobile CTA bar */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#fff', borderTop: '1.5px solid #e8e8e8', padding: '10px 16px 14px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', direction: 'rtl' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#0c1a35', lineHeight: 1.2 }}>₪{product.price}</div>
          </div>
          <button
            onClick={() => { handleAddToCart(); router.push('/cart'); }}
            style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 900, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            קנה עכשיו ←
          </button>
        </div>
      )}

      {showEdit && <EditModal product={product} onClose={() => setShowEdit(false)} onSave={handleSave} />}
    </div>
  );
}
