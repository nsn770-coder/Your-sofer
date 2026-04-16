'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import ProductCard from '@/components/ui/ProductCard';

interface Product {
  id: string;
  name: string;
  price: number;
  imgUrl?: string;
  image_url?: string;
  imgUrl2?: string;
  imgUrl3?: string;
  priority?: number;
  isBestSeller?: boolean;
  badge?: string | null;
  was?: number | null;
  createdAt?: { seconds: number } | null;
  hidden?: boolean;
  description?: string;
  cat?: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() ?? '';

  const [results, setResults]   = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);

  const doSearch = useCallback(async (term: string) => {
    if (!term) { setResults([]); return; }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'products'), orderBy('priority', 'desc'), limit(500))
      );
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => p.hidden !== true);

      const lower = term.toLowerCase();
      const matched = all.filter(p =>
        p.name?.toLowerCase().includes(lower) ||
        p.description?.toLowerCase().includes(lower) ||
        p.cat?.toLowerCase().includes(lower)
      );
      setResults(matched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doSearch(q); }, [q, doSearch]);

  return (
    <main className="max-w-6xl mx-auto px-3 sm:px-6 py-8" dir="rtl">
      <h1 className="text-xl sm:text-2xl font-black text-[#0c1a35] mb-1">
        תוצאות חיפוש
      </h1>
      {q && (
        <p className="text-sm text-gray-500 mb-6">
          חיפוש: <span className="font-bold text-[#0c1a35]">{q}</span>
          {!loading && (
            <span className="mr-2 text-gray-400">({results.length} תוצאות)</span>
          )}
        </p>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#b8972a]" />
        </div>
      )}

      {!loading && q && results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-bold text-gray-600">לא נמצאו תוצאות עבור &ldquo;{q}&rdquo;</p>
          <p className="text-sm text-gray-400 mt-2">נסה מילת חיפוש אחרת</p>
        </div>
      )}

      {!loading && !q && (
        <div className="text-center py-20">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg font-bold text-gray-600">הקלד מילת חיפוש כדי להתחיל</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
          {results.map(p => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={p.price}
              images={[p.imgUrl || p.image_url, p.imgUrl2, p.imgUrl3].filter(Boolean) as string[]}
              priority={p.priority}
              isBestSeller={p.isBestSeller}
              badge={p.badge}
              was={p.was}
              createdAt={p.createdAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
