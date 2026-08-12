'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  images: string[];
  units30: number;
  daysOfCover: number | null;
  state: 'out' | 'low' | 'ok';
}

interface Summary {
  total: number;
  outOfStock: number;
  lowStock: number;
  inactive: number;
  inventoryValue: number;
  lowStockThreshold: number;
}

const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'out', label: 'אזל מלאי' },
  { key: 'low', label: 'מלאי נמוך' },
  { key: 'inactive', label: 'לא פעילים' },
] as const;

export default function PartnerInventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/partner/inventory', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת המלאי נכשלה');
        if (!cancelled) {
          setProducts(data.products || []);
          setSummary(data.summary || null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.idToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => {
        if (filter === 'out') return p.state === 'out';
        if (filter === 'low') return p.state === 'low';
        if (filter === 'inactive') return p.status !== 'active';
        return true;
      })
      .filter((p) =>
        q ? [p.name, p.sku, p.category].some((v) => (v || '').toLowerCase().includes(q)) : true
      );
  }, [products, filter, search]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מלאי</h1>
          <p className="text-gray-600 mt-1">
            מצב המלאי ומהירות מכירה ב-30 הימים האחרונים.
          </p>
        </div>
        <Link
          href="/partner/products"
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
        >
          ניהול מוצרים
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="מוצרים" value={loading ? '…' : String(summary?.total ?? 0)} />
        <Card
          label="אזלו מהמלאי"
          value={loading ? '…' : String(summary?.outOfStock ?? 0)}
          tone={summary?.outOfStock ? 'danger' : undefined}
        />
        <Card
          label="מלאי נמוך"
          value={loading ? '…' : String(summary?.lowStock ?? 0)}
          tone={summary?.lowStock ? 'warn' : undefined}
        />
        <Card label="שווי מלאי" value={loading ? '…' : shekel(summary?.inventoryValue ?? 0)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              filter === f.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש מוצר..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="p-6 text-gray-500">בטעינה...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-gray-500">אין מוצרים להצגה</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th>מוצר</Th>
                <Th>מק״ט</Th>
                <Th>מחיר</Th>
                <Th>מלאי</Th>
                <Th>נמכרו (30 יום)</Th>
                <Th>ימי כיסוי</Th>
                <Th>סטטוס</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <Td>
                    <div className="flex items-center gap-2">
                      {p.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </Td>
                  <Td>{p.sku || '—'}</Td>
                  <Td>{shekel(p.price)}</Td>
                  <Td>
                    <span
                      className={
                        p.state === 'out'
                          ? 'text-red-600 font-bold'
                          : p.state === 'low'
                          ? 'text-amber-600 font-bold'
                          : 'text-gray-800'
                      }
                    >
                      {p.stock}
                    </span>
                  </Td>
                  <Td>{p.units30}</Td>
                  <Td>
                    {p.daysOfCover === null ? (
                      <span className="text-gray-400">—</span>
                    ) : p.daysOfCover < 14 ? (
                      <span className="text-amber-600 font-medium">{p.daysOfCover}</span>
                    ) : (
                      p.daysOfCover
                    )}
                  </Td>
                  <Td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        p.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {p.status === 'active' ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'warn';
}) {
  const styles =
    tone === 'danger'
      ? 'bg-red-50 border-red-200 text-red-700'
      : tone === 'warn'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-white border-gray-200 text-gray-900';
  return (
    <div className={`rounded-lg border p-4 ${styles}`}>
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-right font-medium px-4 py-3 whitespace-nowrap">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{children}</td>;
}
