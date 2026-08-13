'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, getEventKippahPricePerUnit, type CartItem } from '../contexts/CartContext';
import dynamic from 'next/dynamic';
import type { KippaDesign } from '../designer/utils/types';
// עורך כיפה — נטען רק כשעורכים עיצוב קיים (ssr:false — canvas)
const KippaDesignModal = dynamic(() => import('../designer/components/KippaDesignModal'), { ssr: false });
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';
import { isBulkEventKippotLine } from '@/app/lib/kippot';
import DeliveryEstimate from '../components/DeliveryEstimate';
import PaymentMethodsRow from '../components/trust/PaymentMethodsRow';
import TrustCluster from '../components/trust/TrustCluster';
import ReviewProof from '../components/trust/ReviewProof';
import PageFaqSection from '../components/faq/PageFaqSection';

export default function CartPage() {
  const router = useRouter();
  const {
    items, removeItem, updateQty, total,
    bundleDiscountAmount,
    giftEnabled, giftEligible, giftThreshold, amountToGift, selectedGift, setSelectedGift,
    appliedCoupon, setAppliedCoupon, couponInput, setCouponInput, applyCoupon, couponLoading, couponError,
    discountAmount, simchaResult,
  } = useCart();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [isMobile, setIsMobile] = useState(false);
  // עריכת עיצוב כיפה קיים מהסל (תוספת אדיטיבית)
  const [editingDesignItem, setEditingDesignItem] = useState<CartItem | null>(null);

  function saveEditedDesign(design: KippaDesign) {
    const item = editingDesignItem;
    if (!item) return;
    removeItem(item.id);
    removeItem(`print-${item.id}`);
    const material = /סאטן|סטאן|סטן/.test(item.name || '') ? 'satin' as const : 'linen' as const;
    const unitPrice = getEventKippahPricePerUnit(item.price, design.quantity, material);
    addItem({ ...item, price: unitPrice, quantity: design.quantity, customDesign: design });
    addItem({
      id: `print-${item.id}`, name: 'הדפסה לכיפות — עיצוב מהעורך (כלול במחיר)', price: 0,
      quantity: design.quantity, cat: 'הדפסה', imgUrl: design.previewImageUrl,
      printCustomization: {
        uploadedImageUrl: design.previewImageUrl, originalImageUrl: design.previewImageUrl,
        productType: 'כיפות', side: 'front', bgRemoved: false,
        designText: design.text, mockupUrl: design.previewImageUrl,
      },
    });
    setEditingDesignItem(null);
  }
  // PERF (CLS ~4.3 on /cart): on a hard load the SSR HTML painted the
  // "empty cart" state in a desktop 2-column grid, then flipped to the real
  // items + mobile 1-column layout after hydration. Gate the cart body behind
  // `hydrated` (set in the same effect flush that reads localStorage items and
  // window width), so the first painted state is already the correct one.
  const [hydrated, setHydrated] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [giftOptions, setGiftOptions] = useState<{ id: string; name: string; imgUrl?: string; productId?: string }[]>([]);

  async function shareCart() {
    setShareLoading(true);
    try {
      const res = await fetch('/api/save-cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await res.json();
      if (!res.ok || !data.cartId) {
        console.error('[shareCart] API error:', data.error);
        alert('שגיאה ביצירת קישור שיתוף: ' + (data.error || 'שגיאת שרת'));
        return;
      }
      setShareUrl(`${window.location.origin}/shared-cart/${data.cartId}`);
    } catch (err) {
      console.error('[shareCart]', err);
      alert('שגיאה ביצירת קישור שיתוף');
    } finally {
      setShareLoading(false);
    }
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setHydrated(true); }, []);

  // Fetch gift options from Firestore
  useEffect(() => {
    getDoc(doc(db, 'siteConfig', 'gifts'))
      .then(snap => { if (snap.exists()) setGiftOptions(snap.data().options ?? []); })
      .catch(() => {});
  }, []);

  // Auto-select when exactly one gift option and user becomes eligible
  useEffect(() => {
    if (giftEligible && giftOptions.length === 1 && !selectedGift) {
      setSelectedGift(giftOptions[0].id);
    }
  }, [giftEligible, giftOptions, selectedGift, setSelectedGift]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  // משלוח יחושב בדף התשלום בלבד אחרי שהלקוח יבחר בין איסוף לבית
  // Final total shown in cart: products - coupon (ללא משלוח עדיין)
  const cartFinalTotal = total - discountAmount;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f4',
      direction: 'rtl',
      fontFamily: "'Heebo', Arial, sans-serif",
      overflowX: 'hidden',
      maxWidth: '100vw',
    }}>

      {/* Header */}
      <div style={{ background: 'var(--ys-dark-surface)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Your Sofer</div>
          <div style={{ fontSize: 9, color: 'var(--ys-accent)', fontWeight: 700 }}>ישראל ✡</div>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginRight: 16 }}>🛒 סל הקניות</h1>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1100,
        margin: '20px auto',
        padding: isMobile ? '0 12px' : '0 16px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 320px',
        gap: 20,
        alignItems: 'start',
        boxSizing: 'border-box',
        width: '100%',
      }}>

        {!hydrated ? (
          /* Neutral placeholder — spans both grid columns, so the desktop→mobile
             column flip and the localStorage items appearing never paint a wrong
             intermediate state. Replaced in the very next frame after hydration. */
          <div style={{ gridColumn: '1 / -1', minHeight: '55vh' }} />
        ) : items.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: isMobile ? 32 : 60, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>הסל שלך ריק</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>הוסף מוצרים מהחנות כדי להתחיל</div>
            <button onClick={() => router.push('/')}
              style={{ background: '#FFFFFF', color: 'var(--ys-text)', border: '1.5px solid #E7E2D8', borderRadius: 12, height: 48, padding: '0 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              המשך בקנייה
            </button>
          </div>
        ) : (
          <>
            {/* ── Product list ── */}
            <div style={{ minWidth: 0 }}>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #ddd', padding: '14px 16px', marginBottom: 12 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f1111', margin: 0 }}>סל הקניות ({totalItems} פריטים)</h2>
              </div>

              {bundleDiscountAmount > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🎁</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#15803d' }}>מבצע כיפות חבילות הופעל!</div>
                    <div style={{ fontSize: 12, color: '#166534' }}>מחיר חבילה מיוחד הופעל — חיסכון של ₪{bundleDiscountAmount.toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    padding: isMobile ? '12px' : '16px 20px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 10 : 16,
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                  }}>

                    {isMobile ? (
                      /* ── Mobile card layout ── */
                      <>
                        {/* Top row: image + name + price */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          {/* Image */}
                          <div
                            onClick={() => router.push(`/product/${item.id}`)}
                            style={{ width: 80, height: 80, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }}>
                            {item.imgUrl ? (
                              <img src={optimizeCloudinaryUrl(item.imgUrl, 100)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => (e.currentTarget.style.display = 'none')} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📦</div>
                            )}
                          </div>

                          {/* Name + price */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              onClick={() => router.push(`/product/${item.id}`)}
                              style={{ fontSize: 14, fontWeight: 600, color: '#0f1111', lineHeight: 1.4, cursor: 'pointer', marginBottom: 4 }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 11, color: '#1a6b3c', marginBottom: 2 }}>✓ במלאי</div>
                          {item.embroideryText && (
                            <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4 }}>✍️ ריקמה: {item.embroideryText}</div>
                          )}
                          {item.customDesign && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '5px 8px', marginBottom: 4 }}>
                              <img src={optimizeCloudinaryUrl(item.customDesign.previewImageUrl, 60)} alt="עיצוב הכיפה" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #c4b5fd', background: '#fff' }} />
                              <div style={{ fontSize: 11, color: '#5b21b6', fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                🎨 עיצוב אישי: „{item.customDesign.text}"
                              </div>
                              <button onClick={() => setEditingDesignItem(item)}
                                style={{ background: 'none', border: '1px solid #8b5cf6', color: '#6d28d9', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
                                ערוך עיצוב
                              </button>
                            </div>
                          )}
                          {item.threadColor && (
                            <div style={{ fontSize: 11, color: '#92400e', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #ccc', background: item.threadColor.hex, display: 'inline-block', flexShrink: 0 }} />
                              צבע חוט: {item.threadColor.id} - {item.threadColor.name}
                            </div>
                          )}
                          {item.embroideryOptions && item.embroideryOptions.length > 0 && (
                            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                              תוספת רקמה ({item.embroideryOptions.join(' + ')}): +₪{item.embroiderySurcharge ?? item.embroideryOptions.length * 50}
                            </div>
                          )}
                          {item.embossingText && (
                            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                              🔖 הטבעה: {item.embossingText} ({item.embossingColor === 'silver' ? 'כסף' : 'זהב'}) +₪{item.embossingSurcharge ?? 15}
                            </div>
                          )}
                          {item.selectedCover && (
                            <div style={{ fontSize: 11, color: '#5B4B12', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              כיסוי נבחר:
                              <img src={optimizeCloudinaryUrl(item.selectedCover.imgUrl, 40)} alt={item.selectedCover.name}
                                style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover', border: '1px solid #ddd' }} />
                              {item.selectedCover.name}
                            </div>
                          )}
                          {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                            <div style={{ fontSize: 11, color: '#5B4B12', fontWeight: 600, marginBottom: 4 }}>
                              {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </div>
                          )}
                          {(item.selectedAddons ?? []).map(a => (
                            <div key={a.id} style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                              ✨ {a.label}{a.text ? `: „${a.text}"` : ''} — {a.pricing === 'perUnit' ? `+₪${a.price} ליחידה` : `+₪${a.price} חד־פעמי`}
                            </div>
                          ))}
                            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ys-text)' }}>
                              {formatPrice(item.price * item.quantity + (item.addonsFlatSurcharge ?? 0))}
                            </div>
                            {item.quantity > 1 && (
                              <div style={{ fontSize: 11, color: '#888' }}>{formatPrice(item.price)} × {item.quantity}{(item.addonsFlatSurcharge ?? 0) > 0 ? ` + ₪${item.addonsFlatSurcharge} חד־פעמי` : ''}</div>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: qty controls + actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                          {/* Qty stepper */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                            <button onClick={() => updateQty(item.id, item.quantity - 1)} aria-label={`הקטנת כמות של ${item.name}`}
                              style={{ width: 34, height: 34, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>−</button>
                            <span aria-live="polite" style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd', lineHeight: '34px' }}>
                              {item.quantity}
                            </span>
                            <button onClick={() => updateQty(item.id, item.quantity + 1)} aria-label={`הגדלת כמות של ${item.name}`}
                              style={{ width: 34, height: 34, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>+</button>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => removeItem(item.id)} aria-label={`הסרת ${item.name} מהסל`}
                              style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                              הסר
                            </button>
                            <button onClick={() => router.push(`/product/${item.id}`)}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                              פרטים
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* ── Desktop row layout ── */
                      <>
                        {/* Image */}
                        <div style={{ width: 100, height: 100, background: '#f7f8f8', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }}
                          onClick={() => router.push(`/product/${item.id}`)}>
                          {item.imgUrl ? (
                            <img src={optimizeCloudinaryUrl(item.imgUrl, 100)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📦</div>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div onClick={() => router.push(`/product/${item.id}`)}
                            style={{ fontSize: 15, fontWeight: 600, color: '#0f1111', marginBottom: 6, cursor: 'pointer', lineHeight: 1.4 }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#0e6ba8')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#0f1111')}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#1a6b3c', marginBottom: item.embroideryText || item.embossingText || item.selectedCover ? 4 : 10 }}>✓ במלאי</div>
                          {/* כיפות לאירועים בכמויות — מחיר מדרגות; קופונים לא חלים */}
                          {isBulkEventKippotLine(item) && (
                            <div style={{ fontSize: 11.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '3px 8px', display: 'inline-block', fontWeight: 700, marginBottom: 6 }}>
                              🏷️ הנחת כמות כלולה במחיר — קוד קופון לא חל על פריט זה
                            </div>
                          )}
                          {item.embroideryText && (
                            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 6 }}>✍️ ריקמה: {item.embroideryText}</div>
                          )}
                          {item.customDesign && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 10px', marginBottom: 6, maxWidth: 420 }}>
                              <img src={optimizeCloudinaryUrl(item.customDesign.previewImageUrl, 80)} alt="עיצוב הכיפה" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid #c4b5fd', background: '#fff' }} />
                              <div style={{ fontSize: 12, color: '#5b21b6', fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                🎨 עיצוב אישי: „{item.customDesign.text}"
                              </div>
                              <button onClick={() => setEditingDesignItem(item)}
                                style={{ background: 'none', border: '1px solid #8b5cf6', color: '#6d28d9', fontSize: 12, fontWeight: 700, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                                ערוך עיצוב
                              </button>
                            </div>
                          )}
                          {item.threadColor && (
                            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #ccc', background: item.threadColor.hex, display: 'inline-block', flexShrink: 0 }} />
                              צבע חוט: {item.threadColor.id} - {item.threadColor.name}
                            </div>
                          )}
                          {item.embroideryOptions && item.embroideryOptions.length > 0 && (
                            <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                              תוספת רקמה ({item.embroideryOptions.join(' + ')}): +₪{item.embroiderySurcharge ?? item.embroideryOptions.length * 50}
                            </div>
                          )}
                          {item.embossingText && (
                            <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                              🔖 הטבעה: {item.embossingText} ({item.embossingColor === 'silver' ? 'כסף' : 'זהב'}) +₪{item.embossingSurcharge ?? 15}
                            </div>
                          )}
                          {item.selectedCover && (
                            <div style={{ fontSize: 11, color: '#5B4B12', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                              כיסוי נבחר:
                              <img src={optimizeCloudinaryUrl(item.selectedCover.imgUrl, 40)} alt={item.selectedCover.name}
                                style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover', border: '1px solid #ddd' }} />
                              {item.selectedCover.name}
                            </div>
                          )}
                          {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                            <div style={{ fontSize: 12, color: '#5B4B12', fontWeight: 600, marginBottom: 6 }}>
                              {Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </div>
                          )}
                          {(item.selectedAddons ?? []).map(a => (
                            <div key={a.id} style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                              ✨ {a.label}{a.text ? `: „${a.text}"` : ''} — {a.pricing === 'perUnit' ? `+₪${a.price} ליחידה` : `+₪${a.price} חד־פעמי`}
                            </div>
                          ))}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                              <button onClick={() => updateQty(item.id, item.quantity - 1)} aria-label={`הקטנת כמות של ${item.name}`}
                                style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>−</button>
                              <span aria-live="polite" style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 700, borderRight: '1px solid #ddd', borderLeft: '1px solid #ddd', lineHeight: '32px' }}>
                                {item.quantity}
                              </span>
                              <button onClick={() => updateQty(item.id, item.quantity + 1)} aria-label={`הגדלת כמות של ${item.name}`}
                                style={{ width: 32, height: 32, background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#333' }}>+</button>
                            </div>
                            <span style={{ color: '#ddd' }} aria-hidden="true">|</span>
                            <button onClick={() => removeItem(item.id)} aria-label={`הסרת ${item.name} מהסל`}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#0e6ba8')}>
                              הסר
                            </button>
                            <button onClick={() => router.push(`/product/${item.id}`)}
                              style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                              פרטי מוצר
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ys-text)' }}>{formatPrice(item.price * item.quantity + (item.addonsFlatSurcharge ?? 0))}</div>
                          {item.quantity > 1 && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{formatPrice(item.price)} × {item.quantity}{(item.addonsFlatSurcharge ?? 0) > 0 ? ` + ₪${item.addonsFlatSurcharge} חד־פעמי` : ''}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <button onClick={() => router.push('/')}
                  style={{ background: 'none', border: 'none', color: '#0e6ba8', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                  ← המשך בקנייה
                </button>
              </div>
            </div>

            {/* ── Order summary ── */}
            <div style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '20px',
              position: isMobile ? 'static' : 'sticky',
              top: 20,
            }}>
              {/* Pricing breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ color: '#555' }}>סכום ביניים ({totalItems} פריטים):</span>
                  <span style={{ fontWeight: 700 }}>{formatPrice(total + bundleDiscountAmount)}</span>
                </div>
                {bundleDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#15803d', fontWeight: 700 }}>
                    <span>🎁 מבצע כיפות: 2nd ב-10%, 3+ ב-15%</span>
                    <span>-{formatPrice(bundleDiscountAmount)}</span>
                  </div>
                )}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 10px', marginBottom: 8, fontSize: 12.5, color: '#15803d', fontWeight: 700, textAlign: 'center' }}>
                  💡 אופן המשלוח (משלוח / איסוף) ודמי המשלוח יחושבו בדף התשלום
                </div>
                {appliedCoupon && discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#15803d', fontWeight: 700 }}>
                    <span>{appliedCoupon.type === 'simcha' ? '🎉 הנחת מבצע SIMCHA:' : `🏷️ קופון (${appliedCoupon.type === 'fixed' ? `₪${appliedCoupon.discount}` : `${appliedCoupon.discount}%`}):`}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900 }}>
                    <span>סה"כ לתשלום:</span>
                    <span style={{ color: 'var(--ys-text)' }}>{formatPrice(cartFinalTotal)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>כולל מע״מ</div>
                </div>
              </div>

              {/* Delivery estimate */}
              <div style={{ marginBottom: 16 }}>
                <DeliveryEstimate />
              </div>

              {/* Coupon section */}
              <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>🏷️ קוד קופון</div>
                {appliedCoupon ? (
                  <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>
                      ✓ {appliedCoupon.code} — {appliedCoupon.type === 'simcha' ? 'מבצע אירועים' : `${appliedCoupon.type === 'fixed' ? `₪${appliedCoupon.discount}` : `${appliedCoupon.discount}%`} הנחה`}
                    </span>
                    <button onClick={() => setAppliedCoupon(null)} aria-label="הסרת הקופון" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                  </div>
                  {appliedCoupon.type === 'simcha' && simchaResult && (
                    <div style={{ marginTop: 8, background: simchaResult.totalDiscount > 0 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${simchaResult.totalDiscount > 0 ? '#86efac' : '#fcd34d'}`, borderRadius: 10, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: simchaResult.totalDiscount > 0 ? '#15803d' : '#92400e', marginBottom: Object.keys(simchaResult.lineDiscounts).length > 0 ? 6 : 0 }}>
                        {simchaResult.reason}
                      </div>
                      {Object.keys(simchaResult.lineDiscounts).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {items.filter(i => simchaResult.lineDiscounts[i.id]).map(i => {
                            const d = simchaResult.lineDiscounts[i.id];
                            const orig = i.price * i.quantity;
                            return (
                              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#166534', gap: 8 }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{i.name} ({Math.round(d.percent * 100)}%)</span>
                                <span style={{ whiteSpace: 'nowrap' }}><s style={{ color: '#9ca3af' }}>{formatPrice(orig)}</s> {formatPrice(orig - d.amount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="הזן קוד קופון"
                      style={{ flex: 1, border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: 'ltr', letterSpacing: 1, fontFamily: 'inherit', background: '#fff', color: 'var(--ys-text)' }}
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      style={{ background: '#FFFFFF', color: '#2446A6', border: '1.5px solid #E7E2D8', borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: couponLoading ? 'default' : 'pointer', opacity: couponLoading ? 0.5 : 1, whiteSpace: 'nowrap' }}
                    >
                      {couponLoading ? '...' : 'החל'}
                    </button>
                  </div>
                )}
                {couponError && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 5 }}>{couponError}</div>}
                {/* כיפות לאירועים בכמויות — כבר במחירי מדרגות; קופונים לא חלים עליהן */}
                {appliedCoupon && appliedCoupon.type !== 'simcha' && items.some(isBulkEventKippotLine) && (
                  <div style={{ marginTop: 8, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, fontWeight: 700, lineHeight: 1.6, color: '#92400e' }}>
                    🏷️ הכיפות לאירועים בסל כבר כוללות הנחת כמות (מחיר מדרגות מוזל) — קוד הקופון חל על שאר המוצרים בלבד.
                  </div>
                )}
                {!appliedCoupon && (
                  <div style={{ fontSize: 11, color: '#888', marginTop: 6, lineHeight: 1.5 }}>
                    קוד ההצטרפות של 5% מתקבל לאחר ההצטרפות למועדון ונשלח גם למייל.
                  </div>
                )}
              </div>

              {/* Gift selector */}
              {giftEnabled && (
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #eee' }}>
                  {giftEligible && giftOptions.length > 0 ? (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1a6b3c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        🎁 {giftOptions.length === 1 ? 'קיבלת מתנה חינם!' : 'בחר מתנה חינם!'}
                      </div>
                      {giftOptions.length === 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 10px' }}>
                          {giftOptions[0].imgUrl && (
                            <img src={optimizeCloudinaryUrl(giftOptions[0].imgUrl, 100)} alt={giftOptions[0].name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ys-text)' }}>{giftOptions[0].name}</span>
                          <span style={{ marginRight: 'auto', fontSize: 12, color: '#1a6b3c', fontWeight: 700 }}>חינם</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {giftOptions.map(g => (
                            <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: selectedGift === g.id ? '#f0fdf4' : '#fafafa', border: `1px solid ${selectedGift === g.id ? '#86efac' : '#e0e0e0'}`, borderRadius: 8, padding: '8px 10px' }}>
                              <input type="radio" name="gift" value={g.id} checked={selectedGift === g.id} onChange={() => setSelectedGift(g.id)} style={{ accentColor: '#1a6b3c', flexShrink: 0 }} />
                              {g.imgUrl && <img src={optimizeCloudinaryUrl(g.imgUrl, 100)} alt={g.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ys-text)' }}>{g.name}</span>
                              <span style={{ marginRight: 'auto', fontSize: 12, color: '#1a6b3c', fontWeight: 700 }}>חינם</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  ) : !giftEligible ? (
                    <div dir="rtl" style={{
                      borderRadius: 9999,
                      background:   'var(--ys-dark-surface)',
                      padding:      '9px 12px 9px 10px',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          10,
                    }}>
                      {/* Gift icon + badge */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #C9A227, #E6C25A)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 17,
                        }}>
                          🎁
                        </div>
                        {totalItems > 0 && (
                          <div style={{
                            position: 'absolute', top: -3, right: -3,
                            minWidth: 16, height: 16, borderRadius: 9999,
                            background: '#e53e3e', color: '#fff',
                            fontSize: 9, fontWeight: 800, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 3px',
                            border: '1.5px solid #1a1a1a',
                          }}>
                            {totalItems}
                          </div>
                        )}
                      </div>
                      {/* Text + bar */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                          הוסף עוד{' '}
                          <strong style={{ color: '#E6C25A' }}>{formatPrice(amountToGift)}</strong>
                          {' '}לקבלת מתנה חינם
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 9999, height: 4, overflow: 'hidden' }}>
                          <div style={{
                            background:   'linear-gradient(90deg, #C9A227, #E6C25A)',
                            height:       '100%',
                            width:        `${Math.min(100, (total / giftThreshold) * 100)}%`,
                            borderRadius: 9999,
                            transition:   'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <button
                onClick={() => {
                  window.gtag?.('event', 'begin_checkout', {
                    currency: 'ILS',
                    value: total,
                    items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
                  });
                  router.push('/checkout');
                }}
                style={{ width: '100%', background: '#C9A227', color: '#1F3D8F', border: 'none', borderRadius: 14, height: 52, fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 10 }}>
                המשך לתשלום →
              </button>

              <button onClick={() => router.push('/')}
                style={{ width: '100%', background: '#FFFFFF', color: 'var(--ys-text)', border: '1.5px solid #E7E2D8', borderRadius: 12, height: 48, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                המשך בקנייה
              </button>

              {user?.role === 'admin' && (
                <div style={{ marginTop: 12 }}>
                  {!shareUrl ? (
                    <button onClick={shareCart} disabled={shareLoading} style={{ width: '100%', background: '#f8f4ec', color: 'var(--ys-text)', border: '1.5px solid var(--ys-accent)', borderRadius: 12, height: 44, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: shareLoading ? 0.6 : 1 }}>
                      {shareLoading ? '...' : '🔗 שתף עגלה'}
                    </button>
                  ) : (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>✓ קישור שיתוף מוכן</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input readOnly value={shareUrl} style={{ flex: 1, fontSize: 11, border: '1px solid #d1fae5', borderRadius: 8, padding: '6px 8px', background: '#fff', color: '#333', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                        <button onClick={copyShareUrl} style={{ flexShrink: 0, background: shareCopied ? '#16a34a' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {shareCopied ? '✓ הועתק' : 'העתק'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <PaymentMethodsRow size="md" />
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eee' }}>
                <TrustCluster fontSize={12} />
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <ReviewProof compact />
              </div>
            </div>
          </>
        )}
      </div>

      {/* FAQ ממוקד לעגלה — מבצעים, קופונים, נקודות ומשלוח (מקור: data/faq.ts) */}
      <PageFaqSection pageKey="cart" title="שאלות נפוצות לפני התשלום" max={6} showWhatsAppCta={false} />

      {/* עורך כיפה — עריכת עיצוב קיים מהסל (תוספת אדיטיבית) */}
      {editingDesignItem?.customDesign && (
        <KippaDesignModal
          open={!!editingDesignItem}
          material={/סאטן|סטאן|סטן/.test(editingDesignItem.name || '') ? 'satin' : 'linen'}
          productImageUrl={editingDesignItem.customDesign.productImageUrl || editingDesignItem.imgUrl}
          initialDesign={editingDesignItem.customDesign}
          onSave={saveEditedDesign}
          onClose={() => setEditingDesignItem(null)}
        />
      )}
    </div>
  );
}
