'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';

export interface SoferData {
  name: string;
  city?: string;
  style?: string;
  imageUrl?: string;
}

interface Props {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  badge?: string | null;
  was?: number | null;
  sofer?: SoferData;
  soferName?: string;
}

function IconCart({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

function IconCheck({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconUser({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function SoferProductCard({ id, name, price, imgUrl, badge, was, sofer, soferName }: Props) {
  const router = useRouter();
  const { items, addItem, updateQty } = useCart();

  const itemInCart = items.find(i => i.id === id);
  const qty = itemInCart?.quantity ?? 0;
  const hasSale = typeof was === 'number' && was > price;
  const savePct = hasSale ? Math.round((1 - price / was!) * 100) : 0;
  const displayName = sofer?.name ?? soferName ?? '';

  function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    addItem({ id, name, price, imgUrl: imgUrl ?? undefined, quantity: 1 });
  }

  function handleDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    updateQty(id, qty - 1);
  }

  return (
    <div
      dir="rtl"
      onClick={() => router.push(`/product/${id}`)}
      className="group relative flex flex-col sm:flex-row bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
    >
      {/* ── Sofer side (40%) ── */}
      <div className="flex flex-row sm:flex-col items-center sm:justify-center gap-3 p-4 sm:w-[40%] bg-gradient-to-b from-[#f8f6f2] to-white border-b sm:border-b-0 sm:border-l border-gray-100 flex-shrink-0">
        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-[#0c1a35]/10 flex items-center justify-center">
          {sofer?.imageUrl ? (
            <img src={sofer.imageUrl} alt={sofer.name} className="w-full h-full object-cover" />
          ) : (
            <IconUser size={32} />
          )}
        </div>
        <div className="text-right sm:text-center sm:mt-2">
          {displayName ? (
            <>
              <p className="font-bold text-[#0c1a35] text-sm leading-tight">{displayName}</p>
              {sofer?.city && <p className="text-xs text-gray-500 mt-0.5">{sofer.city}</p>}
              {sofer?.style && (
                <p className="text-xs text-gray-400 mt-1 leading-snug line-clamp-3 sm:max-w-[140px]">{sofer.style}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">ללא פרטי סופר</p>
          )}
        </div>
      </div>

      {/* ── Product side (60%) ── */}
      <div className="flex flex-col flex-1">
        <div className="relative aspect-[16/9] sm:aspect-[4/3] bg-gray-50 overflow-hidden">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-200">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
          {badge && (
            <span className="absolute top-2 right-2 bg-[#b8972a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>

        <div className="p-3 flex flex-col gap-2 flex-1">
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{name}</p>

          <div className="flex items-baseline gap-2 mt-auto">
            <span className="text-lg font-black text-[#0c1a35]">₪{price.toLocaleString('he-IL')}</span>
            {hasSale && (
              <>
                <span className="text-xs text-gray-400 line-through">₪{was!.toLocaleString('he-IL')}</span>
                <span className="text-xs font-bold text-green-600">-{savePct}%</span>
              </>
            )}
          </div>

          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#0c1a35] text-white text-sm font-bold hover:bg-[#1a3060] transition-colors"
            >
              <IconCart size={13} />
              הוסף לסל
            </button>
          ) : (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button
                onClick={handleAdd}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0c1a35] text-white text-sm font-bold hover:bg-[#1a3060] transition-colors"
              >
                <IconCheck size={10} />
                בסל ({qty})
              </button>
              <button
                onClick={handleDecrement}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 font-bold text-lg transition-colors"
              >
                −
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
