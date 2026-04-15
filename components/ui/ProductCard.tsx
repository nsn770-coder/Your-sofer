'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';
import ProductBadge from '@/components/ui/ProductBadge';

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
}

export default function ProductCard({
  id,
  name,
  price,
  images,
  priority,
  isBestSeller,
  badge,
  was,
  createdAt,
}: Props) {
  const router = useRouter();
  const { items, addItem, updateQty } = useCart();

  const imgSrc = images?.[0] ?? null;

  const itemInCart = items.find(i => i.id === id);
  const qty = itemInCart?.quantity ?? 0;

  const hasSale = typeof was === 'number' && was > price;
  const savePct = hasSale ? Math.round((1 - price / was!) * 100) : 0;

  const isNew = (() => {
    if (!createdAt?.seconds) return false;
    const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
    return createdAt.seconds > sevenDaysAgo;
  })();

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({ id, name, price, imgUrl: imgSrc ?? undefined, quantity: 1 });
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    updateQty(id, qty - 1);
  }

  return (
    <div
      dir="rtl"
      onClick={() => router.push(`/product/${id}`)}
      className="
        group relative flex flex-col bg-white rounded-2xl
        shadow-sm border border-gray-100 overflow-hidden cursor-pointer
        transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
      "
    >
      {/* ─── Image ─────────────────────────────────────────────── */}
      {/* Mobile: fixed h-36 so the card stays compact; desktop: aspect-square */}
      <div className="relative w-full h-36 sm:h-auto sm:aspect-square bg-gray-50 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl text-gray-300">
            📦
          </div>
        )}

        {/* Top-right: best-seller / priority badge */}
        <div className="absolute top-2 right-2">
          <ProductBadge
            isBestSeller={isBestSeller}
            priority={priority}
            badge={badge}
          />
        </div>

        {/* Top-left: sale or new badge */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasSale && (
            <span
              className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight"
              style={{ background: '#e53e3e' }}
            >
              🔥 מבצע
            </span>
          )}
          {isNew && (
            <span
              className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight"
              style={{ background: '#3182ce' }}
            >
              ✨ חדש
            </span>
          )}
        </div>
      </div>

      {/* ─── Content ───────────────────────────────────────────── */}
      {/* Tighter padding + gap on mobile */}
      <div className="flex flex-col flex-1 px-2 py-2 sm:p-3 gap-1 sm:gap-2">

        {/* Name — smaller on mobile, 2-line clamp */}
        <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
          {name}
        </p>

        {/* Price block */}
        <div className="flex flex-col gap-0.5">
          {hasSale && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-500 line-through font-medium">
                ₪{was!.toLocaleString('he-IL')}
              </span>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                חסכת {savePct}%
              </span>
            </div>
          )}
          <p className="text-base sm:text-lg font-black text-[#0c1a35]">
            ₪{price.toLocaleString('he-IL')}
          </p>
        </div>

        {/* Cart button — smaller on mobile */}
        <div className="mt-auto" onClick={e => e.stopPropagation()}>
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="w-full rounded-full py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-all duration-200 bg-[#b8972a] text-[#0c1a35] border border-[#b8972a] hover:bg-[#a07d20] hover:border-[#a07d20]"
            >
              הוסף לסל
            </button>
          ) : (
            <div className="flex items-center justify-between bg-green-500 rounded-full overflow-hidden w-full">
              <button
                onClick={handleDecrement}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-white text-lg sm:text-xl font-bold hover:bg-green-600 transition-colors leading-none"
              >
                −
              </button>
              <span className="text-white font-bold text-sm sm:text-base">{qty}</span>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-white text-lg sm:text-xl font-bold hover:bg-green-600 transition-colors leading-none"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
