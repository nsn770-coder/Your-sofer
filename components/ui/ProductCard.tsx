'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import ProductBadge from '@/components/ui/ProductBadge';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice } from '@/app/lib/utils';

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

function IconCart({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
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
  comingSoon, expectedArrivalDate,
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
  const hasClearance = clearanceDiscount === true && typeof clearanceSalePrice === 'number';
  const displayPrice = hasClearance ? clearanceSalePrice! : price;
  const hasSale      = !hasClearance && typeof was === 'number' && was > price;
  const savePct      = hasSale ? Math.round((1 - price / was!) * 100) : 0;
  const isNew        = (() => {
    if (!createdAt?.seconds) return false;
    return createdAt.seconds > Date.now() / 1000 - 7 * 24 * 60 * 60;
  })();

  const notPurchasable = outOfStock || comingSoon;

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (notPurchasable) return;
    addItem({ id, name, price, imgUrl: imgSrc ?? undefined, quantity: 1, cat, bundlePromo: bundlePromo ?? undefined });
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
      <div className={`relative w-full overflow-hidden rounded-none${horizontal ? ' pc-img' : ''}`} style={{ aspectRatio: '4 / 5', background: '#FFFFFF' }}>
        {imgSrc ? (
          <img
            src={imgSrc} alt={name}
            width={400} height={500}
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
          {hasSale && (
            <span className="flex items-center gap-1 text-white text-[11px] font-semibold px-2 py-1 rounded-none leading-tight" style={{ background: '#373A5A' }}>
              {savePct}% הנחה
            </span>
          )}
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
          {hasClearance && (
            <span style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(originalPrice ?? price)}</span>
          )}
          {hasSale && (
            <span style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'line-through' }}>{formatPrice(was!)}</span>
          )}
        </div>

        {/* Cart button */}
        <div className={qty === 0 ? 'lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200' : ''} style={{ marginTop: 'auto', paddingTop: 10 }} onClick={e => e.stopPropagation()}>
          {notPurchasable ? (
            <a
              href={`https://wa.me/972587479933?text=${encodeURIComponent('שלום, אני מתעניין במוצר: ' + name)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#FFFFFF', color: '#6b7280',
                height: 38, borderRadius: 0, border: '1px solid #d1d5db',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
              עדכנו אותי
            </a>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: '#FFFFFF', color: '#373A5A',
                height: 38, borderRadius: 0, border: '1px solid #373A5A',
                fontWeight: 500, fontSize: 14, cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#373A5A'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLButtonElement).style.color = '#373A5A'; }}
            >
              <IconCart size={13} />
              הוסף לסל
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', borderRadius: 0, overflow: 'hidden', width: '100%', height: 38, border: '1px solid #373A5A' }}>
              <button onClick={handleDecrement} style={{ background: 'none', border: 'none', color: '#373A5A', fontSize: 20, fontWeight: 800, cursor: 'pointer', padding: '0 14px', height: '100%', lineHeight: 1 }}>−</button>
              <span style={{ color: '#373A5A', fontWeight: 700, fontSize: 15 }}>{qty}</span>
              <button onClick={handleAdd} style={{ background: 'none', border: 'none', color: '#373A5A', fontSize: 20, fontWeight: 800, cursor: 'pointer', padding: '0 14px', height: '100%', lineHeight: 1 }}>+</button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
