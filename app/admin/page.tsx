'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, orderBy, query,
  doc, updateDoc, addDoc, serverTimestamp, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { CATS } from '../constants/categories';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  shaliachName?: string;
  commissionAmount?: number;
  createdAt?: { seconds: number };
}

interface SoferApplication {
  id: string;
  name: string;
  city: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  description?: string;
  style?: string;
  categories: string[];
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { seconds: number };
}

interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: string;
  soferId?: string;
  shaliachId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cat?: string;
  category?: string;
  status?: string;
  soferId?: string;
  imgUrl?: string;
  image_url?: string;
}

interface Sofer {
  id: string;
  name: string;
}

interface SoferFull {
  id: string;
  name: string;
  city?: string;
  phone?: string;
  email?: string;
  description?: string;
  style?: string;
  categories?: string[];
  imageUrl?: string;
  status?: string;
}

interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroText: string;
}

interface Category {
  id: string;
  name: string;
  imgUrl: string;
  sub: string;
  order: number;
}

type TabType = 'orders' | 'commissions' | 'soferim' | 'users' | 'products' | 'content' | 'categories';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '👑 מנהל',
  sofer: '✍️ סופר',
  shaliach: '🟦 שליח',
  customer: '👤 לקוח',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  sofer: 'bg-amber-100 text-amber-700',
  shaliach: 'bg-blue-100 text-blue-700',
  customer: 'bg-gray-100 text-gray-600',
};

