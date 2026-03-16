'use client';
import { useRouter } from 'next/navigation';
import { useCart } from '../CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, total } = useCart();

  return (
    <main className="max-w-3xl mx-auto p-6" dir="rtl">
      <button onClick={() => router.push('/')}
        className="mb-6 flex items-center gap-2 text-green-700 font-bold hover:underline">
        ← חזרה לחנות
      </button>

      <h1 className="text-2xl font-bold mb-6">🛒 סל הקניות</h1>

      {items.length === 0 ? (
        <div className="text-center text-gray-400 py-20">
          <div className="text-5xl mb-4">🛒</div>
          <div className="text-lg">הסל ריק</div>
          <button onClick={() => router.push('/')}
            className="mt-6 bg-green-700 text-white px-6 py-2 rounded-xl font-bold">
            לחנות
          </button>
        </div>
      ) : (
        <div>
          {/* רשימת מוצרים */}
          <div className="flex flex-col gap-4 mb-8">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 bg-white rounded-xl shadow p-4 items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.imgUrl ? (
                    <img src={item.imgUrl} alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm line-clamp-2">{item.name}</div>
                  <div className="text-green-700 font-black mt-1">₪{item.price}</div>
                </div>

                {/* כמות */}
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 font-bold text-lg flex items-center justify-center">
                    −
                  </button>
                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-gray-100 font-bold text-lg flex items-center justify-center">
                    +
                  </button>
                </div>

                <div className="text-right">
                  <div className="font-black">₪{(item.price * item.quantity).toFixed(2)}</div>
                  <button onClick={() => removeItem(item.id)}
                    className="text-red-400 text-xs mt-1 hover:text-red-600">
                    הסר
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* סיכום */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>סה"כ לתשלום:</span>
              <span className="text-green-700 text-2xl">₪{total.toFixed(2)}</span>
            </div>
            <button onClick={() => router.push('/checkout')}
  className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg transition">
  המשך לתשלום →
</button>
          </div>
        </div>
      )}
    </main>
  );
}