'use client';
import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import PageFaqSection from '@/app/components/faq/PageFaqSection';
import { getKipaUnitPrice, KIPA_EXTRA_SIDE_PRICE } from '@/app/lib/kippot';

// ── Constants ─────────────────────────────────────────────────────────────────

const KIPPOT_STYLES: Record<string, { label: string; img: string }> = {
  lavan:    { label: 'לבן ורדרד',  img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  beige:    { label: "בז'",         img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  marva:    { label: 'ירוק מרווה', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%9E%D7%A8%D7%95%D7%95%D7%94_b5ov4n.png' },
  techelet: { label: 'כחול רויאל', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%AA%D7%9B%D7%9C%D7%AA_iflyjn.png' },
  'white':         { label: 'לבן',       img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_25_PM_mcqhle.png' },
  'beige-natural': { label: "בז' טבעי",  img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_58_PM_wva57o.png' },
};

const TYPE_LABELS: Record<string, string> = {
  'print-top':    'הדפסה למעלה',
  'print-bottom': 'הדפסה למטה',
  'embroidery':   'רקמה',
};

const PRINT_AREA = { top: '18%', left: '18%', width: '64%', height: '64%' };

// התמחור מגיע מהמקור המרכזי app/lib/kippot.ts — אין לשכפל מדרגות מחיר כאן.

function extractPublicId(url: string): string {
  try {
    const clean = url.split('?')[0];
    const idx = clean.indexOf('/upload/');
    if (idx === -1) return '';
    const after = clean.slice(idx + 8);
    const m = after.match(/v\d+\/(.*)/);
    const withExt = m ? m[1] : after;
    const dot = withExt.lastIndexOf('.');
    return (dot >= 0 ? withExt.slice(0, dot) : withExt).replace(/\//g, ':');
  } catch { return ''; }
}

// ── Inner page ────────────────────────────────────────────────────────────────

function KippotOrderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();

  const qty    = Math.max(30, Number(searchParams.get('qty') || 30));
  const type   = (searchParams.get('type') || 'print-top') as 'print-top' | 'print-bottom' | 'embroidery';
  const style  = searchParams.get('style') || 'lavan';
  const kippah = KIPPOT_STYLES[style] || KIPPOT_STYLES.lavan;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [designText, setDesignText] = useState('');
  const [addSide, setAddSide]       = useState(false);
  const [addSideText, setAddSideText] = useState('');

  // ── Upload state ────────────────────────────────────────────────────────────
  const [localUrl, setLocalUrl]       = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── AI mockup state ─────────────────────────────────────────────────────────
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState<'service_disabled' | 'rate_limited' | 'general' | null>(null);
  const [aiResult, setAiResult]       = useState<{ imageBase64: string; mimeType: string } | null>(null);

  // ── Drag / resize state ─────────────────────────────────────────────────────
  const [imgPos, setImgPos]           = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale]       = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [isDragging, setIsDragging]   = useState(false);
  const imgPosRef      = useRef({ x: 0, y: 0 });
  const imgScaleRef    = useRef(1);
  const imgRotationRef = useRef(0);
  const isDraggingRef  = useRef(false);
  const isPinchingRef  = useRef(false);
  const dragOriginRef  = useRef({ mouseX: 0, mouseY: 0, imgX: 0, imgY: 0 });
  const pinchStartRef  = useRef({ dist: 1, angle: 0, scale: 1, rotation: 0 });
  const printAreaRef   = useRef<HTMLDivElement>(null);
  const logoImgRef     = useRef<HTMLImageElement>(null);

  // ── Price ───────────────────────────────────────────────────────────────────
  const basePrice  = getKipaUnitPrice(qty);
  const typeExtra  = type === 'embroidery' ? 5 : 0;
  const sideExtra  = addSide ? KIPA_EXTRA_SIDE_PRICE : 0;
  const unitPrice  = basePrice + typeExtra + sideExtra;
  const totalPrice = qty * unitPrice;

  // ── Global mouse/touch listeners ────────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const p = { x: dragOriginRef.current.imgX + e.clientX - dragOriginRef.current.mouseX, y: dragOriginRef.current.imgY + e.clientY - dragOriginRef.current.mouseY };
      imgPosRef.current = p; setImgPos(p);
    }
    function onMouseUp() { if (isDraggingRef.current) { isDraggingRef.current = false; setIsDragging(false); } }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDraggingRef.current = true; setIsDragging(true);
    dragOriginRef.current = { mouseX: e.clientX, mouseY: e.clientY, imgX: imgPosRef.current.x, imgY: imgPosRef.current.y };
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault(); isDraggingRef.current = false; setIsDragging(false); isPinchingRef.current = true;
      const t1 = e.touches[0], t2 = e.touches[1], dx = t2.clientX-t1.clientX, dy = t2.clientY-t1.clientY;
      pinchStartRef.current = { dist: Math.sqrt(dx*dx+dy*dy), angle: Math.atan2(dy,dx)*(180/Math.PI), scale: imgScaleRef.current, rotation: imgRotationRef.current };
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false; isDraggingRef.current = true; setIsDragging(true);
      const t = e.touches[0];
      dragOriginRef.current = { mouseX: t.clientX, mouseY: t.clientY, imgX: imgPosRef.current.x, imgY: imgPosRef.current.y };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && isPinchingRef.current) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1], dx = t2.clientX-t1.clientX, dy = t2.clientY-t1.clientY;
      const dist = Math.sqrt(dx*dx+dy*dy), angle = Math.atan2(dy,dx)*(180/Math.PI);
      const { dist: sd, angle: sa, scale: ss, rotation: sr } = pinchStartRef.current;
      const ns = Math.min(3, Math.max(0.2, ss*(dist/sd))), nr = sr+(angle-sa);
      imgScaleRef.current = ns; imgRotationRef.current = nr; setImgScale(ns); setImgRotation(nr);
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      const t = e.touches[0];
      const p = { x: dragOriginRef.current.imgX+t.clientX-dragOriginRef.current.mouseX, y: dragOriginRef.current.imgY+t.clientY-dragOriginRef.current.mouseY };
      imgPosRef.current = p; setImgPos(p);
    }
  }

  function handleTouchEnd() { isDraggingRef.current = false; isPinchingRef.current = false; setIsDragging(false); }

  function resetTransform() {
    const z = { x: 0, y: 0 };
    imgPosRef.current = z; imgScaleRef.current = 1; imgRotationRef.current = 0;
    setImgPos(z); setImgScale(1); setImgRotation(0);
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalUrl(URL.createObjectURL(file));
    setUploadedUrl(null); setUploadError(null); setUploading(true);
    // Keep a base64 copy for the AI mockup + reset any previous mockup
    setAiResult(null); setAiError(null); setLogoDataUrl(null);
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    resetTransform();
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload-print-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'שגיאת העלאה');
      setUploadedUrl(data.url);
    } catch { setUploadError('שגיאה בהעלאת התמונה — נסה שוב'); }
    finally { setUploading(false); }
  }, []);

  // ── AI mockup generation ────────────────────────────────────────────────────
  async function generateAiMockup() {
    if (!logoDataUrl || aiLoading) return;
    setAiLoading(true); setAiError(null); setAiResult(null);
    try {
      const res = await fetch('/api/kippah-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoBase64: logoDataUrl, productType: 'kippah', kippahColor: style }),
      });
      if (res.status === 503) { setAiError('service_disabled'); return; }
      if (res.status === 429) { setAiError('rate_limited'); return; }
      if (!res.ok) { setAiError('general'); return; }
      const data = await res.json();
      if (!data.imageBase64) { setAiError('general'); return; }
      setAiResult({ imageBase64: data.imageBase64, mimeType: data.mimeType || 'image/png' });
    } catch {
      setAiError('general');
    } finally {
      setAiLoading(false);
    }
  }

  // ── Build Cloudinary mockup URL ─────────────────────────────────────────────
  function buildMockupUrl(): string {
    const logoUrl = uploadedUrl || localUrl;
    if (!logoUrl) return '';
    const el = printAreaRef.current, logoEl = logoImgRef.current;
    const imageX = el ? (imgPosRef.current.x / el.offsetWidth) * 100 : 0;
    const imageY = el ? (imgPosRef.current.y / el.offsetHeight) * 100 : 0;
    const logoWidthPct = (el && logoEl) ? (logoEl.offsetWidth * imgScale) / el.offsetWidth * 100 : imgScale * 100;
    const pa = PRINT_AREA;
    const paTop = parseFloat(pa.top), paLeft = parseFloat(pa.left), paW = parseFloat(pa.width), paH = parseFloat(pa.height);
    const BASE_W = 1000;
    const cx = paLeft + paW/2 + (imageX/100)*paW, cy = paTop + paH/2 + (imageY/100)*paH;
    const logoWpx = Math.round((logoWidthPct/100) * (paW/100) * BASE_W);
    const xpx = Math.round((cx/100)*BASE_W - logoWpx/2), ypx = Math.round((cy/100)*BASE_W - logoWpx/2);
    const rot = Math.round(imgRotation);
    const logoPid = extractPublicId(logoUrl), templatePid = extractPublicId(kippah.img);
    if (!logoPid || !templatePid || logoWpx <= 0) return '';
    return `https://res.cloudinary.com/dyxzq3ucy/image/upload/w_${BASE_W}/l_${logoPid},w_${logoWpx}${rot?`,a_${rot}`:''},g_north_west,x_${xpx},y_${ypx}/${templatePid}.png`;
  }

  // ── Add to cart ─────────────────────────────────────────────────────────────
  function handleAddToCart() {
    const logoUrl    = uploadedUrl || localUrl || '';
    const mockupUrl  = buildMockupUrl();
    const el         = printAreaRef.current, logoEl = logoImgRef.current;
    const imageX     = el ? (imgPosRef.current.x / el.offsetWidth)  * 100 : 0;
    const imageY     = el ? (imgPosRef.current.y / el.offsetHeight) * 100 : 0;
    const logoWidthPct = (el && logoEl) ? (logoEl.offsetWidth * imgScale) / el.offsetWidth * 100 : imgScale * 100;

    addItem({
      id: `kippot-bulk-${Date.now()}`,
      name: `כיפות ${kippah.label} × ${qty} — ${TYPE_LABELS[type]}${addSide ? ' + צד נוסף' : ''}`,
      price: unitPrice,
      quantity: qty,
      imgUrl: kippah.img,
      cat: 'כיפות',
      printCustomization: {
        productType:      'kipa',
        side:             type === 'print-bottom' ? 'bottom' : 'top',
        uploadedImageUrl: logoUrl,
        originalImageUrl: logoUrl,
        bgRemoved:        false,
        imageX, imageY,
        imageScale:    imgScale,
        imageRotation: imgRotation,
        logoWidthPct,
        mockupUrl:     mockupUrl || undefined,
        // Extra fields saved to order & shown in dashboard
        designText:  designText || undefined,
        addSide,
        addSideText: addSide ? addSideText : undefined,
        kippahStyle: style,
        kippahLabel: kippah.label,
        printType:   type,
      },
    });
    router.push('/cart');
  }

  const hasLogo = !!localUrl;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,3vw,40px) 16px', fontFamily: "'Heebo', Arial, sans-serif" }}>

      {/* חזרה */}
      <a href="/category/כיפות" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C5A028', fontWeight: 700, fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>
        → חזרה לבחירת כיפה
      </a>

      <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: '#1a1a1a', marginBottom: 4 }}>עיצוב ופרטי הזמנה</h1>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 28 }}>
        {kippah.label} · {TYPE_LABELS[type]} · {qty} יחידות · ₪{unitPrice} ליחידה
      </p>

      {/* כיפה נבחרת */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#FAF8F3', border: '1px solid #E5E0D5', padding: 16, marginBottom: 28 }}>
        <img src={kippah.img} alt={kippah.label} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0, border: '2px solid #C5A028' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{kippah.label}</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{TYPE_LABELS[type]}</div>
          <div style={{ fontSize: 13, color: '#C5A028', fontWeight: 700, marginTop: 6 }}>₪{unitPrice} × {qty} = ₪{totalPrice.toLocaleString('he-IL')}</div>
        </div>
      </div>

      {/* העלאת לוגו */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
          {type === 'embroidery' ? 'העלה קובץ לרקמה' : 'העלה לוגו להדפסה'}{' '}
          <span style={{ fontWeight: 400, color: '#9C7B3F', fontSize: 12 }}>(אופציונלי — ניתן לשלוח גם בווצאפ)</span>
        </div>

        <div onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${hasLogo ? '#C5A028' : '#D1CCC3'}`, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: hasLogo ? 'rgba(197,160,40,0.05)' : '#fff', transition: 'all 0.2s', marginBottom: 12 }}>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: 'none' }} onChange={handleFileChange} />
          {uploading ? (
            <div style={{ fontSize: 14, color: '#9C7B3F' }}>מעלה לקלודינרי...</div>
          ) : hasLogo ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <img src={localUrl!} alt="לוגו" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
              <span style={{ fontSize: 12, color: '#9C7B3F' }}>
                {uploadedUrl ? '✓ הועלה — לחץ להחלפה' : 'מעלה...'}
              </span>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>לחץ לבחירת לוגו / קובץ</div>
              <div style={{ fontSize: 12, color: '#9C7B3F', marginTop: 4 }}>PNG, JPG, SVG · עד 10MB</div>
            </>
          )}
        </div>
        {uploadError && <div style={{ fontSize: 12, color: '#dc2626' }}>{uploadError}</div>}
      </div>

      {/* מיקום לוגו */}
      {hasLogo && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>מקם את הלוגו על הכיפה</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>גרור להזזה · שני אצבעות לשינוי גודל וסיבוב</div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 300, margin: '0 auto', aspectRatio: '1', userSelect: 'none' }}>
            <img src={kippah.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} />
            <div
              ref={printAreaRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ position: 'absolute', top: PRINT_AREA.top, left: PRINT_AREA.left, width: PRINT_AREA.width, height: PRINT_AREA.height, cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden', outline: '2px dashed rgba(197,160,40,0.6)', outlineOffset: 2 }}
            >
              <img
                ref={logoImgRef}
                src={localUrl!}
                alt="לוגו"
                draggable={false}
                style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%,-50%) translate(${imgPos.x}px,${imgPos.y}px) scale(${imgScale}) rotate(${imgRotation}deg)`, maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: '+ הגדל', fn: () => { const s=Math.min(3,imgScaleRef.current*1.2); imgScaleRef.current=s; setImgScale(s); } },
              { label: '− הקטן', fn: () => { const s=Math.max(0.2,imgScaleRef.current*0.85); imgScaleRef.current=s; setImgScale(s); } },
              { label: '↺ סובב', fn: () => { const r=imgRotationRef.current-15; imgRotationRef.current=r; setImgRotation(r); } },
              { label: 'איפוס',  fn: resetTransform },
            ].map(btn => (
              <button key={btn.label} onClick={btn.fn} style={{ padding: '6px 14px', border: '1px solid #E5E0D5', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>{btn.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── הדמיית AI ── */}
      {hasLogo && (
        <div style={{ marginBottom: 24, border: '1px solid #E5D9B8', background: '#FDFAF2', padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>✨ הדמיית AI</div>
          <div style={{ fontSize: 12.5, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>
            צרו תמונה פוטו-ריאליסטית של כיפת {kippah.label} עם הלוגו שלכם מודפס עליה.
          </div>

          {!aiResult && !aiLoading && (
            <button
              onClick={generateAiMockup}
              disabled={!logoDataUrl}
              style={{ background: '#C5A028', color: '#1a1a1a', fontWeight: 900, fontSize: 14, padding: '12px 24px', border: 'none', cursor: logoDataUrl ? 'pointer' : 'not-allowed', opacity: logoDataUrl ? 1 : 0.6, fontFamily: 'inherit', width: '100%' }}
            >
              ✨ צרו לי הדמיה
            </button>
          )}

          {aiLoading && (
            <div style={{ textAlign: 'center', padding: '18px 0', fontSize: 13.5, color: '#9C7B3F' }}>
              <div style={{ display: 'inline-block', width: 22, height: 22, border: '3px solid #E5D9B8', borderTopColor: '#C5A028', borderRadius: '50%', animation: 'kip-ai-spin 0.8s linear infinite', verticalAlign: 'middle', marginLeft: 8 }} />
              מייצרים הדמיה... זה לוקח בערך 15 שניות
              <style>{`@keyframes kip-ai-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {aiError === 'service_disabled' && (
            <div style={{ fontSize: 13, color: '#9C7B3F', lineHeight: 1.6 }}>
              ⚠️ ההדמיה זמנית לא זמינה — אפשר להמשיך להזמין כרגיל, ונשמח לעזור עם עיצוב מותאם{' '}
              <a href="https://wa.me/972587479933" target="_blank" rel="noopener noreferrer" style={{ color: '#C5A028', fontWeight: 700 }}>בוואטסאפ</a>.
            </div>
          )}
          {aiError === 'rate_limited' && (
            <div style={{ fontSize: 13, color: '#9C7B3F' }}>ניסיתם הרבה פעמים — נסו שוב בעוד כמה דקות.</div>
          )}
          {aiError === 'general' && (
            <div style={{ fontSize: 13, color: '#dc2626' }}>
              משהו השתבש — <button onClick={generateAiMockup} style={{ background: 'none', border: 'none', color: '#C5A028', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>נסו שוב</button>
            </div>
          )}

          {aiResult && (
            <div>
              <img
                src={`data:${aiResult.mimeType};base64,${aiResult.imageBase64}`}
                alt={`הדמיית AI — כיפת ${kippah.label} עם הלוגו שלכם`}
                style={{ width: '100%', display: 'block', border: '1px solid #E5D9B8' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <a
                  href={`data:${aiResult.mimeType};base64,${aiResult.imageBase64}`}
                  download="hadmaya-yoursofer.png"
                  style={{ flex: 1, textAlign: 'center', background: '#fff', border: '1px solid #C5A028', color: '#9C7B3F', fontWeight: 700, fontSize: 13, padding: '10px 16px', textDecoration: 'none' }}
                >
                  ⬇ הורדת ההדמיה
                </a>
                <button
                  onClick={generateAiMockup}
                  style={{ flex: 1, background: '#fff', border: '1px solid #E5E0D5', color: '#6B7280', fontWeight: 700, fontSize: 13, padding: '10px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  🔄 הדמיה נוספת
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#9C7B3F', marginTop: 8, lineHeight: 1.5 }}>
                ההדמיה להמחשה בלבד — ההדפסה בפועל תיעשה לפי המיקום והגודל שקבעתם למעלה.
              </div>
            </div>
          )}
        </div>
      )}

      {/* טקסט */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
          {type === 'embroidery' ? 'טקסט לרקמה' : 'טקסט להדפסה'}{' '}
          <span style={{ fontWeight: 400, color: '#9C7B3F' }}>(אופציונלי)</span>
        </label>
        <textarea value={designText} onChange={e => setDesignText(e.target.value)}
          placeholder="שם, תאריך, פסוק..." rows={2}
          style={{ width: '100%', border: '1px solid #E5E0D5', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>

      {/* צד נוסף */}
      {type !== 'embroidery' && (
        <div style={{ marginBottom: 20, border: '1px solid #E5E0D5', padding: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={addSide} onChange={e => setAddSide(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#C5A028' }} />
            <div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{type === 'print-top' ? 'הדפסה גם למטה' : 'הדפסה גם למעלה'}</span>
              <span style={{ color: '#C5A028', fontWeight: 700 }}> +₪{KIPA_EXTRA_SIDE_PRICE} ליחידה</span>
            </div>
          </label>
          {addSide && (
            <textarea value={addSideText} onChange={e => setAddSideText(e.target.value)}
              placeholder="טקסט / עיצוב לצד הנוסף..." rows={2}
              style={{ width: '100%', marginTop: 12, border: '1px solid #E5E0D5', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          )}
        </div>
      )}

      {/* סיכום */}
      <div style={{ background: '#FAF8F3', border: '1px solid #E5E0D5', padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>סיכום מחיר</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
            <span>₪{basePrice} × {qty}</span><span>כיפה + הדפסה</span>
          </div>
          {typeExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
              <span>+₪{typeExtra} × {qty}</span><span>תוספת רקמה</span>
            </div>
          )}
          {sideExtra > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6B7280' }}>
              <span>+₪{KIPA_EXTRA_SIDE_PRICE} × {qty}</span><span>הדפסה צד נוסף</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #E5E0D5', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 17 }}>
            <span>₪{totalPrice.toLocaleString('he-IL')}</span><span>סה"כ</span>
          </div>
        </div>
      </div>

      {/* הוסף לעגלה */}
      <button
        onClick={handleAddToCart}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#1a1a1a', color: '#fff', fontWeight: 900, fontSize: 16, padding: '18px 32px', border: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
      >
        🛒 הוסף לעגלה וסיים הזמנה
      </button>
      <div style={{ fontSize: 11, color: '#9C7B3F', textAlign: 'center', marginTop: 8 }}>
        ניתן להשלים את התשלום בשלב הבא
      </div>
    </div>
  );
}

export default function KippotOrderPage() {
  return (
    <>
      <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>טוען...</div>}>
        <KippotOrderInner />
      </Suspense>
      {/* FAQ ממוקד — מקור אמת מרכזי data/faq.ts; מוצג מתחת לתהליך העיצוב ולא מפריע לו */}
      <PageFaqSection pageKey="kippot-order" title="שאלות נפוצות על עיצוב והדפסה" max={6} />
    </>
  );
}
