'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import ProductBadge from '@/components/ui/ProductBadge';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice, effectivePrice as computeEffectivePrice, type EffectivePriceFields } from '@/app/lib/utils';

interface Props {
  id: string;
  name: string;
  price: number;
  images: string[];
  aiLifestyleImage?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  bundlePromo?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  aboveFold?: boolean;
  hasKlafSelection?: boolean;
  cat?: string;
  soferId?: string;
  soferName?: string;
  soferPhoto?: string;
  horizontal?: boolean;
  stars?: number;
  outOfStock?: boolean;
  clearanceDiscount?: boolean;
  clearanceSalePrice?: number;
  originalPrice?: number;
  comingSoon?: boolean;
  expectedArrivalDate?: string | null; // 'YYYY-MM-DD'
  /**
   * מסמך המוצר הגולמי — לחישוב המחיר האפקטיבי דרך effectivePrice() בלבד.
   * בלעדיו הכרטיס מתעלם ממבצע מתוזמן (isOnSale / salePrice / saleStartsAt /
   * saleEndsAt) ומציג מחיר מלא בזמן שעמוד המוצר מציג מחיר מבצע.
   * העברה: productDoc={p}.
   */
  productDoc?: EffectivePriceFields;
  /** מוצר מארז — מציג באדג' "מארז מהודר" */
  isBundle?: boolean;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
export function formatArrivalDate(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : '';
}

const SOFER_CATS = new Set(['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'סט בר מצווה', 'מגילות']);

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconBox() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );
}

function IconCheck({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductCard({
  id, name, price, images, aiLifestyleImage, priority, isBestSeller, badge, bundlePromo, was, createdAt, hidden, aboveFold, hasKlafSelection, cat,
  soferId, soferName, soferPhoto, horizontal, outOfStock, clearanceDiscount, clearanceSalePrice, originalPrice,
  comingSoon, expectedArrivalDate, productDoc, isBundle,
}: Props) {
  const router = useRouter();
  const { items, addItem, updateQty } = useCart();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [localHidden, setLocalHidden]     = useState(hidden ?? false);
  const [localPriority, setLocalPriority] = useState(priority ?? 50);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [prioritySaved, setPrioritySaved] = useState(false);
  const [removing, setRemoving]           = useState(false);
  const [removed, setRemoved]             = useState(false);
  const priorityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleToggleHidden(e: React.MouseEvent) {
    e.stopPropagation();
    const newHidden = !localHidden;
    setLocalHidden(newHidden);
    await updateDoc(doc(db, 'products', id), { hidden: newHidden });
    if (newHidden) { setRemoving(true); setTimeout(() => setRemoved(true), 300); }
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.max(1, Math.min(99, Number(e.target.value)));
    setLocalPriority(val);
    if (priorityTimer.current) clearTimeout(priorityTimer.current);
    priorityTimer.current = setTimeout(async () => {
      await updateDoc(doc(db, 'products', id), { priority: val });
      setPrioritySaved(true);
      setTimeout(() => setPrioritySaved(false), 1500);
    }, 300);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    await deleteDoc(doc(db, 'products', id));
    setRemoving(true);
    setTimeout(() => setRemoved(true), 300);
  }

  // תמונת ה-AI lifestyle מקבלת עדיפות כתמונה שמוצגת בגלילה; אחרת התנהגות קודמת (images[1])
  const thumbRaw     = aiLifestyleImage || ((images?.length ?? 0) >= 2 ? images[1] : (images?.[0] ?? ''));
  const imgSrc       = optimizeCloudinaryUrl(thumbRaw, 400) || null;
  const itemInCart   = items.find(i => i.id === id);
  const qty          = itemInCart?.quantity ?? 0;
  // מקור אמת יחיד למחיר: effectivePrice() — אותו חישוב בדיוק כמו בעמוד המוצר
  // ובפידים. clearance ומבצע מתוזמן כבר מטופלים בתוכו; אין לשכפל כאן לוגיקה.
  const source: EffectivePriceFields = productDoc ?? {
    price, clearanceDiscount, clearanceSalePrice,
  };
  const displayPrice = computeEffectivePrice({ ...source, price: source.price ?? price });
  const hasClearance = clearanceDiscount === true && typeof clearanceSalePrice === 'number';
  // מחיר-לפני-הנחה: was גובר; אם אין was אבל המחיר האפקטיבי נמוך מהמחיר
  // הבסיסי (מבצע/מלאי) — המחיר הבסיסי הוא ה"לפני".
  const compareAt    = typeof was === 'number' && was > displayPrice
    ? was
    : (displayPrice < price ? price : null);
  const hasSale      = compareAt !== null;
  const savePct      = hasSale ? Math.round((1 - displayPrice / compareAt!) * 100) : 0;
  const isNew        = (() => {
    if (!createdAt?.seconds) return false;
    return createdAt.seconds > Date.now() / 1000 - 7 * 24 * 60 * 60;
  })();

  const notPurchasable = outOfStock || comingSoon;

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (notPurchasable) return;
    // ⚠️ displayPrice ולא price: הכרטיס הוסיף עד כה לסל את המחיר הבסיסי גם
    // כשהוצג מחיר מבצע/מלאי — כלומר הלקוח חויב יותר ממה שראה, ובסכום שונה
    // מהוספה של אותו מוצר מעמוד המוצר (שם משתמשים ב-cartPrice האפקטיבי).
    addItem({ id, name, price: displayPrice, imgUrl: imgSrc ?? undefined, quantity: 1, cat, bundlePromo: bundlePromo ?? undefined });
    try { localStorage.removeItem('bmWizard_step'); } catch {}
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    updateQty(id, qty - 1);
  }

  if (removed) return null;

  return (
    <div
      dir="rtl"
      onClick={() => router.push(`/product/${id}`)}
      className={`group relative flex flex-col cursor-pointer rounded-none ${removing ? 'opacity-0 scale-95 pointer-events-none' : ''} ${horizontal ? 'pc-horizontal' : ''}`}
      style={{ background: '#FFFFFF', transition: 'opacity 0.25s ease' }}
    >
      {/* ── Admin toolbar ── */}
      {isAdmin && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/75" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleToggleHidden}
            title={localHidden ? 'הצג מוצר' : 'הסתר מוצר'}
            className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
              localHidden ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {localHidden ? <><IconEye /> הצג</> : <><IconEyeOff /> הסתר</>}
          </button>

          <input
            type="number" min={1} max={99} value={localPriority}
            onChange={handlePriorityChange}
            onClick={e => e.stopPropagation()}
            className="w-10 text-[10px] text-center font-bold rounded bg-white/20 text-white border border-white/30 px-1 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          {prioritySaved && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-400">
              <IconCheck size={8} /> נשמר
            </span>
          )}

          <div className="mr-auto flex gap-1">
            {deleteConfirm ? (
              <>
                <button onClick={handleDelete} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">אשר</button>
                <button onClick={e => { e.stopPropagation(); setDeleteConfirm(false); }} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white hover:bg-white/30 transition-colors">בטל</button>
              </>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
                title="מחק מוצר"
                className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white hover:bg-red-500/60 transition-colors"
              >
                <IconTrash /> מחק
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Image ── */}
      <div className={`relative w-full overflow-hidden rounded-none${horizontal ? ' pc-img' : ''}`} style={{ aspectRatio: '1 / 1', background: '#FFFFFF' }}>
        {imgSrc ? (
          <img
            src={imgSrc} alt={name}
            width={400} height={400}
            loading={aboveFold ? 'eager' : 'lazy'}
            fetchPriority={aboveFold ? 'high' : 'auto'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <IconBox />
          </div>
        )}

        {/* Top-right: best-seller / priority / bundle badge */}
        <div className="absolute top-2 right-2">
          <ProductBadge isBestSeller={isBestSeller} priority={priority} badge={badge} bundlePromo={bundlePromo} />
        </div>

        {/* Bottom-left: kippot discount badge */}
        {cat === 'כיפות' && (
          <div className="absolute bottom-0 left-0" style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
            padding: '8px 12px 8px 16px',
            borderRadius: '0 8px 0 0'
          }}>
            <span style={{ color: '#1a1a1a', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
              מוצר 2: 10% | 3+: 15%
            </span>
          </div>
        )}

        {/* Top-left: clearance / sale / new / klaf-selection badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {comingSoon && (
            <span className="flex items-center gap-1 text-white text-[11px] font-semibold px-2 py-1 rounded-none leading-tight" style={{ background: '#111111' }}>
              מגיע בקרוב{expectedArrivalDate ? ` ${formatArrivalDate(expectedArrivalDate)}` : ''}
            </span>
          )}
          {hasClearance && (
            <span className="flex items-center gap-1 text-white text-[11px] font-semibold px-2 py-1 rounded-none leading-tight" style={{ background: '#111111' }}>
              10% הנחת מלאי
            </span>
          )}
          {hasSale && !hasClearance && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-none leading-tight" style={{ background: '#C5A028', color: '#111111' }}>
              מבצע {savePct}%-
            </span>
          )}
          {isBundle && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-none leading-tight" style={{ background: '#373A5A', color: '#C5A028' }}>
              ✦ מארז מהודר
            </span>
          )}
          {/* תגית "רקמה אישית" הוסרה (07/2026) — היא הצטברה מעל התמונה יחד עם
              "חדש"/"מבצע"/"מארז" והסתירה את המוצר. ההתאמה האישית מוצגת בעמוד
              המוצר, ליד כפתור ההוספה לסל. */}
          {isNew && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-none leading-tight" style={{ background: '#FFFFFF', color: '#373A5A', border: '1px solid #373A5A' }}>
              חדש
            </span>
          )}
          {hasKlafSelection && (
            <span style={{ background: '#111111', color: '#C5A028', borderRadius: 0, fontSize: 11, fontWeight: 700, padding: '3px 8px', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              ✦ בחר את הקלף שלך
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className={horizontal ? 'pc-content' : ''} style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '8px 2px 2px', gap: 2 }}>
        <h3 className="mt-1 text-right text-[14px] font-medium leading-snug text-[#373A5A]" style={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', minHeight: '40px',
        } as React.CSSProperties}>
          {name}
        </h3>

        {(soferId || soferName || (cat && SOFER_CATS.has(cat))) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {soferPhoto ? (
              <img
                src={soferPhoto}
                alt={soferName ?? 'סופר'}
                style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB', flexShrink: 0 }}
              />
            ) : null}
            <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              נכתב ע״י {soferName ?? 'סופר מוסמך'}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="mt-1 flex items-center justify-start gap-2" dir="rtl">
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111111', lineHeight: 1 }}>
            {formatPrice(displayPrice)}
          </span>
          {hasClearance ? (
            <span style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(originalPrice ?? was ?? price)}</span>
          ) : hasSale ? (
            <span style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(compareAt!)}</span>
          ) : null}
        </div>

        {/* Cart button — minimal underlined text link */}
        <div style={{ marginTop: 'auto', paddingTop: 6, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
          {notPurchasable ? (
            <a
              href={`https://wa.me/972587479933?text=${encodeURIComponent('שלום, אני מתעניין במוצר: ' + name)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-block',
                color: '#6b7280', fontSize: 13, fontWeight: 500,
                textDecoration: 'underline', textUnderlineOffset: 4,
                cursor: 'pointer',
              }}
            >
              עדכנו אותי
            </a>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: '#111111', fontSize: 13, fontWeight: 500,
                textDecoration: 'underline', textUnderlineOffset: 4,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#373A5A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#111111'; }}
            >
              הוספה לסל
            </button>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 0, height: 30 }}>
              <button onClick={handleDecrement} style={{ background: 'none', border: 'none', color: '#373A5A', fontSize: 17, fontWeight: 700, cursor: 'pointer', padding: '0 10px', height: '100%', lineHeight: 1 }}>−</button>
              <span style={{ color: '#373A5A', fontWeight: 600, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{qty}</span>
              <button onClick={handleAdd} style={{ background: 'none', border: 'none', color: '#373A5A', fontSize: 17, fontWeight: 700, cursor: 'pointer', padding: '0 10px', height: '100%', lineHeight: 1 }}>+</button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
