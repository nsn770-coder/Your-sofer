'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '../../contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  desc?: string;
  description?: string;
  imgUrl?: string;
  image_url?: string;
  img1?: string;
  img2?: string;
  img3?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  imgUrl4?: string;
  cat?: string;
  badge?: string;
  sofer?: string;
  days?: string;
}

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'products', String(id)));
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() } as Product);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-2xl">טוען...</div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-xl">מוצר לא נמצא</div>
      <button onClick={() => router.push('/')} className="bg-green-700 text-white px-6 py-2 rounded-lg">
        חזרה לחנות
      </button>
    </div>
  );

  const imgs = [
    product.imgUrl || product.image_url,
    product.imgUrl2 || product.img1,
    product.imgUrl3 || product.img2,
    product.imgUrl4 || product.img3,
  ].filter(Boolean) as string[];

  function handleAddToCart() {
    addItem({
      id: product!.id,
      name: product!.name,
      price: product!.price,
      imgUrl: product!.imgUrl || product!.image_url,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main className="max-w-5xl mx-auto p-6" dir="rtl">
      {/* כפתור חזרה */}
      <button onClick={() => router.push('/')}
        className="mb-6 flex items-center gap-2 text-green-700 font-bold hover:underline">
        ← חזרה לחנות
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* גלריה */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3">
            {imgs.length > 0 ? (
              <img src={imgs[activeImg]} alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2">
              {imgs.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition
                    ${activeImg === i ? 'border-green-600' : 'border-transparent opacity-60'}`}>
                  <img src={img} alt={`תמונה ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* פרטים */}
        <div className="flex flex-col gap-4">
          {product.badge && (
            <span className="w-fit text-sm font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">
              {product.badge}
            </span>
          )}

          <h1 className="text-2xl font-bold leading-tight">{product.name}</h1>

          <div>
            {product.was && (
              <div className="text-gray-400 line-through text-sm">₪{product.was}</div>
            )}
            <div className="text-3xl font-black text-green-700">₪{product.price}</div>
            <div className="text-sm text-gray-500">כולל מע"מ · משלוח חינם</div>
          </div>

          {product.sofer && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 font-semibold">
              ✓ כתוב בידי {product.sofer} — סופר מאומת ומורשה
            </div>
          )}

          {(product.desc || product.description) && (
            <div className="text-gray-600 text-sm leading-relaxed border-t pt-4">
              {product.desc || product.description}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <div>📦 זמן אספקה: {product.days || '7-14'} ימי עסקים</div>
            <div>🚚 משלוח חינם לכל הארץ</div>
            <div>↩️ ביטול עד 24 שעות מהרכישה</div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button onClick={handleAddToCart}
              className={`w-full font-bold py-3 rounded-xl text-lg transition
                ${added ? 'bg-green-500 text-white' : 'bg-yellow-400 hover:bg-yellow-300 text-black'}`}>
              {added ? '✅ נוסף לסל!' : '🛒 הוסף לסל'}
            </button>
            <button onClick={() => { handleAddToCart(); router.push('/cart'); }}
              className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-lg transition">
              ⚡ קנה עכשיו
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}