// ══ מודל הוספת מוצר ══
function AddProductModal({ soferim, onClose, onSave }: {
  soferim: Sofer[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [was, setWas] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(CATS.filter(c => c !== 'הכל')[0] || '');
  const [badge, setBadge] = useState('');
  const [days, setDays] = useState('7-14');
  const [soferId, setSoferId] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imgUrl2, setImgUrl2] = useState('');
  const [imgUrl3, setImgUrl3] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'שגיאה');
    return data.secure_url;
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: 'main' | 'img2' | 'img3') {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(field);
    try {
      const url = await uploadToCloudinary(file);
      if (field === 'main') setImgUrl(url);
      else if (field === 'img2') setImgUrl2(url);
      else setImgUrl3(url);
    } catch (err: any) {
      alert('שגיאה בהעלאת תמונה: ' + err.message);
    } finally {
      setUploadingImg(null);
    }
  }

  async function handleSave() {
    if (!name || !price) { alert('שם ומחיר הם שדות חובה'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'products'), {
        name, price: Number(price),
        was: was ? Number(was) : null,
        desc, cat,
        badge: badge || null,
        days,
        soferId: soferId || null,
        imgUrl: imgUrl || null,
        imgUrl2: imgUrl2 || null,
        imgUrl3: imgUrl3 || null,
        status: 'active',
        createdAt: serverTimestamp(),
      });
      onSave();
      onClose();
    } catch {
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0c1a35' }}>➕ הוספת מוצר חדש</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>שם מוצר *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="מזוזה מהודרת..."
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>מחיר ₪ *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>מחיר לפני הנחה ₪</label>
              <input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="לא חובה"
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>קטגוריה</label>
              <select value={cat} onChange={e => setCat(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                {CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>סופר</label>
              <select value={soferId} onChange={e => setSoferId(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                <option value="">ללא סופר</option>
                {soferim.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
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
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
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
                      {uploadingImg === field ? '⏳...' : '📷 העלה'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload(e, field)} />
                    </label>
                    <input value={currentUrl} onChange={e => setUrl(e.target.value)} placeholder="או הדבק URL"
                      style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 12, minWidth: 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ שומר...' : '✅ הוסף מוצר'}
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

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<SoferApplication[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [soferim, setSoferim] = useState<Sofer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [content, setContent] = useState<HomeContent>({ heroTitle: '', heroSubtitle: '', heroText: '' });
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const [catSaving, setCatSaving] = useState<string | null>(null);
  const [catSaved, setCatSaved] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('הכל');
  const [productSearch, setProductSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [soferimFull, setSoferimFull] = useState<SoferFull[]>([]);
  const [soferimLoading, setSoferimLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrders(); loadApplications(); loadUsers();
      loadProducts(); loadSoferim(); loadContent(); loadCategories();
    }
  }, [user]);

  async function loadOrders() {
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const data: Order[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setOrdersLoading(false); }
  }

  async function loadApplications() {
    try {
      const snap = await getDocs(query(collection(db, 'soferim_applications'), orderBy('createdAt', 'desc')));
      const data: SoferApplication[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as SoferApplication));
      setApplications(data);
    } catch (e) { console.error(e); }
    finally { setAppsLoading(false); }
  }

  async function loadUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data: AppUser[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as AppUser));
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setUsersLoading(false); }
  }

  async function loadProducts() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const data: Product[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
      setProducts(data);
    } catch (e) { console.error(e); }
    finally { setProductsLoading(false); }
  }

  async function loadSoferim() {
    try {
      const snap = await getDocs(collection(db, 'soferim'));
      const data: Sofer[] = [];
      snap.forEach(d => data.push({ id: d.id, name: d.data().name } as Sofer));
      setSoferim(data);
    } catch (e) { console.error(e); }
  }

  async function loadSoferimFull() {
    setSoferimLoading(true);
    try {
      const snap = await getDocs(collection(db, 'soferim'));
      const data: SoferFull[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as SoferFull));
      setSoferimFull(data);
    } catch (e) { console.error(e); }
    finally { setSoferimLoading(false); }
  }

  async function loadContent() {
    try {
      const snap = await getDoc(doc(db, 'content', 'homepage'));
      if (snap.exists()) setContent(snap.data() as HomeContent);
    } catch (e) { console.error(e); }
  }

  async function loadCategories() {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const data: Category[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Category));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
    } catch (e) { console.error(e); }
  }

  async function saveContent() {
    setContentSaving(true);
    try {
      await setDoc(doc(db, 'content', 'homepage'), content, { merge: true });
      setContentSaved(true);
      setTimeout(() => setContentSaved(false), 3000);
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    finally { setContentSaving(false); }
  }

  async function saveCategoryImg(catId: string, imgUrl: string, sub: string) {
    setCatSaving(catId);
    try {
      await updateDoc(doc(db, 'categories', catId), { imgUrl, sub });
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, imgUrl, sub } : c));
      setCatSaved(catId);
      setTimeout(() => setCatSaved(null), 2500);
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    finally { setCatSaving(null); }
  }

  async function assignSoferToProduct(productId: string, soferId: string) {
    setActionLoading(productId);
    try {
      await updateDoc(doc(db, 'products', productId), { soferId: soferId || null });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, soferId: soferId || undefined } : p));
    } catch (e) { console.error(e); alert('שגיאה בשיוך סופר'); }
    finally { setActionLoading(null); }
  }

  async function toggleProductStatus(productId: string, currentStatus: string) {
    setActionLoading(productId + '_status');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'products', productId), { status: newStatus });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
    } catch (e) { console.error(e); alert('שגיאה בעדכון סטטוס'); }
    finally { setActionLoading(null); }
  }

  async function changeUserRole(userId: string, newRole: UserRole) {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) { console.error(e); alert('שגיאה בעדכון תפקיד'); }
    finally { setActionLoading(null); }
  }

  async function approveApplication(app: SoferApplication) {
    setActionLoading(app.id);
    try {
      await updateDoc(doc(db, 'soferim_applications', app.id), { status: 'approved', approvedAt: serverTimestamp() });
      await addDoc(collection(db, 'soferim'), {
        name: app.name, city: app.city, phone: app.phone,
        whatsapp: app.whatsapp || '', email: app.email || '',
        description: app.description || '', style: app.style || '',
        categories: app.categories, imageUrl: app.imageUrl || '',
        status: 'active', createdAt: serverTimestamp(),
      });
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
    } catch (e) { console.error(e); alert('שגיאה באישור'); }
    finally { setActionLoading(null); }
  }

  async function rejectApplication(id: string) {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'soferim_applications', id), { status: 'rejected', rejectedAt: serverTimestamp() });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (e) { console.error(e); alert('שגיאה בדחייה'); }
    finally { setActionLoading(null); }
  }

  // ══ ייצוא ══
  function exportToExcel() {
    const rows = [
      ['id', 'name', 'cat', 'price', 'was', 'desc', 'badge', 'days', 'imgUrl', 'imgUrl2', 'imgUrl3', 'soferId'],
      ...products.map(p => [
        p.id, p.name, p.cat || '', p.price,
        (p as any).was || '', (p as any).desc || '',
        (p as any).badge || '', (p as any).days || '7-14',
        p.imgUrl || p.image_url || '',
        (p as any).imgUrl2 || '', (p as any).imgUrl3 || '',
        p.soferId || ''
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products.csv';
    a.click();
  }

  // ══ הורד תבנית ריקה ══
  function downloadTemplate() {
    const headers = ['id', 'name', 'cat', 'price', 'was', 'desc', 'badge', 'days', 'imgUrl', 'imgUrl2', 'imgUrl3', 'soferId'];
    const example = ['', 'בית מזוזה כסף 10 ס"מ', 'מזוזות', '89.90', '', 'תיאור המוצר כאן', 'חדש', '7-14', 'https://example.com/image.jpg', '', '', ''];
    const notes = ['# הסבר:', '# id — ריק למוצר חדש', '# cat — חייב להתאים לקטגוריה באתר', '# badge — חדש / מבצע / פופולרי / ריק', '# imgUrl — URL לתמונה ראשית', '', ''];
    const csv = [headers.join(','), example.map(v => `"${v}"`).join(','), ...notes].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products_template.csv';
    a.click();
  }

  // ══ ייבוא CSV משופר ══
  async function importFromCSV(file: File) {
    setImportStatus('⏳ מייבא מוצרים...');
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(r => r.trim() && !r.trim().startsWith('#'));

      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

      const getIdx = (...names: string[]) => {
        for (const n of names) {
          const i = headers.indexOf(n);
          if (i >= 0) return i;
        }
        return -1;
      };

      const idIdx    = getIdx('id');
      const nameIdx  = getIdx('name', 'שם');
      const catIdx   = getIdx('cat', 'category', 'קטגוריה');
      const priceIdx = getIdx('price', 'מחיר');
      const wasIdx   = getIdx('was', 'מחיר מקורי');
      const descIdx  = getIdx('desc', 'description', 'תיאור');
      const badgeIdx = getIdx('badge', 'תווית');
      const daysIdx  = getIdx('days', 'ימי אספקה');
      const imgIdx   = getIdx('imgurl', 'image_url', 'img_url', 'תמונה');
      const img2Idx  = getIdx('imgurl2', 'image_url2');
      const img3Idx  = getIdx('imgurl3', 'image_url3');
      const soferIdx = getIdx('soferid', 'sofer_id');

      if (nameIdx === -1) {
        setImportStatus('❌ לא נמצאה עמודת שם — בדוק שהכותרות בעברית או באנגלית');
        return;
      }

      let added = 0, updated = 0, skipped = 0;

      for (let i = 1; i < lines.length; i++) {
        // פרסר CSV עם תמיכה בגרשיים
        const cols: string[] = [];
        let cur = ''; let inQ = false;
        for (const ch of lines[i]) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        cols.push(cur.trim());

        const get = (idx: number) => idx >= 0 ? (cols[idx] || '').replace(/^"|"$/g, '').trim() : '';

        const name  = get(nameIdx);
        const price = parseFloat(get(priceIdx));
        if (!name || isNaN(price) || price <= 0) { skipped++; continue; }

        const productData: any = {
          name,
          cat: get(catIdx) || 'כללי',
          price,
          status: 'active',
        };
        const wasVal = get(wasIdx);
        if (wasVal) productData.was = parseFloat(wasVal);
        const descVal = get(descIdx);
        if (descVal) productData.desc = descVal;
        const badgeVal = get(badgeIdx);
        if (badgeVal) productData.badge = badgeVal;
        const daysVal = get(daysIdx);
        if (daysVal) productData.days = daysVal;
        const imgVal = get(imgIdx);
        if (imgVal) productData.imgUrl = imgVal;
        const img2Val = get(img2Idx);
        if (img2Val) productData.imgUrl2 = img2Val;
        const img3Val = get(img3Idx);
        if (img3Val) productData.imgUrl3 = img3Val;
        const soferVal = get(soferIdx);
        if (soferVal) productData.soferId = soferVal;

        const existingId = get(idIdx);

        try {
          if (existingId) {
            await updateDoc(doc(db, 'products', existingId), productData);
            updated++;
          } else {
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            added++;
          }
        } catch (e) {
          console.error('שגיאה במוצר', name, e);
          skipped++;
        }
      }

      setImportStatus(`✅ הושלם! נוספו: ${added} | עודכנו: ${updated} | דולגו: ${skipped}`);
      setTimeout(() => setImportStatus(''), 6000);
      loadProducts();
    } catch (e) {
      console.error(e);
      setImportStatus('❌ שגיאה בייבוא — בדוק שהקובץ תקין');
    }
  }

  if (loading || ordersLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl">טוען...</div>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const shaliachOrders = orders.filter(o => o.shaliachName);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const filteredUsers = roleFilter === 'הכל' ? users : users.filter(u => u.role === roleFilter);
  const filteredProducts = products.filter(p => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()));
  const unassignedProducts = products.filter(p => !p.soferId).length;

  return (
    <main className="max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">👑 דשבורד מנהל</h1>
        <button onClick={() => router.push('/')} className="text-green-700 font-bold hover:underline">← חזרה לחנות</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-green-700">₪{totalRevenue.toFixed(0)}</div>
          <div className="text-sm text-gray-500 mt-1">סה"כ הכנסות</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{products.length}</div>
          <div className="text-sm text-gray-500 mt-1">מוצרים</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-purple-600">{users.length}</div>
          <div className="text-sm text-gray-500 mt-1">משתמשים</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-orange-500">{pendingApps.length}</div>
          <div className="text-sm text-gray-500 mt-1">בקשות סופרים</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'orders', label: '📦 הזמנות', color: 'bg-green-700' },
          { key: 'products', label: '📜 מוצרים', color: 'bg-teal-600', badge: unassignedProducts },
          { key: 'commissions', label: '🤝 עמלות', color: 'bg-blue-600' },
          { key: 'soferim_list', label: '✍️ סופרים', color: 'bg-amber-700' },
          { key: 'soferim', label: '📋 בקשות סופרים', color: 'bg-amber-600', badge: pendingApps.length },
          { key: 'users', label: '👥 משתמשים', color: 'bg-purple-600' },
          { key: 'content', label: '✏️ תוכן', color: 'bg-pink-600' },
          { key: 'categories', label: '🖼️ קטגוריות', color: 'bg-indigo-600' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as TabType)}
            className={`px-4 py-2 rounded-xl font-bold transition relative ${activeTab === t.key ? `${t.color} text-white` : 'bg-white text-gray-600'}`}>
            {t.label}
            {t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ PRODUCTS TAB ══ */}
      {activeTab === 'products' && (
        <div>
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
              placeholder="חיפוש מוצר..." className="border border-gray-200 rounded-xl px-4 py-2 text-sm flex-1 max-w-xs" />
            <span className="text-sm text-gray-500">{filteredProducts.length} מוצרים</span>
            {unassignedProducts > 0 && <span className="text-sm text-red-500 font-bold">{unassignedProducts} ללא סופר</span>}

            {/* ➕ הוסף מוצר */}
            <button onClick={() => setShowAddProduct(true)}
              style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ➕ הוסף מוצר
            </button>

            {/* 📥 ייצוא */}
            <button onClick={exportToExcel}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📥 ייצוא ל-Excel
            </button>

            {/* 📋 הורד תבנית */}
            <button onClick={downloadTemplate}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📋 הורד תבנית
            </button>

            {/* 📤 ייבוא CSV */}
            <label style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📤 ייבוא CSV
              <input type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) { importFromCSV(e.target.files[0]); e.target.value = ''; } }} />
            </label>
          </div>

          {/* סטטוס ייבוא */}
          {importStatus && (
            <div style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700,
              background: importStatus.startsWith('✅') ? '#f0fdf4' : importStatus.startsWith('❌') ? '#fef2f2' : '#eff6ff',
              color: importStatus.startsWith('✅') ? '#15803d' : importStatus.startsWith('❌') ? '#dc2626' : '#1d4ed8',
            }}>
              {importStatus}
            </div>
          )}

          {productsLoading ? (
            <div className="p-10 text-center text-gray-400">טוען מוצרים...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">מוצר</th>
                    <th className="p-3 text-right">קטגוריה</th>
                    <th className="p-3 text-right">מחיר</th>
                    <th className="p-3 text-right">סטטוס</th>
                    <th className="p-3 text-right">שיוך לסופר</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">אין מוצרים</td></tr>
                  ) : filteredProducts.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {(p.imgUrl || p.image_url) && (
                            <img src={p.imgUrl || p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover"
                              onError={e => (e.currentTarget.style.display = 'none')} />
                          )}
                          <span className="font-bold text-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{p.cat || p.category || '—'}</td>
                      <td className="p-3 font-bold text-green-700">₪{p.price}</td>
                      <td className="p-3">
                        <button onClick={() => toggleProductStatus(p.id, p.status || 'active')}
                          disabled={actionLoading === p.id + '_status'}
                          className={`px-2 py-1 rounded-full text-xs font-bold transition ${p.status === 'inactive' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {p.status === 'inactive' ? '● לא פעיל' : '● פעיל'}
                        </button>
                      </td>
                      <td className="p-3">
                        <select value={p.soferId || ''} disabled={actionLoading === p.id}
                          onChange={e => assignSoferToProduct(p.id, e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer ${!p.soferId ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-700'}`}>
                          <option value="">⚠️ ללא סופר</option>
                          {soferim.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ CATEGORIES TAB ══ */}
      {activeTab === 'categories' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-black mb-2">🖼️ ניהול תמונות קטגוריות</h2>
            <p className="text-sm text-gray-500 mb-6">עדכן תמונה וכיתוב לכל קטגוריה. התמונות מופיעות בדף הבית.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map(cat => (
                <CategoryCard key={cat.id} cat={cat} saving={catSaving === cat.id} saved={catSaved === cat.id}
                  onSave={(imgUrl, sub) => saveCategoryImg(cat.id, imgUrl, sub)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ CONTENT TAB ══ */}
      {activeTab === 'content' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-black mb-6 text-gray-800">✏️ עריכת תוכן דף הבית</h2>
          <div className="grid gap-6">
            <div className="border border-gray-100 rounded-xl p-5 bg-gray-50">
              <h3 className="font-bold text-gray-700 mb-4">🏠 אזור Hero</h3>
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">כותרת ראשית</label>
                  <input value={content.heroTitle} onChange={e => setContent(prev => ({ ...prev, heroTitle: e.target.value }))}
                    placeholder='רכישת סת"מ' className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">כותרת משנה (בזהב)</label>
                  <input value={content.heroSubtitle} onChange={e => setContent(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                    placeholder="ישירות מהסופר" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">טקסט תיאור</label>
                  <textarea value={content.heroText} onChange={e => setContent(prev => ({ ...prev, heroText: e.target.value }))}
                    placeholder="בחר את הסופר שלך..." rows={3}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="border border-gray-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-700 mb-4">👁️ תצוגה מקדימה</h3>
              <div style={{ background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', borderRadius: 12, padding: '24px 32px', direction: 'rtl' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{content.heroTitle || 'רכישת סת"מ'}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#b8972a', marginBottom: 10 }}>{content.heroSubtitle || 'ישירות מהסופר'}</div>
                <div style={{ fontSize: 13, color: '#a8c8b4', lineHeight: 1.6 }}>{content.heroText || 'בחר את הסופר שלך...'}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveContent} disabled={contentSaving}
                className="bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-base hover:bg-green-600 disabled:opacity-50 transition">
                {contentSaving ? '⏳ שומר...' : '💾 שמור שינויים'}
              </button>
              {contentSaved && <span className="text-green-600 font-bold text-sm">✅ נשמר!</span>}
            </div>
          </div>
        </div>
      )}

      {/* ══ ORDERS TAB ══ */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">מספר הזמנה</th>
                <th className="p-3 text-right">לקוח</th>
                <th className="p-3 text-right">סכום</th>
                <th className="p-3 text-right">שליח</th>
                <th className="p-3 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">אין הזמנות עדיין</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="p-3 font-bold">{o.customerName}</td>
                  <td className="p-3 text-green-700 font-bold">₪{o.total}</td>
                  <td className="p-3 text-blue-600">{o.shaliachName || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${o.status === 'new' ? 'bg-yellow-100 text-yellow-700' : o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {o.status === 'new' ? '⏳ חדש' : o.status === 'processing' ? '🔄 בעיבוד' : o.status === 'delivered' ? '✅ נמסר' : o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ COMMISSIONS TAB ══ */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {shaliachOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין הזמנות שליחים עדיין</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">מספר הזמנה</th>
                  <th className="p-3 text-right">שליח</th>
                  <th className="p-3 text-right">סכום</th>
                  <th className="p-3 text-right">אחוז</th>
                  <th className="p-3 text-right">עמלה</th>
                </tr>
              </thead>
              <tbody>
                {shaliachOrders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="p-3 font-bold text-blue-600">{o.shaliachName}</td>
                    <td className="p-3">₪{o.total}</td>
                    <td className="p-3">{(o as any).commissionPercent}%</td>
                    <td className="p-3 font-bold text-orange-500">₪{o.commissionAmount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══ SOFERIM APPLICATIONS TAB ══ */}

      {activeTab === 'soferim_list' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black">✍️ סופרים פעילים ({soferimFull.length})</h2>
          </div>
          {soferimLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : soferimFull.length === 0 ? <div className="p-10 text-center text-gray-400">אין סופרים עדיין</div>
          : (
            <div className="grid gap-4">
              {soferimFull.map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {s.imageUrl
                        ? <img src={s.imageUrl} alt={s.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-200" />
                        : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">✍️</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{s.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.status === 'active' ? '✅ פעיל' : '⏸️ לא פעיל'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                        {s.city && <span>📍 {s.city}</span>}
                        {s.phone && <span>📞 {s.phone}</span>}
                        {s.email && <span>✉️ {s.email}</span>}
                        {s.style && <span>✍️ {s.style}</span>}
                      </div>
                      {s.categories && s.categories.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {s.categories.map((cat: string) => (
                            <span key={cat} className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{cat}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => router.push(`/?soferId=${s.id}`)}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700">
                        📜 המוצרים שלו
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'soferim' && (
        <div>
          {appsLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : applications.length === 0 ? <div className="p-10 text-center text-gray-400">אין בקשות עדיין</div>
          : (
            <div className="grid gap-4">
              {applications.map(app => (
                <div key={app.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0">
                      {app.imageUrl ? <img src={app.imageUrl} alt={app.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                      : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">✍️</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'pending' ? '⏳ ממתין' : app.status === 'approved' ? '✅ מאושר' : '❌ נדחה'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                        {app.city && <span>📍 {app.city}</span>}
                        {app.phone && <span>📞 {app.phone}</span>}
                        {app.email && <span>✉️ {app.email}</span>}
                        {app.style && <span>✍️ {app.style}</span>}
                      </div>
                      {app.categories?.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-3">
                          {app.categories.map(cat => <span key={cat} className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{cat}</span>)}
                        </div>
                      )}
                      {app.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{app.description}</p>}
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => approveApplication(app)} disabled={actionLoading === app.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                          {actionLoading === app.id ? '...' : '✅ אשר'}
                        </button>
                        <button onClick={() => rejectApplication(app.id)} disabled={actionLoading === app.id}
                          className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 disabled:opacity-50">
                          ❌ דחה
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ USERS TAB ══ */}
      {activeTab === 'users' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['הכל', 'admin', 'sofer', 'shaliach', 'customer'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${roleFilter === r ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>
                {r === 'הכל' ? 'הכל' : ROLE_LABELS[r as UserRole]}
              </button>
            ))}
          </div>
          {usersLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : filteredUsers.length === 0 ? <div className="p-10 text-center text-gray-400">אין משתמשים</div>
          : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">משתמש</th>
                    <th className="p-3 text-right">אימייל</th>
                    <th className="p-3 text-right">תפקיד נוכחי</th>
                    <th className="p-3 text-right">שנה תפקיד</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-bold">{u.displayName || '—'}</td>
                      <td className="p-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td className="p-3">
                        <select value={u.role} disabled={actionLoading === u.id}
                          onChange={e => changeUserRole(u.id, e.target.value as UserRole)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer">
                          <option value="customer">👤 לקוח</option>
                          <option value="sofer">✍️ סופר</option>
                          <option value="shaliach">🟦 שליח</option>
                          <option value="admin">👑 מנהל</option>
                        </select>
                        {actionLoading === u.id && <span className="text-xs text-gray-400 mr-2">שומר...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ מודל הוספת מוצר ══ */}
      {showAddProduct && (
        <AddProductModal soferim={soferim} onClose={() => setShowAddProduct(false)} onSave={() => loadProducts()} />
      )}
    </main>
  );
}

// ══ קומפוננט כרטיס קטגוריה ══
function CategoryCard({ cat, saving, saved, onSave }: {
  cat: Category; saving: boolean; saved: boolean;
  onSave: (imgUrl: string, sub: string) => void;
}) {
  const [imgUrl, setImgUrl] = useState(cat.imgUrl || '');
  const [sub, setSub] = useState(cat.sub || '');
  const [preview, setPreview] = useState(cat.imgUrl || '');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div style={{ height: 120, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', position: 'relative', overflow: 'hidden' }}>
        {preview ? (
          <img src={preview} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>🖼️</div>
        )}
        <div style={{ position: 'absolute', bottom: 0, right: 0, left: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '8px 12px' }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{cat.name}</div>
        </div>
      </div>
      <div className="p-4 bg-white">
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 mb-1">כיתוב</label>
          <input value={sub} onChange={e => setSub(e.target.value)} placeholder="מכל הסוגים והגדלים"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="mb-3">
          <label className="block text-xs font-bold text-gray-500 mb-1">קישור תמונה (URL)</label>
          <input value={imgUrl} onChange={e => { setImgUrl(e.target.value); setPreview(e.target.value); }} placeholder="https://..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onSave(imgUrl, sub)} disabled={saving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition">
            {saving ? '⏳ שומר...' : '💾 שמור'}
          </button>
          {saved && <span className="text-green-600 text-sm font-bold">✅ נשמר!</span>}
        </div>
      </div>
    </div>
  );
}
