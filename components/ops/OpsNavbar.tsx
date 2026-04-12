'use client';
import { useRouter } from 'next/navigation';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';

const ROLE_LABELS: Record<string, string> = {
  owner: 'בעלים',
  ops_manager: 'מנהל תפעול',
  fulfillment: 'מילוי הזמנות',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ops_manager: 'bg-blue-100 text-blue-800 border-blue-300',
  fulfillment: 'bg-green-100 text-green-800 border-green-300',
};

export default function OpsNavbar() {
  const { opsUser, logout } = useOpsAuth();
  const router = useRouter();

  const dashboardPath =
    opsUser?.role === 'owner'
      ? '/ops/dashboard/owner'
      : opsUser?.role === 'ops_manager'
      ? '/ops/dashboard/ops'
      : '/ops/dashboard/fulfillment';

  return (
    <nav
      style={{ background: '#0c1a35', borderBottom: '2px solid #b8972a' }}
      className="sticky top-0 z-50 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between" dir="rtl">
        {/* Logo + title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(dashboardPath)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span style={{ color: '#b8972a' }} className="text-xl font-black">✡ Your Sofer</span>
            <span className="text-white text-sm opacity-60">| מערכת פנימית</span>
          </button>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <button
            onClick={() => router.push(dashboardPath)}
            className="text-white hover:text-yellow-300 transition-colors"
          >
            דשבורד
          </button>
          <button
            onClick={() => router.push('/ops/orders')}
            className="text-white hover:text-yellow-300 transition-colors"
          >
            כל ההזמנות
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3">
          {opsUser && (
            <>
              <div className="text-right hidden sm:block">
                <div className="text-white text-sm font-semibold">{opsUser.name}</div>
                <div
                  className={`text-xs border rounded-full px-2 py-0.5 inline-block ${
                    ROLE_BADGE_STYLES[opsUser.role] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {ROLE_LABELS[opsUser.role] || opsUser.role}
                </div>
              </div>
              <button
                onClick={logout}
                className="text-sm text-white border border-white/30 hover:border-white/70 px-3 py-1.5 rounded-lg transition-colors"
              >
                יציאה
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
