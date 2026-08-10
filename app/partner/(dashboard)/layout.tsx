'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PartnerProvider } from '@/app/contexts/PartnerContext';

const SIDEBAR_ITEMS = [
  { href: '/partner/dashboard', label: 'ראשי', icon: '📊' },
  { href: '/partner/onboarding', label: 'הקמת חנות', icon: '🚀' },
  { href: '/partner/store', label: 'החנות שלי', icon: '🏪' },
  { href: '/partner/orders', label: 'הזמנות', icon: '📦' },
  { href: '/partner/products', label: 'מוצרים', icon: '🛒' },
  { href: '/partner/analytics', label: 'אנליטיקה', icon: '📈' },
  { href: '/partner/earnings', label: 'הרווחים שלי', icon: '💰' },
  { href: '/partner/payouts', label: 'משיכות כספים', icon: '🏦' },
  { href: '/partner/marketing', label: 'שיווק', icon: '📢' },
  { href: '/partner/subscription', label: 'הנוי שלי', icon: '🔔' },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'partner')) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'partner') {
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
            {SIDEBAR_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors"
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className={`${!sidebarOpen && 'hidden'} text-sm font-medium`}>{item.label}</span>
              </Link>
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
                onClick={() => {
                  // Logout
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
