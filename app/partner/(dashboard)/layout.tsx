'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PartnerProvider } from '@/app/contexts/PartnerContext';

// `ready: false` = the page has not been built yet. Those entries render as
// disabled ("בקרוב") instead of linking to a 404. Flip to true when the page lands.
const SIDEBAR_ITEMS = [
  { href: '/partner', label: 'ראשי', icon: '📊', ready: true },
  { href: '/partner/onboarding', label: 'הקמת חנות', icon: '🚀', ready: true },
  { href: '/partner/store', label: 'החנות שלי', icon: '🏪', ready: true },
  { href: '/partner/orders', label: 'הזמנות', icon: '📦', ready: true },
  { href: '/partner/products', label: 'מוצרים', icon: '🛒', ready: true },
  { href: '/partner/analytics', label: 'אנליטיקה', icon: '📈', ready: true },
  { href: '/partner/earnings', label: 'הרווחים שלי', icon: '💰', ready: true },
  { href: '/partner/payouts', label: 'משיכות כספים', icon: '🏦', ready: true },
  { href: '/partner/marketing', label: 'שיווק', icon: '📢', ready: true },
  { href: '/partner/subscription', label: 'המנוי שלי', icon: '🔔', ready: true },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
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

          <nav className="p-4 space-y-2">
            {SIDEBAR_ITEMS.map((item) =>
              item.ready ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <span className={`${!sidebarOpen && 'hidden'} text-sm font-medium`}>{item.label}</span>
                </Link>
              ) : (
                <div
                  key={item.href}
                  title="בקרוב"
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed select-none"
                >
                  <span className="text-xl flex-shrink-0 opacity-50">{item.icon}</span>
                  <span className={`${!sidebarOpen && 'hidden'} text-sm font-medium`}>
                    {item.label}
                    <span className="mr-2 text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">בקרוב</span>
                  </span>
                </div>
              )
            )}
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
