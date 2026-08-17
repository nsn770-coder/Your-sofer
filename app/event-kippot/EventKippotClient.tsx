'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getKipaUnitPrice, getKipaMaterial, KIPA_MATERIAL_LABELS, KIPA_EXTRA_SIDE_PRICE, DEFAULT_STYLE_PRODUCT_MAP } from '@/app/lib/kippot';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCart } from '@/app/contexts/CartContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { KippaDesign } from '@/app/designer/utils/types';
import { Product } from '@/app/lib/types';
// עורך כיפה מותאמת אישית — נטען רק בלחיצה (ssr:false — canvas)
const KippaDesignModal = dynamic(() => import('@/app/designer/components/KippaDesignModal'), { ssr: false });
import EventSouvenirsBrowser from './EventSouvenirsBrowser';
import { EVENT_SCROLL_SECTION_IDS } from '@/app/constants/eventScrollSections';
import { PROMO_ACTIVE, MIN_KIPPOT_QTY, MIN_ADDON_QTY } from '@/app/lib/promoRules';

const GOLD = 'var(--ys-accent)';
const NAVY = '#111d3a';

const KIPPOT_STYLES = [
  { id: 'lavan',       label: 'לבן ורדרד',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636051/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%9F_%D7%95%D7%A8%D7%93%D7%A8%D7%93_nauwhq.png' },
  { id: 'beige',       label: "בז'",           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_fhrr09.png' },
  { id: 'marva',       label: 'ירוק מרווה',   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%9E%D7%A8%D7%95%D7%95%D7%94_b5ov4n.png' },
  { id: 'techelet',    label: 'כחול רויאל',   img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782636052/%D7%9B%D7%99%D7%A4%D7%94_%D7%AA%D7%9B%D7%9C%D7%AA_iflyjn.png' },
  { id: 'white',       label: 'לבן',           img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_25_PM_mcqhle.png' },
  { id: 'beige-natural', label: "בז' טבעי",    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784407273/ChatGPT_Image_Jul_18_2026_11_38_58_PM_wva57o.png' },
  { id: 'satin-white', label: 'סאטן',          img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781586601/a8c7n05vniv34n4qw44g.jpg' },
  { id: 'satin-white-18', label: 'סאטן לבן 18 ס"מ', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1781587426/eu12gjypbrxlyhfi40tk.jpg' },
];

const PRINT_TYPES = [
  { id: 'print-top',    label: 'הדפסה למעלה', desc: 'הדפסה על חלק עליון', img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638747/%D7%9B%D7%99%D7%A4%D7%94_%D7%91%D7%96_%D7%A2%D7%9D_%D7%94%D7%93%D7%A4%D7%A1_%D7%9C%D7%9E%D7%A2%D7%9C%D7%94_dh4nuv.png' },
  { id: 'print-bottom', label: 'הדפסה למטה',  desc: 'הדפסה על שוליים',    img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638855/ChatGPT_Image_Jun_28_2026_12_27_20_PM_amqsji.png' },
  { id: 'print-both',   label: 'הדפסה למעלה ולמטה', desc: `שני הצדדים · +₪${KIPA_EXTRA_SIDE_PRICE} ליחידה`, img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1784534251/WhatsApp_Image_2026-07-20_at_10.56.03_bdot7c.jpg' },
  { id: 'embroidery',   label: 'רקמה',         desc: '+₪5 ליחידה',         img: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1782638923/%D7%9B%D7%99%D7%A4%D7%94_%D7%9C%D7%91%D7%A0%D7%94_%D7%A2%D7%9D_%D7%A8%D7%A7%D7%9E%D7%94_%D7%95%D7%95%D7%A8%D7%95%D7%93_n9tjmk.png' },
] as const;

type PrintType = typeof PRINT_TYPES[number]['id'];

export default function EventKippotClient() {
  const [qty, setQty]             = useState(30);
  const [printType, setPrintType] = useState<PrintType>('print-top');
  const [style, setStyle]         = useState<string | null>(null);
  const { user } = useAuth();
  const [eventProducts, setEventProducts] = useState<Product[]>([]);
  const isAdmin = user?.role === 'admin';
  const router = useRouter();
  const { addItem, removeItem } = useCart();
  // עורך כיפה מותאמת אישית (Modal) — תוספת אדיטיבית
  const [designerOpen, setDesignerOpen] = useState(false);

  // ── שיוך דגם ← מוצר בחנות (settings/eventKippotStyles) — מלאי ורווחיות ──
  const [styleMap, setStyleMap] = useState<Record<string, { productId: string; sku: string; name: string }>>({});
  const [styleProducts, setStyleProducts] = useState<Record<string, Product>>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'eventKippotStyles'));
        // ברירת מחדל מהקוד (למשל סאטן ← UK00321); Firestore גובר עליה
        const map = { ...DEFAULT_STYLE_PRODUCT_MAP, ...(snap.exists() ? snap.data() as Record<string, { productId: string; sku: string; name: string }> : {}) };
        setStyleMap(map);
        const prods: Record<string, Product> = {};
        await Promise.all(Object.entries(map).map(async ([styleId, m]) => {
          if (!m?.productId) return;
          const pSnap = await getDoc(doc(db, 'products', m.productId));
          if (pSnap.exists()) prods[styleId] = { id: pSnap.id, ...pSnap.data() } as Product;
        }));
        setStyleProducts(prods);
      } catch (e) { console.error('[EventKippot] style map load:', e); }
    })();
  }, []);

  // אדמין: שיוך דגם לקוד מוצר (SKU) — חיפוש מדויק ואז לפי ספרות הקוד
  async function assignStyleProduct(styleId: string, styleLabel: string) {
    const input = window.prompt(`קוד מוצר (SKU) לשיוך לדגם "${styleLabel}":`, styleMap[styleId]?.sku ?? '');
    if (!input || !input.trim()) return;
    const code = input.trim();
    setAssigning(styleId);
    try {
      let product: Product | null = null;
      const exact = await getDocs(query(collection(db, 'products'), where('sku', '==', code)));
      if (!exact.empty) {
        product = { id: exact.docs[0].id, ...exact.docs[0].data() } as Product;
      } else {
        // התאמה לפי ספרות הקוד — כמו בטאב המלאי
        const digits = code.replace(/^[A-Z]+/i, '');
        if (digits) {
          const snap = await getDocs(query(collection(db, 'products'), where('sku', '>=', ' ')));
          snap.forEach(d => {
            if (product) return;
            const p = { id: d.id, ...d.data() } as Product;
            if ((p.sku || '').replace(/^[A-Z]+/i, '') === digits) product = p;
          });
        }
      }
      if (!product) { alert(`לא נמצא מוצר עם קוד "${code}"`); return; }
      const found: Product = product;
      const entry = { productId: found.id, sku: found.sku || code, name: found.name || '' };
      await setDoc(doc(db, 'settings', 'eventKippotStyles'), { [styleId]: entry }, { merge: true });
      setStyleMap(prev => ({ ...prev, [styleId]: entry }));
      setStyleProducts(prev => ({ ...prev, [styleId]: found }));
      alert(`✅ הדגם "${styleLabel}" שויך למוצר: ${found.name}\nמהיום הזמנות כיפות מהדגם הזה יורדות מהמלאי שלו ונספרות ברווחיות.`);
    } catch (e) {
      alert('שגיאה בשיוך'); console.error(e);
    } finally { setAssigning(null); }
  }

  // ── פופאפ מבצע SIMCHA — פעם אחת לסשן ─────────────────────────────────────
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  useEffect(() => {
    if (!PROMO_ACTIVE) return;
    try { if (sessionStorage.getItem('simchaPopupSeen')) return; } catch { /* private mode */ }
    const t = setTimeout(() => setShowPromoPopup(true), 800);
    return () => clearTimeout(t);
  }, []);
  function closePromoPopup() {
    setShowPromoPopup(false);
    try { sessionStorage.setItem('simchaPopupSeen', '1'); } catch { /* non-fatal */ }
  }

  // ── אנימציית "שימו לב" לסרגל הכמות: כשהסרגל נכנס לתצוגה הסמן זז עד הקצה
  //    ואז חוזר מהר למרכז — כדי שהלקוחות יבינו שגרירה מעדכנת את המחיר.
  //    רצה פעם אחת, ומתבטלת מיד אם המשתמש נגע בסרגל בעצמו.
  const sliderBoxRef      = useRef<HTMLDivElement>(null);
  const userTouchedQtyRef = useRef(false);
  const demoRanRef        = useRef(false);
  useEffect(() => {
    const el = sliderBoxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || demoRanRef.current || userTouchedQtyRef.current) return;
      demoRanRef.current = true;
      obs.disconnect();
      const start = performance.now();
      const SWEEP_MS = 700;  // 30 → 300 (עד הקצה)
      const BACK_MS  = 350;  // 300 → 165 (מהר למרכז)
      function frame(now: number) {
        if (userTouchedQtyRef.current) return; // המשתמש נגע — עוצרים מיד
        const t = now - start;
        if (t <= SWEEP_MS) {
          setQty(Math.round(30 + (300 - 30) * (t / SWEEP_MS)));
          requestAnimationFrame(frame);
        } else if (t <= SWEEP_MS + BACK_MS) {
          setQty(Math.round(300 - (300 - 165) * ((t - SWEEP_MS) / BACK_MS)));
          requestAnimationFrame(frame);
        } else {
          setQty(165); // נעצר במרכז הסרגל
        }
      }
      requestAnimationFrame(frame);
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    // שלוש שאילתות: מוצרי אירועים + מוצרים המשויכים לסקרולים + מוצרים המסומנים "רק לאירועים"
    Promise.all([
      getDocs(query(collection(db, 'products'), where('isEventProduct', '==', true))),
      getDocs(query(collection(db, 'products'), where('eventScrollSection', 'in', EVENT_SCROLL_SECTION_IDS))),
      getDocs(query(collection(db, 'products'), where('eventsOnly', '==', true))),
    ]).then(([eventSnap, scrollSnap, eventsOnlySnap]) => {
      const byId = new Map<string, Product>();
      [...eventSnap.docs, ...scrollSnap.docs, ...eventsOnlySnap.docs].forEach(d => byId.set(d.id, { id: d.id, ...d.data() } as Product));
      setEventProducts(
        Array.from(byId.values()).filter(p => !p.hidden && !p.outOfStock && p.status !== 'inactive')
      );
    }).catch(e => console.error('[EventKippot] load products:', e));
  }, []);

  const embroideryExtra = printType === 'embroidery' ? 5 : 0;
  const bothSidesExtra  = printType === 'print-both' ? KIPA_EXTRA_SIDE_PRICE : 0;
  // תמחור לפי חומר הדגם הנבחר: פשתן (ברירת מחדל) או סאטן
  const selectedStyleId = style ?? KIPPOT_STYLES[0].id;
  const material  = getKipaMaterial(selectedStyleId);
  const unitPrice = getKipaUnitPrice(qty, material) + embroideryExtra + bothSidesExtra;
  const total = qty * unitPrice;

  // ── עורך כיפה מותאמת אישית — שמירה מוסיפה לסל עם תמחור המדרגות הקיים ──────
  function handleDesignerSave(design: KippaDesign) {
    const styleLabel = KIPPOT_STYLES.find(s => s.id === selectedStyleId)?.label ?? '';
    const sp = styleProducts[selectedStyleId];
    const lineId = sp?.id ?? `event-designer-${selectedStyleId}`;
    const unit = getKipaUnitPrice(design.quantity, material);
    removeItem(lineId);
    removeItem(`print-${lineId}`);
    addItem({
      id: lineId,
      productId: sp?.id,
      name: sp?.name ?? `כיפות ${styleLabel} — עיצוב אישי`,
      price: unit,
      imgUrl: sp?.imgUrl || KIPPOT_STYLES.find(s => s.id === selectedStyleId)?.img,
      quantity: design.quantity,
      cat: 'כיפות',
      customDesign: design,
    });
    addItem({
      id: `print-${lineId}`, name: 'הדפסה לכיפות — עיצוב מהעורך (כלול במחיר)', price: 0,
      quantity: design.quantity, cat: 'הדפסה', imgUrl: design.previewImageUrl,
      printCustomization: {
        uploadedImageUrl: design.previewImageUrl, originalImageUrl: design.previewImageUrl,
        productType: 'כיפות', side: 'front', bgRemoved: false,
        designText: design.text, mockupUrl: design.previewImageUrl,
      },
    });
    setDesignerOpen(false);
    router.push('/cart');
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", maxWidth: 860, margin: '0 auto', padding: 'clamp(16px, 3vw, 40px) 16px 60px' }}>
      <style>{`
        .ys-ekip-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; background: #E5E0D5; outline: none; cursor: pointer; transform: scaleX(-1); }
        .ys-ekip-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 26px; height: 26px; background: ${GOLD}; cursor: pointer; border-radius: 50%; box-shadow: 0 2px 8px rgba(197,160,40,0.4); }
        .ys-ekip-range::-moz-range-thumb { width: 26px; height: 26px; background: ${GOLD}; cursor: pointer; border-radius: 50%; border: none; box-shadow: 0 2px 8px rgba(197,160,40,0.4); }
        .ys-ekip-card { transition: all 0.2s; }
        .ys-ekip-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .ys-ekip-scroll { scrollbar-width: thin; scrollbar-color: var(--ys-accent) #F3EFE6; }
        .ys-ekip-scroll::-webkit-scrollbar { height: 6px; }
        .ys-ekip-scroll::-webkit-scrollbar-track { background: #F3EFE6; }
        .ys-ekip-scroll::-webkit-scrollbar-thumb { background: var(--ys-accent); border-radius: 3px; }
        .ys-ekip-styles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        @media (max-width: 640px) {
          .ys-ekip-styles { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 8px; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: var(--ys-accent) #F3EFE6; }
          .ys-ekip-styles::-webkit-scrollbar { height: 6px; }
          .ys-ekip-styles::-webkit-scrollbar-track { background: #F3EFE6; }
          .ys-ekip-styles::-webkit-scrollbar-thumb { background: var(--ys-accent); border-radius: 3px; }
          .ys-ekip-styles .ys-ekip-card { flex: 0 0 132px; width: 132px; }
        }
      `}</style>

      {/* ── פס מבצע SIMCHA — צמוד לחלק העליון של העמוד ── */}
      {PROMO_ACTIVE && (
        <div style={{ marginTop: 'calc(-1 * clamp(16px, 3vw, 40px))', marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)', marginBottom: 24, background: NAVY, color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: 13.5, fontWeight: 700, lineHeight: 1.6 }}>
          🎉 מבצע SIMCHA: מזמינים {MIN_KIPPOT_QTY}+ כיפות מאותו דגם ומקבלים <span style={{ color: GOLD }}>10%-15% הנחה</span> על מזכרות ומוצרים נלווים ({MIN_ADDON_QTY}+ יח׳ מכל מוצר) · קוד בעגלה: <span style={{ color: GOLD, letterSpacing: 1 }}>SIMCHA</span>
        </div>
      )}

      {/* ── פופאפ מבצע SIMCHA ── */}
      {showPromoPopup && (
        <div onClick={closePromoPopup} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: '#fff', borderRadius: 18, maxWidth: 420, width: '100%', maxHeight: '92vh', overflowY: 'auto', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button onClick={closePromoPopup} aria-label="סגירה" style={{ position: 'absolute', top: 10, left: 12, width: 30, height: 30, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', fontSize: 20, color: '#555', cursor: 'pointer', lineHeight: 1, boxShadow: '0 1px 6px rgba(0,0,0,0.2)', zIndex: 1 }}>×</button>
            <img
              src="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_840/v1784837677/ChatGPT_Image_Jul_23_2026_11_14_21_PM_c4gm6t.png"
              alt="מבצע SIMCHA — הנחה על מזכרות לאירועים"
              /* CLS FIX (08/2026): התמונה היא 840×840 (ריבועית). בלי width/height
                 הדפדפן לא יודע לשריין לה מקום, והפופאפ גדל מ-307px ל-687px ברגע
                 שהיא נטענת — 0.371 CLS, כמעט כל ה-CLS של העמוד. עם המידות
                 הדפדפן מחשב aspect-ratio ושומר את המקום מראש.
                 width:100% + height:auto שומרים על תצוגה זהה לחלוטין. */
              width={840}
              height={840}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
            <div style={{ padding: '12px 16px 16px' }}>
              <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.7, marginBottom: 10 }}>
                בתוקף בהזמנת {MIN_KIPPOT_QTY}+ כיפות מאותו דגם · {MIN_ADDON_QTY}+ יח׳ מכל מוצר נלווה
                <br />קוד בעגלה: <b style={{ color: NAVY, letterSpacing: 1 }}>SIMCHA</b>
              </div>
              <button onClick={closePromoPopup} style={{ background: GOLD, color: '#FEFBF7', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%' }}>
                מעולה, בואו נתחיל ←
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ marginBottom: 32, borderBottom: '1px solid #E5E0D5', paddingBottom: 24 }}>
        <div style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 300, color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          כיפות ומזכרות לאירועים
        </div>
        <div style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 900, color: NAVY, letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 12 }}>
          עם הדפסה אישית
        </div>
        <div style={{ fontSize: 15, color: '#6B7280', fontWeight: 400, lineHeight: 1.6, maxWidth: 520 }}>
          שם, תאריך ולוגו — הדמיה מיידית, מגוון ענק של צבעים וסגנונות, אספקה בזמן לאירוע.
        </div>
      </div>

      {/* שלב 1: סוג עיצוב */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 12 }}>1. בחר סוג עיצוב</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {PRINT_TYPES.map(opt => (
            <button
              key={opt.id}
              onClick={() => setPrintType(opt.id)}
              style={{
                flex: '1 1 140px',
                padding: 0,
                border: printType === opt.id ? `2px solid ${GOLD}` : '2px solid #E5E0D5',
                background: printType === opt.id ? 'rgba(197,160,40,0.08)' : '#fff',
                cursor: 'pointer',
                textAlign: 'right',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                overflow: 'hidden',
              }}
            >
              <img src={opt.img} alt={opt.label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ys-text)' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#9C7B3F', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* שלב 2: כמות */}
      <div ref={sliderBoxRef} style={{ background: '#fff', border: '1px solid #E5E0D5', padding: 'clamp(16px, 2.5vw, 28px)', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 16 }}>2. בחר כמות — גררו את הסמן</div>
        <input
          type="range"
          className="ys-ekip-range"
          min={30}
          max={300}
          step={1}
          value={qty}
          onChange={e => { userTouchedQtyRef.current = true; setQty(Number(e.target.value)); }}
          onPointerDown={() => { userTouchedQtyRef.current = true; }}
          style={{ touchAction: 'pan-y' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#9C7B3F', fontWeight: 600 }}>
          <span>300</span><span>30</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          <div style={{ background: 'var(--ys-bg-warm)', padding: '12px 20px', minWidth: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>כמות — לחצו לעריכה</div>
            {/* קלט ישיר: לחיצה על המספר מאפשרת הקלדת כמות מדויקת */}
            <input
              type="number"
              inputMode="numeric"
              min={30}
              max={3000}
              value={qty}
              onFocus={() => { userTouchedQtyRef.current = true; }}
              onChange={e => {
                userTouchedQtyRef.current = true;
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n) && n >= 1) setQty(Math.min(3000, n));
              }}
              onBlur={e => {
                const n = parseInt(e.target.value, 10);
                if (!(n >= 30)) setQty(30);
              }}
              style={{
                fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: NAVY,
                background: 'transparent', border: 'none', borderBottom: `2px dashed ${GOLD}`,
                width: 76, padding: 0, fontFamily: 'inherit', outline: 'none', textAlign: 'right',
              }}
            />
          </div>
          <div style={{ background: 'var(--ys-bg-warm)', padding: '12px 20px', minWidth: 110 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>מחיר ליחידה</div>
            <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: GOLD }}>₪{unitPrice}</div>
            {embroideryExtra > 0 && <div style={{ fontSize: 10, color: '#9C7B3F' }}>כולל +₪{embroideryExtra} רקמה</div>}
          </div>
          <div style={{ background: 'var(--ys-bg-warm)', padding: '12px 20px', minWidth: 130 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', marginBottom: 4 }}>סה&quot;כ משוער</div>
            <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: NAVY }}>
              ₪{total.toLocaleString('he-IL')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F' }}>מדרגות ({KIPA_MATERIAL_LABELS[material]}):</span>
          {/* מדרגות תואמות למקור המרכזי app/lib/kippot.ts + data/faq.ts */}
          {(material === 'satin' ? [
            { range: '30–49',  price: 8,  active: qty >= 30 && qty <= 49 },
            { range: '50+',    price: 6,  active: qty >= 50              },
          ] : [
            { range: '30–49',  price: 14, active: qty >= 30  && qty <= 49 },
            { range: '50–99',  price: 12, active: qty >= 50  && qty <= 99 },
            { range: '100+',   price: 10, active: qty >= 100             },
          ] as { range: string; price: number; active: boolean }[]).map(({ range, price, active }) => (
            <span key={range} style={{ fontSize: 11, fontWeight: active ? 800 : 400, color: active ? GOLD : '#9C7B3F', background: active ? 'rgba(197,160,40,0.10)' : 'transparent', padding: active ? '2px 8px' : '2px 0', transition: 'all 0.15s' }}>
              {range} = ₪{price}{printType === 'embroidery' ? '+₪5' : printType === 'print-both' ? `+₪${KIPA_EXTRA_SIDE_PRICE}` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* שלב 3: בחר סוג כיפה */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A2E1A', marginBottom: 12 }}>3. בחר סוג כיפה</div>
        <div className="ys-ekip-styles">
          {KIPPOT_STYLES.map(s => {
            const mapped  = styleMap[s.id];
            const product = styleProducts[s.id];
            const stock   = typeof product?.inStock === 'number' ? product.inStock : null;
            return (
              <div key={s.id} className="ys-ekip-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  onClick={() => setStyle(style === s.id ? null : s.id)}
                  style={{
                    border: style === s.id ? `2px solid ${GOLD}` : '2px solid #E5E0D5',
                    background: '#fff',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  {style === s.id && (
                    <div style={{ position: 'absolute', top: 6, left: 6, background: GOLD, color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✓</div>
                  )}
                  <img src={s.img} alt={`${s.label} — ${KIPA_MATERIAL_LABELS[getKipaMaterial(s.id)]}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '8px 10px 2px', fontSize: 13, fontWeight: 600, color: 'var(--ys-text)' }}>{s.label}</div>
                  {/* סוג הכיפה — מוצג מתחת לכל דגם */}
                  <div style={{ padding: '0 10px 8px', fontSize: 11, fontWeight: 600, color: '#9C7B3F' }}>
                    {KIPA_MATERIAL_LABELS[getKipaMaterial(s.id)]}
                    {getKipaMaterial(s.id) === 'satin' && <span style={{ color: GOLD, fontWeight: 800 }}> · מ-₪6 ליח'</span>}
                  </div>
                </button>
                {/* אדמין: שיוך הדגם למוצר בחנות + תצוגת מלאי */}
                {isAdmin && (
                  <div style={{ padding: '4px 2px 0', fontSize: 10.5, lineHeight: 1.5, textAlign: 'center' }}>
                    {mapped ? (
                      <div style={{ color: '#374151' }}>
                        🔗 {mapped.sku}
                        {stock != null && (
                          <span style={{ fontWeight: 800, color: stock <= 0 ? '#dc2626' : stock < 50 ? '#d97706' : '#16a34a' }}>
                            {' '}· במלאי: {stock}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#dc2626', fontWeight: 700 }}>לא משויך למוצר</div>
                    )}
                    <button
                      onClick={() => assignStyleProduct(s.id, s.label)}
                      disabled={assigning === s.id}
                      style={{ background: 'none', border: 'none', color: '#1d4ed8', fontWeight: 700, fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}
                    >
                      {assigning === s.id ? '⏳ משייך...' : mapped ? 'שנה שיוך' : '🔗 שייך מוצר'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA — פעיל תמיד: אם לא נבחר דגם, ממשיכים אוטומטית עם הדגם הראשון בקרוסלה */}
      <a
        href={`/kippot-order?qty=${qty}&type=${printType}&style=${style ?? KIPPOT_STYLES[0].id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: GOLD,
          color: '#FEFBF7',
          fontWeight: 900,
          fontSize: 17,
          padding: '18px 32px',
          textDecoration: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        המשך לעיצוב ←
      </a>
      {!style && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9C7B3F', marginTop: 8 }}>
          לא בחרתם דגם? נמשיך עם {KIPPOT_STYLES[0].label} — אפשר לשנות בכל שלב
        </div>
      )}
      <div style={{ textAlign: 'center', fontSize: 13, color: '#9C7B3F', marginTop: 10, fontWeight: 600 }}>
        ✨ בשלב הבא: מעלים לוגו ומקבלים הדמיית AI של הכיפה שלכם — חינם
      </div>

      {/* ── עורך כיפה עצמאי — למי שאין לוגו (תוספת אדיטיבית) ── */}
      <button
        type="button"
        onClick={() => setDesignerOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', marginTop: 14,
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff',
          fontWeight: 900, fontSize: 15.5, padding: '15px 24px',
          border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 12px rgba(124,58,237,0.3)',
        }}
      >
        🎨 אין לכם לוגו? עצבו כיפה בעצמכם — עורך חינם
      </button>

      {/* ── מזכרות לאירוע — באנרים לפי קטגוריה + סינון ומיון ── */}
      <EventSouvenirsBrowser products={eventProducts} />

      {user?.role === 'admin' && (
        <a
          href="/admin/new-product?isEventProduct=true"
          style={{
            position: 'fixed', bottom: 140, right: 20, zIndex: 9999,
            background: '#374151', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '10px 16px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontFamily: 'Heebo, Arial, sans-serif',
          }}
        >
          ➕ הוסף מוצר לאירוע
        </a>
      )}
      {user?.role === 'admin' && (
        <a
          href={`/admin/new-product?cat=${encodeURIComponent('כיפות')}&isEventKippot=true`}
          style={{
            position: 'fixed', bottom: 90, right: 20, zIndex: 9999,
            background: 'var(--ys-accent)', color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '10px 16px', textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            fontFamily: 'Heebo, Arial, sans-serif',
          }}
        >
          + הוסף כיפה
        </a>
      )}

      {/* עורך כיפה מותאמת אישית — Modal */}
      {designerOpen && (
        <KippaDesignModal
          open={designerOpen}
          material={material}
          productImageUrl={styleProducts[selectedStyleId]?.imgUrl || KIPPOT_STYLES.find(s => s.id === selectedStyleId)?.img}
          onSave={handleDesignerSave}
          onClose={() => setDesignerOpen(false)}
        />
      )}
    </div>
  );
}
