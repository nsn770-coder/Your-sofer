'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';

const NAVY = '#1a1a1a';
const GOLD = '#C5A028';

type ProductType = 'shirt' | 'kipa';
type ShirtColor = 'white' | 'black';
type Side = 'front' | 'back' | 'top' | 'bottom';

const PRINT_PRODUCTS = {
  shirt: {
    name: 'חולצה מודפסת',
    price: 60,
    templates: {
      white: {
        front: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252180/%D7%97%D7%95%D7%9C%D7%A6%D7%AA-%D7%9C%D7%99%D7%99%D7%A7%D7%A8%D7%94-%D7%97%D7%9C%D7%A7%D7%94-4_olpkhm.jpg',
        back: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252180/%D7%9C%D7%91%D7%9F_%D7%9E%D7%90%D7%97%D7%95%D7%A8_pxby0m.jpg',
      },
      black: {
        front: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252181/%D7%97%D7%95%D7%9C%D7%A6%D7%94_%D7%A9%D7%97%D7%95%D7%A8%D7%94_%D7%A7%D7%93%D7%99%D7%9E%D7%94_rarnhj.png',
        back: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252180/%D7%A9%D7%97%D7%95%D7%A8%D7%9E%D7%90%D7%97%D7%95%D7%A8_%D7%97%D7%95%D7%9C%D7%A6%D7%94_heyvn7.jpg',
      },
    },
    printArea: { top: '28%', left: '30%', width: '40%', height: '42%' },
  },
  kipa: {
    name: 'הדפסה על כיפה',
    price: 10,      // ₪10 per unit for < 100 units
    bulkPrice: 4.5, // ₪4.5 per unit for 100+ units
    bulkMinQty: 100,
    templates: {
      top: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252683/%D7%9B%D7%99%D7%A4%D7%94_%D7%90%D7%A4%D7%95%D7%A8%D7%94_%D7%94%D7%93%D7%A4%D7%A1%D7%94_shpljn.jpg',
      bottom: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1780252910/%D7%AA%D7%9E%D7%95%D7%A0%D7%94_%D7%9B%D7%99%D7%A4%D7%94_%D7%94%D7%A4%D7%95%D7%9A_zutxnt.jpg',
    },
    printArea: { top: '20%', left: '20%', width: '60%', height: '60%' },
  },
} as const;

function getTemplateUrl(pt: ProductType, color: ShirtColor, side: Side): string {
  if (pt === 'shirt') {
    return PRINT_PRODUCTS.shirt.templates[color][side as 'front' | 'back'];
  }
  return PRINT_PRODUCTS.kipa.templates[side as 'top' | 'bottom'];
}

function getPrintArea(pt: ProductType) {
  return PRINT_PRODUCTS[pt].printArea;
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: done ? GOLD : active ? NAVY : '#E5E7EB',
        color: done ? NAVY : active ? '#fff' : '#9CA3AF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 14, transition: 'all 0.2s',
      }}>
        {done ? '✓' : n}
      </div>
    </div>
  );
}

