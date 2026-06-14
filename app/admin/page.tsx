'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, orderBy, query, where,
  doc, updateDoc, addDoc, deleteDoc, serverTimestamp, getDoc, setDoc, getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatPrice } from '@/app/lib/utils';
import { getAuthLazy } from '@/lib/authLazy';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';
import { CATS, SUB_CATS } from '../constants/categories';
import HomepageConfigTab from './components/HomepageConfigTab';
import BestSellersTab from './components/BestSellersTab';
import InventoryTab from './components/InventoryTab';
import PrintsTab from './components/PrintsTab';
import StickersTab from './components/StickersTab';
import ProfitabilityTab from './components/ProfitabilityTab';
import SiteSettingsTab from './components/SiteSettingsTab';
import PromotionsTab from './components/PromotionsTab';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId?: string;    // alias used by InventoryTab / ProfitabilityTab
  productName?: string;  // alias used by InventoryTab / ProfitabilityTab
  finalPrice?: number;
  embroideryText?: string | null;
  selectedKlafName?: string | null;
  selectedCover?: { id: string; name: string; imgUrl: string } | null;
  printCustomization?: {
    productType: string;
    side: string;
    color?: string;
    uploadedImageUrl: string;
    bgRemoved: boolean;
    originalImageUrl: string;
    imageX?: number;
    imageY?: number;
    imageScale?: number;
    imageRotation?: number;
    logoWidthPct?: number;
    mockupUrl?: string;
  } | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  paymentTotal?: number;    // locked: actual amount customer paid
  status: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  shippingCost?: number;
  shippingType?: string;
  shaliachName?: string;
  commissionAmount?: number;
  createdAt?: { seconds: number };
  items?: OrderItem[];
}

interface ProductEntry {
  type: string;
  name: string;
  desc: string;
  nusach: string;
  level: string;
  days: string;
  soferPrice: string;
  size: string;
  images: string[];
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
  writingSamples?: string[];
  products?: ProductEntry[];
  taxStatus?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { seconds: number };
}

interface ShluchimApplication {
  id: string;
  name: string;
  chabadName?: string;
  city: string;
  phone: string;
  email?: string;
  rabbiName?: string;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { seconds: number };
  approvedDocId?: string;
}

interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: string;
  soferId?: string;
  shaliachId?: string;
  neverLoggedIn?: boolean;
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
  hidden?: boolean;
  priority?: number;
  level?: string;
  nusach?: string;
  was?: number | null;
  desc?: string;
  badge?: string | null;
  days?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  sourceUrl?: string;
  source?: string;
  sku?: string;
  stockCount?: number;
  stockVisible?: boolean;
  outOfStock?: boolean;
  outOfStockReason?: string | null;
  outOfStockDate?: string | null;
  soferName?: string;
  soferPrice?: number;
  supplierCost?: number;
  createdAt?: { seconds: number };
  isExpertRecommended?: boolean;
  isBestSeller?: boolean;
  // Warehouse location
  storageColumn?: string;
  storageShelf?: string | number;
  storageNote?: string;
  // Sale
  isOnSale?: boolean;
  salePrice?: number;
  salePercent?: number;
  saleCampaignId?: string | null;
  subCategory?: string;
}

interface Sofer {
  id: string;
  name: string;
}

interface WritingSample {
  type: 'image' | 'video';
  url: string;
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
  writingSamples?: (string | WritingSample)[];
  status?: string;
}

interface SoferEditRequest {
  id: string;
  soferId: string;
  soferDocId?: string;
  soferName: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: Partial<{
    name: string; city: string; style: string;
    description: string; imageUrl: string;
    writingSamples: WritingSample[];
  }>;
  currentData?: Partial<SoferFull>;
  createdAt?: { seconds: number };
  adminNote?: string;
}

interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroText: string;
}

interface Category {
  id: string;
  slug: string;
  displayName: string;
  imageUrl: string;
  priority: number;
  name?: string;
  imgUrl?: string;
  sub?: string;
  order?: number;
}

type TabType = 'orders' | 'commissions' | 'soferim' | 'soferim_list' | 'shluchim' | 'rabbi_requests' | 'users' | 'products' | 'content' | 'categories' | 'reviews' | 'testimonials' | 'homepage' | 'edit_requests' | 'hidden_products' | 'theme_editor' | 'curations' | 'abandoned_carts' | 'customers' | 'leads' | 'emails' | 'coupons' | 'out_of_stock' | 'gifts' | 'inventory' | 'prints' | 'stickers' | 'profitability' | 'site_settings' | 'promotions' | 'best_sellers';

interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  discount: number;
  active: boolean;
  usedBy: string[];
  minOrder?: number;
  expiresAt?: string;
  createdAt: string;
}

interface RabbiRequest {
  id: string;
  soferUid: string;
  soferName: string;
  soferEmail: string;
  businessName?: string;
  city?: string;
  businessType?: string;
  businessId?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountHolder?: string;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { seconds: number };
}

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  nusach?: string;
  location?: string;
  klafimCount?: number;
  createdAt?: { seconds: number };
  source?: string;
}

interface Review {
  id: string;
  productId: string;
  productName: string;
  reviewerName: string;
  stars: number;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  approved: boolean;
  createdAt?: { seconds: number };
}

interface Testimonial {
  id: string;
  name: string;
  city: string;
  text: string;
  rating: number;
  imageUrl: string;
  active: boolean;
  createdAt?: { seconds: number };
}

interface Curation {
  id: string;
  category: string;
  activeTag: string;
  bannerTitle: string;
  bannerImageUrl: string;
  updatedAt?: { seconds: number };
}

interface AbandonedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imgUrl?: string | null;
  printCustomization?: {
    productType: string;
    side: string;
    color?: string;
    uploadedImageUrl: string;
    bgRemoved: boolean;
    originalImageUrl: string;
    imageX?: number;
    imageY?: number;
    imageScale?: number;
    imageRotation?: number;
    logoWidthPct?: number;
    mockupUrl?: string;
  } | null;
}

interface AbandonedCart {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  cartItems: AbandonedCartItem[];
  cartTotal: number;
  converted: boolean;
  convertedOrderId: string | null;
  createdAt?: { seconds: number } | string;
  updatedAt?: { seconds: number } | string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  firstOrderAt: string;
  lastOrderAt: string;
  totalOrders: number;
  totalSpent: number;
  isGuest: boolean;
  uid: string | null;
}

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

// ─── Sofer field - categories that show the sofer selector ───────────────────

const SOFER_CATS_LIST = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'בר מצווה'];
const SOFER_DROPDOWN_CATS = new Set(SOFER_CATS_LIST);

/** Returns true if the cat string (after trim+normalize) is a sofer category */
function isSoferCat(cat: string): boolean {
  const c = cat.trim().normalize('NFC');
  return SOFER_CATS_LIST.some(s => s.trim().normalize('NFC') === c);
}

const PARENT_CATS = [
  'בתי מזוזה', 'תפילין קומפלט', 'טליתות', 'מגילות', 'ספרי תורה',
  'יודאיקה', 'מתנות', 'בר מצווה', 'קלפי מזוזה', 'קלפי תפילין', 'כיפות',
];

