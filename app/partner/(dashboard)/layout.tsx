'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PartnerProvider } from '@/app/contexts/PartnerContext';

// `ready: false` = the page has not been built yet. Those entries render as
// disabled ("בקרוב") instead of linking to a 404. Flip to true when the page lands.
const SIDEBAR_GROUPS: {
  title: string;
  items: { href: string; label: string; icon: string; ready: boolean }[];
}[] = [
  {
    title: 'סקירה',
    items: [
      { href: '/partner', label: 'ראשי', icon: '📊', ready: true },
      { href: '/partner/onboarding', label: 'הקמת חנות', icon: '🚀', ready: true },
    ],
  },
  {
    title: 'החנות',
    items: [
      { href: '/partner/store', label: 'החנות שלי', icon: '🏪', ready: true },
      { href: '/partner/products', label: 'מוצרים', icon: '🛒', ready: true },
      { href: '/partner/inventory', label: 'מלאי', icon: '📦', ready: true },
    ],
  },
  {
    title: 'מכירות',
    items: [
      { href: '/partner/orders', label: 'הזמנות', icon: '🧾', ready: true },
      { href: '/partner/customers', label: 'לקוחות', icon: '👤', ready: true },
      { href: '/partner/abandoned-carts', label: 'נטישות עגלה', icon: '🛒', ready: true },
      { href: '/partner/best-sellers', label: 'נמכרים ביותר', icon: '🏆', ready: true },
    ],
  },
  {
    title: 'כספים ונתונים',
    items: [
      { href: '/partner/analytics', label: 'אנליטיקה', icon: '📈', ready: true },
      { href: '/partner/profitability', label: 'רווחיות', icon: '💹', ready: true },
      { href: '/partner/earnings', label: 'הרווחים שלי', icon: '💰', ready: true },
      { href: '/partner/payouts', label: 'משיכות כספים', icon: '🏦', ready: true },
    ],
  },
  {
    title: 'אחר',
    items: [
      { href: '/partner/marketing', label: 'שיווק', icon: '📢', ready: true },
      { href: '/partner/subscription', label: 'המנוי שלי', icon: '🔔', ready: true },
    ],
  },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !user.partnerId)) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.partnerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">בטעינה...</p>
        </div>
      </div>
    );
  }

  return (
    <PartnerProvider>
      <div className="flex h-screen bg-gray-50" dir="rtl">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-l border-gray-200 transition-all duration-300`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <h1 className={`${!sidebarOpen && 'hidden'} font-bold text-lg`}>Your Sofer</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>

          <nav className="p-3 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.title}>
                <div
                  className={`${
                    !sidebarOpen && 'hidden'
                  } px-3 pb-1 text-[11px] font-semibold text-gray-400 tracking-wide`}
                >
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) =>
                    item.ready ? (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          pathname === item.href
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                        }`}
                      >
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <span className={`${!sidebarOpen && 'hidden'} text-sm`}>{item.label}</span>
                      </Link>
                    ) : (
                      <div
                        key={item.href}
                        title="בקרוב"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed select-none"
                      >
                        <span className="text-lg flex-shrink-0 opacity-50">{item.icon}</span>
                        <span className={`${!sidebarOpen && 'hidden'} text-sm`}>
                          {item.label}
                          <span className="mr-2 text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                            בקרוב
                          </span>
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Top bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="text-gray-600 text-sm">
              ברוכים הבאים, {user.displayName || user.email}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Partner Account</span>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                התנתקות
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </PartnerProvider>
  );
}