export default function PrintOrderPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [color, setColor] = useState<ShirtColor>('white');
  const [side, setSide] = useState<Side>('front');
  const [qty, setQty] = useState(1);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [bgRemovedUrl, setBgRemovedUrl] = useState<string | null>(null);
  const [bgRemoveChecked, setBgRemoveChecked] = useState(false);
  const [showBgRemoved, setShowBgRemoved] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'preview' | 'image'>('preview');
  const [added, setAdded] = useState(false);

  // Drag & resize state
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Refs for drag logic (avoid stale closures in window listeners)
  const imgPosRef = useRef({ x: 0, y: 0 });
  const imgScaleRef = useRef(1);
  const imgRotationRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPinchingRef = useRef(false);
  const dragOriginRef = useRef({ mouseX: 0, mouseY: 0, imgX: 0, imgY: 0 });
  const pinchStartRef = useRef({ dist: 1, angle: 0, scale: 1, rotation: 0 });
  const printAreaRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { addItem } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kipaUnitPrice = qty >= PRINT_PRODUCTS.kipa.bulkMinQty ? PRINT_PRODUCTS.kipa.bulkPrice : PRINT_PRODUCTS.kipa.price;
  const kipaTotal = kipaUnitPrice * qty;

  // Global mouse listeners for drag (added once, use refs)
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragOriginRef.current.mouseX;
      const dy = e.clientY - dragOriginRef.current.mouseY;
      const newPos = { x: dragOriginRef.current.imgX + dx, y: dragOriginRef.current.imgY + dy };
      imgPosRef.current = newPos;
      setImgPos(newPos);
    }
    function onMouseUp() {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleOverlayMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragOriginRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      imgX: imgPosRef.current.x,
      imgY: imgPosRef.current.y,
    };
  }

  function handleOverlayTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      isDraggingRef.current = false;
      setIsDragging(false);
      isPinchingRef.current = true;
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      pinchStartRef.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        angle: Math.atan2(dy, dx) * (180 / Math.PI),
        scale: imgScaleRef.current,
        rotation: imgRotationRef.current,
      };
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];
      isDraggingRef.current = true;
      setIsDragging(true);
      dragOriginRef.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        imgX: imgPosRef.current.x,
        imgY: imgPosRef.current.y,
      };
    }
  }

  function handleOverlayTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const { dist: startDist, angle: startAngle, scale: startScale, rotation: startRotation } = pinchStartRef.current;
      const newScale = Math.min(3, Math.max(0.25, startScale * (dist / startDist)));
      const newRotation = startRotation + (angle - startAngle);
      imgScaleRef.current = newScale;
      imgRotationRef.current = newRotation;
      setImgScale(newScale);
      setImgRotation(newRotation);
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragOriginRef.current.mouseX;
      const dy = touch.clientY - dragOriginRef.current.mouseY;
      const newPos = { x: dragOriginRef.current.imgX + dx, y: dragOriginRef.current.imgY + dy };
      imgPosRef.current = newPos;
      setImgPos(newPos);
    }
  }

  function handleOverlayTouchEnd() {
    isDraggingRef.current = false;
    isPinchingRef.current = false;
    setIsDragging(false);
  }

  function resetImageTransform() {
    const zero = { x: 0, y: 0 };
    imgPosRef.current = zero;
    imgScaleRef.current = 1;
    imgRotationRef.current = 0;
    setImgPos(zero);
    setImgScale(1);
    setImgRotation(0);
  }

  function selectProduct(pt: ProductType) {
    setProductType(pt);
    setSide(pt === 'shirt' ? 'front' : 'top');
    setStep(2);
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objUrl = URL.createObjectURL(file);
    setLocalUrl(objUrl);
    setUploadedUrl(null);
    setOriginalUrl(null);
    setBgRemovedUrl(null);
    setBgRemoveChecked(false);
    setShowBgRemoved(false);
    setUploadError(null);
    setUploading(true);
    // Reset position/scale/rotation for new image
    const zero = { x: 0, y: 0 };
    imgPosRef.current = zero;
    imgScaleRef.current = 1;
    imgRotationRef.current = 0;
    setImgPos(zero);
    setImgScale(1);
    setImgRotation(0);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload-print-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'שגיאת העלאה');
      setUploadedUrl(data.url as string);
      setOriginalUrl(data.url as string);
    } catch {
      setUploadError('שגיאה בהעלאת התמונה — נסה שוב');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleBgRemoveToggle = useCallback(async (checked: boolean) => {
    setBgRemoveChecked(checked);
    if (!checked) { setShowBgRemoved(false); return; }
    if (bgRemovedUrl) { setShowBgRemoved(true); return; }

    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setRemovingBg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/remove-bg', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'שגיאה');
      setBgRemovedUrl(data.url as string);
      setUploadedUrl(data.url as string);
      setShowBgRemoved(true);
    } catch {
      setBgRemoveChecked(false);
      setUploadError('שגיאה בהסרת הרקע');
    } finally {
      setRemovingBg(false);
    }
  }, [bgRemovedUrl]);

  function handleAddToCart() {
    if (!productType) return;
    const imageUrl = uploadedUrl || localUrl || '';
    const templateUrl = getTemplateUrl(productType, color, side);

    const el = printAreaRef.current;
    const imageX = el ? (imgPosRef.current.x / el.offsetWidth) * 100 : 0;
    const imageY = el ? (imgPosRef.current.y / el.offsetHeight) * 100 : 0;

    const name = productType === 'shirt'
      ? `חולצה מודפסת - ${color === 'white' ? 'לבן' : 'שחור'} - ${side === 'front' ? 'קדימה' : 'מאחורה'}`
      : `הדפסה על כיפה × ${qty}`;

    const price = productType === 'shirt' ? PRINT_PRODUCTS.shirt.price : kipaUnitPrice;
    const itemQty = productType === 'shirt' ? 1 : qty;

    addItem({
      id: `print-${productType}-${Date.now()}`,
      name,
      price,
      imgUrl: templateUrl,
      quantity: itemQty,
      printCustomization: {
        productType,
        side,
        color: productType === 'shirt' ? color : undefined,
        uploadedImageUrl: imageUrl,
        bgRemoved: bgRemoveChecked && !!bgRemovedUrl,
        originalImageUrl: originalUrl || imageUrl,
        imageX,
        imageY,
        imageScale: imgScale,
        imageRotation: imgRotation,
      },
    });
    setAdded(true);
    setTimeout(() => router.push('/cart'), 600);
  }

  const displayImageUrl = showBgRemoved && bgRemovedUrl ? bgRemovedUrl : localUrl;
  const templateUrl = productType ? getTemplateUrl(productType, color, side) : '';
  const printArea = productType ? getPrintArea(productType) : null;
  const overlayActive = isDragging || isHovering;

  return (
    <div dir="rtl" style={{ background: '#F5F2EC', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background: NAVY, padding: '32px 16px 28px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: '0 0 8px' }}>הדפסות לאירועים</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>חולצות וכיפות עם הדפסה אישית לכל אירוע</p>
      </div>

      {/* Step indicator */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E7E2D8', padding: '16px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {([1, 2, 3] as const).map((n, i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
              <StepDot n={n} active={step === n} done={step > n} />
              {i < 2 && <div style={{ width: 48, height: 2, background: step > n ? GOLD : '#E5E7EB', margin: '0 4px', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 8 }}>
          {['בחירת מוצר', 'פרטי מוצר', 'העלאת תמונה'].map((label, i) => (
            <span key={i} style={{ fontSize: 11, color: step === i + 1 ? NAVY : '#9CA3AF', fontWeight: step === i + 1 ? 700 : 400, textAlign: 'center' }}>{label}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* ── STEP 1: Product Selection ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: NAVY, marginBottom: 20, textAlign: 'center' }}>בחרו מוצר</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <button onClick={() => selectProduct('shirt')}
                style={{ background: '#fff', border: `2px solid ${productType === 'shirt' ? GOLD : '#E7E2D8'}`, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: productType === 'shirt' ? `0 0 0 3px ${GOLD}33` : '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👕</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: NAVY, marginBottom: 6 }}>חולצה מודפסת</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>₪60</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>לפריט</div>
              </button>
              <button onClick={() => selectProduct('kipa')}
                style={{ background: '#fff', border: `2px solid ${productType === 'kipa' ? GOLD : '#E7E2D8'}`, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: productType === 'kipa' ? `0 0 0 3px ${GOLD}33` : '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🥷</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: NAVY, marginBottom: 6 }}>הדפסה על כיפה</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: GOLD }}>₪20 / כיפה</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>₪10 ל-20+ כיפות</div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Product Details ── */}
        {step === 2 && productType && (
          <div>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, marginBottom: 16, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              → חזור לבחירת מוצר
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: NAVY, marginBottom: 20 }}>פרטי המוצר</h2>

            {productType === 'shirt' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>צבע החולצה</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['white', 'black'] as ShirtColor[]).map(c => (
                      <button key={c} onClick={() => setColor(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', border: `2px solid ${color === c ? GOLD : '#E7E2D8'}`, background: color === c ? '#FEF9EC' : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: color === c ? 700 : 400, color: NAVY, fontSize: 14, transition: 'all 0.15s' }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', background: c === 'white' ? '#F3F4F6' : '#111', border: '1.5px solid #ccc', flexShrink: 0 }} />
                        {c === 'white' ? 'לבן' : 'שחור'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>צד הדפסה</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['front', 'back'] as const).map(s => (
                      <button key={s} onClick={() => setSide(s)}
                        style={{ flex: 1, padding: '12px 8px', border: `2px solid ${side === s ? GOLD : '#E7E2D8'}`, background: side === s ? '#FEF9EC' : '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={PRINT_PRODUCTS.shirt.templates[color][s]} alt={s === 'front' ? 'קדימה' : 'מאחורה'} style={{ width: 80, height: 80, objectFit: 'cover' }} />
                        <span style={{ fontSize: 13, fontWeight: side === s ? 700 : 400, color: NAVY }}>{s === 'front' ? 'קדימה' : 'מאחורה'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {productType === 'kipa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>מיקום ההדפסה</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['top', 'bottom'] as const).map(s => (
                      <button key={s} onClick={() => setSide(s)}
                        style={{ flex: 1, padding: '12px 8px', border: `2px solid ${side === s ? GOLD : '#E7E2D8'}`, background: side === s ? '#FEF9EC' : '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={PRINT_PRODUCTS.kipa.templates[s]} alt={s === 'top' ? 'חלק עליון' : 'חלק תחתון'} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%' }} />
                        <span style={{ fontSize: 13, fontWeight: side === s ? 700 : 400, color: NAVY }}>{s === 'top' ? 'חלק עליון' : 'חלק תחתון'}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>כמות כיפות</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, border: `1.5px solid ${NAVY}`, background: 'none', color: NAVY, fontSize: 20, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 20, fontWeight: 900, color: NAVY, minWidth: 32, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, border: `1.5px solid ${NAVY}`, background: 'none', color: NAVY, fontSize: 20, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <div style={{ marginTop: 12, padding: '12px 16px', background: '#FEF9EC', border: `1px solid ${GOLD}66` }}>
                    <div style={{ fontSize: 13, color: '#6B5A1A' }}>
                      {qty >= PRINT_PRODUCTS.kipa.bulkMinQty
                        ? <><strong>מחיר מיוחד!</strong> ₪{kipaUnitPrice} לכיפה (הנחת כמות)</>
                        : <>₪{kipaUnitPrice} לכיפה — הזמן 20+ לקבלת מחיר ₪10 לכיפה</>
                      }
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: NAVY, marginTop: 6 }}>סה&quot;כ: ₪{kipaTotal}</div>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setStep(3)}
              style={{ marginTop: 28, width: '100%', padding: '14px 0', background: NAVY, color: '#fff', border: 'none', fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>
              הבא: העלאת תמונה ←
            </button>
          </div>
        )}

        {/* ── STEP 3: Image Upload ── */}
        {step === 3 && productType && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 13, marginBottom: 16, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              → חזור לפרטי מוצר
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: NAVY, marginBottom: 20 }}>העלאת תמונה</h2>

            {/* File input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${localUrl ? GOLD : '#C9C4BB'}`, padding: '28px', textAlign: 'center', cursor: 'pointer', background: localUrl ? '#FEF9EC' : '#fff', marginBottom: 20, transition: 'all 0.2s' }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {localUrl ? (
                <div style={{ fontSize: 14, color: NAVY, fontWeight: 700 }}>✓ תמונה נבחרה — לחץ להחלפה</div>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 4 }}>לחץ לבחירת תמונה</div>
                  <div style={{ fontSize: 12, color: '#888' }}>JPG, PNG, WEBP — עד 10MB</div>
                </>
              )}
            </div>

            {uploading && (
              <div style={{ textAlign: 'center', padding: '12px', color: NAVY, fontSize: 13, marginBottom: 16 }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginLeft: 6 }}>⟳</span> מעלה תמונה...
              </div>
            )}
            {uploadError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{uploadError}</div>
            )}

            {/* Preview section */}
            {localUrl && printArea && (
              <div style={{ marginBottom: 20 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
                  {(['preview', 'image'] as const).map(tab => (
                    <button key={tab} onClick={() => setPreviewTab(tab)}
                      style={{ flex: 1, padding: '9px 0', border: `1.5px solid ${NAVY}`, borderLeft: tab === 'image' ? 'none' : undefined, background: previewTab === tab ? NAVY : '#fff', color: previewTab === tab ? '#fff' : NAVY, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {tab === 'preview' ? 'תצוגה מקדימה' : 'תמונה בלבד'}
                    </button>
                  ))}
                </div>

                {previewTab === 'preview' ? (
                  <div>
                    {/* Template + overlay */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto', display: 'block', userSelect: 'none' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={templateUrl} alt="תבנית" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />

                      {/* Draggable print area */}
                      <div
                        ref={printAreaRef}
                        onMouseDown={handleOverlayMouseDown}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        onTouchStart={handleOverlayTouchStart}
                        onTouchMove={handleOverlayTouchMove}
                        onTouchEnd={handleOverlayTouchEnd}
                        style={{
                          position: 'absolute',
                          top: printArea.top,
                          left: printArea.left,
                          width: printArea.width,
                          height: printArea.height,
                          overflow: 'hidden',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          outline: overlayActive ? `2px dashed ${GOLD}` : '2px dashed transparent',
                          outlineOffset: '-2px',
                          transition: 'outline-color 0.15s',
                          touchAction: 'none',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={displayImageUrl || localUrl}
                          alt="תמונה מועלית"
                          draggable={false}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            opacity: 0.6,
                            transform: `translate(calc(-50% + ${imgPos.x}px), calc(-50% + ${imgPos.y}px)) scale(${imgScale}) rotate(${imgRotation}deg)`,
                            transformOrigin: 'center center',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* Hint text */}
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 6 }}>
                      גרור להזזה • צבוט בשתי אצבעות לזום וסיבוב
                    </div>

                    {/* Scale slider */}
                    <div style={{ marginTop: 14, background: '#fff', padding: '14px 16px', border: '1px solid #E7E2D8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>גודל התמונה</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, color: '#555', minWidth: 36, textAlign: 'center' }}>{Math.round(imgScale * 100)}%</span>
                          <button
                            onClick={resetImageTransform}
                            style={{ fontSize: 11, background: 'none', border: `1px solid ${NAVY}`, color: NAVY, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                            איפוס מיקום
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        step="1"
                        value={Math.round(imgScale * 100)}
                        onChange={e => { const s = Number(e.target.value) / 100; imgScaleRef.current = s; setImgScale(s); }}
                        dir="ltr"
                        style={{ width: '100%', accentColor: GOLD, cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        <span>50%</span>
                        <span>150%</span>
                      </div>
                    </div>

                    {imgRotation !== 0 && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 13, color: '#555' }}>
                        <span>סיבוב: {Math.round(imgRotation)}°</span>
                        <button
                          onClick={() => { imgRotationRef.current = 0; setImgRotation(0); }}
                          style={{ fontSize: 11, background: 'none', border: `1px solid ${NAVY}`, color: NAVY, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                          איפוס סיבוב
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayImageUrl || localUrl} alt="תמונה מועלית" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />
                  </div>
                )}

                {/* Before/After toggle */}
                {bgRemovedUrl && (
                  <button onClick={() => setShowBgRemoved(v => !v)}
                    style={{ marginTop: 10, background: 'none', border: `1.5px solid ${NAVY}`, color: NAVY, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
                    {showBgRemoved ? '← הצג לפני הסרה' : 'הצג אחרי הסרה →'}
                  </button>
                )}
              </div>
            )}

            {/* Remove background checkbox */}
            {localUrl && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', border: `1.5px solid ${bgRemoveChecked ? GOLD : '#E7E2D8'}`, cursor: 'pointer', marginBottom: 24, transition: 'all 0.2s' }}>
                <input
                  type="checkbox"
                  checked={bgRemoveChecked}
                  disabled={removingBg}
                  onChange={e => handleBgRemoveToggle(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: GOLD, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
                    הסר רקע מהתמונה
                    {removingBg && <span style={{ marginRight: 8, color: '#888', fontWeight: 400, fontSize: 12 }}>מעבד...</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>מסיר את הרקע אוטומטית — מומלץ לקבלת הדפסה מקצועית</div>
                </div>
              </label>
            )}

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={!localUrl || uploading || removingBg || added}
              style={{ width: '100%', padding: '16px 0', background: added ? '#16A34A' : (!localUrl || uploading || removingBg) ? '#9CA3AF' : GOLD, color: added ? '#fff' : NAVY, border: 'none', fontSize: 17, fontWeight: 900, cursor: !localUrl || uploading || removingBg || added ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {added ? '✓ נוסף לסל — מעביר אותך...' : !localUrl ? 'יש להעלות תמונה תחילה' : uploading ? 'מעלה תמונה...' : removingBg ? 'מסיר רקע...' : 'הוסף לסל'}
            </button>

            {productType === 'kipa' && !added && (
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: '#555' }}>
                סה&quot;כ: ₪{kipaTotal} ({qty} כיפות × ₪{kipaUnitPrice})
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
