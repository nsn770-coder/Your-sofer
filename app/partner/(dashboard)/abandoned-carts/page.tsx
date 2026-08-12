'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePartner } from '@/app/contexts/PartnerContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imgUrl: string | null;
}

interface Cart {
  id: string;
  sessionId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  converted: boolean;
  updatedAt: number | null;
  cartTotal: number;
  myTotal: number;
  items: CartItem[];
}

interface Summary {
  total: number;
  potentialRevenue: number;
  withContact: number;
  scanned: number;
  scanLimit: number;
}

const shekel = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

function timeAgo(ms: number | null): string {
  if (!ms) return '—';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
}

export default function PartnerAbandonedCartsPage() {
  const { user } = useAuth();
  const { partner } = usePartner();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [onlyWithContact, setOnlyWithContact] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.idToken) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/partner/abandoned-carts', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'טעינת הנטישות נכשלה');
        if (!cancelled) {
          setCarts((data.carts || []).filter((c: Cart) => !c.converted));
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

  const filtered = useMemo(
    () => (onlyWithContact ? carts.filter((c) => c.phone || c.email) : carts),
    [carts, onlyWithContact]
  );

  function whatsappLink(cart: Cart) {
    const phone = cart.phone.replace(/\D/g, '').replace(/^0/, '972');
    const productNames = cart.items.map((i) => i.name).join(', ');
    const text = `שלום ${cart.name || ''}, ראינו שהתחלתם הזמנה ב${
      partner?.storeName || 'חנות שלנו'
    } (${productNames}) ולא סיימתם. אפשר לעזור במשהו?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">נטישות עגלה</h1>
        <p className="text-gray-600 mt-1">
          לקוחות שהוסיפו מוצרים שלכם לעגלה ולא השלימו רכישה.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card label="עגלות פתוחות" value={loading ? '…' : String(summary?.total ?? 0)} />
        <Card
          label="פוטנציאל הכנסה"
          value={loading ? '…' : shekel(summary?.potentialRevenue ?? 0)}
          highlight
        />
        <Card label="עם פרטי קשר" value={loading ? '…' : String(summary?.withContact ?? 0)} />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={onlyWithContact}
          onChange={(e) => setOnlyWithContact(e.target.checked)}
          className="rounded"
        />
        רק עגלות עם טלפון או אימייל
      </label>

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-500">בטעינה...</p>
        ) : filtered.length === 0 ? (
          <p className="bg-white rounded-lg border border-gray-200 p-6 text-gray-500">
            אין נטישות עגלה להצגה
          </p>
        ) : (
          filtered.map((cart) => (
            <div key={cart.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900">
                    {cart.name || 'לקוח אנונימי'}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 flex flex-wrap gap-x-3">
                    {cart.phone && <span dir="ltr">{cart.phone}</span>}
                    {cart.email && <span dir="ltr">{cart.email}</span>}
                    <span>{timeAgo(cart.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-left">
                    <div className="text-xs text-gray-500">שווי אצלכם</div>
                    <div className="font-bold text-gray-900">{shekel(cart.myTotal)}</div>
                  </div>
                  {cart.phone && (
                    <a
                      href={whatsappLink(cart)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm whitespace-nowrap"
                    >
                      וואטסאפ
                    </a>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === cart.id ? null : cart.id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
                  >
                    {expanded === cart.id ? 'סגירה' : `${cart.items.length} מוצרים`}
                  </button>
                </div>
              </div>

              {expanded === cart.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {cart.items.map((it, i) => (
                    <div key={`${it.id}-${i}`} className="flex items-center gap-3 text-sm">
                      {it.imgUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imgUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <span className="flex-1 text-gray-900">{it.name}</span>
                      <span className="text-gray-600">× {it.quantity}</span>
                      <span className="font-medium w-20 text-left">
                        {shekel(it.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                  {cart.address && (
                    <div className="text-xs text-gray-500 pt-2">כתובת: {cart.address}</div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {summary && summary.scanned >= summary.scanLimit && (
        <p className="text-xs text-gray-500">
          מוצגות {summary.scanLimit} העגלות האחרונות באתר. נטישות ישנות יותר אינן נסרקות.
        </p>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`text-2xl font-bold mt-1 ${highlight ? 'text-amber-700' : 'text-gray-900'}`}
      >
        {value}
      </div>
    </div>
  );
}
