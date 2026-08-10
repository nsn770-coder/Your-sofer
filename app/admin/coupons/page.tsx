'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';
import type { PartnerCoupon, PartnerCouponType } from '@/app/lib/partner-coupon-types';

interface ProductCoupon {
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

type TabKey = 'product' | 'partner';

export default function AdminCouponsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('product');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return <div className="p-10 text-center text-gray-400">בטעינה...</div>;
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black mb-6" style={{ color: 'var(--ys-heading)' }}>ניהול קופונים</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('product')}
          className={`px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'product' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
          style={activeTab === 'product' ? { background: 'var(--ys-accent)' } : undefined}
        >
          🛍️ קופונים למוצרים
        </button>
        <button
          onClick={() => setActiveTab('partner')}
          className={`px-4 py-2 rounded-full text-sm font-bold ${activeTab === 'partner' ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
          style={activeTab === 'partner' ? { background: 'var(--ys-accent)' } : undefined}
        >
          🆙 קופונים לשדרוג Partner
        </button>
      </div>

      {activeTab === 'product' ? <ProductCouponsTab /> : <PartnerCouponsTab />}
    </div>
  );
}

// ── Tab 1: Product coupons (existing collection — display only) ─────────────

function ProductCouponsTab() {
  const [coupons, setCoupons] = useState<ProductCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc')));
        const data: ProductCoupon[] = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() } as ProductCoupon));
        setCoupons(data);
      } catch (e) {
        console.error('[admin/coupons] failed to load product coupons:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-black" style={{ color: 'var(--ys-heading)' }}>קופונים קיימים</h2>
        <span className="text-sm text-gray-500">{coupons.length} קופונים</span>
      </div>
      {loading ? (
        <div className="p-10 text-center text-gray-400">טוען...</div>
      ) : (
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
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">אין קופונים</td></tr>
            ) : coupons.map((c) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Tab 2: Partner-upgrade coupons (new — create + list) ─────────────────────

function PartnerCouponsTab() {
  const [coupons, setCoupons] = useState<PartnerCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'partner_coupons'), orderBy('createdAt', 'desc')));
      const data: PartnerCoupon[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as PartnerCoupon));
      setCoupons(data);
    } catch (e) {
      console.error('[admin/coupons] failed to load partner coupons:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCoupons(); }, []);

  return (
    <div className="grid gap-6">
      <PartnerCouponCreateForm onCreated={loadCoupons} />

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: 'var(--ys-heading)' }}>קופונים קיימים</h2>
          <span className="text-sm text-gray-500">{coupons.length} קופונים</span>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">קוד</th>
                <th className="p-3 text-right">תיאור</th>
                <th className="p-3 text-right">ערך</th>
                <th className="p-3 text-right">שימושים</th>
                <th className="p-3 text-right">תוקף</th>
                <th className="p-3 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">אין קופונים</td></tr>
              ) : coupons.map((c) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono font-black tracking-widest text-sm">{c.code}</td>
                  <td className="p-3 text-xs text-gray-500">{c.description || '—'}</td>
                  <td className="p-3 font-bold text-green-700">
                    {c.type === 'free' ? 'חינם' : c.type === 'percent' ? `${c.value}%` : `₪${c.value}`}
                  </td>
                  <td className="p-3 text-xs text-gray-600">{c.usedCount} / {c.maxUses}</td>
                  <td className="p-3 text-xs text-gray-500">{c.expiresAt || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {c.active ? '● פעיל' : '● מושהה'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PartnerCouponCreateForm({ onCreated }: { onCreated: () => void }) {
  const codeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const maxUsesRef = useRef<HTMLInputElement>(null);
  const expiresAtRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<PartnerCouponType>('percent');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCoupon() {
    const code = codeRef.current?.value.trim().toUpperCase() || '';
    const value = Number(valueRef.current?.value || 0);
    const description = descriptionRef.current?.value.trim() || '';
    const maxUses = Number(maxUsesRef.current?.value || 0);
    const expiresAt = expiresAtRef.current?.value || undefined;

    setError(null);
    if (!code) { setError('נא להזין קוד קופון'); return; }
    if (type !== 'free' && value <= 0) { setError('נא להזין ערך תקין'); return; }
    if (maxUses < 1) { setError('נא להזין מספר שימושים תקין'); return; }

    setSaving(true);
    try {
      const auth = await getAuthLazy();
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/coupons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code, type, value, description, maxUses, expiresAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'שגיאה ביצירת הקופון');
        return;
      }
      if (codeRef.current) codeRef.current.value = '';
      if (valueRef.current) valueRef.current.value = '10';
      if (descriptionRef.current) descriptionRef.current.value = '';
      if (maxUsesRef.current) maxUsesRef.current.value = '1';
      if (expiresAtRef.current) expiresAtRef.current.value = '';
      onCreated();
    } catch (e) {
      setError('שגיאה ביצירת הקופון');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-black mb-4" style={{ color: 'var(--ys-heading)' }}>🆙 יצירת קופון שדרוג Partner</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">קוד</label>
          <input ref={codeRef} placeholder="PARTNER50" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono tracking-widest w-36" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">סוג</label>
          <select ref={typeRef} value={type} onChange={(e) => setType(e.target.value as PartnerCouponType)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="percent">אחוז (%)</option>
            <option value="fixed">סכום קבוע (₪)</option>
            <option value="free">בחינם</option>
          </select>
        </div>
        {type !== 'free' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500">ערך</label>
            <input ref={valueRef} type="number" min={1} defaultValue={10} onFocus={(e) => e.target.select()} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">תיאור</label>
          <input ref={descriptionRef} placeholder="הנחה מיוחדת לשותפים" className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-48" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">מספר שימושים</label>
          <input ref={maxUsesRef} type="number" min={1} defaultValue={1} onFocus={(e) => e.target.select()} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500">תוקף עד</label>
          <input ref={expiresAtRef} type="date" className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={createCoupon} disabled={saving} style={{ background: 'var(--ys-accent)', color: '#FEFBF7', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
          {saving ? '...' : '➕ צור קופון'}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm font-bold mt-3">{error}</p>}
    </div>
  );
}
