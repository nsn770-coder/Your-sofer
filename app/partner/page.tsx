'use client';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePartner } from '@/app/contexts/PartnerContext';
import { DashboardStats } from '@/app/components/partner/DashboardStats';
import { OnboardingChecklist } from '@/app/components/partner/OnboardingChecklist';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { partner, subscription, loading } = usePartner();

  if (loading) {
    return <div className="text-center py-12">בטעינה...</div>;
  }

  if (!partner || !user) {
    return <div className="text-center py-12 text-gray-500">לא ניתן לטעון נתונים</div>;
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          שלום {partner.businessName}! 👋
        </h1>
        <p className="text-gray-600 mt-2">הנה מה שקרה בחנות שלך החודש</p>
      </div>

      {/* Status badge */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">סטטוס חנות</p>
            <p className="text-lg font-bold text-blue-600 mt-1">
              {partner.status === 'active' ? '🟢 פעילה' :
               partner.status === 'suspended' ? '🔴 מושהה' :
               partner.status === 'pending_payment' ? '🟡 ממתינה לתשלום' :
               partner.status}
            </p>
          </div>
          <div>
            {subscription && (
              <p className="text-sm text-gray-700">
                חיוב הבא: {new Date(subscription.nextBillingDate).toLocaleDateString('he-IL')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-8">
        <DashboardStats idToken={user.uid} />
      </div>

      {/* Onboarding Checklist */}
      <OnboardingChecklist partner={partner} />
    </div>
  );
}
