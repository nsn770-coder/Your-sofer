// Phase 10: Mobile-Optimized Partner Dashboard
'use client';

import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { PartnerEarningsChart } from './PartnerEarningsChart';
import { PayoutRequestForm } from './PayoutRequestForm';
import { DashboardStats } from './DashboardStats';
import { PartnerErrorBoundary } from './ErrorBoundary';

function MobilePartnerDashboardContent() {
  const authContext = useContext(AuthContext);
  if (!authContext) throw new Error('Missing AuthContext');

  const { user } = authContext;
  const [availableBalance, setAvailableBalance] = useState(0);

  // Fetch available balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.idToken) return;

      try {
        const res = await fetch('/api/partner/payouts/request', {
          headers: { Authorization: `Bearer ${user.idToken}` },
        });
        const result = await res.json();

        if (result.success && result.payouts) {
          let totalCommission = 0;
          let totalPaidOut = 0;

          // Get all orders for total commission (this would ideally be from a dedicated balance endpoint)
          const ordersRes = await fetch('/api/partner/orders?limit=1000', {
            headers: { Authorization: `Bearer ${user.idToken}` },
          });
          const ordersResult = await ordersRes.json();

          if (ordersResult.success) {
            for (const order of ordersResult.orders) {
              if (order.status === 'completed') {
                totalCommission += order.partnerCommission || 0;
              }
            }
          }

          // Get completed payouts
          for (const payout of result.payouts) {
            if (payout.status === 'completed') {
              totalPaidOut += payout.amount || 0;
            }
          }

          setAvailableBalance(Math.max(0, totalCommission - totalPaidOut));
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    fetchBalance();
  }, [user?.idToken]);

  if (!user || user.role !== 'partner') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">גישה מוגבלת</p>
      </div>
    );
  }

  const idToken = user.idToken || '';
  const partnerName = user.partnerName || 'שם העסק';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-right text-gray-900">{partnerName}</h1>
          <p className="text-sm text-gray-600 text-right mt-1">לוח בקרה שותף</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6 pb-20">
        {/* Stats Cards */}
        <div>
          <h2 className="text-lg font-semibold text-right mb-3 text-gray-900">סטטיסטיקות</h2>
          <DashboardStats idToken={idToken} />
        </div>

        {/* Earnings Chart */}
        <div>
          <h2 className="text-lg font-semibold text-right mb-3 text-gray-900">הכנסות ועמלות</h2>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <PartnerEarningsChart idToken={idToken} />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            aria-label="הזמנות"
            className="bg-white border border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition"
          >
            <div className="text-2xl mb-2">📦</div>
            <p className="text-sm font-medium text-gray-700">הזמנות</p>
          </button>
          <button
            aria-label="ניתוח"
            className="bg-white border border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition"
          >
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-medium text-gray-700">ניתוח</p>
          </button>
        </div>

        {/* Payout Section */}
        <div>
          <h2 className="text-lg font-semibold text-right mb-3 text-gray-900">משיכות כסף</h2>
          <PayoutRequestForm idToken={idToken} availableBalance={availableBalance} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <nav className="flex justify-around">
          <button
            aria-label="בעמוד הבית"
            className="flex-1 py-3 text-center text-blue-600 border-t-2 border-blue-600"
          >
            <span className="text-2xl">🏠</span>
            <p className="text-xs mt-1">בית</p>
          </button>
          <button
            aria-label="הזמנות"
            className="flex-1 py-3 text-center text-gray-600"
          >
            <span className="text-2xl">📦</span>
            <p className="text-xs mt-1">הזמנות</p>
          </button>
          <button
            aria-label="בקשות משיכה"
            className="flex-1 py-3 text-center text-gray-600"
          >
            <span className="text-2xl">💰</span>
            <p className="text-xs mt-1">משיכות</p>
          </button>
          <button
            aria-label="הגדרות"
            className="flex-1 py-3 text-center text-gray-600"
          >
            <span className="text-2xl">⚙️</span>
            <p className="text-xs mt-1">הגדרות</p>
          </button>
        </nav>
      </div>
    </div>
  );
}

export function MobilePartnerDashboard() {
  return (
    <PartnerErrorBoundary>
      <MobilePartnerDashboardContent />
    </PartnerErrorBoundary>
  );
}