// ─── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({ soferim, soferimFull, onClose, onSave }: {
  soferim: Sofer[];
  soferimFull: SoferFull[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [was, setWas] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(PARENT_CATS[0]);
  const [subCat, setSubCat] = useState('');
  const [level, setLevel] = useState('');
  const [nusach, setNusach] = useState('');
  const [badge, setBadge] = useState('');
  const [days, setDays] = useState('7-10');
  const [soferId, setSoferId] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [imgUrl2, setImgUrl2] = useState('');
  const [imgUrl3, setImgUrl3] = useState('');
  const [supplierCost, setSupplierCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);
  const [soferOptions, setSoferOptions] = useState<Sofer[]>([]);
  const STAM_CATS_ADMIN = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה', 'תפילין'];
  const LEVEL_CATS = STAM_CATS_ADMIN;

  useEffect(() => {
    getDocs(collection(db, 'soferim'))
      .then(snap => {
        const data: Sofer[] = [];
        snap.forEach(d => data.push({ id: d.id, name: d.data().name }));
        setSoferOptions(data);
      })
      .catch(() => {});
  }, []);

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
    const subOptions = SUB_CATS[cat] ?? [];
    if (subOptions.length > 0 && !subCat) { alert('יש לבחור תת-קטגוריה'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'products'), {
        name, price: Number(price),
        was: was ? Number(was) : null,
        supplierCost: supplierCost ? Number(supplierCost) : null,
        desc, cat,
        category: cat,
        ...(subCat ? { subCategory: subCat } : {}),
        level: LEVEL_CATS.includes(cat) ? level : '',
        nusach: LEVEL_CATS.includes(cat) ? nusach : '',
        badge: badge || null,
        priority: 50,
        isBestSeller: false,
        days,
        soferId: soferId || null,
        imgUrl: imgUrl || null,
        imgUrl2: imgUrl2 || null,
        imgUrl3: imgUrl3 || null,
        status: 'active',
        uploadedBySofer: false,
        createdAt: serverTimestamp(),
      });
      onSave();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[AddProduct] save failed:', err);
      alert('שגיאה בשמירה: ' + msg);
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
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>➕ הוספת מוצר חדש</h2>
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
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>עלות ספק ₪ (מחיר גולמי, לפני הנחה ומע&quot;מ)</label>
            <input type="number" value={supplierCost} onChange={e => setSupplierCost(e.target.value)} placeholder="לא חובה"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>העלות שלך מחושבת אוטומטית: ערך זה × 0.95 × 1.18</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>קטגוריה</label>
            <select value={cat} onChange={e => { setCat(e.target.value); setSubCat(''); }}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
              {PARENT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(SUB_CATS[cat] ?? []).length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>תת-קטגוריה *</label>
              <select value={subCat} onChange={e => setSubCat(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: subCat ? '#fff' : '#fffbe6', boxSizing: 'border-box', outline: subCat ? '' : '2px solid #C5A028' }}>
                <option value="">בחר תת-קטגוריה</option>
                {(SUB_CATS[cat] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {(isSoferCat(cat) || !!soferId) && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>סופר</label>
              <select value={soferId} onChange={e => setSoferId(e.target.value)}
                style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                <option value="">ללא סופר</option>
                {soferOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {LEVEL_CATS.includes(cat) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>רמת כשרות</label>
                <select value={level} onChange={e => setLevel(e.target.value)}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">לא מוגדר</option>
                  <option value="כשר לכתחילה">כשר לכתחילה</option>
                  <option value="מהודר">מהודר</option>
                  <option value="מהודר בתכלית">מהודר בתכלית</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 }}>נוסח</label>
                <select value={nusach} onChange={e => setNusach(e.target.value)}
                  style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                  <option value="">לא מוגדר</option>
                  <option value="אשכנז">אשכנז</option>
                  <option value="ספרד">ספרד</option>
                  <option value='חב"ד'>חב"ד</option>
                  <option value="תימני">תימני</option>
                  <option value="עדות המזרח">עדות המזרח</option>
                </select>
              </div>
            </div>
          )}
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
              <input value={days} onChange={e => setDays(e.target.value)} placeholder="7-10"
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
                    <label style={{ background: field === 'main' ? '#1E3A8A' : '#555', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
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
            style={{ flex: 1, background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
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

const STAM_CATS_ADMIN_EDIT = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה', 'תפילין'];
const LEVEL_CATS_EDIT = STAM_CATS_ADMIN_EDIT;
const EXPERT_REC_CATS_ADMIN = ['קלפי מזוזה', 'תפילין קומפלט', 'סט בר מצוה', 'סט בר מצווה'];

const TYPE_TO_CAT: Record<string, string> = {
  'קלף מזוזה':  'קלפי מזוזה',
  'קלף תפילין': 'קלפי תפילין',
  'מגילה':      'מגילות',
  'ספר תורה':   'ספרי תורה',
  'אחר':        '',
};

function extractOriginalName(sourceUrl: string): string {
  try {
    const match = sourceUrl.match(/\/product\/([^/?#]+)/i);
    if (!match) return '';
    let slug = decodeURIComponent(match[1]);
    slug = slug.replace(/^\d+/, '');
    slug = slug.replace(/-/g, ' ').trim();
    return slug;
  } catch {
    return '';
  }
}

function EditProductModal({ product, soferim, soferimFull, onClose, onSave }: {
  product: Product;
  soferim: Sofer[];
  soferimFull: SoferFull[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName]       = useState(product.name || '');
  const [price, setPrice]     = useState(String(product.price ?? ''));
  const [was, setWas]         = useState(product.was != null ? String(product.was) : '');
  const [desc, setDesc]       = useState(product.desc || '');
  const [cat, setCat]         = useState(product.cat || product.category || '');
  const [subCat, setSubCat]   = useState(product.subCategory || '');
  const [level, setLevel]     = useState(product.level || '');
  const [nusach, setNusach]   = useState(product.nusach || '');
  const [badge, setBadge]     = useState(product.badge || '');
  const [days, setDays]       = useState(product.days || '');
  const [soferId, setSoferId] = useState(product.soferId || '');
  const [imgUrl, setImgUrl]   = useState(product.imgUrl || '');
  const [imgUrl2, setImgUrl2] = useState(product.imgUrl2 || '');
  const [imgUrl3, setImgUrl3] = useState(product.imgUrl3 || '');
  const [stockVisible, setStockVisible] = useState<boolean>(() => {
    if (product.stockVisible !== undefined) return product.stockVisible;
    return !['מגילות', 'ספרי תורה'].includes(product.cat || product.category || '');
  });
  const [outOfStock, setOutOfStock] = useState(product.outOfStock ?? false);
  const [outOfStockReason] = useState(product.outOfStockReason ?? null);
  const [outOfStockDate] = useState(product.outOfStockDate ?? null);
  const [isExpertRecommended, setIsExpertRecommended] = useState(product.isExpertRecommended ?? false);
  const [isBestSeller, setIsBestSeller] = useState(product.isBestSeller ?? false);
  const [stockCountInput, setStockCountInput] = useState(
    product.stockCount != null ? String(product.stockCount) : ''
  );
  const [supplierCost, setSupplierCost] = useState(
    product.supplierCost != null ? String(product.supplierCost) : ''
  );
  const [storageColumn, setStorageColumn] = useState(product.storageColumn ?? '');
  const [storageShelf, setStorageShelf]   = useState(product.storageShelf != null ? String(product.storageShelf) : '');
  const [storageNote, setStorageNote]     = useState(product.storageNote ?? '');
  const [saving, setSaving]         = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);
  const [soferOptions, setSoferOptions] = useState<Sofer[]>([]);

  useEffect(() => {
    // Debug: log what category value we got from Firestore
    console.log('[EditProductModal] product.cat:', JSON.stringify(product.cat), '| product.category:', JSON.stringify(product.category), '| cat state:', JSON.stringify(product.cat || product.category || ''), '| isSoferCat:', isSoferCat(product.cat || product.category || ''));

    getDocs(collection(db, 'soferim'))
      .then(snap => {
        const data: Sofer[] = [];
        snap.forEach(d => data.push({ id: d.id, name: d.data().name }));
        setSoferOptions(data);
      })
      .catch(() => {});
  }, []);

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

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const { id, ...rest } = product;
      await addDoc(collection(db, 'products'), { ...rest, name: `${product.name} — עותק`, createdAt: serverTimestamp() });
      onClose();
      alert(`המוצר שוכפל בהצלחה: "${product.name} — עותק"`);
    } catch (e) { console.error(e); alert('שגיאה בשכפול'); }
    finally { setDuplicating(false); }
  }

  async function handleSave() {
    if (!name || !price) { alert('שם ומחיר הם שדות חובה'); return; }
    const subOptions = SUB_CATS[cat] ?? [];
    if (subOptions.length > 0 && !subCat) { alert('יש לבחור תת-קטגוריה'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        name, price: Number(price),
        was: was ? Number(was) : null,
        supplierCost: supplierCost ? Number(supplierCost) : null,
        desc, cat,
        category: cat,
        subCategory: subCat || null,
        level: LEVEL_CATS_EDIT.includes(cat) ? level : '',
        nusach: LEVEL_CATS_EDIT.includes(cat) ? nusach : '',
        badge: badge || null,
        days,
        soferId: soferId || null,
        imgUrl: imgUrl || null,
        imgUrl2: imgUrl2 || null,
        imgUrl3: imgUrl3 || null,
        stockVisible,
        stockCount: stockCountInput !== '' ? Number(stockCountInput) : null,
        outOfStock,
        outOfStockReason: outOfStock ? (outOfStockReason ?? null) : null,
        outOfStockDate: outOfStock ? (outOfStockDate ?? null) : null,
        isExpertRecommended: EXPERT_REC_CATS_ADMIN.includes(cat) ? isExpertRecommended : false,
        isBestSeller,
        storageColumn: storageColumn || null,
        storageShelf: storageShelf || null,
        storageNote: storageNote || null,
      });
      // Sync AI knowledge index (fire-and-forget)
      fetch('/api/ai/products/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {});
      onSave();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[EditProduct] save failed:', err);
      alert('שגיאה בשמירה: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  console.log('[EditProductModal] cat:', cat, 'EXPERT_REC_CATS_ADMIN:', EXPERT_REC_CATS_ADMIN);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>✏️ עריכת מוצר</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={duplicating}
              style={{ background: '#fffbf0', border: '1px solid #C5A028', color: '#7a6018', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: duplicating ? 'not-allowed' : 'pointer', opacity: duplicating ? 0.6 : 1 }}
            >
              {duplicating ? '...' : '📋 שכפל מוצר'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>שם מוצר *</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          {product.sourceUrl && (() => {
            const orig = extractOriginalName(product.sourceUrl!);
            return orig ? (
              <div style={{ background: '#f8f6f0', border: '1px solid #e8dfc8', padding: '8px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#888' }}>שם מקורי מהספק: </span>
                <span style={{ fontSize: 13, color: '#1E3A8A', fontWeight: 600 }}>{orig}</span>
              </div>
            ) : null;
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>מחיר ₪ *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>מחיר לפני הנחה ₪</label>
              <input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="לא חובה" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>עלות ספק ₪ (מחיר גולמי, לפני הנחה ומע&quot;מ)</label>
            <input type="number" value={supplierCost} onChange={e => setSupplierCost(e.target.value)} placeholder="לא חובה" style={inputStyle} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>העלות שלך מחושבת אוטומטית: ערך זה × 0.95 × 1.18</div>
          </div>
          <div>
            <label style={labelStyle}>קטגוריה</label>
            <select value={cat} onChange={e => { setCat(e.target.value); setSubCat(''); if (!LEVEL_CATS_EDIT.includes(e.target.value)) { setLevel(''); setNusach(''); } }}
              style={{ ...inputStyle, background: '#fff' }}>
              {PARENT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(SUB_CATS[cat] ?? []).length > 0 && (
            <div>
              <label style={labelStyle}>תת-קטגוריה *</label>
              <select value={subCat} onChange={e => setSubCat(e.target.value)}
                style={{ ...inputStyle, background: subCat ? '#fff' : '#fffbe6', outline: subCat ? '' : '2px solid #C5A028' }}>
                <option value="">בחר תת-קטגוריה</option>
                {(SUB_CATS[cat] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {(isSoferCat(cat) || !!soferId) && (
            <div>
              <label style={labelStyle}>סופר</label>
              <select value={soferId} onChange={e => setSoferId(e.target.value)}
                style={{ ...inputStyle, background: '#fff' }}>
                <option value="">ללא סופר</option>
                {soferOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {LEVEL_CATS_EDIT.includes(cat) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>רמת כשרות</label>
                <select value={level} onChange={e => setLevel(e.target.value)}
                  style={{ ...inputStyle, background: '#fff' }}>
                  <option value="">לא מוגדר</option>
                  <option value="כשר לכתחילה">כשר לכתחילה</option>
                  <option value="מהודר">מהודר</option>
                  <option value="מהודר בתכלית">מהודר בתכלית</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>נוסח</label>
                <select value={nusach} onChange={e => setNusach(e.target.value)}
                  style={{ ...inputStyle, background: '#fff' }}>
                  <option value="">לא מוגדר</option>
                  <option value="אשכנז">אשכנז</option>
                  <option value="ספרד">ספרד</option>
                  <option value='חב"ד'>חב"ד</option>
                  <option value="תימני">תימני</option>
                  <option value="עדות המזרח">עדות המזרח</option>
                </select>
              </div>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isBestSeller ? '#FFF7E6' : '#F9F9F9', border: `1.5px solid ${isBestSeller ? '#C5A028' : '#ddd'}`, borderRadius: 8, padding: '10px 14px', transition: 'all 0.15s' }}>
            <input
              type="checkbox"
              checked={isBestSeller}
              onChange={e => setIsBestSeller(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#C5A028' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: isBestSeller ? '#92710c' : '#555' }}>
              🏆 נמכר ביותר (מופיע בסקרול דף הבית)
            </span>
          </label>
          {(
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#EFF4FF', border: '1.5px solid #93C5FD', borderRadius: 8, padding: '10px 14px' }}>
              <input
                type="checkbox"
                checked={isExpertRecommended}
                onChange={e => setIsExpertRecommended(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1E3A8A' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>
                ⭐ המוצר הכי מומלץ על ידי המומחים שלנו
              </span>
            </label>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>תווית</label>
              <select value={badge} onChange={e => setBadge(e.target.value)}
                style={{ ...inputStyle, background: '#fff' }}>
                <option value="">ללא</option>
                <option value="חדש">חדש</option>
                <option value="מבצע">מבצע</option>
                <option value="פופולרי">פופולרי</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>זמן אספקה</label>
              <input value={days} onChange={e => setDays(e.target.value)} placeholder="7-10" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ ...labelStyle, marginBottom: 8 }}>תמונות</label>
            {(['main', 'img2', 'img3'] as const).map((field, idx) => {
              const currentUrl = field === 'main' ? imgUrl : field === 'img2' ? imgUrl2 : imgUrl3;
              const setUrl = field === 'main' ? setImgUrl : field === 'img2' ? setImgUrl2 : setImgUrl3;
              const lbl = field === 'main' ? 'תמונה ראשית' : `תמונה ${idx + 1} (אופציונלי)`;
              return (
                <div key={field} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{lbl}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {currentUrl && <img src={currentUrl} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }} />}
                    <label style={{ background: field === 'main' ? '#1E3A8A' : '#555', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
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

        {/* ── מלאי ── */}
        <div style={{ marginTop: 14, background: '#f8f6f2', border: '1px solid #e8e0d0', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A', marginBottom: 10 }}>מלאי</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: outOfStock ? '#dc2626' : '#333', fontWeight: outOfStock ? 700 : 400 }}>
              <input
                type="checkbox"
                checked={outOfStock}
                onChange={e => setOutOfStock(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#dc2626' }}
              />
              אזל מהמלאי (לא ניתן לרכישה)
            </label>
          </div>
          {outOfStock && (outOfStockReason || outOfStockDate) && (
            <div style={{ fontSize: 12, color: '#6b7280', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
              {outOfStockReason && <div>סיבה: <strong>{outOfStockReason === 'SKU_MISSING' ? 'SKU חסר' : outOfStockReason === 'NOT_FOUND_AT_SUPPLIER' ? 'לא נמצא אצל הספק' : outOfStockReason}</strong></div>}
              {outOfStockDate && <div>תאריך סימון: <strong>{outOfStockDate}</strong></div>}
            </div>
          )}
          {outOfStock && (
            <button
              type="button"
              onClick={() => setOutOfStock(false)}
              style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', marginBottom: 8 }}
            >
              ✅ סמן כחוזר למלאי
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: stockVisible ? 10 : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#333' }}>
              <input
                type="checkbox"
                checked={stockVisible}
                onChange={e => setStockVisible(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              הצג כמות במלאי
            </label>
          </div>
          {stockVisible && (
            <div>
              <label style={labelStyle}>כמות במלאי (ריק = מספר אקראי)</label>
              <input
                type="number"
                min={1}
                value={stockCountInput}
                onChange={e => setStockCountInput(e.target.value)}
                placeholder="למשל: 3"
                style={{ ...inputStyle, maxWidth: 140 }}
              />
            </div>
          )}
        </div>

        {/* ── מיקום במחסן ── */}
        <div style={{ marginTop: 14, background: '#f0fff4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10 }}>📦 מיקום במחסן</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>עמודה (A–G)</label>
              <select value={storageColumn} onChange={e => setStorageColumn(e.target.value)}
                style={{ ...inputStyle, background: '#fff' }}>
                <option value="">לא מוגדר</option>
                {['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>מדף (1–7)</label>
              <select value={storageShelf} onChange={e => setStorageShelf(e.target.value)}
                style={{ ...inputStyle, background: '#fff' }}>
                <option value="">לא מוגדר</option>
                {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>הערת מיקום</label>
            <input value={storageNote} onChange={e => setStorageNote(e.target.value)}
              placeholder='למשל: "שורה שלישית מלמעלה"'
              style={inputStyle} />
          </div>
        </div>

        {/* ── מידע ספק ── */}
        {product.source && (
          <div style={{ marginTop: 14, background: '#f0f4ff', border: '1px solid #c5d8ff', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A', marginBottom: 10 }}>מידע ספק</div>
            <div style={{ display: 'grid', gap: 7, fontSize: 13, color: '#333' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#555', marginLeft: 6 }}>ספק:</span>
                <span style={{ fontFamily: 'monospace' }}>{product.source}</span>
              </div>
              {product.sku && (
                <div>
                  <span style={{ fontWeight: 700, color: '#555', marginLeft: 6 }}>מק&quot;ט:</span>
                  <span style={{ fontFamily: 'monospace' }}>{product.sku}</span>
                </div>
              )}
              {(() => {
                const url = product.sourceUrl || (
                  product.source === 'israel-judaica' && product.sku
                    ? `https://www.israel-judaica.com/index.php?option=com_art&view=product&sku=${encodeURIComponent(product.sku)}&lang=he`
                    : null
                );
                return url ? (
                  <div>
                    <span style={{ fontWeight: 700, color: '#555', marginLeft: 6 }}>קישור לספק:</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1E3A8A', textDecoration: 'underline', fontSize: 12, wordBreak: 'break-all' }}
                    >
                      {url}
                    </a>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ שומר...' : '✅ שמור שינויים'}
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

function AddSoferModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: '', city: '', phone: '', whatsapp: '', email: '',
    description: '', style: '', imageUrl: '',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const SOFER_CATS = ['בתי מזוזה', 'תפילין', 'מגילות', 'ספרי תורה', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'בר מצווה'];

  function toggleCat(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('שגיאה בהעלאה');
    return data.secure_url;
  }

  async function handleSave() {
    if (!form.name || !form.phone) { alert('שם וטלפון הם שדות חובה'); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'soferim'), {
        ...form, categories, status: 'active', createdAt: serverTimestamp(),
      });
      onSave();
      onClose();
    } catch (e) {
      alert('שגיאה בשמירה');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>➕ הוספת סופר חדש</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>שם מלא *</label><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="הרב ישראל ישראלי" style={inputStyle} /></div>
            <div><label style={labelStyle}>עיר</label><input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="ירושלים" style={inputStyle} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>טלפון *</label><input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="050-0000000" style={inputStyle} /></div>
            <div><label style={labelStyle}>וואטסאפ</label><input value={form.whatsapp} onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} placeholder="050-0000000" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>אימייל</label><input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="sofer@example.com" type="email" style={inputStyle} /></div>
          <div><label style={labelStyle}>סגנון כתיבה</label><input value={form.style} onChange={e => setForm(p => ({...p, style: e.target.value}))} placeholder='חב"ד / אשכנז / ספרד' style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3}
              placeholder="סופר מוסמך עם ניסיון של 10 שנים..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>קטגוריות</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SOFER_CATS.map(cat => (
                <button key={cat} type="button" onClick={() => toggleCat(cat)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: categories.includes(cat) ? '#1E3A8A' : '#f5f5f5', color: categories.includes(cat) ? '#fff' : '#333', border: categories.includes(cat) ? '1px solid #1E3A8A' : '1px solid #ddd', fontWeight: categories.includes(cat) ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>תמונה</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
              <label style={{ background: '#1E3A8A', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {uploadingImg ? '⏳ מעלה...' : '📷 העלה תמונה'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingImg(true);
                  try { const url = await uploadToCloudinary(file); setForm(p => ({...p, imageUrl: url})); }
                  catch { alert('שגיאה בהעלאה'); }
                  finally { setUploadingImg(false); }
                }} />
              </label>
              <input value={form.imageUrl} onChange={e => setForm(p => ({...p, imageUrl: e.target.value}))} placeholder="או הדבק URL"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 12 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ שומר...' : '✅ הוסף סופר'}
          </button>
          <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

function EditSoferModal({ sofer, onClose, onSave }: {
  sofer: SoferFull;
  onClose: () => void;
  onSave: (updated: SoferFull) => void;
}) {
  const [form, setForm] = useState({
    name: sofer.name ?? '',
    city: sofer.city ?? '',
    phone: sofer.phone ?? '',
    whatsapp: (sofer as any).whatsapp ?? '',
    email: sofer.email ?? '',
    description: sofer.description ?? '',
    style: sofer.style ?? '',
    imageUrl: sofer.imageUrl ?? '',
  });
  const [categories, setCategories] = useState<string[]>(sofer.categories ?? []);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const SOFER_CATS = ['בתי מזוזה', 'תפילין', 'מגילות', 'ספרי תורה', 'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'בר מצווה'];

  function toggleCat(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('שגיאה בהעלאה');
    return data.secure_url;
  }

  async function handleSave() {
    if (!form.name) { alert('שם הוא שדה חובה'); return; }
    setSaving(true);
    try {
      const payload = { ...form, categories };
      await updateDoc(doc(db, 'soferim', sofer.id), payload);
      onSave({ ...sofer, ...payload });
    } catch (e) {
      alert('שגיאה בשמירה');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>✏️ עריכת סופר - {sofer.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>שם מלא *</label><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} style={inputStyle} /></div>
            <div><label style={labelStyle}>עיר</label><input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="ירושלים" style={inputStyle} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>טלפון</label><input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="050-0000000" style={inputStyle} /></div>
            <div><label style={labelStyle}>וואטסאפ</label><input value={form.whatsapp} onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} placeholder="050-0000000" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>אימייל</label><input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="sofer@example.com" type="email" style={inputStyle} /></div>
          <div><label style={labelStyle}>סגנון כתיבה</label><input value={form.style} onChange={e => setForm(p => ({...p, style: e.target.value}))} placeholder='חב"ד / אשכנז / ספרד' style={inputStyle} /></div>
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>קטגוריות</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SOFER_CATS.map(cat => (
                <button key={cat} type="button" onClick={() => toggleCat(cat)}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: categories.includes(cat) ? '#1E3A8A' : '#f5f5f5', color: categories.includes(cat) ? '#fff' : '#333', border: categories.includes(cat) ? '1px solid #1E3A8A' : '1px solid #ddd', fontWeight: categories.includes(cat) ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>תמונת פרופיל</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />}
              <label style={{ background: '#1E3A8A', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {uploadingImg ? '⏳ מעלה...' : '📷 החלף תמונה'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingImg(true);
                  try { const url = await uploadToCloudinary(file); setForm(p => ({...p, imageUrl: url})); }
                  catch { alert('שגיאה בהעלאה'); }
                  finally { setUploadingImg(false); }
                }} />
              </label>
              <input value={form.imageUrl} onChange={e => setForm(p => ({...p, imageUrl: e.target.value}))} placeholder="או הדבק URL"
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 12, minWidth: 0 }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '⏳ שומר...' : '💾 שמור שינויים'}
          </button>
          <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

function AddShliachModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: '', chabadName: '', city: '', phone: '', email: '', rabbiName: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('שגיאה בהעלאה');
    return data.secure_url;
  }

  async function handleSave() {
    if (!form.name || !form.phone) { alert('שם וטלפון הם שדות חובה'); return; }
    setSaving(true);
    try {
      const shliachRef = await addDoc(collection(db, 'shluchim'), {
        ...form, status: 'active', createdAt: serverTimestamp(),
      });
      const newId = shliachRef.id;
      await addDoc(collection(db, 'shluchim_applications'), {
        ...form, status: 'approved', approvedAt: serverTimestamp(), approvedDocId: newId, createdAt: serverTimestamp(),
      });
      if (form.email) {
        const normalizedEmail = form.email.trim().toLowerCase();
        const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
        if (!userSnap.empty) {
          await updateDoc(doc(db, 'users', userSnap.docs[0].id), { role: 'shaliach', shaliachId: newId });
        }
      }
      setCreatedLink(`https://your-sofer.com/?ref=${newId}`);
      onSave();
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={createdLink ? undefined : onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24, direction: 'rtl' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A8A' }}>➕ הוספת שליח ידנית</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {createdLink ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1E3A8A', marginBottom: 8 }}>השליח נוצר בהצלחה!</h3>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>קישור ההפניה האישי:</p>
            <div style={{ background: '#f0f4ff', border: '1px solid #c8d4f0', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', marginBottom: 16 }}>
              {createdLink}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { navigator.clipboard.writeText(createdLink); }}
                style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                📋 העתק קישור
              </button>
              <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>סגור</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>שם מלא *</label><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="הרב ישראל ישראלי" style={inputStyle} /></div>
              <div><label style={labelStyle}>שם ארגון / בית כנסת</label><input value={form.chabadName} onChange={e => setForm(p => ({...p, chabadName: e.target.value}))} placeholder="קהילת ישראל תל אביב" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>עיר</label><input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="תל אביב" style={inputStyle} /></div>
              <div><label style={labelStyle}>טלפון *</label><input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="050-0000000" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>אימייל</label><input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="rabbi@example.com" type="email" style={inputStyle} /></div>
              <div><label style={labelStyle}>שם רב</label><input value={form.rabbiName} onChange={e => setForm(p => ({...p, rabbiName: e.target.value}))} placeholder="הרב כהן" style={inputStyle} /></div>
            </div>
            <div>
              <label style={labelStyle}>לוגו</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {form.logoUrl && <img src={form.logoUrl} alt="לוגו" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '2px solid #ddd', flexShrink: 0 }} />}
                <label style={{ background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  {uploadingLogo ? '⏳ מעלה...' : '📷 העלה לוגו'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingLogo(true);
                    try { const url = await uploadToCloudinary(file); setForm(p => ({...p, logoUrl: url})); }
                    catch { alert('שגיאה בהעלאה'); }
                    finally { setUploadingLogo(false); }
                  }} />
                </label>
                <input value={form.logoUrl} onChange={e => setForm(p => ({...p, logoUrl: e.target.value}))} placeholder="או הדבק URL"
                  style={{ flex: 1, border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 12, minWidth: 0 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ שומר...' : '✅ צור שליח'}
              </button>
              <button onClick={onClose} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ORDER_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'new',        label: '⏳ חדש',            color: 'bg-yellow-100 text-yellow-700' },
  { value: 'pending',    label: '🕐 ממתין',           color: 'bg-orange-100 text-orange-700' },
  { value: 'magiah',     label: '✅ מגיע',             color: 'bg-teal-100 text-teal-700' },
  { value: 'sofer',      label: '✍️ אצל הסופר',       color: 'bg-blue-100 text-blue-700' },
  { value: 'packing',    label: '📦 באריזה',           color: 'bg-purple-100 text-purple-700' },
  { value: 'shipped',    label: '🚚 נשלח',             color: 'bg-indigo-100 text-indigo-700' },
  { value: 'delivered',  label: '✅ נמסר',             color: 'bg-green-100 text-green-700' },
  { value: 'completed',  label: '🏁 הושלם',            color: 'bg-green-200 text-green-800' },
  { value: 'needs_care', label: '⚠️ דורש טיפול',      color: 'bg-red-100 text-red-700' },
  { value: 'abandoned',  label: '🚫 נטוש',             color: 'bg-gray-200 text-gray-600' },
  { value: 'cancelled',  label: '❌ בוטל',             color: 'bg-red-100 text-red-500' },
];

// ── Shared print-customization display block ─────────────────────────────────
// Used by both OrdersTab and AbandonedCartsTab so the UI stays in sync.

interface PrintCustomizationData {
  productType: string;
  side: string;
  color?: string;
  uploadedImageUrl: string;
  bgRemoved: boolean;
  originalImageUrl: string;
  imageX?: number;
  imageY?: number;
  imageScale?: number;
  imageRotation?: number;
  logoWidthPct?: number;
  mockupUrl?: string;
}

function PrintCustomizationView({ pc }: { pc: PrintCustomizationData }) {
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
          🖨️ {pc.productType === 'shirt' ? 'חולצה' : 'כיפה'} · {pc.side}{pc.color ? ` · ${pc.color === 'white' ? 'לבן' : 'שחור'}` : ''}
        </span>
        {pc.bgRemoved && (
          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            ✂️ רקע הוסר
          </span>
        )}
      </span>
      {pc.mockupUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pc.mockupUrl}
          alt="הדמיה"
          style={{ maxWidth: 200, display: 'block', border: '1px solid #e5e7eb', borderRadius: 4 }}
        />
      )}
      <span className="inline-flex flex-wrap gap-1.5">
        {pc.mockupUrl && (
          <a
            href={pc.mockupUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5 hover:underline text-xs"
          >
            ⬇️ הורד הדמיה
          </a>
        )}
        <a
          href={pc.uploadedImageUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 hover:underline text-xs"
        >
          ⬇️ הורד קובץ מקורי
        </a>
      </span>
      {pc.imageX !== undefined && (
        <span className="text-[10px] text-gray-400 font-mono" dir="ltr">
          X:{pc.imageX?.toFixed(1)} Y:{pc.imageY?.toFixed(1)} scale:{pc.imageScale?.toFixed(2)} rot:{pc.imageRotation?.toFixed(0)}°
        </span>
      )}
    </div>
  );
}

function OrdersTab({ orders, setOrders, ordersError }: { orders: Order[]; setOrders: React.Dispatch<React.SetStateAction<Order[]>>; ordersError?: string | null; }) {
  const { user } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    customerName: string; phone: string; email: string;
    address: string; notes: string; items: OrderItem[];
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState<Product[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const itemSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allProductsCacheRef = useRef<Product[] | null>(null);
  // Feature 5: warehouse info cache for order item display
  const [productDetailsCache, setProductDetailsCache] = useState<Record<string, Product>>({});

  // Feature 5: load product warehouse info when expanding an order
  async function loadProductDetailsForOrder(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    if (!order?.items?.length) return;
    const missing = order.items
      .map(it => it.productId ?? it.id)
      .filter(pid => pid && !productDetailsCache[pid]);
    if (missing.length === 0) return;
    try {
      const snaps = await Promise.all(missing.map(pid => getDoc(doc(db, 'products', pid))));
      const updates: Record<string, Product> = {};
      snaps.forEach((snap, i) => {
        if (snap.exists()) updates[missing[i]] = { id: snap.id, ...snap.data() } as Product;
      });
      if (Object.keys(updates).length > 0) {
        setProductDetailsCache(prev => ({ ...prev, ...updates }));
      }
    } catch (e) {
      console.error('[OrdersTab] loadProductDetails:', e);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  }

  async function handleCancel(orderId: string) {
    const ok = window.confirm('לבטל את העסקה? ההזמנה תישאר ברשומות אך לא תיחשב כהכנסה.');
    if (!ok) return;
    setCancellingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (e) { console.error(e); alert('שגיאה בביטול ההזמנה'); }
    finally { setCancellingId(null); }
  }

  async function handleDelete(orderId: string, orderNumber: string) {
    const ok1 = window.confirm(`למחוק לצמיתות את הזמנה ${orderNumber}? פעולה בלתי הפיכה.`);
    if (!ok1) return;
    const ok2 = window.confirm('אישור נוסף: האם אתה בטוח? הנתונים יאבדו לצמיתות ולא ניתן לשחזר.');
    if (!ok2) return;
    setDeletingId(orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (e) { console.error(e); alert('שגיאה במחיקת ההזמנה'); }
    finally { setDeletingId(null); }
  }

  function calcTotal(items: OrderItem[], shippingCost?: number): number {
    return items.reduce((s, it) => s + it.price * it.quantity, 0) + (shippingCost ?? 0);
  }

  function startEdit(o: Order) {
    setEditingId(o.id);
    setExpandedId(o.id);
    setEditDraft({
      customerName: o.customerName || '',
      phone: o.phone || '',
      email: o.email || '',
      address: o.address || '',
      notes: o.notes || '',
      items: (o.items || []).map(it => ({ ...it })),
    });
    setItemSearchQuery('');
    setItemSearchResults([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setItemSearchQuery('');
    setItemSearchResults([]);
  }

  function updateDraftItem(idx: number, field: 'quantity' | 'price', value: number) {
    setEditDraft(d => {
      if (!d) return d;
      const items = d.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
      return { ...d, items };
    });
  }

  function removeDraftItem(idx: number) {
    setEditDraft(d => d ? { ...d, items: d.items.filter((_, i) => i !== idx) } : d);
  }

  async function searchProductsForEdit(q: string) {
    if (!q.trim()) { setItemSearchResults([]); return; }
    setItemSearchLoading(true);
    try {
      if (!allProductsCacheRef.current) {
        const snap = await getDocs(collection(db, 'products'));
        const all: Product[] = [];
        snap.forEach(d => all.push({ id: d.id, ...d.data() } as Product));
        allProductsCacheRef.current = all;
      }
      const ql = q.toLowerCase();
      const res = allProductsCacheRef.current
        .filter(p => p.name?.toLowerCase().includes(ql) || p.sku?.toLowerCase().includes(ql))
        .slice(0, 6);
      setItemSearchResults(res);
    } catch { setItemSearchResults([]); }
    finally { setItemSearchLoading(false); }
  }

  function addProductToDraft(p: Product) {
    setEditDraft(d => {
      if (!d) return d;
      const newItem: OrderItem = {
        id: p.id, name: p.name, price: p.price, quantity: 1,
        productId: p.id, productName: p.name,
      };
      return { ...d, items: [...d.items, newItem] };
    });
    setItemSearchQuery('');
    setItemSearchResults([]);
  }

  async function saveEdit(o: Order) {
    if (!editDraft) return;
    setSavingEdit(true);
    try {
      const updatedItems = editDraft.items.map(it => ({
        id: it.id,
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        productId: it.productId ?? it.id,
        productName: it.productName ?? it.name,
        ...(it.embroideryText != null && { embroideryText: it.embroideryText }),
        ...(it.selectedKlafName != null && { selectedKlafName: it.selectedKlafName }),
        ...(it.selectedCover != null && { selectedCover: it.selectedCover }),
        ...(it.printCustomization != null && { printCustomization: it.printCustomization }),
        ...(it.finalPrice != null && { finalPrice: it.finalPrice }),
      }));

      // Feature 4: lock payment amount after payment; only update logistics fields
      const isPaid = o.status !== 'pending_payment' && o.status !== 'cancelled';
      const updateData: Record<string, unknown> = {
        customerName: editDraft.customerName,
        phone: editDraft.phone,
        email: editDraft.email,
        address: editDraft.address,
        notes: editDraft.notes,
        items: updatedItems,
      };

      if (!isPaid) {
        // Pre-payment: recalculate total normally
        updateData.total = calcTotal(editDraft.items, o.shippingCost);
      } else {
        // Post-payment: lock original total; stamp paymentTotal on first edit
        if (!o.paymentTotal) {
          updateData.paymentTotal = o.total;
        }
      }

      await updateDoc(doc(db, 'orders', o.id), updateData);

      // Log edit history in subcollection
      await addDoc(collection(db, 'orders', o.id, 'orderEditHistory'), {
        editedAt: serverTimestamp(),
        editedBy: user?.email ?? 'אדמין',
        oldItems: o.items ?? [],
        newItems: updatedItems,
        note: '',
      });

      const newTotal = isPaid ? o.total : calcTotal(editDraft.items, o.shippingCost);
      setOrders(prev => prev.map(ord => ord.id === o.id ? {
        ...ord,
        customerName: editDraft.customerName,
        phone: editDraft.phone,
        email: editDraft.email,
        address: editDraft.address,
        notes: editDraft.notes,
        items: updatedItems,
        total: newTotal,
        paymentTotal: o.paymentTotal ?? (isPaid ? o.total : undefined),
      } : ord));
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירת ההזמנה');
    } finally {
      setSavingEdit(false);
    }
  }

  function getStatusMeta(val: string) {
    return ORDER_STATUSES.find(s => s.value === val) ?? { label: val, color: 'bg-gray-100 text-gray-600' };
  }

  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;
  const activeCount = orders.filter(o => o.status !== 'cancelled').length;
  const visibleOrders = orders.filter(o => showCancelled ? o.status === 'cancelled' : o.status !== 'cancelled');

  if (ordersError) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-red-600 font-bold">שגיאה בטעינת הזמנות: {ordersError}</div>;
  }
  if (orders.length === 0) {
    return <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">אין הזמנות עדיין</div>;
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex gap-2">
        <button
          onClick={() => setShowCancelled(false)}
          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${!showCancelled ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
        >
          הזמנות פעילות ({activeCount})
        </button>
        <button
          onClick={() => setShowCancelled(true)}
          className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${showCancelled ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
        >
          מבוטלות ({cancelledCount})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">מספר הזמנה</th>
              <th className="p-3 text-right">לקוח</th>
              <th className="p-3 text-right">סכום</th>
              <th className="p-3 text-right">שליח</th>
              <th className="p-3 text-right">סטטוס</th>
              <th className="p-3 text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  {showCancelled ? 'אין הזמנות מבוטלות' : 'אין הזמנות פעילות'}
                </td>
              </tr>
            )}
            {visibleOrders.map(o => {
              const meta = getStatusMeta(o.status);
              const isExpanded = expandedId === o.id;
              const isCancelled = o.status === 'cancelled';
              const isEditing = editingId === o.id;
              return (
                <React.Fragment key={o.id}>
                  <tr
                    className={`border-t cursor-pointer ${isCancelled ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                    onClick={() => { if (isEditing) return; const next = isExpanded ? null : o.id; setExpandedId(next); if (next) loadProductDetailsForOrder(next); }}
                  >
                    <td className="p-3 font-mono text-xs">
                      {o.orderNumber}
                      {isCancelled && (
                        <span className="mr-2 inline-block bg-gray-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">בוטל</span>
                      )}
                    </td>
                    <td className={`p-3 font-bold ${isCancelled ? 'text-gray-400' : ''}`}>{o.customerName}</td>
                    <td className={`p-3 font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-green-700'}`}>{formatPrice(o.total)}</td>
                    <td className="p-3 text-blue-600">{o.shaliachName || '-'}</td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <select
                        value={o.status}
                        disabled={updatingId === o.id}
                        onChange={e => handleStatusChange(o.id, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer outline-none ${meta.color}`}
                        style={{ fontFamily: 'inherit' }}
                      >
                        {ORDER_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      {updatingId === o.id && <span className="ml-2 text-xs text-gray-400">שומר...</span>}
                    </td>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => isEditing ? cancelEdit() : startEdit(o)}
                          className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${isEditing ? 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100' : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                        >
                          {isEditing ? 'ביטול עריכה' : 'ערוך הזמנה'}
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => handleCancel(o.id)}
                            disabled={cancellingId === o.id}
                            className="text-xs font-bold px-2 py-1 rounded border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 whitespace-nowrap"
                          >
                            {cancellingId === o.id ? '...' : 'בטל עסקה'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(o.id, o.orderNumber)}
                          disabled={deletingId === o.id}
                          className="text-xs font-bold px-2 py-1 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === o.id ? '...' : 'מחק'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={6} className="px-5 py-4" dir="rtl">
                        {isEditing && editDraft ? (
                          <div className="space-y-3">
                            {/* ── Feature 4: payment lock warning ── */}
                            {o.status !== 'pending_payment' && o.status !== 'cancelled' && (
                              <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 text-xs text-amber-800 font-medium flex items-start gap-2">
                                <span className="text-base shrink-0">⚠️</span>
                                <span>
                                  <strong>שימו לב:</strong> עריכת מוצרים לאחר תשלום אינה משנה את הסכום שהלקוח שילם.
                                  הסכום המקורי ששולם: <strong>{formatPrice(o.paymentTotal ?? o.total)}</strong> — נעול.
                                </span>
                              </div>
                            )}
                            {/* ── פרטי לקוח — עריכה ── */}
                            <div className="bg-white border border-blue-100 rounded-lg px-4 py-3">
                              <p className="text-xs font-bold text-gray-400 mb-3">פרטי לקוח</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">שם</label>
                                  <input value={editDraft.customerName} onChange={e => setEditDraft(d => d ? { ...d, customerName: e.target.value } : d)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">טלפון</label>
                                  <input value={editDraft.phone} onChange={e => setEditDraft(d => d ? { ...d, phone: e.target.value } : d)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" dir="ltr" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">אימייל</label>
                                  <input value={editDraft.email} onChange={e => setEditDraft(d => d ? { ...d, email: e.target.value } : d)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" dir="ltr" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block mb-1">כתובת</label>
                                  <input value={editDraft.address} onChange={e => setEditDraft(d => d ? { ...d, address: e.target.value } : d)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-gray-500 block mb-1">הערות</label>
                                  <input value={editDraft.notes} onChange={e => setEditDraft(d => d ? { ...d, notes: e.target.value } : d)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs" />
                                </div>
                              </div>
                            </div>

                            {/* ── פריטים — עריכה ── */}
                            <div className="bg-white border border-blue-100 rounded-lg px-4 py-3">
                              <p className="text-xs font-bold text-gray-400 mb-3">פריטים</p>
                              <div className="flex flex-col gap-2">
                                {editDraft.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="font-medium flex-1 min-w-0">{item.name}</span>
                                    <label className="text-gray-400 shrink-0">כמות</label>
                                    <input
                                      type="number" min={1}
                                      value={item.quantity}
                                      onChange={e => updateDraftItem(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                                      className="border border-gray-200 rounded px-2 py-1 w-16 text-center"
                                    />
                                    <label className="text-gray-400 shrink-0">מחיר ₪</label>
                                    <input
                                      type="number" min={0}
                                      value={item.price}
                                      onChange={e => updateDraftItem(idx, 'price', Number(e.target.value) || 0)}
                                      className="border border-gray-200 rounded px-2 py-1 w-24 text-center"
                                    />
                                    <span className="text-green-700 font-bold shrink-0 w-20 text-left">
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                    <button
                                      onClick={() => removeDraftItem(idx)}
                                      className="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50 shrink-0"
                                    >
                                      הסר פריט
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* חיפוש מוצר */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="relative">
                                  <input
                                    value={itemSearchQuery}
                                    onChange={e => {
                                      const v = e.target.value;
                                      setItemSearchQuery(v);
                                      if (itemSearchTimer.current) clearTimeout(itemSearchTimer.current);
                                      itemSearchTimer.current = setTimeout(() => searchProductsForEdit(v), 400);
                                    }}
                                    placeholder='הוסף פריט — חפש לפי שם או מק"ט...'
                                    className="w-full border border-dashed border-blue-300 rounded px-3 py-2 text-xs"
                                  />
                                  {itemSearchLoading && <span className="absolute left-2 top-2 text-xs text-gray-400">מחפש...</span>}
                                </div>
                                {itemSearchResults.length > 0 && (
                                  <div className="border border-gray-200 rounded mt-1 bg-white shadow-sm overflow-hidden">
                                    {itemSearchResults.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => addProductToDraft(p)}
                                        className="w-full text-right text-xs px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 border-gray-100 flex justify-between items-center gap-4"
                                      >
                                        <span className="font-medium">{p.name}</span>
                                        <span className="text-green-700 shrink-0">{formatPrice(p.price)}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── סה"כ + כפתורי שמירה ── */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="text-sm font-bold text-gray-700">
                                {o.status !== 'pending_payment' && o.status !== 'cancelled' ? 'סה״כ ששולם (נעול):' : 'סה״כ מעודכן:'}{' '}
                                <span className="text-green-700 text-base">
                                  {o.status !== 'pending_payment' && o.status !== 'cancelled'
                                    ? formatPrice(o.paymentTotal ?? o.total)
                                    : formatPrice(calcTotal(editDraft.items, o.shippingCost))}
                                </span>
                                {o.shippingCost && (o.status === 'pending_payment' || o.status === 'cancelled') ? <span className="text-gray-400 font-normal text-xs mr-2">(כולל משלוח ₪{o.shippingCost})</span> : null}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={cancelEdit} className="text-xs px-3 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-600 font-medium">ביטול עריכה</button>
                                <button onClick={() => saveEdit(o)} disabled={savingEdit} className="text-xs px-4 py-2 bg-blue-900 text-white rounded font-bold hover:bg-blue-800 disabled:opacity-50">
                                  {savingEdit ? 'שומר...' : 'שמור שינויים'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* ── פרטי לקוח — תצוגה ── */}
                            <div className="bg-white border border-blue-100 rounded-lg px-4 py-3 mb-3 text-xs text-gray-700">
                              <p className="text-xs font-bold text-gray-400 mb-2">פרטי לקוח</p>
                              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                {o.customerName && (
                                  <div><span className="text-gray-400 ml-1">שם:</span><span className="font-medium">{o.customerName}</span></div>
                                )}
                                {o.phone && (
                                  <div><span className="text-gray-400 ml-1">טלפון:</span><span className="font-medium" dir="ltr">{o.phone}</span></div>
                                )}
                                {o.email && (
                                  <div><span className="text-gray-400 ml-1">אימייל:</span><span className="font-medium" dir="ltr">{o.email}</span></div>
                                )}
                                {o.address && (
                                  <div><span className="text-gray-400 ml-1">כתובת:</span><span className="font-medium">{o.address}</span></div>
                                )}
                                {o.shippingCost != null && (
                                  <div><span className="text-gray-400 ml-1">משלוח:</span><span className="font-medium">₪{o.shippingCost}</span></div>
                                )}
                                {o.notes && (
                                  <div className="col-span-2 mt-1"><span className="text-gray-400 ml-1">הערות:</span><span className="font-medium">{o.notes}</span></div>
                                )}
                              </div>
                            </div>
                            {/* ── פריטים — תצוגה ── */}
                            {o.items && o.items.length > 0 && (
                              <>
                                <p className="text-xs font-bold text-gray-500 mb-2">פריטים בהזמנה:</p>
                                <div className="flex flex-col gap-1">
                                  {o.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-xs text-gray-700 flex-wrap py-1 border-b border-gray-50 last:border-0">
                                      {/* thumbnail */}
                                      {(() => { const pd = productDetailsCache[item.productId ?? item.id]; return pd?.imgUrl ? <img src={pd.imgUrl} alt="" className="w-10 h-10 object-cover rounded border border-gray-200 shrink-0" /> : null; })()}
                                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <a href={`/product/${item.id}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline hover:text-blue-600">{item.name}</a>
                                          <span className="text-gray-400">×{item.quantity}</span>
                                          <span className="text-green-700 font-bold">{formatPrice(item.price * item.quantity)}</span>
                                          {/* Feature 5: SKU */}
                                          {(() => { const pd = productDetailsCache[item.productId ?? item.id]; return pd?.sku ? <span className="text-gray-400 font-mono">מק&quot;ט: {pd.sku}</span> : null; })()}
                                        </div>
                                        {/* Feature 5: warehouse location */}
                                        {(() => {
                                          const pd = productDetailsCache[item.productId ?? item.id];
                                          if (!pd?.storageColumn && !pd?.storageShelf) return null;
                                          return (
                                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 text-xs font-mono w-fit">
                                              📦 {pd.storageColumn && `עמודה ${pd.storageColumn}`}{pd.storageShelf && ` · מדף ${pd.storageShelf}`}{pd.storageNote && ` · ${pd.storageNote}`}
                                            </span>
                                          );
                                        })()}
                                        <div className="flex flex-wrap gap-1">
                                          {item.embroideryText && (
                                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                                              ✍️ ריקמה: <strong>{item.embroideryText}</strong>
                                            </span>
                                          )}
                                          {item.selectedKlafName && (
                                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                              📜 קלף: <strong>{item.selectedKlafName}</strong>
                                            </span>
                                          )}
                                          {item.selectedCover && (
                                            <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                                              כיסוי נבחר: <strong>{item.selectedCover.name}</strong>
                                            </span>
                                          )}
                                        </div>
                                        {item.printCustomization && (
                                          <PrintCustomizationView pc={item.printCustomization} />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CouponCreateForm({ onCreated }: { onCreated: () => void }) {
  const codeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const minOrderRef = useRef<HTMLInputElement>(null);
  const expiresAtRef = useRef<HTMLInputElement>(null);
  const [couponSaving, setCouponSaving] = useState(false);

  async function createCoupon() {
    const code = codeRef.current?.value.trim().toUpperCase() || '';
    const type = (typeRef.current?.value || 'percent') as 'percent' | 'fixed';
    const discount = Number(discountRef.current?.value || 0);
    const minOrder = Number(minOrderRef.current?.value || 0);
    const expiresAt = expiresAtRef.current?.value || '';
    if (!code || !discount) return;
    setCouponSaving(true);
    try {
      const data: any = { code, type, discount, active: true, usedBy: [], createdAt: new Date().toISOString() };
      if (minOrder > 0) data.minOrder = minOrder;
      if (expiresAt) data.expiresAt = expiresAt;
      await setDoc(doc(db, 'coupons', code), data);
      if (codeRef.current) codeRef.current.value = '';
      if (discountRef.current) discountRef.current.value = '10';
      if (minOrderRef.current) minOrderRef.current.value = '0';
      if (expiresAtRef.current) expiresAtRef.current.value = '';
      onCreated();
    } catch (e) { console.error(e); }
    finally { setCouponSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-black mb-4" style={{ color: '#1E3A8A' }}>🏷️ יצירת קופון חדש</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">קוד קופון</label>
          <input ref={codeRef} defaultValue="" placeholder="SAVE10" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">סוג הנחה</label>
          <select ref={typeRef} defaultValue="percent" className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="percent">אחוז (%)</option>
            <option value="fixed">סכום קבוע (₪)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">אחוז / סכום הנחה</label>
          <input ref={discountRef} type="number" min={1} defaultValue={10} onFocus={e => e.target.select()} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">הזמנה מינימלית (₪)</label>
          <input ref={minOrderRef} type="number" min={0} defaultValue={0} onFocus={e => e.target.select()} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">תפוגה</label>
          <input ref={expiresAtRef} type="date" defaultValue="" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={createCoupon} disabled={couponSaving} style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: couponSaving ? 0.5 : 1 }}>
          {couponSaving ? '...' : '➕ צור קופון'}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<SoferApplication[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [createdProductLinks, setCreatedProductLinks] = useState<Record<string, { id: string; name: string }[]>>({});
  const [users, setUsers] = useState<AppUser[]>([]);
  const [soferIdsWithProducts, setSoferIdsWithProducts] = useState<Set<string>>(new Set());
  const [soferUidsWithStore, setSoferUidsWithStore] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [soferim, setSoferim] = useState<Sofer[]>([]);
  const [soferimFull, setSoferimFull] = useState<SoferFull[]>([]);
  const [soferimLoading, setSoferimLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [content, setContent] = useState<HomeContent>({ heroTitle: '', heroSubtitle: '', heroText: '' });
  const [contentSaving, setContentSaving] = useState(false);
  const [contentSaved, setContentSaved] = useState(false);
  const [catSaving, setCatSaving] = useState<string | null>(null);
  const [catSaved, setCatSaved] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [appsLoading, setAppsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [outOfStockLoading, setOutOfStockLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('הכל');
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showAddSofer, setShowAddSofer] = useState(false);
  const [editingSofer, setEditingSofer] = useState<SoferFull | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [shluchimApps, setShluchimApps] = useState<ShluchimApplication[]>([]);
  const [shluchimAppsLoading, setShluchimAppsLoading] = useState(true);
  const [rabbiRequests, setRabbiRequests] = useState<RabbiRequest[]>([]);
  const [rabbiRequestsLoading, setRabbiRequestsLoading] = useState(true);
  const [showAddShliach, setShowAddShliach] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [testForm, setTestForm] = useState({ name: '', city: '', text: '', rating: 5, imageUrl: '' });
  const [testSaving, setTestSaving] = useState(false);
  const [testUploadingImg, setTestUploadingImg] = useState(false);
  const [editRequests, setEditRequests] = useState<SoferEditRequest[]>([]);
  const [editRequestsLoading, setEditRequestsLoading] = useState(true);
  const [rejectNoteMap, setRejectNoteMap] = useState<Record<string, string>>({});
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>([]);
  const [abandonedCartsLoading, setAbandonedCartsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [productDeleteConfirm, setProductDeleteConfirm] = useState<string | null>(null);
  const [priorityUpdating, setPriorityUpdating] = useState<string | null>(null);
  const priorityTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrders(); loadApplications(); loadUsers();
      loadProducts(); loadSoferim(); loadSoferimFull(); loadContent(); loadCategories();
      loadReviews(); loadShluchimApplications(); loadTestimonials(); loadEditRequests();
      loadAbandonedCarts(); loadCustomers(); loadLeads(); loadRabbiRequests(); loadCoupons(); loadOutOfStockProducts();
    }
  }, [user]);

  async function loadReviews() {
    try {
      const snap = await getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')));
      const data: Review[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Review));
      setReviews(data);
    } catch (e) { console.error(e); }
    finally { setReviewsLoading(false); }
  }

  async function loadOrders() {
    try {
      // Single-field orderBy — no composite index required.
      // pending_payment orders are filtered client-side (they are not real orders yet).
      const snap = await getDocs(query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
      ));
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Order))
        .filter(o => o.status !== 'pending_payment');
      setOrders(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[loadOrders]', msg);
      setOrdersError(msg);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadAbandonedCarts() {
    try {
      const snap = await getDocs(query(
        collection(db, 'abandoned_carts'),
        where('converted', '==', false),
        orderBy('updatedAt', 'desc'),
      ));
      const data: AbandonedCart[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as AbandonedCart));
      setAbandonedCarts(data);
    } catch (e) { console.error(e); }
    finally { setAbandonedCartsLoading(false); }
  }

  async function loadCustomers() {
    try {
      const snap = await getDocs(query(collection(db, 'customers'), orderBy('lastOrderAt', 'desc')));
      const data: Customer[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Customer));
      setCustomers(data);
    } catch (e) { console.error(e); }
    finally { setCustomersLoading(false); }
  }

  async function loadLeads() {
    try {
      const snap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
      const data: Lead[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Lead));
      setLeads(data);
    } catch (e) { console.error(e); }
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

  async function loadShluchimApplications() {
    try {
      const snap = await getDocs(query(collection(db, 'shluchim_applications'), orderBy('createdAt', 'desc')));
      const data: ShluchimApplication[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as ShluchimApplication));
      setShluchimApps(data);
    } catch (e) { console.error(e); }
    finally { setShluchimAppsLoading(false); }
  }

  async function loadRabbiRequests() {
    try {
      const snap = await getDocs(query(collection(db, 'rabbi_requests'), orderBy('createdAt', 'desc')));
      const data: RabbiRequest[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as RabbiRequest));
      setRabbiRequests(data);
    } catch (e) { console.error(e); }
    finally { setRabbiRequestsLoading(false); }
  }

  async function approveRabbiRequest(req: RabbiRequest) {
    setActionLoading(req.id);
    try {
      const refCode = req.soferUid.slice(0, 8);
      // Create shluchim doc with document ID = soferUid for ShaliachContext compatibility
      await setDoc(doc(db, 'shluchim', req.soferUid), {
        name: req.soferName,
        email: req.soferEmail,
        uid: req.soferUid,
        refCode,
        commissionPercent: 10,
        status: 'active',
        isRabbi: false,
        isPersonalStore: true,
        bannerImage: '',
        createdAt: serverTimestamp(),
      });
      // Add shaliachId to user doc without changing role.
      // User document ID = uid (set by AuthContext via setDoc(doc(db,'users',uid), ...))
      await updateDoc(doc(db, 'users', req.soferUid), { shaliachId: req.soferUid });
      await updateDoc(doc(db, 'rabbi_requests', req.id), { status: 'approved', approvedAt: serverTimestamp() });
      setRabbiRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  }

  async function rejectRabbiRequest(id: string) {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'rabbi_requests', id), { status: 'rejected', rejectedAt: serverTimestamp() });
      setRabbiRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  }

  async function approveShluchimApplication(app: ShluchimApplication) {
    setActionLoading(app.id);
    try {
      let uid: string | null = null;
      if (app.email) {
        const normalizedEmail = app.email.trim().toLowerCase();
        const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
        if (!userSnap.empty) uid = userSnap.docs[0].id;
      }
      const docId = uid || app.id;
      await setDoc(doc(db, 'shluchim', docId), {
        name: app.name, chabadName: app.chabadName || '', city: app.city,
        phone: app.phone, email: app.email || '', rabbiName: app.rabbiName || '',
        logoUrl: app.logoUrl || '', status: 'active', createdAt: serverTimestamp(),
        commissionPercent: 0,
      });
      if (uid) {
        await updateDoc(doc(db, 'users', uid), { role: 'shaliach', shaliachId: uid });
      }
      await updateDoc(doc(db, 'shluchim_applications', app.id), {
        status: 'approved', approvedAt: serverTimestamp(), approvedDocId: docId,
      });
      setShluchimApps(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      loadUsers();
    } catch (e) { console.error(e); alert('שגיאה באישור'); }
    finally { setActionLoading(null); }
  }

  async function rejectShluchimApplication(id: string) {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'shluchim_applications', id), { status: 'rejected', rejectedAt: serverTimestamp() });
      setShluchimApps(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (e) { console.error(e); alert('שגיאה בדחייה'); }
    finally { setActionLoading(null); }
  }

  async function loadUsers() {
    try {
      const [usersSnap, soferimSnap, productsSnap, shluchimSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'soferim')),
        getDocs(collection(db, 'products')),
        getDocs(query(collection(db, 'shluchim'), where('isPersonalStore', '==', true))),
      ]);
      const data: AppUser[] = [];
      usersSnap.forEach(d => data.push({ id: d.id, ...d.data() } as AppUser));
      // Add soferim that have no matching users doc (never logged in)
      const linkedSoferIds = new Set(data.map(u => u.soferId).filter(Boolean));
      const userEmails = new Set(data.map(u => u.email?.trim().toLowerCase()).filter(Boolean));
      soferimSnap.forEach(d => {
        const s = d.data();
        if (linkedSoferIds.has(d.id)) return;
        const soferEmail = s.email?.trim().toLowerCase();
        if (soferEmail && userEmails.has(soferEmail)) return;
        data.push({
          id: d.id,
          email: s.email || '',
          displayName: s.name || '',
          role: 'sofer',
          status: 'active',
          soferId: d.id,
          neverLoggedIn: true,
        });
      });
      const withProducts = new Set<string>();
      productsSnap.forEach(d => { const sid = d.data().soferId; if (sid) withProducts.add(sid); });
      setSoferIdsWithProducts(withProducts);
      const withStore = new Set<string>();
      shluchimSnap.forEach(d => withStore.add(d.id));
      setSoferUidsWithStore(withStore);
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setUsersLoading(false); }
  }

  async function loadProducts() {
    setProductsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'products'), orderBy('name')));
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

  const REQUIRED_CATS: { slug: string; displayName: string; priority: number }[] = [
    { slug: 'בתי מזוזה',        displayName: 'בתי מזוזה',        priority: 1  },
    { slug: 'קלפי מזוזה',      displayName: 'קלפי מזוזה',      priority: 2  },
    { slug: 'קלפי תפילין',     displayName: 'קלפי תפילין',     priority: 3  },
    { slug: 'תפילין קומפלט',   displayName: 'תפילין קומפלט',   priority: 4  },
    { slug: 'סט טלית תפילין',  displayName: 'סט טלית תפילין',  priority: 6  },
    { slug: 'יודאיקה',         displayName: 'יודאיקה',         priority: 7  },
    { slug: 'בר מצווה',         displayName: 'בר מצווה',         priority: 8  },
    { slug: 'מתנות',           displayName: 'מתנות',           priority: 9  },
    { slug: 'מגילות',          displayName: 'מגילות',          priority: 10 },
    { slug: 'ספרי תורה',       displayName: 'ספרי תורה',       priority: 11 },
    { slug: 'פסח',             displayName: 'פסח',             priority: 12 },
    { slug: 'חנוכה',           displayName: 'חנוכה',           priority: 13 },
    { slug: 'שבתות וחגים',    displayName: 'שבתות וחגים',    priority: 14 },
    { slug: 'נטלות וכלים',    displayName: 'נטלות וכלים',    priority: 15 },
    { slug: 'תיקי טלית ותפילין', displayName: 'תיקי טלית ותפילין', priority: 16 },
    { slug: 'טליתות וציציות', displayName: 'טליתות וציציות', priority: 17 },
    { slug: 'כיפות',           displayName: 'כיפות',           priority: 18 },
  ];

  async function loadCategories() {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      // Track all existing slugs using BOTH the doc ID AND the slug/name fields
      // so old auto-ID docs don't cause phantom re-creation of named docs.
      const existingSlugs = new Set<string>();
      // Best imageUrl per slug (from any existing doc) — inherited when seeding new docs.
      const slugToImg = new Map<string, string>();
      const data: Category[] = [];

      snap.forEach(d => {
        const r    = d.data();
        const slug = (d.id || r.slug || r.name || '') as string;
        existingSlugs.add(d.id);
        if (r.slug) existingSlugs.add(r.slug as string);
        if (r.name) existingSlugs.add(r.name as string);

        const img = (r.imageUrl || r.imgUrl || '') as string;
        const effectiveSlug = (r.slug || r.name || d.id) as string;
        if (img && effectiveSlug && !slugToImg.get(effectiveSlug)) {
          slugToImg.set(effectiveSlug, img);
        }

        data.push({
          id: d.id, slug,
          displayName: r.displayName || r.name || '',
          imageUrl: img,
          priority: r.priority ?? r.order ?? 0,
          name: r.name, imgUrl: r.imgUrl, sub: r.sub, order: r.order,
        });
      });

      await Promise.all(
        REQUIRED_CATS
          .filter(c => !existingSlugs.has(c.slug))
          .map(c => {
            const img = slugToImg.get(c.slug);
            return setDoc(doc(db, 'categories', c.slug), {
              slug: c.slug, displayName: c.displayName, priority: c.priority,
              ...(img ? { imageUrl: img } : {}),
            }, { merge: true });
          })
      );

      if (REQUIRED_CATS.some(c => !existingSlugs.has(c.slug))) {
        const fresh = await getDocs(collection(db, 'categories'));
        data.length = 0;
        fresh.forEach(d => {
          const r = d.data();
          data.push({
            id: d.id, slug: (d.id || r.slug || r.name || '') as string,
            displayName: r.displayName || r.name || '',
            imageUrl: r.imageUrl || r.imgUrl || '',
            priority: r.priority ?? r.order ?? 0,
            name: r.name, imgUrl: r.imgUrl, sub: r.sub, order: r.order,
          });
        });
      }
      data.sort((a, b) => a.priority - b.priority);
      setCategories(data);
    } catch (e) { console.error(e); }
  }

  async function loadOutOfStockProducts() {
    setOutOfStockLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'products'), where('outOfStock', '==', true)));
      const data: Product[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
      setOutOfStockProducts(data);
    } catch { /* non-fatal */ } finally { setOutOfStockLoading(false); }
  }

  async function loadCoupons() {
    setCouponsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc')));
      const data: Coupon[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Coupon));
      setCoupons(data);
    } catch (e) { console.error(e); }
    finally { setCouponsLoading(false); }
  }

  async function toggleCoupon(id: string, active: boolean) {
    await updateDoc(doc(db, 'coupons', id), { active: !active });
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c));
  }

  async function deleteCoupon(id: string) {
    await deleteDoc(doc(db, 'coupons', id));
    setCoupons(prev => prev.filter(c => c.id !== id));
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

  async function saveCategory(catId: string, data: { displayName: string; imageUrl: string; priority: number }) {
    setCatSaving(catId);
    try {
      console.log('[saveCategory] writing:', catId, data);
      await updateDoc(doc(db, 'categories', catId), data);
      setCategories(prev =>
        prev.map(c => c.id === catId ? { ...c, ...data } : c)
            .sort((a, b) => a.priority - b.priority)
      );
      setCatSaved(catId);
      setTimeout(() => setCatSaved(null), 2500);
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    finally { setCatSaving(null); }
  }

  async function toggleSoferStatus(soferId: string, currentStatus: string | undefined) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setActionLoading(soferId + '_status');
    try {
      await updateDoc(doc(db, 'soferim', soferId), { status: newStatus });
      setSoferimFull(prev => prev.map(s => s.id === soferId ? { ...s, status: newStatus } : s));
    } catch (e) { console.error(e); alert('שגיאה בעדכון סטטוס'); }
    finally { setActionLoading(null); }
  }

  async function deleteSofer(soferId: string) {
    try {
      await deleteDoc(doc(db, 'soferim', soferId));
      setSoferimFull(prev => prev.filter(s => s.id !== soferId));
      setSoferim(prev => prev.filter(s => s.id !== soferId));
      setDeleteConfirm(null);
    } catch (e) { console.error(e); alert('שגיאה במחיקה'); }
  }

  async function assignSoferToProduct(productId: string, soferId: string) {
    setActionLoading(productId);
    try {
      await updateDoc(doc(db, 'products', productId), { soferId: soferId || null });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, soferId: soferId || undefined } : p));
    } catch (e) { console.error(e); alert('שגיאה בשיוך סופר'); }
    finally { setActionLoading(null); }
  }

  async function approvePendingProduct(productId: string) {
    setActionLoading(productId + '_status');
    try {
      await updateDoc(doc(db, 'products', productId), { status: 'active' });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'active' } : p));
    } catch (e) { console.error(e); alert('שגיאה באישור מוצר'); }
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

  async function deleteProduct(productId: string) {
    try {
      const _auth = await getAuthLazy();
      const idToken = await _auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('לא מחובר');

      const res = await fetch('/api/admin/product-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error ?? res.statusText);
      }

      setProducts(prev => prev.filter(p => p.id !== productId));
      setProductDeleteConfirm(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[deleteProduct] failed:', e);
      alert('שגיאה במחיקה: ' + msg);
    }
  }

  async function duplicateProduct(product: Product) {
    try {
      const { id, ...rest } = product;
      const newData = { ...rest, name: `${product.name} — עותק`, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'products'), newData);
      const newProduct: Product = { ...rest, id: ref.id, name: newData.name };
      setProducts(prev => [newProduct, ...prev]);
      alert(`המוצר שוכפל בהצלחה: "${newData.name}"`);
    } catch (e) { console.error(e); alert('שגיאה בשכפול'); }
  }

  async function toggleHidden(productId: string, currentHidden: boolean) {
    setActionLoading(productId + '_hidden');
    const newHidden = !currentHidden;
    try {
      await updateDoc(doc(db, 'products', productId), { hidden: newHidden });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, hidden: newHidden } : p));
    } catch (e) { console.error(e); alert('שגיאה בעדכון'); }
    finally { setActionLoading(null); }
  }

  async function toggleBestSeller(productId: string, current: boolean) {
    setActionLoading(productId + '_bs');
    const next = !current;
    try {
      await updateDoc(doc(db, 'products', productId), { isBestSeller: next });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isBestSeller: next } : p));
    } catch (e) { console.error(e); alert('שגיאה בעדכון'); }
    finally { setActionLoading(null); }
  }

  function updatePriorityDebounced(productId: string, value: number) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, priority: value } : p));
    if (priorityTimers.current[productId]) clearTimeout(priorityTimers.current[productId]);
    priorityTimers.current[productId] = setTimeout(async () => {
      setPriorityUpdating(productId);
      try { await updateDoc(doc(db, 'products', productId), { priority: value }); }
      catch (e) { console.error(e); }
      finally { setPriorityUpdating(null); }
    }, 300);
  }

  async function changeUserRole(userId: string, newRole: UserRole) {
    setActionLoading(userId);
    try {
      const _auth = await getAuthLazy();
      const idToken = await _auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('Not authenticated');
      const res = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e: any) { console.error(e); alert('שגיאה בעדכון תפקיד: ' + (e?.message ?? '')); }
    finally { setActionLoading(null); }
  }

  async function approveApplication(app: SoferApplication) {
    setActionLoading(app.id);
    try {
      await updateDoc(doc(db, 'soferim_applications', app.id), { status: 'approved', approvedAt: serverTimestamp() });
      const soferRef = await addDoc(collection(db, 'soferim'), {
        name: app.name, city: app.city, phone: app.phone,
        whatsapp: app.whatsapp || '', email: app.email || '',
        description: app.description || '', style: app.style || '',
        categories: app.categories, imageUrl: app.imageUrl || '',
        writingSamples: app.writingSamples || [],
        taxStatus: app.taxStatus || null,
        status: 'active', createdAt: serverTimestamp(),
      });
      // Store soferId in the application so AuthContext can link on first login
      await updateDoc(doc(db, 'soferim_applications', app.id), { soferId: soferRef.id });
      // Create a product document for each submitted product
      if (app.products?.length) {
        await Promise.all(app.products.map((p: ProductEntry) =>
          addDoc(collection(db, 'products'), {
            name: p.name,
            description: p.desc,
            category: TYPE_TO_CAT[p.type] ?? p.type,
            cat: TYPE_TO_CAT[p.type] ?? p.type,
            level: p.level,
            soferId: soferRef.id,
            soferName: app.name,
            price: p.soferPrice ? Math.round(Number(p.soferPrice) * 1.15 * 1.18) : 0,
            soferBasePrice: p.soferPrice ? Number(p.soferPrice) : 0,
            uploadedBySofer: true,
            imgUrl: p.images?.[0] ?? '',
            image_url: p.images?.[0] ?? '',
            images: p.images ?? [],
            nusach: p.nusach,
            size: p.size,
            deliveryDays: p.days,
            days: p.days,
            priority: 0,
            status: 'active',
            createdAt: serverTimestamp(),
          })
        ));
      }
      if (app.email) {
        const normalizedEmail = app.email.trim().toLowerCase();

        // Create (or verify) Firebase Auth account via Admin SDK
        try {
          const _auth = await getAuthLazy();
          const idToken = await _auth.currentUser?.getIdToken(true);
          if (idToken) {
            await fetch('/api/admin/create-sofer-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ email: normalizedEmail, displayName: app.name, soferId: soferRef.id }),
            });
          }
        } catch (authErr) {
          console.error('create-sofer-auth failed (non-fatal):', authErr);
        }

        const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
        if (!usersSnap.empty) {
          await updateDoc(usersSnap.docs[0].ref, {
            role: 'sofer',
            soferId: soferRef.id,
            taxStatus: app.taxStatus || null,
          });
          setUsers(prev => prev.map(u => u.id === usersSnap.docs[0].id ? { ...u, role: 'sofer', soferId: soferRef.id } : u));
        } else {
          // No users doc yet — create one so role='sofer' is set when they first log in
          const newUserRef = doc(collection(db, 'users'));
          await setDoc(newUserRef, {
            email: normalizedEmail,
            displayName: app.name,
            role: 'sofer' as UserRole,
            soferId: soferRef.id,
            taxStatus: app.taxStatus || null,
            status: 'active',
            neverLoggedIn: true,
            createdAt: serverTimestamp(),
          });
          const newUser: AppUser = { id: newUserRef.id, email: normalizedEmail, displayName: app.name, role: 'sofer', soferId: soferRef.id, status: 'active', neverLoggedIn: true };
          setUsers(prev => [...prev, newUser]);
        }
      }
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
      loadSoferim(); loadSoferimFull();
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

  async function createProductsForApprovedApp(app: SoferApplication) {
    if (!app.products?.length) { alert('אין מוצרים בבקשה זו'); return; }
    setActionLoading(app.id + '_products');
    try {
      let soferId = '';
      let soferName = app.name;
      if (app.email) {
        const soferSnap = await getDocs(query(collection(db, 'soferim'), where('email', '==', app.email.trim().toLowerCase())));
        if (!soferSnap.empty) { soferId = soferSnap.docs[0].id; soferName = soferSnap.docs[0].data().name || app.name; }
      }
      const refs = await Promise.all(app.products.map((p: ProductEntry) =>
        addDoc(collection(db, 'products'), {
          name: p.name,
          description: p.desc,
          category: TYPE_TO_CAT[p.type] ?? p.type,
          cat: TYPE_TO_CAT[p.type] ?? p.type,
          level: p.level,
          soferId: soferId || null,
          soferName,
          price: p.soferPrice ? Math.round(Number(p.soferPrice) * 1.15 * 1.18) : 0,
          soferBasePrice: p.soferPrice ? Number(p.soferPrice) : 0,
          uploadedBySofer: true,
          imgUrl: p.images?.[0] ?? '',
          image_url: p.images?.[0] ?? '',
          images: p.images ?? [],
          nusach: p.nusach,
          size: p.size,
          deliveryDays: p.days,
          days: p.days,
          priority: 0,
          status: 'active',
          createdAt: serverTimestamp(),
        })
      ));
      const links = refs.map((ref, i) => ({ id: ref.id, name: app.products![i].name || `מוצר ${i + 1}` }));
      setCreatedProductLinks(prev => ({ ...prev, [app.id]: links }));
    } catch (e) { console.error(e); alert('שגיאה ביצירת מוצרים'); }
    finally { setActionLoading(null); }
  }

  async function loadTestimonials() {
    try {
      const snap = await getDocs(query(collection(db, 'testimonials'), orderBy('createdAt', 'desc')));
      setTestimonials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial)));
    } catch (e) { console.error(e); }
    finally { setTestimonialsLoading(false); }
  }

  async function loadEditRequests() {
    try {
      const snap = await getDocs(query(collection(db, 'sofer_edit_requests'), orderBy('createdAt', 'desc')));
      setEditRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as SoferEditRequest)));
    } catch (e) { console.error(e); }
    finally { setEditRequestsLoading(false); }
  }

  async function approveEditRequest(req: SoferEditRequest) {
    setActionLoading(req.id);
    const soferDocId = req.soferDocId ?? req.soferId;
    try {
      await updateDoc(doc(db, 'soferim', soferDocId), req.changes);
      await updateDoc(doc(db, 'sofer_edit_requests', req.id), { status: 'approved', approvedAt: serverTimestamp() });
      setEditRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
      loadSoferimFull();
    } catch (e) { console.error(e); alert('שגיאה באישור'); }
    finally { setActionLoading(null); }
  }

  async function rejectEditRequest(req: SoferEditRequest, note: string) {
    setActionLoading(req.id + '_reject');
    try {
      await updateDoc(doc(db, 'sofer_edit_requests', req.id), {
        status: 'rejected', rejectedAt: serverTimestamp(), adminNote: note,
      });
      setEditRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected', adminNote: note } : r));
    } catch (e) { console.error(e); alert('שגיאה בדחייה'); }
    finally { setActionLoading(null); }
  }

  async function uploadTestimonialImg(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'yoursofer_upload');
    const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.secure_url) throw new Error('שגיאה בהעלאה');
    return data.secure_url;
  }

  async function addTestimonial() {
    if (!testForm.name || !testForm.text) { alert('שם וטקסט ביקורת הם שדות חובה'); return; }
    setTestSaving(true);
    try {
      const ref = await addDoc(collection(db, 'testimonials'), { ...testForm, active: true, createdAt: serverTimestamp() });
      setTestimonials(prev => [{ id: ref.id, ...testForm, active: true }, ...prev]);
      setTestForm({ name: '', city: '', text: '', rating: 5, imageUrl: '' });
    } catch (e) { console.error(e); alert('שגיאה בשמירה'); }
    finally { setTestSaving(false); }
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('למחוק ביקורת זו?')) return;
    await deleteDoc(doc(db, 'testimonials', id));
    setTestimonials(prev => prev.filter(t => t.id !== id));
  }

  async function toggleTestimonialActive(id: string, current: boolean) {
    await updateDoc(doc(db, 'testimonials', id), { active: !current });
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, active: !current } : t));
  }

  function exportToExcel() {
    const rows = [
      ['id', 'name', 'cat', 'price', 'was', 'desc', 'badge', 'days', 'imgUrl', 'imgUrl2', 'imgUrl3', 'soferId'],
      ...products.map(p => [
        p.id, p.name, p.cat || '', p.price,
        (p as any).was || '', (p as any).desc || '',
        (p as any).badge || '', (p as any).days || '7-10',
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

  function downloadTemplate() {
    const headers = ['id', 'name', 'cat', 'price', 'was', 'desc', 'badge', 'days', 'imgUrl', 'imgUrl2', 'imgUrl3', 'soferId'];
    const example = ['', 'בית מזוזה כסף 10 ס"מ', 'בתי מזוזה', '89.90', '', 'תיאור המוצר כאן', 'חדש', '7-10', 'https://example.com/image.jpg', '', '', ''];
    const csv = [headers.join(','), example.map(v => `"${v}"`).join(',')].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'products_template.csv';
    a.click();
  }

  async function importFromCSV(file: File) {
    setImportStatus('⏳ מייבא מוצרים...');
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(r => r.trim() && !r.trim().startsWith('#'));
      const firstLine = lines[0].replace(/^\uFEFF/, '');
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const getIdx = (...names: string[]) => { for (const n of names) { const i = headers.indexOf(n); if (i >= 0) return i; } return -1; };
      const idIdx = getIdx('id'); const nameIdx = getIdx('name', 'שם'); const catIdx = getIdx('cat', 'category', 'קטגוריה');
      const priceIdx = getIdx('price', 'מחיר'); const wasIdx = getIdx('was'); const descIdx = getIdx('desc', 'description');
      const badgeIdx = getIdx('badge'); const daysIdx = getIdx('days'); const imgIdx = getIdx('imgurl', 'image_url');
      const img2Idx = getIdx('imgurl2'); const img3Idx = getIdx('imgurl3'); const soferIdx = getIdx('soferid');
      if (nameIdx === -1) { setImportStatus('❌ לא נמצאה עמודת שם'); return; }
      let added = 0, updated = 0, skipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols: string[] = []; let cur = ''; let inQ = false;
        for (const ch of lines[i]) { if (ch === '"') { inQ = !inQ; } else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; } else cur += ch; }
        cols.push(cur.trim());
        const get = (idx: number) => idx >= 0 ? (cols[idx] || '').replace(/^"|"$/g, '').trim() : '';
        const name = get(nameIdx); const price = parseFloat(get(priceIdx));
        if (!name || isNaN(price) || price <= 0) { skipped++; continue; }
        const catVal = get(catIdx) || 'כללי';
        const productData: any = { name, cat: catVal, category: catVal, price, status: 'active', priority: 50, isBestSeller: false, badge: null };
        const wasVal = get(wasIdx); if (wasVal) productData.was = parseFloat(wasVal);
        const descVal = get(descIdx); if (descVal) productData.desc = descVal;
        const badgeVal = get(badgeIdx); if (badgeVal) productData.badge = badgeVal;
        const daysVal = get(daysIdx); if (daysVal) productData.days = daysVal;
        const imgVal = get(imgIdx); if (imgVal) productData.imgUrl = imgVal;
        const img2Val = get(img2Idx); if (img2Val) productData.imgUrl2 = img2Val;
        const img3Val = get(img3Idx); if (img3Val) productData.imgUrl3 = img3Val;
        const soferVal = get(soferIdx); if (soferVal) productData.soferId = soferVal;
        const existingId = get(idIdx);
        try {
          if (existingId) { await updateDoc(doc(db, 'products', existingId), productData); updated++; }
          else { productData.createdAt = serverTimestamp(); await addDoc(collection(db, 'products'), productData); added++; }
        } catch (e) { console.error('שגיאה במוצר', name, e); skipped++; }
      }
      setImportStatus(`✅ הושלם! נוספו: ${added} | עודכנו: ${updated} | דולגו: ${skipped}`);
      setTimeout(() => setImportStatus(''), 6000);
      loadProducts();
    } catch (e) { console.error(e); setImportStatus('❌ שגיאה בייבוא'); }
  }

  if (loading || ordersLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-2xl">טוען...</div></div>;
  if (!user || user.role !== 'admin') return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const shaliachOrders = orders.filter(o => o.shaliachName);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const pendingShluchimApps = shluchimApps.filter(a => a.status === 'pending');
  const pendingRabbiRequests = rabbiRequests.filter(r => r.status === 'pending');
  const filteredUsers = roleFilter === 'הכל' ? users : users.filter(u => u.role === roleFilter);
  const visibleProducts = products.filter(p => p.hidden !== true);
  const hiddenProducts  = products.filter(p => p.hidden === true);
  const filteredProducts = visibleProducts.filter(p => !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) || p.sku?.toLowerCase().includes(productSearch.toLowerCase()));
  const unassignedProducts = visibleProducts.filter(p => !p.soferId).length;

  return (
    <main className="max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">👑 דשבורד מנהל</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/analytics')} className="text-blue-600 font-bold hover:underline text-sm">📊 Analytics</button>
          <button onClick={() => router.push('/')} className="text-green-700 font-bold hover:underline">← חזרה לחנות</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center"><div className="text-3xl font-black text-green-700">{formatPrice(totalRevenue)}</div><div className="text-sm text-gray-500 mt-1">סה"כ הכנסות</div></div>
        <div className="bg-white rounded-xl shadow p-4 text-center cursor-pointer" onClick={() => setActiveTab('products')}><div className="text-3xl font-black text-blue-600">{products.length}</div><div className="text-sm text-gray-500 mt-1">מוצרים</div></div>
        <div className="bg-white rounded-xl shadow p-4 text-center"><div className="text-3xl font-black text-purple-600">{users.length}</div><div className="text-sm text-gray-500 mt-1">משתמשים</div></div>
        <div className="bg-white rounded-xl shadow p-4 text-center"><div className="text-3xl font-black text-orange-500">{pendingApps.length}</div><div className="text-sm text-gray-500 mt-1">בקשות סופרים</div></div>
        <div className="bg-white rounded-xl shadow p-4 text-center"><div className="text-3xl font-black text-blue-500">{pendingShluchimApps.length}</div><div className="text-sm text-gray-500 mt-1">בקשות שלוחים</div></div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => { setActiveTab('products'); setShowAddProduct(true); }} style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>➕ הוסף מוצר חדש</button>
      </div>

      {/* ── טאבים ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'orders',         label: '📦 הזמנות',           color: 'bg-green-700' },
          { key: 'products',       label: '📜 מוצרים',           color: 'bg-teal-600',   badge: unassignedProducts },
          { key: 'commissions',    label: '🤝 עמלות',            color: 'bg-blue-600' },
          { key: 'soferim_list',   label: '✍️ סופרים',           color: 'bg-amber-700' },
          { key: 'soferim',        label: '📋 בקשות סופרים',     color: 'bg-amber-600',  badge: pendingApps.length },
          { key: 'shluchim',       label: '🟦 בקשות שלוחים',     color: 'bg-blue-700',   badge: pendingShluchimApps.length },
          { key: 'rabbi_requests', label: '🏪 חנויות סופרים',    color: 'bg-green-800',  badge: pendingRabbiRequests.length },
          { key: 'users',          label: '👥 משתמשים',          color: 'bg-purple-600' },
          { key: 'content',        label: '✏️ תוכן',             color: 'bg-pink-600' },
          { key: 'categories',     label: '🖼️ קטגוריות',        color: 'bg-indigo-600' },
          { key: 'reviews',        label: '⭐ ביקורות',          color: 'bg-yellow-600', badge: reviews.filter(r => !r.approved).length },
          { key: 'testimonials',   label: '💬 עדויות לקוחות',   color: 'bg-rose-600' },
          { key: 'homepage',       label: '🏠 דף הבית',          color: 'bg-slate-700' },
          { key: 'edit_requests',  label: '✏️ בקשות עריכה',     color: 'bg-emerald-700', badge: editRequests.filter(r => r.status === 'pending').length },
          { key: 'hidden_products',label: '👁️ מוסתרים',         color: 'bg-gray-600',   badge: hiddenProducts.length },
          { key: 'theme_editor',   label: '🎨 עורך עיצוב',      color: 'bg-violet-600' },
          { key: 'curations',      label: '✨ סלקציות',          color: 'bg-fuchsia-700' },
          { key: 'abandoned_carts', label: '🛒 נטישות עגלה',    color: 'bg-orange-600',  badge: abandonedCarts.length },
          { key: 'customers',      label: '👤 לקוחות',           color: 'bg-cyan-700' },
          { key: 'leads',          label: '📋 לידים',            color: 'bg-lime-700',   badge: leads.length },
          { key: 'emails',         label: '📧 מיילים',           color: 'bg-sky-700' },
          { key: 'coupons',        label: '🏷️ קופונים',          color: 'bg-rose-700' },
          { key: 'out_of_stock',   label: '🔴 אזל מלאי',         color: 'bg-red-700',    badge: outOfStockProducts.length },
          { key: 'gifts',          label: '🎁 מתנות VIP',         color: 'bg-pink-600' },
          { key: 'inventory',      label: '📦 מלאי',               color: 'bg-teal-600' },
          { key: 'prints',         label: '🖨️ הדפסות',             color: 'bg-amber-600' },
          { key: 'stickers',       label: '🏷️ מדבקות QR',          color: 'bg-indigo-600' },
          { key: 'profitability',  label: '📊 רווחיות',             color: 'bg-emerald-700' },
          { key: 'promotions',     label: '🏷️ מבצעים',              color: 'bg-orange-500' },
          { key: 'site_settings',  label: '⚙️ הגדרות אתר',          color: 'bg-slate-600' },
          { key: 'best_sellers',   label: '🏆 נמכרים ביותר',         color: 'bg-amber-500' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as TabType)}
            className={`px-4 py-2 rounded-xl font-bold transition relative ${activeTab === t.key ? `${t.color} text-white` : 'bg-white text-gray-600'}`}>
            {t.label}
            {(t as any).badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{(t as any).badge}</span>}
          </button>
        ))}
        <a href="/admin/klafim" className="px-4 py-2 rounded-xl font-bold transition bg-white text-gray-600 hover:bg-amber-700 hover:text-white" style={{ textDecoration: 'none' }}>
          📜 ניהול קלפים
        </a>
      </div>

      {/* ── תוכן טאבים ── */}

      {activeTab === 'theme_editor' && (
        <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <iframe
            src="/admin/theme-editor"
            className="w-full h-full border-0"
            title="עורך עיצוב"
          />
        </div>
      )}

      {activeTab === 'products' && (
        <div>
          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="חיפוש לפי שם או SKU..." className="border border-gray-200 rounded-xl px-4 py-2 text-sm w-full" />
              {productSearch && <button onClick={() => setProductSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
            </div>
            <span className="text-sm text-gray-500">{filteredProducts.length} מוצרים</span>
            {unassignedProducts > 0 && <span className="text-sm text-red-500 font-bold">{unassignedProducts} ללא סופר</span>}
            <button onClick={() => setShowAddProduct(true)} style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>➕ הוסף מוצר</button>
            <button onClick={exportToExcel} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📥 ייצוא ל-Excel</button>
            <button onClick={downloadTemplate} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 הורד תבנית</button>
            <label style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📤 ייבוא CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) { importFromCSV(e.target.files[0]); e.target.value = ''; } }} />
            </label>
          </div>
          {importStatus && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: importStatus.startsWith('✅') ? '#f0fdf4' : importStatus.startsWith('❌') ? '#fef2f2' : '#eff6ff', color: importStatus.startsWith('✅') ? '#15803d' : importStatus.startsWith('❌') ? '#dc2626' : '#1d4ed8' }}>{importStatus}</div>}
          {productsLoading ? <div className="p-10 text-center text-gray-400">טוען מוצרים...</div> : (
            <>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-3 text-right">מוצר</th><th className="p-3 text-right">קטגוריה</th><th className="p-3 text-right">מחיר</th><th className="p-3 text-right">מחסן</th><th className="p-3 text-right">סטטוס</th><th className="p-3 text-right">שיוך לסופר</th><th className="p-3 text-right">עדיפות</th><th className="p-3 text-right">נמכר ביותר</th><th className="p-3 text-right">הסתרה</th><th className="p-3 text-right">עריכה</th><th className="p-3 text-right">מחיקה</th></tr></thead>
                <tbody>
                  {filteredProducts.length === 0 ? <tr><td colSpan={8} className="p-10 text-center text-gray-400">אין מוצרים</td></tr>
                  : filteredProducts.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3"><div className="flex items-center gap-2">{(p.imgUrl || p.image_url) && <img src={p.imgUrl || p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" onError={e => (e.currentTarget.style.display = 'none')} />}<span className="font-bold text-xs">{p.name}</span></div></td>
                      <td className="p-3 text-gray-500 text-xs">{p.cat || p.category || '-'}</td>
                      <td className="p-3 font-bold text-green-700">{formatPrice(p.price)}</td>
                      <td className="p-3 text-xs font-mono text-green-700">
                        {p.storageColumn && p.storageShelf ? `${p.storageColumn}${p.storageShelf}` : (p.storageColumn || p.storageShelf ? `${p.storageColumn ?? ''}${p.storageShelf ?? ''}` : <span className="text-gray-300">—</span>)}
                      </td>
                      <td className="p-3">
                        {p.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">⏳ ממתין לאישור</span>
                            <button onClick={() => approvePendingProduct(p.id)} disabled={actionLoading === p.id + '_status'} className="px-2 py-1 rounded-full text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">אשר</button>
                          </div>
                        ) : (
                          <button onClick={() => toggleProductStatus(p.id, p.status || 'active')} disabled={actionLoading === p.id + '_status'} className={`px-2 py-1 rounded-full text-xs font-bold transition ${p.status === 'inactive' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{p.status === 'inactive' ? '● לא פעיל' : '● פעיל'}</button>
                        )}
                      </td>
                      <td className="p-3"><select value={p.soferId || ''} disabled={actionLoading === p.id} onChange={e => assignSoferToProduct(p.id, e.target.value)} className={`border rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer ${!p.soferId ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-700'}`}><option value="">⚠️ ללא סופר</option>{soferim.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></td>
                      <td className="p-3">
                        <input type="number" min={1} max={99} value={p.priority ?? 50}
                          onChange={e => updatePriorityDebounced(p.id, Number(e.target.value))}
                          className={`w-14 border rounded-lg px-2 py-1 text-xs text-center font-bold ${priorityUpdating === p.id ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} />
                      </td>
                      <td className="p-3">
                        <button onClick={() => toggleBestSeller(p.id, p.isBestSeller ?? false)} disabled={actionLoading === p.id + '_bs'}
                          className={`px-2 py-1 rounded-full text-xs font-bold transition ${p.isBestSeller ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {p.isBestSeller ? '🏆 כן' : '— לא'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => toggleHidden(p.id, p.hidden ?? false)} disabled={actionLoading === p.id + '_hidden'}
                          className={`px-2 py-1 rounded-full text-xs font-bold transition ${p.hidden ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {p.hidden ? '👁️ הצג' : '🙈 הסתר'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => duplicateProduct(p)} className="px-2 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100">📋 שכפל</button>
                      </td>
                      <td className="p-3">
                        <button onClick={() => setEditingProduct(p)} className="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100">✏️ ערוך</button>
                      </td>
                      <td className="p-3">
                        {productDeleteConfirm === p.id ? (
                          <span className="flex gap-1">
                            <button onClick={() => deleteProduct(p.id)} className="px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white hover:bg-red-700">אשר</button>
                            <button onClick={() => setProductDeleteConfirm(null)} className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">ביטול</button>
                          </span>
                        ) : (
                          <button onClick={() => setProductDeleteConfirm(p.id)} className="px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100">🗑️ מחק</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end mt-4 px-1">
              <span className="text-sm text-gray-500">
                {productSearch ? `${filteredProducts.length} תוצאות מסוננות` : `${products.length} מוצרים`}
              </span>
            </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-black mb-1">🖼️ ניהול קטגוריות</h2>
            <p className="text-sm text-gray-500 mb-6">
              ערוך שם תצוגה, העלה תמונה (Cloudinary) וקבע עדיפות לכל קטגוריה.<br/>
              <span className="font-mono text-xs text-gray-400">slug</span> = מזהה הקטגוריה - לא ניתן לשינוי מכאן.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {categories.map(cat => (
                <CategoryCard key={cat.id} cat={cat} saving={catSaving === cat.id} saved={catSaved === cat.id} onSave={data => saveCategory(cat.id, data)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-black mb-6 text-gray-800">✏️ עריכת תוכן דף הבית</h2>
          <div className="grid gap-6">
            <div className="border border-gray-100 rounded-xl p-5 bg-gray-50">
              <h3 className="font-bold text-gray-700 mb-4">🏠 אזור Hero</h3>
              <div className="grid gap-4">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">כותרת ראשית</label><input value={content.heroTitle} onChange={e => setContent(prev => ({ ...prev, heroTitle: e.target.value }))} placeholder='רכישת סת"מ' className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">כותרת משנה</label><input value={content.heroSubtitle} onChange={e => setContent(prev => ({ ...prev, heroSubtitle: e.target.value }))} placeholder="ישירות מהסופר" className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">טקסט תיאור</label><textarea value={content.heroText} onChange={e => setContent(prev => ({ ...prev, heroText: e.target.value }))} rows={3} className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm resize-none" /></div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={saveContent} disabled={contentSaving} className="bg-green-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50">{contentSaving ? '⏳ שומר...' : '💾 שמור שינויים'}</button>
              {contentSaved && <span className="text-green-600 font-bold text-sm">✅ נשמר!</span>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <OrdersTab orders={orders} setOrders={setOrders} ordersError={ordersError} />
      )}

      {activeTab === 'commissions' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {shaliachOrders.length === 0 ? <div className="p-10 text-center text-gray-400">אין הזמנות שליחים עדיין</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr><th className="p-3 text-right">מספר הזמנה</th><th className="p-3 text-right">שליח</th><th className="p-3 text-right">סכום</th><th className="p-3 text-right">אחוז</th><th className="p-3 text-right">עמלה</th></tr></thead>
              <tbody>{shaliachOrders.map(o => <tr key={o.id} className="border-t hover:bg-gray-50"><td className="p-3 font-mono text-xs">{o.orderNumber}</td><td className="p-3 font-bold text-blue-600">{o.shaliachName}</td><td className="p-3">{formatPrice(o.total)}</td><td className="p-3">{(o as any).commissionPercent}%</td><td className="p-3 font-bold text-orange-500">{o.commissionAmount != null ? formatPrice(o.commissionAmount) : '-'}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'soferim_list' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black">✍️ סופרים פעילים ({soferimFull.length})</h2>
            <button onClick={() => setShowAddSofer(true)} style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>➕ הוסף סופר</button>
          </div>
          {soferimLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : soferimFull.length === 0 ? <div className="p-10 text-center text-gray-400">אין סופרים עדיין</div>
          : (
            <div className="grid gap-4">
              {soferimFull.map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">{s.imageUrl ? <img src={s.imageUrl} alt={s.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-200" /> : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">✍️</div>}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{s.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status === 'active' ? '✅ פעיל' : '⏸️ לא פעיל'}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                        {s.city && <span>📍 {s.city}</span>}{s.phone && <span>📞 {s.phone}</span>}{s.email && <span>✉️ {s.email}</span>}{s.style && <span>✍️ {s.style}</span>}
                      </div>
                      {s.categories && s.categories.length > 0 && <div className="flex gap-2 flex-wrap">{s.categories.map((cat: string) => <span key={cat} className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{cat}</span>)}</div>}
                      {s.writingSamples && s.writingSamples.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-bold text-gray-500 mb-1">🖊️ דוגמאות כתיבה</p>
                          <div className="flex gap-2 flex-wrap">
                            {s.writingSamples.map((sample, i) => {
                              const url = typeof sample === 'string' ? sample : (sample as WritingSample).url;
                              return <img key={i} src={url} alt={`דוגמת כתיבה ${i + 1}`} onClick={() => setLightboxImage(url)} className="w-16 h-16 object-cover rounded-lg border border-amber-200 cursor-zoom-in hover:opacity-80 transition-opacity" />;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => router.push(`/soferim/${s.id}`)} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-700">📜 פרופיל</button>
                      <button onClick={() => setEditingSofer(s)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">✏️ ערוך</button>
                      <button onClick={() => toggleSoferStatus(s.id, s.status)} disabled={actionLoading === s.id + '_status'}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${s.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {actionLoading === s.id + '_status' ? '...' : s.status === 'active' ? '● פעיל' : '● לא פעיל'}
                      </button>
                      <button onClick={() => setDeleteConfirm(s.id)} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200">🗑️ מחק</button>
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
          {/* ── Pending Products from Soferim ── */}
          {(() => {
            const pending = products.filter(p => p.status === 'pending');
            if (productsLoading) return null;
            return pending.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-xl font-black mb-4">📦 מוצרים ממתינים לאישור ({pending.length})</h2>
                <div className="grid gap-4">
                  {pending.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow p-4 flex gap-4 items-start">
                      {p.imgUrl && <img src={p.imgUrl} alt={p.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-base mb-1 truncate">{p.name}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                          {p.soferName && <span>✍️ {p.soferName}</span>}
                          <span>📁 {p.cat || p.category || '—'}</span>
                          {p.soferPrice != null && <span>💰 מחיר סופר: {formatPrice(p.soferPrice)}</span>}
                          <span>🏷 מחיר ללקוח: {formatPrice(p.price)}</span>
                          {p.createdAt && <span>📅 {new Date(p.createdAt.seconds * 1000).toLocaleDateString('he-IL')}</span>}
                        </div>
                        {p.desc && <p className="text-xs text-gray-400 line-clamp-2">{p.desc}</p>}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => window.open(`/product/${p.id}`, '_blank')} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 whitespace-nowrap">
                          👁 תצוגה
                        </button>
                        <button
                          onClick={async () => {
                            setActionLoading(p.id + '_approve');
                            try { await updateDoc(doc(db, 'products', p.id), { status: 'active' }); setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'active' } : x)); }
                            catch { alert('שגיאה'); } finally { setActionLoading(null); }
                          }}
                          disabled={actionLoading === p.id + '_approve'}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {actionLoading === p.id + '_approve' ? '...' : '✅ אשר'}
                        </button>
                        <button
                          onClick={async () => {
                            setActionLoading(p.id + '_reject');
                            try { await updateDoc(doc(db, 'products', p.id), { status: 'rejected' }); setProducts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'rejected' } : x)); }
                            catch { alert('שגיאה'); } finally { setActionLoading(null); }
                          }}
                          disabled={actionLoading === p.id + '_reject'}
                          className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 disabled:opacity-50 whitespace-nowrap"
                        >
                          {actionLoading === p.id + '_reject' ? '...' : '❌ דחה'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="my-6 border-gray-200" />
              </div>
            ) : null;
          })()}

          {/* ── Sofer Applications ── */}
          {appsLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : applications.length === 0 ? <div className="p-10 text-center text-gray-400">אין בקשות עדיין</div>
          : (
            <div className="grid gap-4">
              {applications.map(app => (
                <div key={app.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0">{app.imageUrl ? <img src={app.imageUrl} alt={app.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" /> : <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">✍️</div>}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{app.status === 'pending' ? '⏳ ממתין' : app.status === 'approved' ? '✅ מאושר' : '❌ נדחה'}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">{app.city && <span>📍 {app.city}</span>}{app.phone && <span>📞 {app.phone}</span>}{app.email && <span>✉️ {app.email}</span>}{app.style && <span>✍️ {app.style}</span>}</div>
                      {app.categories?.length > 0 && <div className="flex gap-2 flex-wrap mb-3">{app.categories.map(cat => <span key={cat} className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{cat}</span>)}</div>}
                      {app.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{app.description}</p>}
                      {app.writingSamples && app.writingSamples.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-bold text-gray-500 mb-1">🖊️ דוגמאות כתיבה</p>
                          <div className="flex gap-2 flex-wrap">
                            {app.writingSamples.map((url, i) => (
                              <img key={i} src={url} alt={`דוגמת כתיבה ${i + 1}`} onClick={() => setLightboxImage(url)} className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* taxStatus */}
                      {app.taxStatus && (
                        <div className="mt-2">
                          <span className="text-xs font-bold text-gray-500">🧾 סטטוס עוסק: </span>
                          <span className="text-xs font-bold text-amber-700">
                            {app.taxStatus === 'osek_patur' ? 'עוסק פטור' : app.taxStatus === 'osek_morsheh' ? 'עוסק מורשה' : app.taxStatus === 'no_osek' ? 'ללא עוסק' : app.taxStatus === 'salary' ? 'תלוש שכר' : app.taxStatus}
                          </span>
                        </div>
                      )}

                      {/* Collapsible products section */}
                      {app.products && app.products.length > 0 && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setExpandedProducts(prev => {
                              const next = new Set(prev);
                              next.has(app.id) ? next.delete(app.id) : next.add(app.id);
                              return next;
                            })}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition"
                          >
                            🛍️ מוצרים שהוגשו ({app.products.length})
                            <span>{expandedProducts.has(app.id) ? '▲' : '▼'}</span>
                          </button>

                          {expandedProducts.has(app.id) && (
                            <div className="mt-3 grid gap-3">
                              {app.products.map((p, pi) => (
                                <div key={pi} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-black text-sm text-gray-900">{p.name || `מוצר ${pi + 1}`}</span>
                                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">{p.type}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                                    {p.level && <span>✡️ {p.level}</span>}
                                    {p.nusach && <span>📜 {p.nusach}</span>}
                                    {p.size && <span>📐 {p.size}</span>}
                                    {p.days && <span>🕐 {p.days} ימי עסקים</span>}
                                    {p.soferPrice && <span className="font-bold text-green-700">💰 ₪{p.soferPrice} (מחיר סופר)</span>}
                                  </div>
                                  {p.desc && <p className="text-xs text-gray-500 mb-2 leading-relaxed">{p.desc}</p>}
                                  {p.images && p.images.length > 0 && (
                                    <div className="flex gap-2 flex-wrap">
                                      {p.images.slice(0, 4).map((url, ii) => (
                                        <img key={ii} src={url} alt={`תמונה ${ii + 1}`} onClick={() => setLightboxImage(url)} className="w-14 h-14 object-cover rounded-lg border border-gray-200 cursor-zoom-in hover:opacity-80 transition-opacity" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => approveApplication(app)} disabled={actionLoading === app.id} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">{actionLoading === app.id ? '...' : '✅ אשר'}</button>
                        <button onClick={() => rejectApplication(app.id)} disabled={actionLoading === app.id} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 disabled:opacity-50">❌ דחה</button>
                      </div>
                    )}
                    {app.status === 'approved' && app.products && app.products.length > 0 && (
                      <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                        {!createdProductLinks[app.id] ? (
                          <button
                            onClick={() => createProductsForApprovedApp(app)}
                            disabled={actionLoading === app.id + '_products'}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            {actionLoading === app.id + '_products' ? '⏳ יוצר...' : '🛍️ צור מוצרים'}
                          </button>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-3 min-w-[180px]">
                            <p className="text-xs font-black text-green-700 mb-2">✅ {createdProductLinks[app.id].length} מוצרים נוצרו:</p>
                            <div className="flex flex-col gap-1">
                              {createdProductLinks[app.id].map(link => (
                                <a
                                  key={link.id}
                                  href={`/product/${link.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-700 font-bold hover:text-indigo-900 hover:underline truncate max-w-[160px]"
                                >
                                  ✏️ {link.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'shluchim' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black">🟦 בקשות שלוחים ({shluchimApps.length})</h2>
            <button onClick={() => setShowAddShliach(true)} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>➕ הוסף שליח ידנית</button>
          </div>
          {shluchimAppsLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : shluchimApps.length === 0 ? <div className="p-10 text-center text-gray-400">אין בקשות עדיין</div>
          : (
            <div className="grid gap-4">
              {shluchimApps.map(app => (
                <div key={app.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0">
                      {app.logoUrl ? <img src={app.logoUrl} alt={app.name} className="w-16 h-16 rounded-full object-cover border-2 border-blue-200" /> : <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl">🟦</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {app.status === 'pending' ? '⏳ ממתין' : app.status === 'approved' ? '✅ מאושר' : '❌ נדחה'}
                        </span>
                      </div>
                      {app.chabadName && <p className="text-sm font-bold text-blue-700 mb-1">{app.chabadName}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                        {app.city && <span>📍 {app.city}</span>}{app.phone && <span>📞 {app.phone}</span>}{app.email && <span>✉️ {app.email}</span>}{app.rabbiName && <span>👤 {app.rabbiName}</span>}
                      </div>
                      {app.createdAt && <p className="text-xs text-gray-400">נשלח: {new Date(app.createdAt.seconds * 1000).toLocaleDateString('he-IL')}</p>}
                      {app.status === 'approved' && app.approvedDocId && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-mono truncate max-w-xs">https://your-sofer.com/?ref={app.approvedDocId}</span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(`https://your-sofer.com/?ref=${app.approvedDocId}`); }}
                            className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-blue-700 transition"
                          >
                            העתק קישור
                          </button>
                        </div>
                      )}
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => approveShluchimApplication(app)} disabled={actionLoading === app.id} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">{actionLoading === app.id ? '...' : '✅ אשר'}</button>
                        <button onClick={() => rejectShluchimApplication(app.id)} disabled={actionLoading === app.id} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 disabled:opacity-50">❌ דחה</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rabbi_requests' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black">🏪 בקשות חנות אישית לסופרים ({rabbiRequests.length})</h2>
          </div>
          {rabbiRequestsLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : rabbiRequests.length === 0 ? <div className="p-10 text-center text-gray-400">אין בקשות עדיין</div>
          : (
            <div className="grid gap-4">
              {rabbiRequests.map(req => (
                <div key={req.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 items-start">
                      {req.logoUrl && (
                        <img src={req.logoUrl} alt="לוגו" className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      )}
                      <div>
                        <div className="text-lg font-black mb-0.5">{req.businessName || req.soferName || '—'}</div>
                        <div className="text-sm font-semibold text-gray-600">{req.soferName} · {req.city}</div>
                        <div className="text-xs text-gray-400">{req.soferEmail}</div>
                        {req.createdAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(req.createdAt.seconds * 1000).toLocaleDateString('he-IL')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {req.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => approveRabbiRequest(req)}
                            disabled={actionLoading === req.id}
                            className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                            style={{ opacity: actionLoading === req.id ? 0.6 : 1, cursor: actionLoading === req.id ? 'not-allowed' : 'pointer' }}>
                            {actionLoading === req.id ? '...' : '✅ אשר'}
                          </button>
                          <button
                            onClick={() => rejectRabbiRequest(req.id)}
                            disabled={actionLoading === req.id}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-sm"
                            style={{ cursor: actionLoading === req.id ? 'not-allowed' : 'pointer' }}>
                            ❌ דחה
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                          {req.status === 'approved' ? '✅ אושר' : '❌ נדחה'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Business + bank details */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm border-t pt-4">
                    <div>
                      <span className="text-gray-400 text-xs block">סוג עוסק</span>
                      <span className="font-semibold">{req.businessType || '—'}</span>
                      {req.businessId && <span className="text-gray-500 text-xs mr-2">({req.businessId})</span>}
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">בנק</span>
                      <span className="font-semibold">{req.bankName || '—'}</span>
                      {req.bankBranch && <span className="text-gray-500 text-xs mr-1">סניף {req.bankBranch}</span>}
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">מספר חשבון</span>
                      <span className="font-semibold font-mono">{req.bankAccount || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">שם בעל החשבון</span>
                      <span className="font-semibold">{req.accountHolder || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['הכל', 'admin', 'sofer', 'shaliach', 'customer'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${roleFilter === r ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>{r === 'הכל' ? 'הכל' : ROLE_LABELS[r as UserRole]}</button>
            ))}
          </div>
          {usersLoading ? <div className="p-10 text-center text-gray-400">טוען...</div>
          : filteredUsers.length === 0 ? <div className="p-10 text-center text-gray-400">אין משתמשים</div>
          : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="p-3 text-right">משתמש</th><th className="p-3 text-right">אימייל</th><th className="p-3 text-right">תפקיד נוכחי</th><th className="p-3 text-right">שנה תפקיד</th><th className="p-3 text-right">קישור הפניה</th><th className="p-3 text-right">חנות</th></tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`border-t hover:bg-gray-50 ${u.neverLoggedIn ? 'bg-yellow-50' : ''}`}>
                      <td className="p-3 font-bold">
                        {u.displayName || '-'}
                        {u.neverLoggedIn && <span className="mr-2 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">לא התחבר עדיין</span>}
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                      <td className="p-3">
                        <select value={u.role} disabled={actionLoading === u.id || !!u.neverLoggedIn} onChange={e => changeUserRole(u.id, e.target.value as UserRole)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <option value="customer">👤 לקוח</option><option value="sofer">✍️ סופר</option><option value="shaliach">🟦 שליח</option><option value="admin">👑 מנהל</option>
                        </select>
                        {actionLoading === u.id && <span className="text-xs text-gray-400 mr-2">שומר...</span>}
                      </td>
                      <td className="p-3">
                        {u.role === 'shaliach' && (
                          u.shaliachId ? (
                            <button onClick={() => { navigator.clipboard.writeText(`https://your-sofer.com/?ref=${u.shaliachId}`); setCopiedUserId(u.id); setTimeout(() => setCopiedUserId(null), 2000); }}
                              title={`https://your-sofer.com/?ref=${u.shaliachId}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                              {copiedUserId === u.id ? '✅ הועתק' : '📋 העתק קישור'}
                            </button>
                          ) : <span className="text-xs text-gray-400">אין מזהה שליח</span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.role === 'sofer' && (
                          <div className="flex flex-col gap-1">
                            {soferUidsWithStore.has(u.id)
                              ? (
                                <>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 w-fit">פעילה ✓</span>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(`https://your-sofer.com/?ref=${u.id}`); setCopiedUserId(u.id); setTimeout(() => setCopiedUserId(null), 2000); }}
                                    title={`https://your-sofer.com/?ref=${u.id}`}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition w-fit"
                                  >
                                    {copiedUserId === u.id ? '✅ הועתק' : '📋 העתק קישור'}
                                  </button>
                                </>
                              ) : u.soferId && soferIdsWithProducts.has(u.soferId)
                                ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 w-fit">פעילה ✓</span>
                                : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 w-fit">לא פתח</span>
                            }
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-black">⭐ ביקורות לקוחות</h2>
            <div className="flex gap-3 text-sm">
              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold">{reviews.filter(r => !r.approved).length} ממתינות לאישור</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">{reviews.filter(r => r.approved).length} מאושרות</span>
            </div>
          </div>
          {reviewsLoading ? <div className="p-10 text-center text-gray-400">טוען ביקורות...</div> : reviews.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין ביקורות עדיין</div>
          ) : (
            <div className="grid gap-4">
              {reviews.map(r => (
                <div key={r.id} style={{ background: r.approved ? '#fff' : '#f9f9f9', border: `1px solid ${r.approved ? '#e8e8e8' : '#ddd'}`, opacity: r.approved ? 1 : 0.7, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>{r.reviewerName}</span>
                        <span style={{ color: '#e6a817', fontSize: 14 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('he-IL') : ''}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: r.approved ? '#dcfce7' : '#fef9c3', color: r.approved ? '#15803d' : '#854d0e' }}>
                          {r.approved ? '✅ מאושרת' : '⏳ ממתינה'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#0e6ba8', marginBottom: 6 }}>📦 {r.productName}</div>
                      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>{r.text}</div>
                      {r.mediaUrl && (
                        <div style={{ marginTop: 8 }}>
                          {r.mediaType === 'video' ? (
                            <video controls style={{ maxHeight: 140, borderRadius: 6, border: '1px solid #eee' }}><source src={r.mediaUrl} /></video>
                          ) : (
                            <img src={r.mediaUrl} alt="מדיה" style={{ maxHeight: 140, borderRadius: 6, border: '1px solid #eee', objectFit: 'cover' }} />
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      {!r.approved && (
                        <button onClick={async () => {
                          await updateDoc(doc(db, 'reviews', r.id), { approved: true });
                          const updatedReviews = reviews.map(x => x.id === r.id ? { ...x, approved: true } : x);
                          setReviews(updatedReviews);
                          const productReviews = updatedReviews.filter(x => x.productId === r.productId && x.approved);
                          const avg = productReviews.reduce((s, x) => s + x.stars, 0) / productReviews.length;
                          await updateDoc(doc(db, 'products', r.productId), { stars: Math.round(avg * 10) / 10, reviews: productReviews.length });
                        }} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          ✅ אשר
                        </button>
                      )}
                      <button onClick={async () => {
                        const newText = prompt('ערוך את טקסט הביקורת:', r.text);
                        if (newText === null) return;
                        await updateDoc(doc(db, 'reviews', r.id), { text: newText });
                        setReviews(reviews.map(x => x.id === r.id ? { ...x, text: newText } : x));
                      }} style={{ background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✏️ ערוך</button>
                      <button onClick={async () => {
                        if (!confirm('למחוק את הביקורת?')) return;
                        const { deleteDoc } = await import('firebase/firestore');
                        await deleteDoc(doc(db, 'reviews', r.id));
                        setReviews(reviews.filter(x => x.id !== r.id));
                      }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🗑️ מחק</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'testimonials' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-black mb-4">➕ הוסף ביקורת</h2>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-500 block mb-1">שם לקוח *</label><input value={testForm.name} onChange={e => setTestForm(p => ({ ...p, name: e.target.value }))} placeholder="ישראל ישראלי" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-xs font-bold text-gray-500 block mb-1">עיר</label><input value={testForm.city} onChange={e => setTestForm(p => ({ ...p, city: e.target.value }))} placeholder="תל אביב" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="text-xs font-bold text-gray-500 block mb-1">טקסט ביקורת *</label><textarea value={testForm.text} onChange={e => setTestForm(p => ({ ...p, text: e.target.value }))} rows={3} placeholder="חוויה נהדרת..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-vertical" /></div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">דירוג</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setTestForm(p => ({ ...p, rating: s }))}
                      className={`text-2xl transition-transform hover:scale-110 ${s <= testForm.rating ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">תמונת לקוח</label>
                <div className="flex gap-3 items-center">
                  {testForm.imageUrl && <img src={testForm.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />}
                  <label className="bg-gray-800 text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer flex-shrink-0">
                    {testUploadingImg ? '⏳ מעלה...' : '📷 העלה תמונה'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setTestUploadingImg(true);
                      try { const url = await uploadTestimonialImg(file); setTestForm(p => ({ ...p, imageUrl: url })); }
                      catch { alert('שגיאה בהעלאה'); } finally { setTestUploadingImg(false); }
                    }} />
                  </label>
                  <input value={testForm.imageUrl} onChange={e => setTestForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="או הדבק URL" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs min-w-0" />
                </div>
              </div>
              <button onClick={addTestimonial} disabled={testSaving} className="bg-rose-600 text-white rounded-lg py-2 px-6 text-sm font-bold hover:bg-rose-700 disabled:opacity-50 self-start">
                {testSaving ? '⏳ שומר...' : '✅ הוסף ביקורת'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-black mb-4">💬 ביקורות קיימות ({testimonials.length})</h2>
            {testimonialsLoading ? <div className="text-center text-gray-400 py-8">טוען...</div>
            : testimonials.length === 0 ? <div className="text-center text-gray-400 py-8">אין ביקורות עדיין</div>
            : (
              <div className="grid gap-4">
                {testimonials.map(t => (
                  <div key={t.id} className={`rounded-xl border p-4 flex gap-4 items-start ${t.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex-shrink-0">
                      {t.imageUrl ? <img src={t.imageUrl} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" /> : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-sm">{t.name}</span>
                        {t.city && <span className="text-xs text-gray-500">📍 {t.city}</span>}
                        <span className="text-yellow-400 text-sm">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{t.text}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => toggleTestimonialActive(t.id, t.active)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${t.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {t.active ? '● פעיל' : '● לא פעיל'}
                      </button>
                      <button onClick={() => deleteTestimonial(t.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-600 hover:bg-red-200">🗑️ מחק</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'homepage' && (
        <HomepageConfigTab products={products} />
      )}

      {activeTab === 'edit_requests' && (
        <div style={{ direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1E3A8A', margin: 0 }}>✏️ בקשות עריכת פרופיל סופר</h2>
            <button onClick={loadEditRequests} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>🔄 רענן</button>
          </div>
          {editRequestsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>טוען...</div>
          ) : editRequests.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 15 }}>אין בקשות עריכה</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {editRequests.map(req => {
                const isPending  = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const date = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('he-IL') : '';
                const statusBadge = isPending
                  ? { label: '⏳ ממתין', bg: '#fef3c7', color: '#92400e' }
                  : isApproved
                  ? { label: '✅ אושר',  bg: '#d1fae5', color: '#065f46' }
                  : { label: '❌ נדחה',  bg: '#fee2e2', color: '#991b1b' };
                return (
                  <div key={req.id} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', overflow: 'hidden', border: isPending ? '2px solid #fbbf24' : '1px solid #e5e7eb' }}>
                    <div style={{ background: isPending ? '#fffbeb' : '#f9fafb', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontSize: 26 }}>✍️</div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16, color: '#1E3A8A' }}>{req.soferName}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>soferId: {req.soferId} · {date}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color }}>{statusBadge.label}</span>
                    </div>
                    <div style={{ padding: '20px' }}>
                      {req.changes.imageUrl && (
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#374151', marginBottom: 10 }}>תמונת פרופיל</div>
                          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>לפני</div>
                              {req.currentData?.imageUrl ? <img src={req.currentData.imageUrl} alt="לפני" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} /> : <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f3f4f6', border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>}
                            </div>
                            <div style={{ fontSize: 22, color: '#9ca3af' }}>→</div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>אחרי</div>
                              <img src={req.changes.imageUrl} alt="אחרי" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #86efac' }} onError={e => (e.currentTarget.style.display = 'none')} />
                            </div>
                          </div>
                        </div>
                      )}
                      {(['name', 'city', 'style', 'description'] as const).map(field => {
                        if (!(field in req.changes)) return null;
                        const fieldLabels = { name: 'שם', city: 'עיר', style: 'סגנון', description: 'תיאור' };
                        const before = String(req.currentData?.[field] ?? '');
                        const after  = String(req.changes[field] ?? '');
                        return (
                          <div key={field} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8 }}>{fieldLabels[field]}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'start' }}>
                              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#991b1b', minHeight: 36 }}>
                                <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700, marginBottom: 3 }}>לפני</div>
                                {before || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>ריק</span>}
                              </div>
                              <div style={{ fontSize: 20, color: '#9ca3af', marginTop: 10 }}>→</div>
                              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#166534', minHeight: 36 }}>
                                <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, marginBottom: 3 }}>אחרי</div>
                                {after || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>ריק</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {req.changes.writingSamples && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 10 }}>דוגמאות כתב</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start' }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700, marginBottom: 6 }}>לפני</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(req.currentData?.writingSamples ?? []).length === 0
                                  ? <span style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>אין</span>
                                  : (req.currentData?.writingSamples ?? []).map((s, i) => {
                                      const url = typeof s === 'string' ? s : s.url;
                                      const isVid = typeof s !== 'string' && s.type === 'video';
                                      return isVid ? <div key={i} style={{ width: 60, height: 60, borderRadius: 6, background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>▶️</div>
                                        : <img key={i} src={url} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', border: '1px solid #fecaca' }} onClick={() => setLightboxImage(url)} />;
                                    })
                                }
                              </div>
                            </div>
                            <div style={{ fontSize: 20, color: '#9ca3af', marginTop: 28 }}>→</div>
                            <div>
                              <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>אחרי</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {req.changes.writingSamples.length === 0
                                  ? <span style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>ריק</span>
                                  : req.changes.writingSamples.map((s, i) => {
                                      const isVid = s.type === 'video';
                                      return isVid
                                        ? <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ width: 60, height: 60, borderRadius: 6, background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>▶️</a>
                                        : <img key={i} src={s.url} alt="" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', border: '1px solid #86efac', cursor: 'zoom-in' }} onClick={() => setLightboxImage(s.url)} />;
                                    })
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {req.adminNote && (
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#4b5563', marginTop: 8 }}>
                          💬 הערת מנהל: {req.adminNote}
                        </div>
                      )}
                      {isPending && (
                        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <button disabled={actionLoading === req.id} onClick={() => approveEditRequest(req)}
                            style={{ background: actionLoading === req.id ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: actionLoading === req.id ? 'not-allowed' : 'pointer' }}>
                            {actionLoading === req.id ? '⏳ מאשר...' : 'אשר ✅'}
                          </button>
                          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                            <input value={rejectNoteMap[req.id] ?? ''} onChange={e => setRejectNoteMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="הערת דחייה (אופציונלי)..."
                              style={{ flex: 1, minWidth: 180, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }} />
                            <button disabled={actionLoading === req.id + '_reject'} onClick={() => rejectEditRequest(req, rejectNoteMap[req.id] ?? '')}
                              style={{ background: actionLoading === req.id + '_reject' ? '#9ca3af' : '#dc2626', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: actionLoading === req.id + '_reject' ? 'not-allowed' : 'pointer' }}>
                              {actionLoading === req.id + '_reject' ? '⏳...' : 'דחה ❌'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'hidden_products' && (
        <div>
          <h2 className="text-xl font-black mb-4 text-gray-800">👁️ מוצרים מוסתרים ({hiddenProducts.length})</h2>
          {hiddenProducts.length === 0 ? (
            <div className="p-10 text-center text-gray-400 bg-white rounded-xl shadow">אין מוצרים מוסתרים</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><th className="p-3 text-right">מוצר</th><th className="p-3 text-right">קטגוריה</th><th className="p-3 text-right">מחיר</th><th className="p-3 text-right">עדיפות</th><th className="p-3 text-right">פעולה</th></tr>
                </thead>
                <tbody>
                  {hiddenProducts.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50 opacity-70">
                      <td className="p-3"><div className="flex items-center gap-2">{(p.imgUrl || p.image_url) && <img src={p.imgUrl || p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover" onError={e => (e.currentTarget.style.display = 'none')} />}<span className="font-bold text-xs">{p.name}</span></div></td>
                      <td className="p-3 text-gray-500 text-xs">{p.cat || p.category || '-'}</td>
                      <td className="p-3 font-bold text-green-700">{formatPrice(p.price)}</td>
                      <td className="p-3 text-xs text-gray-500">{p.priority ?? 50}</td>
                      <td className="p-3"><button onClick={() => toggleHidden(p.id, true)} disabled={actionLoading === p.id + '_hidden'} className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition">✅ החזר לאתר</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'abandoned_carts' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">🛒 נטישות עגלה ({abandonedCarts.length})</h2>
            <button onClick={loadAbandonedCarts} className="text-sm text-blue-600 hover:underline">רענן</button>
          </div>
          {abandonedCartsLoading ? (
            <div className="p-8 text-center text-gray-400">טוען...</div>
          ) : abandonedCarts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">אין נטישות עגלה</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">שם</th>
                    <th className="p-3 text-right">אימייל</th>
                    <th className="p-3 text-right">טלפון</th>
                    <th className="p-3 text-right">פריטים</th>
                    <th className="p-3 text-right">סה"כ</th>
                    <th className="p-3 text-right">זמן</th>
                  </tr>
                </thead>
                <tbody>
                  {abandonedCarts.map(cart => {
                    const ts = typeof cart.updatedAt === 'object' && cart.updatedAt && 'seconds' in cart.updatedAt
                      ? new Date(cart.updatedAt.seconds * 1000)
                      : typeof cart.updatedAt === 'string' ? new Date(cart.updatedAt) : null;
                    const minutesAgo = ts ? Math.round((Date.now() - ts.getTime()) / 60000) : null;
                    const timeAgo = minutesAgo === null ? '-'
                      : minutesAgo < 60 ? `לפני ${minutesAgo} דקות`
                      : minutesAgo < 1440 ? `לפני ${Math.round(minutesAgo / 60)} שעות`
                      : `לפני ${Math.round(minutesAgo / 1440)} ימים`;
                    const cartTotal = cart.cartItems?.reduce((s, i) => s + i.price * i.quantity, 0) ?? cart.cartTotal ?? 0;
                    return (
                      <tr key={cart.id} className="border-t hover:bg-orange-50">
                        <td className="p-3 font-semibold">{cart.name || '-'}</td>
                        <td className="p-3 text-gray-600 text-xs">{cart.email || '-'}</td>
                        <td className="p-3 text-gray-600">{cart.phone || '-'}</td>
                        <td className="p-3 text-xs">
                          <div className="flex flex-col gap-2">
                            {(cart.cartItems || []).map((item, idx) => (
                              <div key={idx}>
                                <a href={`/product/${item.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{item.name}</a>
                                <span className="text-gray-500"> ×{item.quantity} — {formatPrice(item.price)}</span>
                                {item.printCustomization && (
                                  <PrintCustomizationView pc={item.printCustomization} />
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-green-700">{formatPrice(cartTotal)}</td>
                        <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{timeAgo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold">👤 לקוחות ({customers.length})</h2>
            <button onClick={loadCustomers} className="text-sm text-blue-600 hover:underline">רענן</button>
          </div>
          {customersLoading ? (
            <div className="p-8 text-center text-gray-400">טוען...</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">אין לקוחות עדיין</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">שם</th>
                    <th className="p-3 text-right">אימייל</th>
                    <th className="p-3 text-right">טלפון</th>
                    <th className="p-3 text-right">הזמנות</th>
                    <th className="p-3 text-right">סה"כ הוצאה</th>
                    <th className="p-3 text-right">הזמנה ראשונה</th>
                    <th className="p-3 text-right">סוג</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => {
                    const firstDate = c.firstOrderAt ? new Date(c.firstOrderAt).toLocaleDateString('he-IL') : '-';
                    return (
                      <tr key={c.id} className="border-t hover:bg-cyan-50">
                        <td className="p-3 font-semibold">{c.name || '-'}</td>
                        <td className="p-3 text-gray-600 text-xs">{c.email || '-'}</td>
                        <td className="p-3 text-gray-600">{c.phone || '-'}</td>
                        <td className="p-3 text-center font-bold text-blue-700">{c.totalOrders ?? 0}</td>
                        <td className="p-3 font-bold text-green-700">{formatPrice(c.totalSpent ?? 0)}</td>
                        <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{firstDate}</td>
                        <td className="p-3">
                          {c.isGuest
                            ? <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">אורח</span>
                            : <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">רשום</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'curations' && <CurationsTab />}

      {activeTab === 'leads' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-800">📋 לידים מהאתר ({leads.length})</h2>
            <button onClick={loadLeads} className="text-sm text-blue-600 underline">רענן</button>
          </div>
          {leads.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין לידים עדיין</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ direction: 'rtl' }}>
                <thead className="bg-gray-50 text-gray-600 text-right">
                  <tr>
                    <th className="px-4 py-3 font-semibold">שם</th>
                    <th className="px-4 py-3 font-semibold">טלפון</th>
                    <th className="px-4 py-3 font-semibold">אימייל</th>
                    <th className="px-4 py-3 font-semibold">נוסח</th>
                    <th className="px-4 py-3 font-semibold">מיקום</th>
                    <th className="px-4 py-3 font-semibold">כמות קלפים</th>
                    <th className="px-4 py-3 font-semibold">תאריך</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map(lead => {
                    const date = lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                    const waPhone = lead.phone?.replace(/\D/g, '').replace(/^0/, '972');
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{lead.name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-sm">{lead.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lead.email || '—'}</td>
                        <td className="px-4 py-3">{lead.nusach || '—'}</td>
                        <td className="px-4 py-3">{lead.location === 'room' ? 'חדר' : lead.location === 'entrance' ? 'כניסה ראשית' : '—'}</td>
                        <td className="px-4 py-3 text-center">{lead.klafimCount ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{date}</td>
                        <td className="px-4 py-3">
                          {waPhone && (
                            <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition">
                              💬 פתח וואטסאפ
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <iframe
            src="/admin/emails"
            className="w-full h-full border-0"
            title="ניהול מיילים"
          />
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="grid gap-6">
          {/* Create coupon form */}
          <CouponCreateForm onCreated={loadCoupons} />

          {/* Coupons table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-black" style={{ color: '#1E3A8A' }}>קופונים קיימים</h2>
              <span className="text-sm text-gray-500">{coupons.length} קופונים</span>
            </div>
            {couponsLoading ? <div className="p-10 text-center text-gray-400">טוען...</div> : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">קוד</th>
                    <th className="p-3 text-right">סוג</th>
                    <th className="p-3 text-right">הנחה</th>
                    <th className="p-3 text-right">מינימום</th>
                    <th className="p-3 text-right">תפוגה</th>
                    <th className="p-3 text-right">שימושים</th>
                    <th className="p-3 text-right">סטטוס</th>
                    <th className="p-3 text-right">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.length === 0 ? (
                    <tr><td colSpan={8} className="p-10 text-center text-gray-400">אין קופונים</td></tr>
                  ) : coupons.map(c => (
                    <tr key={c.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono font-black tracking-widest text-sm">{c.code}</td>
                      <td className="p-3 text-xs text-gray-500">{c.type === 'percent' ? 'אחוז' : 'סכום'}</td>
                      <td className="p-3 font-bold text-green-700">{c.type === 'percent' ? `${c.discount}%` : `₪${c.discount}`}</td>
                      <td className="p-3 text-xs text-gray-500">{c.minOrder ? `₪${c.minOrder}` : '—'}</td>
                      <td className="p-3 text-xs text-gray-500">{c.expiresAt || '—'}</td>
                      <td className="p-3 text-xs text-gray-600">{(c.usedBy || []).length} שימושים</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {c.active ? '● פעיל' : '● מושהה'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => toggleCoupon(c.id, c.active)} className={`px-2 py-1 rounded-full text-xs font-bold ${c.active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                            {c.active ? 'השהה' : 'הפעל'}
                          </button>
                          <button onClick={() => deleteCoupon(c.id)} className="px-2 py-1 rounded-full text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100">מחק</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showAddSofer && <AddSoferModal onClose={() => setShowAddSofer(false)} onSave={() => { loadSoferimFull(); loadSoferim(); }} />}
      {showAddShliach && <AddShliachModal onClose={() => setShowAddShliach(false)} onSave={() => { loadShluchimApplications(); loadUsers(); }} />}
      {showAddProduct && <AddProductModal soferim={soferim} soferimFull={soferimFull} onClose={() => setShowAddProduct(false)} onSave={() => loadProducts()} />}
      {editingProduct && <EditProductModal product={editingProduct} soferim={soferim} soferimFull={soferimFull} onClose={() => setEditingProduct(null)} onSave={() => { loadProducts(); }} />}
      {editingSofer && (
        <EditSoferModal sofer={editingSofer} onClose={() => setEditingSofer(null)}
          onSave={(updated) => { setSoferimFull(prev => prev.map(s => s.id === updated.id ? updated : s)); setEditingSofer(null); }} />
      )}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center', direction: 'rtl' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: '#1E3A8A' }}>מחיקת סופר</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              האם אתה בטוח שברצונך למחוק את <strong>{soferimFull.find(s => s.id === deleteConfirm)?.name}</strong>?<br />
              <span style={{ color: '#c0392b' }}>פעולה זו בלתי הפיכה.</span>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteSofer(deleteConfirm)} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>כן, מחק</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, cursor: 'pointer' }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'out_of_stock' && (
        <div className="grid gap-6">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-red-700">🔴 מוצרי אזל מלאי</h2>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>SKU חסר: <strong>{outOfStockProducts.filter(p => (p as any).outOfStockReason === 'SKU_MISSING').length}</strong></span>
                <span>לא נמצא אצל ספק: <strong>{outOfStockProducts.filter(p => (p as any).outOfStockReason === 'NOT_FOUND_AT_SUPPLIER').length}</strong></span>
                <span>סה״כ: <strong>{outOfStockProducts.length}</strong></span>
                <button onClick={loadOutOfStockProducts} className="text-blue-600 underline">רענן</button>
              </div>
            </div>
            {outOfStockLoading ? (
              <div className="p-10 text-center text-gray-400">טוען...</div>
            ) : outOfStockProducts.length === 0 ? (
              <div className="p-10 text-center text-gray-400">אין מוצרים עם אזל מלאי</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">שם המוצר</th>
                    <th className="p-3 text-right">קטגוריה</th>
                    <th className="p-3 text-right">סיבה</th>
                    <th className="p-3 text-right">תאריך סימון</th>
                    <th className="p-3 text-right">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockProducts.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <a href={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                          {p.name || '(ללא שם)'}
                        </a>
                      </td>
                      <td className="p-3 text-gray-500">{p.cat || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${(p as any).outOfStockReason === 'SKU_MISSING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {(p as any).outOfStockReason === 'SKU_MISSING' ? 'SKU חסר' : (p as any).outOfStockReason === 'NOT_FOUND_AT_SUPPLIER' ? 'לא נמצא אצל ספק' : ((p as any).outOfStockReason || '—')}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{(p as any).outOfStockDate || '—'}</td>
                      <td className="p-3">
                        <button
                          onClick={async () => {
                            await updateDoc(doc(db, 'products', p.id), { outOfStock: false, outOfStockReason: null, outOfStockDate: null });
                            setOutOfStockProducts(prev => prev.filter(x => x.id !== p.id));
                          }}
                          className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 hover:bg-green-100 cursor-pointer"
                        >
                          ✅ חזרה למלאי
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gifts' && <GiftsTab />}

      {activeTab === 'inventory' && <InventoryTab products={products} orders={orders} onSave={async (productId, data) => {
        await updateDoc(doc(db, 'products', productId), data as Record<string, unknown>);
      }} />}

      {activeTab === 'prints' && <PrintsTab orders={orders} />}

      {activeTab === 'stickers' && <StickersTab />}

      {activeTab === 'profitability' && <ProfitabilityTab products={products} orders={orders} />}

      {activeTab === 'promotions' && <PromotionsTab />}

      {activeTab === 'site_settings' && <SiteSettingsTab />}

      {activeTab === 'best_sellers' && <BestSellersTab orders={orders} products={products} />}

      {lightboxImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }} onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="דוגמת כתיבה" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxImage(null)} style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: '36px' }}>✕</button>
        </div>
      )}
    </main>
  );
}

function CategoryCard({ cat, saving, saved, onSave }: {
  cat: Category; saving: boolean; saved: boolean;
  onSave: (data: { displayName: string; imageUrl: string; priority: number }) => void;
}) {
  const [displayName, setDisplayName] = useState(cat.displayName || cat.name || '');
  const [imageUrl, setImageUrl]       = useState(cat.imageUrl || cat.imgUrl || '');
  const [priority, setPriority]       = useState(cat.priority ?? cat.order ?? 0);
  const [uploading, setUploading]     = useState(false);
  const [imgSaved, setImgSaved]       = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('uploading file...');
    setUploading(true);
    setImgSaved(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res  = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      console.log('cloudinary response:', data);
      if (!data.secure_url) throw new Error('upload failed — no secure_url in response');
      const url = data.secure_url as string;
      setImageUrl(url);
      console.log('saving to firestore:', cat.id, url);
      onSave({ displayName, imageUrl: url, priority });
      console.log('saved!');
      setImgSaved(true);
      setTimeout(() => setImgSaved(false), 3000);
    } catch (err) {
      console.error('[CategoryCard] upload error:', err);
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
      <div style={{ height: 140, background: '#f3f4f4', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {imageUrl ? <img src={imageUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 44, color: '#ccc' }}>🖼️</div>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', bottom: 8, right: 10, left: 10 }}><span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{displayName}</span></div>
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '2px 7px', fontSize: 11, color: '#ddd', fontFamily: 'monospace' }}>{cat.slug || cat.name}</div>
      </div>
      <div className="p-4 bg-white flex flex-col gap-3 flex-1">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">שם תצוגה</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">תמונה</label>
          <div className="flex gap-2 items-center">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-indigo-100 disabled:opacity-50"
            >
              {uploading ? '⏳ מעלה...' : '📷 העלה תמונה'}
            </button>
            {imgSaved && <span className="text-green-600 text-xs font-bold">✅ נשמר!</span>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">עדיפות (מספר נמוך = ראשון)</label>
          <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-center gap-3 mt-auto">
          <button onClick={() => onSave({ displayName, imageUrl, priority })} disabled={saving || uploading}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? '⏳ שומר...' : '💾 שמור'}
          </button>
          {saved && <span className="text-green-600 text-sm font-bold">✅ נשמר!</span>}
        </div>
      </div>
    </div>
  );
}

// ─── CurationsTab ─────────────────────────────────────────────────────────────

function CurationRow({ curation, onDelete, lookTagCounts }: { curation: Curation | null; onDelete?: () => void; lookTagCounts?: Record<string, number> }) {
  const isNew = !curation?.id;
  const [category,       setCategory]       = useState(curation?.category       ?? '');
  const [activeTag,      setActiveTag]       = useState(curation?.activeTag      ?? '');
  const [bannerTitle,    setBannerTitle]     = useState(curation?.bannerTitle    ?? '');
  const [bannerImageUrl, setBannerImageUrl]  = useState(curation?.bannerImageUrl ?? '');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res  = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error('upload failed');
      setBannerImageUrl(data.secure_url);
    } catch { alert('שגיאה בהעלאת תמונה'); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!category.trim()) { alert('נא למלא שם קטגוריה'); return; }
    setSaving(true);
    try {
      const payload = {
        category: category.trim(),
        activeTag,
        bannerTitle: bannerTitle.trim(),
        bannerImageUrl: bannerImageUrl.trim(),
        updatedAt: serverTimestamp(),
      };
      const docRef = doc(db, 'curations', category.trim());
      await setDoc(docRef, payload, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) { alert('שגיאה בשמירה: ' + (e instanceof Error ? e.message : e)); }
    finally { setSaving(false); }
  }

  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' }}>
      <td style={{ padding: '10px 8px' }}>
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="שם קטגוריה (כגון: נטילת ידיים)"
          disabled={!isNew}
          style={{ width: 180, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 13, direction: 'rtl', background: isNew ? '#fff' : '#f9fafb', color: '#1E3A8A', fontWeight: 600 }}
        />
      </td>
      <td style={{ padding: '10px 8px' }}>
        <input
          value={activeTag}
          onChange={e => setActiveTag(e.target.value)}
          placeholder="כגון: שחור וזהב / Modern"
          style={{ width: 170, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 13, direction: 'rtl', background: '#fff', color: '#1E3A8A' }}
        />
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>הקלד את שם הלוק המדויק כפי שמופיע בפיירסטור</div>
        {activeTag && lookTagCounts && (
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {lookTagCounts[activeTag] != null
              ? `${lookTagCounts[activeTag]} מוצרים`
              : '- אין נתונים'}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 8px' }}>
        <input
          value={bannerTitle}
          onChange={e => setBannerTitle(e.target.value)}
          placeholder="כותרת הבאנר..."
          style={{ width: 200, border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 13, direction: 'rtl' }}
        />
      </td>
      <td style={{ padding: '10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {bannerImageUrl && (
            <img src={bannerImageUrl} alt="" style={{ width: 50, height: 34, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb', flexShrink: 0 }} onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <label style={{ cursor: 'pointer', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {uploading ? '⏳...' : '📷 העלה'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </td>
      <td style={{ padding: '10px 8px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? '⏳' : '💾 שמור'}
          </button>
          {saved && <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 700 }}>✅ נשמר!</span>}
          {onDelete && (
            <button
              onClick={onDelete}
              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              🗑️
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CurationsTab() {
  const [curations, setCurations]         = useState<Curation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [newRows, setNewRows]             = useState(0);
  const [lookTagCounts, setLookTagCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'curations'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Curation));
        setCurations(list);

        // Fetch lookTag counts for each active tag
        const activeTags = [...new Set(list.map(c => c.activeTag).filter(Boolean))];
        const counts: Record<string, number> = {};
        await Promise.all(activeTags.map(async tag => {
          try {
            const q = query(collection(db, 'products'), where('lookTag', '==', tag));
            const countSnap = await getCountFromServer(q);
            counts[tag] = countSnap.data().count;
          } catch { /* silent */ }
        }));
        setLookTagCounts(counts);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1E3A8A' }}>✨ סלקציות (Curations)</h2>
        <button
          onClick={() => setNewRows(n => n + 1)}
          style={{ background: '#C5A028', color: '#1E3A8A', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          + הוסף סלקציה
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
        סלקציה מגדירה איזה סגנון יוצג כברירת מחדל כשגולש נכנס לתת-קטגוריה (למשל: נטילת ידיים), ומציגה באנר מעל הרשת.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>טוען...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                {['קטגוריה', 'סגנון פעיל', 'כותרת באנר', 'תמונת באנר', 'שמירה'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {curations.map(c => <CurationRow key={c.id} curation={c} lookTagCounts={lookTagCounts} />)}
              {Array.from({ length: newRows }).map((_, i) => (
                <CurationRow key={`new-${i}`} curation={null} onDelete={() => setNewRows(n => Math.max(0, n - 1))} />
              ))}
              {curations.length === 0 && newRows === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>אין סלקציות עדיין - לחץ "הוסף סלקציה" כדי להתחיל</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── A4: Gifts tab — manage siteConfig/gifts in Firestore ─────────────────────
interface GiftOption {
  id:        string;  // internal gift slug (gift-1)
  productId: string;  // real Firestore product ID — used as order line item id
  name:      string;
  imgUrl:    string;
}

const EMPTY_GIFT: GiftOption = { id: '', productId: '', name: '', imgUrl: '' };

// Extract product ID from a full URL or bare ID.
// "https://your-sofer.com/product/ABC123" → "ABC123"
// "ABC123" → "ABC123"
function extractProductId(val: string): string {
  const trimmed = val.trim();
  const idx = trimmed.indexOf('/product/');
  if (idx !== -1) {
    return trimmed.slice(idx + 9).split('/')[0].split('?')[0];
  }
  return trimmed;
}

function GiftsTab() {
  const [enabled,   setEnabled]   = useState(false);
  const [threshold, setThreshold] = useState(250);
  const [gifts,     setGifts]     = useState<GiftOption[]>([{ ...EMPTY_GIFT }]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    getDoc(doc(db, 'siteConfig', 'gifts'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setEnabled(d.enabled ?? false);
          setThreshold(d.threshold ?? 250);
          // Normalize: old records may lack productId — always coerce to string
          const raw: Record<string, string>[] = d.options ?? [];
          const opts: GiftOption[] = raw.map(g => ({
            id:        g.id        ?? '',
            productId: g.productId ?? '',
            name:      g.name      ?? '',
            imgUrl:    g.imgUrl    ?? '',
          }));
          setGifts(opts.length > 0 ? opts : [{ ...EMPTY_GIFT }]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateGift(idx: number, field: keyof GiftOption, value: string) {
    setGifts(prev => { const next = [...prev]; next[idx] = { ...next[idx], [field]: value }; return next; });
    setSaved(false); setError('');
  }

  function addGift() { setGifts(prev => [...prev, { ...EMPTY_GIFT }]); setSaved(false); }

  function removeGift(idx: number) { setGifts(prev => prev.filter((_, i) => i !== idx)); setSaved(false); }

  async function save() {
    const invalid = gifts.find(g =>
      !(g.id ?? '').trim() || !(g.productId ?? '').trim() ||
      !(g.name ?? '').trim() || !(g.imgUrl ?? '').trim()
    );
    if (invalid) { setError('כל שדות המתנה (מזהה, מוצר, שם, תמונה) הם חובה'); return; }
    if (threshold < 1) { setError('סף הזכאות חייב להיות חיובי'); return; }
    const ids = gifts.map(g => (g.id ?? '').trim());
    if (new Set(ids).size !== ids.length) { setError('מזהי המתנות חייבים להיות ייחודיים'); return; }
    setError(''); setSaving(true);
    try {
      await setDoc(doc(db, 'siteConfig', 'gifts'), {
        enabled, threshold,
        options: gifts.map(g => ({
          id:        (g.id        ?? '').trim(),
          productId: (g.productId ?? '').trim(),
          name:      (g.name      ?? '').trim(),
          imgUrl:    (g.imgUrl    ?? '').trim(),
        })),
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (e) {
      console.error('GiftsTab save error:', e);
      setError('שגיאה בשמירה — בדוק את החיבור ונסה שנית');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-gray-400">טוען...</div>;

  return (
    <div className="grid gap-6 max-w-2xl">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-black text-pink-700 mb-1">🎁 מתנות VIP</h2>
        <p className="text-sm text-gray-500 mb-6">לקוחות שמגיעים לסף בוחרים מתנה חינם.</p>

        {/* Enable/disable toggle */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <button
            type="button"
            onClick={() => { setEnabled(e => !e); setSaved(false); }}
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-pink-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm font-bold text-gray-700">{enabled ? 'מבצע מתנות פעיל' : 'מבצע מתנות כבוי'}</span>
        </div>

        {/* Threshold */}
        <label className="text-xs text-gray-500 block mb-6">
          סף זכאות למתנה (₪)
          <input
            type="number" min="1"
            value={threshold}
            onChange={e => { setThreshold(Number(e.target.value)); setSaved(false); }}
            className="mt-1 block w-40 border border-gray-200 rounded px-3 py-1.5 text-sm"
            dir="ltr"
          />
        </label>

        {/* Gift cards */}
        <div className="grid gap-6">
          {gifts.map((g, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-700">מתנה {i + 1}</h3>
                {gifts.length > 1 && (
                  <button type="button" onClick={() => removeGift(i)} className="text-xs text-red-500 hover:text-red-700 font-medium">✕ הסר</button>
                )}
              </div>
              <div className="grid gap-3">
                <label className="text-xs text-gray-500">
                  מזהה פנימי (ייחודי)
                  <input value={g.id} onChange={e => updateGift(i, 'id', e.target.value)} placeholder="gift-1"
                    className="mt-1 block w-full border border-gray-200 rounded px-3 py-1.5 text-sm" />
                </label>
                <div>
                  <label className="text-xs text-gray-500">
                    קישור/מזהה מוצר
                    <input
                      value={g.productId ?? ''}
                      onChange={e => updateGift(i, 'productId', extractProductId(e.target.value))}
                      placeholder="https://your-sofer.com/product/… או product ID ישיר"
                      className="mt-1 block w-full border border-gray-200 rounded px-3 py-1.5 text-sm"
                      dir="ltr"
                    />
                  </label>
                  {g.productId && (
                    <p className="mt-1 text-xs text-emerald-600 font-medium">✓ מוצר מקושר: {g.productId}</p>
                  )}
                </div>
                <label className="text-xs text-gray-500">
                  שם המתנה (יוצג ללקוח)
                  <input value={g.name} onChange={e => updateGift(i, 'name', e.target.value)} placeholder="שוקולד בלגי"
                    className="mt-1 block w-full border border-gray-200 rounded px-3 py-1.5 text-sm" />
                </label>
                <label className="text-xs text-gray-500">
                  URL תמונה (Cloudinary)
                  <input value={g.imgUrl} onChange={e => updateGift(i, 'imgUrl', e.target.value)} placeholder="https://res.cloudinary.com/..."
                    className="mt-1 block w-full border border-gray-200 rounded px-3 py-1.5 text-sm" dir="ltr" />
                </label>
                {g.imgUrl && (
                  <img src={g.imgUrl} alt={g.name} className="w-20 h-20 object-cover rounded border border-gray-100" />
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button" onClick={addGift}
          className="mt-4 w-full py-2 border border-dashed border-pink-300 text-pink-600 text-sm font-medium rounded-lg hover:bg-pink-50 transition-colors"
        >
          + הוסף מתנה
        </button>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button type="button" onClick={save} disabled={saving}
          className="mt-4 px-6 py-2 bg-pink-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
        >
          {saving ? 'שומר...' : saved ? '✓ נשמר!' : 'שמור מתנות'}
        </button>
      </div>
    </div>
  );
}