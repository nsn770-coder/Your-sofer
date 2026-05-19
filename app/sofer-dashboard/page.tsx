'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, query, where,
  doc, getDoc, addDoc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '@/app/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  imgUrl?: string;
  status: string;
  inventoryCount?: number;
  uploadedBySofer?: boolean;
}

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  soferId: string;
  orderId: string;
  orderDate?: { seconds: number };
  orderStatus?: string;
  customerName?: string;
}

type StoreStatus = 'loading' | 'none' | 'pending' | 'rejected' | 'approved';

interface StoreDoc {
  refCode: string;
  bannerImage: string;
  commissionPercent: number;
  name: string;
  logoUrl: string;
}

export default function SoferDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');

  const [storeStatus, setStoreStatus] = useState<StoreStatus>('loading');
  const [storeDoc, setStoreDoc] = useState<StoreDoc | null>(null);
  const [topTab, setTopTab] = useState<'sofer' | 'store'>('sofer');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [storeLogoUploading, setStoreLogoUploading] = useState(false);
  const [storeOrdersCount, setStoreOrdersCount] = useState(0);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [storeForm, setStoreForm] = useState({
    businessName: '',
    city: '',
    businessType: 'פטור',
    businessId: '',
    bankName: '',
    bankBranch: '',
    bankAccount: '',
    accountHolder: '',
  });

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && user.role !== 'sofer' && user.role !== 'admin') router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user && (user.role === 'sofer' || user.role === 'admin') && user.soferId) {
      loadData();
    } else if (user && user.role === 'admin') {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid || user.role !== 'sofer') {
      setStoreStatus('none');
      return;
    }
    loadStoreStatus();
  }, [user]);

  async function loadData() {
    if (!user?.soferId) return;
    try {
      const productsSnap = await getDocs(
        query(collection(db, 'products'), where('soferId', '==', user.soferId))
      );
      const productsData: Product[] = [];
      productsSnap.forEach(d => productsData.push({ id: d.id, ...d.data() } as Product));
      setProducts(productsData);

      const ordersSnap = await getDocs(
        query(collection(db, 'orderItems'), where('soferId', '==', user.soferId))
      );
      const ordersData: OrderItem[] = [];
      ordersSnap.forEach(d => ordersData.push({ id: d.id, ...d.data() } as OrderItem));
      setOrderItems(ordersData);
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  async function loadStoreStatus() {
    if (!user?.uid) return;
    try {
      const shluchimSnap = await getDoc(doc(db, 'shluchim', user.uid));
      if (shluchimSnap.exists() && shluchimSnap.data().isPersonalStore) {
        const d = shluchimSnap.data();
        setStoreDoc({
          refCode: d.refCode,
          bannerImage: d.bannerImage || '',
          commissionPercent: d.commissionPercent ?? 10,
          name: d.name,
          logoUrl: d.logoUrl || '',
        });
        // Set approved BEFORE the orders query so a permission error there
        // cannot overwrite this state via the outer catch block.
        setStoreStatus('approved');
        try {
          const ordSnap = await getDocs(query(collection(db, 'orders'), where('shaliachId', '==', user.uid)));
          setStoreOrdersCount(ordSnap.size);
        } catch {
          // Orders count is non-critical; storeStatus already set to 'approved'
        }
        return;
      }
      const reqSnap = await getDocs(query(collection(db, 'rabbi_requests'), where('soferUid', '==', user.uid)));
      if (!reqSnap.empty) {
        const status = reqSnap.docs[0].data().status as string;
        setStoreStatus(status === 'rejected' ? 'rejected' : 'pending');
      } else {
        setStoreStatus('none');
      }
    } catch {
      setStoreStatus('none');
    }
  }

  async function submitStoreRequest() {
    if (!user?.uid) return;
    const { businessName, city, businessType, businessId, bankName, bankBranch, bankAccount, accountHolder } = storeForm;
    if (!businessName || !city || !bankName || !bankBranch || !bankAccount || !accountHolder) {
      alert('נא למלא את כל שדות החובה');
      return;
    }
    setSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'rabbi_requests'), {
        soferUid: user.uid,
        soferName: user.displayName || '',
        soferEmail: user.email || '',
        businessName,
        city,
        businessType,
        businessId,
        bankName,
        bankBranch,
        bankAccount,
        accountHolder,
        logoUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setStoreStatus('pending');
      setShowStoreForm(false);
    } catch {
      alert('שגיאה בשליחת הבקשה, נסה שוב');
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      setLogoUrl(data.secure_url as string);
    } finally {
      setLogoUploading(false);
    }
  }

  async function uploadBanner(file: File) {
    if (!user?.uid) return;
    setBannerUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      const url = data.secure_url as string;
      await updateDoc(doc(db, 'shluchim', user.uid), { bannerImage: url });
      setStoreDoc(prev => prev ? { ...prev, bannerImage: url } : prev);
    } finally {
      setBannerUploading(false);
    }
  }

  async function uploadStoreLogo(file: File) {
    if (!user?.uid) return;
    setStoreLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      const url = data.secure_url as string;
      if (!url) return;
      // Update UI immediately, then persist to Firestore
      setStoreDoc(prev => prev ? { ...prev, logoUrl: url } : prev);
      await updateDoc(doc(db, 'shluchim', user.uid), { logoUrl: url });
    } finally {
      setStoreLogoUploading(false);
    }
  }

  function copyStoreLink() {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 22 }}>טוען...</div>
    </div>
  );

  if (!user || (user.role !== 'sofer' && user.role !== 'admin')) return null;

  if (!user.soferId) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✍️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a3a2a', marginBottom: 12 }}>הפרופיל שלך בבדיקה</h2>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          הבקשה שלך להצטרף כסופר התקבלה ונמצאת בבדיקה. נודיע לך ברגע שתאושר.
        </p>
        <button onClick={() => router.push('/')}
          style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          חזרה לדף הבית
        </button>
      </div>
    </div>
  );

  const totalSold = orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalRevenue = orderItems.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
  const activeProducts = products.filter(p => p.status === 'active').length;
  const storeUrl = user?.uid ? `https://your-sofer.com/?ref=${user.uid}` : '';

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#a8c8b4', marginBottom: 4 }}>פורטל סופר</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
            שלום, {user.displayName?.split(' ')[0]} ✍️
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/sofer-dashboard/edit')}
            style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✏️ ערוך פרופיל
          </button>
          <button onClick={() => router.push('/')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ← לחנות
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* Top-level tabs — only when store is approved */}
        {storeStatus === 'approved' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {([
              { key: 'sofer', label: '✍️ דשבורד סופר' },
              { key: 'store', label: '🏪 דשבורד החנות שלי' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTopTab(t.key)}
                style={{
                  padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', border: 'none',
                  background: topTab === t.key ? '#1a3a2a' : '#fff',
                  color: topTab === t.key ? '#fff' : '#555',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Store Tab Content ── */}
        {storeStatus === 'approved' && topTab === 'store' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Store link — prominent hero card */}
            <div style={{ background: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 100%)', borderRadius: 16, padding: '28px 24px', boxShadow: '0 4px 20px rgba(26,58,42,0.25)', position: 'relative' }}>

              {/* Logo — top-right corner */}
              <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {storeDoc?.logoUrl
                    ? <img src={storeDoc.logoUrl} alt="לוגו" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 28 }}>🏪</span>}
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', cursor: storeLogoUploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                  {storeLogoUploading ? '⏳...' : '📷 העלה לוגו'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={storeLogoUploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadStoreLogo(f); e.target.value = ''; }} />
                </label>
              </div>

              <div style={{ paddingLeft: 92 }}>
                <div style={{ fontSize: 13, color: '#a8c8b4', fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>🔗 הקישור האישי שלך</div>
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#fff', wordBreak: 'break-all', direction: 'ltr', textAlign: 'left', marginBottom: 16, letterSpacing: 0.3 }}>
                  {storeUrl}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={copyStoreLink}
                    style={{ flex: 1, minWidth: 140, background: copied ? '#27ae60' : '#fff', color: copied ? '#fff' : '#1a3a2a', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}>
                    {copied ? '✅ הועתק!' : '📋 העתק קישור'}
                  </button>
                  <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('הקישור האישי שלי לחנות: ' + storeUrl)}`, '_blank')}
                    style={{ flex: 1, minWidth: 140, background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                    💬 שתף בוואטסאפ
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#27ae60' }}>{storeOrdersCount}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>הזמנות דרך החנות</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1a3a2a' }}>{storeDoc?.commissionPercent ?? 10}%</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>עמלה על מכירות</div>
              </div>
            </div>

          </div>
        )}

        {/* ── Sofer Dashboard Content ── */}
        {(storeStatus !== 'approved' || topTab === 'sofer') && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#1a3a2a' }}>{products.length}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>סה"כ מוצרים</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#2980b9' }}>{activeProducts}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>מוצרים פעילים</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#8e44ad' }}>{totalSold}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>יחידות שנמכרו</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#27ae60' }}>{formatPrice(totalRevenue)}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>סה"כ מכירות</div>
              </div>
            </div>

            {/* Inner Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {[
                { key: 'overview', label: '📊 סקירה' },
                { key: 'products', label: '📜 המוצרים שלי' },
                { key: 'orders',   label: '📦 הזמנות' },
              ].map(t => (
                <button key={t.key}
                  onClick={() => setActiveTab(t.key as 'overview' | 'products' | 'orders')}
                  style={{
                    padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: activeTab === t.key ? '#1a3a2a' : '#fff',
                    color: activeTab === t.key ? '#fff' : '#555',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16, color: '#1a3a2a' }}>הזמנות אחרונות</h3>
                {orderItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div>אין הזמנות עדיין</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מוצר</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>כמות</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מחיר</th>
                        <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.slice(0, 10).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.productTitle}</td>
                          <td style={{ padding: '10px 8px', color: '#555' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 8px', color: '#27ae60', fontWeight: 700 }}>{formatPrice(item.price)}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              background: item.orderStatus === 'delivered' ? '#d5f5e3' : '#fef9e7',
                              color: item.orderStatus === 'delivered' ? '#1e8449' : '#b7950b',
                              padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            }}>
                              {item.orderStatus === 'delivered' ? '✅ נמסר' : '⏳ בתהליך'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Products */}
            {activeTab === 'products' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#1a3a2a' }}>המוצרים שלי ({products.length})</div>
                  <button onClick={() => router.push('/sofer-dashboard/add-product')}
                    style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ➕ הוסף מוצר חדש
                  </button>
                </div>
                {products.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
                    <div style={{ fontSize: 18, color: '#555', marginBottom: 8 }}>אין מוצרים עדיין</div>
                    <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>העלה את המוצר הראשון שלך ותתחיל למכור!</div>
                    <button onClick={() => router.push('/sofer-dashboard/add-product')}
                      style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                      ➕ העלה מוצר ראשון
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {products.map(p => (
                      <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                        <div style={{ height: 120, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.imageUrl || p.imgUrl ? (
                            <img src={p.imageUrl || p.imgUrl} alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 40 }}>📜</span>
                          )}
                        </div>
                        <div style={{ padding: 14 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#1a3a2a' }}>{formatPrice(p.price)}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                              background: p.status === 'active' ? '#d5f5e3' : p.status === 'pending' ? '#fef9c3' : '#fde8e8',
                              color: p.status === 'active' ? '#1e8449' : p.status === 'pending' ? '#92400e' : '#c0392b',
                            }}>
                              {p.status === 'active' ? '● פעיל' : p.status === 'pending' ? '⏳ ממתין לאישור' : '● לא פעיל'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{p.category}</div>
                          {p.uploadedBySofer && (
                            <button
                              onClick={() => router.push(`/sofer-dashboard/edit-product/${p.id}`)}
                              style={{ marginTop: 10, width: '100%', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              עריכה ✏️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders */}
            {activeTab === 'orders' && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                {orderItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <div>אין הזמנות עדיין</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מוצר</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>לקוח</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>כמות</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סכום</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.productTitle}</td>
                          <td style={{ padding: '10px 8px', color: '#555' }}>{item.customerName || '-'}</td>
                          <td style={{ padding: '10px 8px' }}>{item.quantity}</td>
                          <td style={{ padding: '10px 8px', color: '#27ae60', fontWeight: 700 }}>{formatPrice(item.price * (item.quantity || 1))}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{
                              background: item.orderStatus === 'delivered' ? '#d5f5e3' : '#fef9e7',
                              color: item.orderStatus === 'delivered' ? '#1e8449' : '#b7950b',
                              padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                            }}>
                              {item.orderStatus === 'delivered' ? '✅ נמסר' :
                               item.orderStatus === 'processing' ? '🔄 בעיבוד' : '⏳ חדש'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Store request widget — states A / B / C */}
            {user.role === 'sofer' && storeStatus !== 'loading' && storeStatus !== 'approved' && (
              <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginTop: 24, border: '1.5px solid rgba(26,58,42,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>🏪</span>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#1a3a2a' }}>חנות אישית לסופר</div>
                </div>

                {storeStatus === 'none' && !showStoreForm && (
                  <>
                    <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 16 }}>
                      פתח חנות אישית עם קישור ייחודי שלך. לקוחות שירכשו דרך הקישור יזוכו לך ב-10% עמלה.
                    </p>
                    <button onClick={() => setShowStoreForm(true)}
                      style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                      📩 בקש לפתוח חנות אישית
                    </button>
                  </>
                )}

                {storeStatus === 'none' && showStoreForm && (
                  <form onSubmit={e => { e.preventDefault(); submitStoreRequest(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>שם העסק / עמותה / קהילה *</label>
                      <input value={storeForm.businessName}
                        onChange={e => setStoreForm(p => ({ ...p, businessName: e.target.value }))}
                        placeholder='לדוג׳: קהילת אנשי מעמד ת"א'
                        required
                        style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>עיר *</label>
                      <input value={storeForm.city}
                        onChange={e => setStoreForm(p => ({ ...p, city: e.target.value }))}
                        placeholder='ת"א, ירושלים...'
                        required
                        style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>לוגו (אופציונלי)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {logoUrl && <img src={logoUrl} alt="לוגו" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' }} />}
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f0f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: logoUploading ? 'not-allowed' : 'pointer', color: '#333' }}>
                          {logoUploading ? '⏳ מעלה...' : '📤 העלה לוגו'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} disabled={logoUploading}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }} />
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>סוג עוסק *</label>
                        <select value={storeForm.businessType}
                          onChange={e => setStoreForm(p => ({ ...p, businessType: e.target.value }))}
                          style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box', background: '#fff' }}>
                          <option value="פטור">עוסק פטור</option>
                          <option value="מורשה">עוסק מורשה</option>
                          <option value="עמותה">עמותה</option>
                          <option value="שכיר">שכיר</option>
                          <option value="שובר_זיכוי">אין לי עוסק — מעוניין בשובר זיכוי לרכישה באתר / באושר עד</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 700, color: '#333', display: 'block', marginBottom: 4 }}>
                          {storeForm.businessType === 'עמותה' ? 'מספר עמותה (ח.פ)' : 'מספר עוסק'} (אופציונלי)
                        </label>
                        <input value={storeForm.businessId}
                          onChange={e => setStoreForm(p => ({ ...p, businessId: e.target.value }))}
                          placeholder="123456789"
                          style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
                      </div>
                    </div>

                    <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1a3a2a' }}>🏦 פרטי חשבון בנק</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 3 }}>שם הבנק *</label>
                          <input value={storeForm.bankName}
                            onChange={e => setStoreForm(p => ({ ...p, bankName: e.target.value }))}
                            placeholder="בנק הפועלים"
                            required
                            style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 3 }}>סניף *</label>
                          <input value={storeForm.bankBranch}
                            onChange={e => setStoreForm(p => ({ ...p, bankBranch: e.target.value }))}
                            placeholder="123"
                            required
                            style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 3 }}>מספר חשבון *</label>
                          <input value={storeForm.bankAccount}
                            onChange={e => setStoreForm(p => ({ ...p, bankAccount: e.target.value }))}
                            placeholder="123456"
                            required
                            style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 3 }}>שם בעל החשבון *</label>
                          <input value={storeForm.accountHolder}
                            onChange={e => setStoreForm(p => ({ ...p, accountHolder: e.target.value }))}
                            placeholder="ישראל ישראלי"
                            required
                            style={{ width: '100%', border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" disabled={submittingRequest}
                        style={{ flex: 1, background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 800, cursor: submittingRequest ? 'not-allowed' : 'pointer', opacity: submittingRequest ? 0.7 : 1 }}>
                        {submittingRequest ? '⏳ שולח...' : '📩 שלח בקשה'}
                      </button>
                      <button type="button" onClick={() => setShowStoreForm(false)}
                        style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        ביטול
                      </button>
                    </div>
                  </form>
                )}

                {storeStatus === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fef9c3', borderRadius: 10, padding: '12px 16px' }}>
                    <span style={{ fontSize: 20 }}>⏳</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>הבקשה שלך בבדיקה</div>
                      <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>נחזור אליך בהקדם עם תשובה</div>
                    </div>
                  </div>
                )}

                {storeStatus === 'rejected' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fde8e8', borderRadius: 10, padding: '12px 16px' }}>
                    <span style={{ fontSize: 20 }}>❌</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#c0392b' }}>הבקשה לא אושרה</div>
                      <div style={{ fontSize: 12, color: '#922b21', marginTop: 2 }}>ניתן לפנות אלינו לפרטים נוספים</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
