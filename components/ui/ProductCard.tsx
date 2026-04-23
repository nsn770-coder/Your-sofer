'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import { useAuth } from '@/app/contexts/AuthContext';
import ProductBadge from '@/components/ui/ProductBadge';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

interface Props {
  id: string;
  name: string;
  price: number;
  images: string[];
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
}

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

function IconFlame() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-2.67 1.19-4.81 2.38-6.29.57-.71 1.14-1.28 1.56-1.67.21-.19.38-.34.5-.44.06-.05.1-.09.13-.11l.04-.03c.12-.09.27-.09.38 0 .14.11.14.32 0 .43-.02.01-.05.04-.09.07-.1.09-.25.22-.43.39-.36.34-.87.86-1.38 1.49C4.99 10.23 4 12.09 4 14.5c0 3.59 3.13 6.5 7 6.5 1.04 0 2.03-.22 2.9-.62C11.64 19.8 10 17.77 10 15.5c0-1.5.61-2.86 1.59-3.84.49-.49 1.04-.85 1.58-1.09.27-.12.54-.21.79-.27.13-.03.25-.05.35-.06h.03c.15-.01.28.08.32.22.04.15-.04.3-.18.35-.02.01-.04.01-.07.02-.08.02-.17.05-.27.1-.22.08-.47.21-.71.39C12.7 11.8 12 13.07 12 14.5c0 2.49 2.01 4.5 4.5 4.5.49 0 .96-.08 1.4-.22C16.84 21.22 14.58 23 12 23z"/>
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
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
  id, name, price, images, priority, isBestSeller, badge, was, createdAt, hidden,
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

  const thumbRaw     = (images?.length ?? 0) >= 2 ? images[1] : (images?.[0] ?? '');
  const imgSrc       = optimizeCloudinaryUrl(thumbRaw, 400) || null;
  const itemInCart   = items.find(i => i.id === id);
  const qty          = itemInCart?.quantity ?? 0;
  const hasSale      = typeof was === 'number' && was > price;
  const savePct      = hasSale ? Math.round((1 - price / was!) * 100) : 0;
  const isNew        = (() => {
    if (!createdAt?.seconds) return false;
    return createdAt.seconds > Date.now() / 1000 - 7 * 24 * 60 * 60;
  })();

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({ id, name, price, imgUrl: imgSrc ?? undefined, quantity: 1 });
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
      className={`
        group relative flex flex-col bg-white rounded-2xl
        shadow-sm border border-gray-100 overflow-hidden cursor-pointer
        transition-all duration-300
        hover:shadow-md hover:-translate-y-0.5
        ${removing ? 'opacity-0 scale-95 pointer-events-none' : ''}
      `}
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
      <div className="relative w-full h-36 sm:h-auto sm:aspect-square bg-gray-50 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc} alt={name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <IconBox />
          </div>
        )}

        {/* Top-right: best-seller / priority badge */}
        <div className="absolute top-2 right-2">
          <ProductBadge isBestSeller={isBestSeller} priority={priority} badge={badge} />
        </div>

        {/* Top-left: sale or new badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasSale && (
            <span className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight" style={{ background: '#e53e3e' }}>
              <IconFlame /> מבצע
            </span>
          )}
          {isNew && (
            <span className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight" style={{ background: '#3182ce' }}>
              <IconSparkle /> חדש
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 px-2 py-2 sm:p-3 gap-1 sm:gap-2">
        <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
          {name}
        </p>

        <div className="flex flex-col gap-0.5">
          {hasSale && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-500 line-through font-medium">₪{was!.toLocaleString('he-IL')}</span>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">חסכת {savePct}%</span>
            </div>
          )}
          <p className="text-base sm:text-lg font-black text-[#0c1a35]">
            ₪{price.toLocaleString('he-IL')}
          </p>
        </div>

        {/* Cart button */}
        <div className="mt-auto" onClick={e => e.stopPropagation()}>
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1.5 rounded-full py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-all duration-200 bg-[#b8972a] text-[#0c1a35] border border-[#b8972a] hover:bg-[#a07d20] hover:border-[#a07d20]"
            >
              <IconCart size={13} />
              הוסף לסל
            </button>
          ) : (
            <div className="flex items-center justify-between bg-green-500 rounded-full overflow-hidden w-full">
              <button onClick={handleDecrement} className="px-3 py-1.5 sm:px-4 sm:py-2 text-white text-lg sm:text-xl font-bold hover:bg-green-600 transition-colors leading-none">−</button>
              <span className="text-white font-bold text-sm sm:text-base">{qty}</span>
              <button onClick={handleAdd} className="px-3 py-1.5 sm:px-4 sm:py-2 text-white text-lg sm:text-xl font-bold hover:bg-green-600 transition-colors leading-none">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
