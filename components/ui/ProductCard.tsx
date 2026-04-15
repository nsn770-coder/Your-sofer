'use client';
import { useState } from 'react';
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
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const imgSrc = images?.[0] ?? null;

  // Sale: original price exists and is higher than current
  const hasSale = typeof was === 'number' && was > price;
  const savePct = hasSale ? Math.round((1 - price / was!) * 100) : 0;

  // New: added within the last 7 days
  const isNew = (() => {
    if (!createdAt?.seconds) return false;
    const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
    return createdAt.seconds > sevenDaysAgo;
  })();

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({ id, name, price, imgUrl: imgSrc ?? undefined, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
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
      <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
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

        {/* Top-right: existing badge (best seller / priority) */}
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
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Name — max 2 lines */}
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">
          {name}
        </p>

        {/* Price block */}
        <div className="flex flex-col gap-0.5">
          {hasSale && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500 line-through font-medium">
                ₪{was!.toLocaleString('he-IL')}
              </span>
              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                חסכת {savePct}%
              </span>
            </div>
          )}
          <p className="text-lg font-black text-[#0c1a35]">
            ₪{price.toLocaleString('he-IL')}
          </p>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          className={`
            mt-auto w-full rounded-full py-2 text-sm font-bold
            transition-all duration-200 border
            ${added
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-[#b8972a] text-[#0c1a35] border-[#b8972a] hover:bg-[#a07d20] hover:border-[#a07d20]'
            }
          `}
        >
          {added ? '✓ נוסף לסל' : 'הוסף לסל'}
        </button>
      </div>
    </div>
  );
}
