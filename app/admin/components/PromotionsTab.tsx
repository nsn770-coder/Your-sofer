'use client';
import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getAuthLazy } from '@/lib/authLazy';
import { formatPrice } from '@/app/lib/utils';

interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: 'percent';
  discountValue: number;
  active: boolean;
  applyTo: 'all_in_stock' | 'manual';
  productIds: string[];
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  affectedCount?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  outOfStock?: boolean;
  inStock?: number | boolean;
  sku?: string;
  imgUrl?: string;
  cat?: string;
  source?: string;
  createdAt?: { seconds: number } | null;
  isOnSale?: boolean;
}

function isInStock(p: Product): boolean {
  if (p.outOfStock === true) return false;
  if (typeof p.inStock === 'number') return p.inStock > 0;
  if (typeof p.inStock === 'boolean') return p.inStock;
  return true;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  discountValue: 10,
  applyTo: 'all_in_stock' as 'all_in_stock' | 'manual',
  startsAt: '',
  endsAt: '',
  productIds: [] as string[],
};

export default function PromotionsTab() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCat, setFilterCat]       = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [hideOnSale, setHideOnSale]     = useState(false);
  const [sortBy, setSortBy]             = useState<'oldest' | 'stock' | 'price' | 'name'>('oldest');
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    loadPromotions();
  }, []);

  async function loadPromotions() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'promotions'));
      const data: Promotion[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Promotion));
      data.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      setPromotions(data);
    } catch (e) {
      console.error('[PromotionsTab] load:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllProducts() {
    if (allProducts.length > 0) return;
    setProductsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const data: Product[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
      setAllProducts(data);
    } catch (e) {
      console.error('[PromotionsTab] loadProducts:', e);
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    if (form.applyTo === 'manual') loadAllProducts();
  }, [form.applyTo]);

  useEffect(() => { setVisibleCount(50); }, [filterCat, filterSource, hideOnSale, sortBy, productSearch]);

  async function handleCreate() {
    if (!form.name.trim()) { alert('נדרש שם למבצע'); return; }
    if (form.discountValue <= 0 || form.discountValue >= 100) { alert('אחוז הנחה לא תקין'); return; }
    setSaving(true);
    try {
      const auth = await getAuthLazy();
      const email = auth.currentUser?.email ?? 'אדמין';
      const now = new Date().toISOString();
      const ref = await addDoc(collection(db, 'promotions'), {
        name: form.name.trim(),
        description: form.description.trim(),
        discountType: 'percent',
        discountValue: form.discountValue,
        active: false,
        applyTo: form.applyTo,
        productIds: form.applyTo === 'manual' ? form.productIds : [],
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        createdAt: now,
        updatedAt: now,
        createdBy: email,
        affectedCount: 0,
      });
      setPromotions(prev => [{
        id: ref.id,
        name: form.name.trim(),
        description: form.description.trim(),
        discountType: 'percent',
        discountValue: form.discountValue,
        active: false,
        applyTo: form.applyTo,
        productIds: form.applyTo === 'manual' ? form.productIds : [],
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        createdAt: now,
        affectedCount: 0,
      }, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e) {
      console.error('[PromotionsTab] create:', e);
      alert('שגיאה ביצירת מבצע');
    } finally {
      setSaving(false);
    }
  }

  async function applyPromotionToProducts(promo: Promotion, activate: boolean) {
    setApplying(promo.id);
    try {
      // Determine which products to update
      let targets: Product[] = [];
      if (activate) {
        await loadAllProducts();
        // Re-read latest
        const snap = await getDocs(collection(db, 'products'));
        const all: Product[] = [];
        snap.forEach(d => all.push({ id: d.id, ...d.data() } as Product));

        if (promo.applyTo === 'all_in_stock') {
          targets = all.filter(p => isInStock(p));
        } else {
          targets = all.filter(p => promo.productIds.includes(p.id));
        }
      } else {
        // Deactivate: find products that have this campaign
        const snap = await getDocs(
          query(collection(db, 'products'), where('saleCampaignId', '==', promo.id))
        );
        snap.forEach(d => targets.push({ id: d.id, ...d.data() } as Product));
      }

      const now = new Date().toISOString();
      const CHUNK = 400;
      for (let i = 0; i < targets.length; i += CHUNK) {
        const batch = writeBatch(db);
        const chunk = targets.slice(i, i + CHUNK);
        for (const p of chunk) {
          const ref = doc(db, 'products', p.id);
          if (activate) {
            const salePrice = Math.round(p.price * (1 - promo.discountValue / 100) * 100) / 100;
            batch.update(ref, {
              isOnSale: true,
              salePrice,
              salePercent: promo.discountValue,
              saleCampaignId: promo.id,
              saleStartsAt: promo.startsAt ?? null,
              saleEndsAt: promo.endsAt ?? null,
            });
          } else {
            batch.update(ref, {
              isOnSale: false,
              salePrice: null,
              salePercent: null,
              saleCampaignId: null,
              saleStartsAt: null,
              saleEndsAt: null,
            });
          }
        }
        await batch.commit();
      }

      // Update promotion document
      await updateDoc(doc(db, 'promotions', promo.id), {
        active: activate,
        affectedCount: activate ? targets.length : 0,
        updatedAt: now,
      });

      setPromotions(prev =>
        prev.map(p =>
          p.id === promo.id
            ? { ...p, active: activate, affectedCount: activate ? targets.length : 0 }
            : p
        )
      );

      alert(activate
        ? `✅ מבצע הופעל — עודכנו ${targets.length} מוצרים`
        : `✅ מבצע הושבת — הסרת מחיר מוזל מ-${targets.length} מוצרים`
      );
    } catch (e) {
      console.error('[PromotionsTab] apply:', e);
      alert('שגיאה בהפעלת המבצע');
    } finally {
      setApplying(null);
    }
  }

  async function handleDelete(promo: Promotion) {
    setDeleteConfirm(null);
    try {
      if (promo.active) {
        await applyPromotionToProducts(promo, false);
      }
      await deleteDoc(doc(db, 'promotions', promo.id));
      setPromotions(prev => prev.filter(p => p.id !== promo.id));
    } catch (e) {
      console.error('[PromotionsTab] delete:', e);
      alert('שגיאה במחיקת המבצע');
    }
  }

  function toggleProduct(productId: string) {
    setForm(f => ({
      ...f,
      productIds: f.productIds.includes(productId)
        ? f.productIds.filter(id => id !== productId)
        : [...f.productIds, productId],
    }));
  }

  function getDateMs(createdAt?: { seconds: number } | null): number {
    return createdAt?.seconds ? createdAt.seconds * 1000 : 0;
  }

  function monthsInStock(createdAt?: { seconds: number } | null): number | null {
    const ms = getDateMs(createdAt);
    if (!ms) return null;
    return Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24 * 30));
  }

  function selectAllFiltered() {
    setForm(f => ({ ...f, productIds: [...new Set([...f.productIds, ...filteredProducts.map(p => p.id)])] }));
  }

  function deselectAllFiltered() {
    const toRemove = new Set(filteredProducts.map(p => p.id));
    setForm(f => ({ ...f, productIds: f.productIds.filter(id => !toRemove.has(id)) }));
  }

  const allCats    = [...new Set(allProducts.map(p => p.cat).filter(Boolean))].sort()    as string[];
  const allSources = [...new Set(allProducts.map(p => p.source).filter(Boolean))].sort() as string[];

  const filteredProducts = allProducts
    .filter(p => {
      const q = productSearch.toLowerCase();
      if (q && !p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false;
      if (filterCat && p.cat !== filterCat) return false;
      if (filterSource && p.source !== filterSource) return false;
      if (hideOnSale && p.isOnSale === true) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return getDateMs(a.createdAt) - getDateMs(b.createdAt);
      if (sortBy === 'stock') {
        const aS = typeof a.inStock === 'number' ? a.inStock : 0;
        const bS = typeof b.inStock === 'number' ? b.inStock : 0;
        return bS - aS;
      }
      if (sortBy === 'price') return (b.price ?? 0) - (a.price ?? 0);
      if (sortBy === 'name')  return (a.name ?? '').localeCompare(b.name ?? '', 'he');
      return 0;
    });

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  if (loading) return <div className="p-10 text-center text-gray-400">טוען מבצעים...</div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-blue-900">🏷️ ניהול מבצעים</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-600"
        >
          {showForm ? '✕ סגור' : '➕ מבצע חדש'}
        </button>
      </div>

      {/* ── create form ── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 border border-amber-200">
          <h3 className="font-black text-gray-800 mb-4">יצירת מבצע חדש</h3>
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">שם המבצע *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="מבצע מוצאי שבת"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">תיאור</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="תיאור קצר..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">% הנחה</label>
                <input
                  type="number" min={1} max={99}
                  value={form.discountValue}
                  onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">החל על</label>
                <select
                  value={form.applyTo}
                  onChange={e => setForm(f => ({ ...f, applyTo: e.target.value as 'all_in_stock' | 'manual', productIds: [] }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="all_in_stock">כל המוצרים שבמלאי</option>
                  <option value="manual">בחירה ידנית</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">תאריך התחלה</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">תאריך סיום</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* manual product selection */}
            {form.applyTo === 'manual' && (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">

                {/* header: count + bulk actions */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-500">
                    {form.productIds.length} נבחרו · {filteredProducts.length} מסוננים · {allProducts.length} סה&quot;כ
                  </span>
                  <div className="flex gap-1">
                    <button type="button" onClick={selectAllFiltered}
                      className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold">
                      ✓ בחר הכל ({filteredProducts.length})
                    </button>
                    <button type="button" onClick={deselectAllFiltered}
                      className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200">
                      הסר סימון
                    </button>
                  </div>
                </div>

                {/* search */}
                <input
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setVisibleCount(50); }}
                  placeholder="חפש לפי שם או SKU..."
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                />

                {/* filters + sort */}
                <div className="flex gap-2 flex-wrap">
                  <select value={filterCat}
                    onChange={e => { setFilterCat(e.target.value); setVisibleCount(50); }}
                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-white flex-1 min-w-[120px]">
                    <option value="">כל הקטגוריות</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={filterSource}
                    onChange={e => { setFilterSource(e.target.value); setVisibleCount(50); }}
                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-white flex-1 min-w-[110px]">
                    <option value="">כל המקורות</option>
                    {allSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={sortBy}
                    onChange={e => { setSortBy(e.target.value as typeof sortBy); setVisibleCount(50); }}
                    className="border border-gray-200 rounded px-2 py-1 text-xs bg-white flex-1 min-w-[130px]">
                    <option value="oldest">ישן → חדש (מלאי תקוע)</option>
                    <option value="stock">מלאי גבוה</option>
                    <option value="price">מחיר גבוה</option>
                    <option value="name">שם א-ת</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={hideOnSale}
                      onChange={e => { setHideOnSale(e.target.checked); setVisibleCount(50); }}
                      className="shrink-0" />
                    הסתר כבר במבצע
                  </label>
                </div>

                {/* product list */}
                {productsLoading ? (
                  <div className="text-xs text-gray-400 py-3 text-center">טוען מוצרים...</div>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto border border-gray-100 rounded divide-y divide-gray-50">
                      {visibleProducts.map(p => {
                        const months   = monthsInStock(p.createdAt);
                        const stockNum = typeof p.inStock === 'number' ? p.inStock : null;
                        const checked  = form.productIds.includes(p.id);
                        return (
                          <label key={p.id}
                            className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 transition-colors ${checked ? 'bg-blue-50 border-r-2 border-blue-400' : 'hover:bg-gray-50'}`}>
                            <input type="checkbox" checked={checked}
                              onChange={() => toggleProduct(p.id)} className="shrink-0" />
                            {p.imgUrl
                              ? <img src={p.imgUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-gray-100" />
                              : <div className="w-8 h-8 rounded bg-gray-100 shrink-0 flex items-center justify-center text-gray-300 font-bold text-base">{(p.name ?? '?')[0]}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium text-gray-800">{p.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-gray-400 flex-wrap">
                                {p.cat && <span>{p.cat}</span>}
                                {p.source && <span className="text-gray-300">·</span>}
                                {p.source && <span>{p.source}</span>}
                                {p.isOnSale && <span className="text-orange-500 font-bold">· במבצע</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-right space-y-0.5">
                              <div className="font-bold text-gray-700">{formatPrice(p.price)}</div>
                              <div className={stockNum != null && stockNum > 0 ? 'text-green-600' : 'text-red-400'}>
                                {stockNum != null ? `${stockNum} יח'` : isInStock(p) ? '● במלאי' : '● חסר'}
                              </div>
                              {months != null && (
                                <div className={`text-gray-400 ${months >= 3 ? 'text-amber-600 font-bold' : ''}`}>
                                  {months === 0 ? '< חודש' : `${months} חודשים`}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <div className="text-xs text-gray-400 py-4 text-center">לא נמצאו מוצרים</div>
                      )}
                    </div>
                    {filteredProducts.length > visibleCount && (
                      <button type="button" onClick={() => setVisibleCount(n => n + 50)}
                        className="w-full text-xs text-blue-600 hover:text-blue-800 py-1.5 border border-blue-200 rounded hover:bg-blue-50">
                        טען עוד 50 (מוצג {visibleCount} מתוך {filteredProducts.length})
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'צור מבצע'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* ── promotions list ── */}
      {promotions.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          אין מבצעים עדיין — צור את הראשון
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map(promo => (
            <div
              key={promo.id}
              className={`bg-white rounded-xl shadow p-4 border-r-4 ${
                promo.active ? 'border-green-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-800">{promo.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      promo.active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {promo.active ? '● פעיל' : '○ לא פעיל'}
                    </span>
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {promo.discountValue}% הנחה
                    </span>
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {promo.applyTo === 'all_in_stock' ? 'כל המלאי' : `${promo.productIds?.length ?? 0} מוצרים`}
                    </span>
                    {promo.affectedCount != null && promo.affectedCount > 0 && (
                      <span className="text-xs text-gray-400">
                        ({promo.affectedCount} מוצרים פעילים)
                      </span>
                    )}
                  </div>
                  {promo.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{promo.description}</div>
                  )}
                  {(promo.startsAt || promo.endsAt) && (
                    <div className="text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">
                      {promo.startsAt && new Date(promo.startsAt).toLocaleString('he-IL')}
                      {promo.startsAt && promo.endsAt && ' → '}
                      {promo.endsAt && new Date(promo.endsAt).toLocaleString('he-IL')}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => applyPromotionToProducts(promo, !promo.active)}
                    disabled={applying === promo.id}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                      promo.active
                        ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                        : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                    } disabled:opacity-50`}
                  >
                    {applying === promo.id
                      ? '⏳ מעבד...'
                      : promo.active
                        ? '🔴 כבה מבצע'
                        : '🟢 הפעל מבצע'}
                  </button>
                  {deleteConfirm === promo.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(promo)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                      >
                        אישור מחיקה
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(promo.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      🗑️ מחק
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
