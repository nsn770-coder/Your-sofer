'use client';

import Link from 'next/link';
import { usePartner } from '@/app/contexts/PartnerContext';
import { OnboardingChecklist } from '@/app/components/partner/OnboardingChecklist';

export default function PartnerOnboardingPage() {
  const { partner, loading } = usePartner();

  if (loading) {
    return <p className="text-gray-500">בטעינה...</p>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הקמת החנות</h1>
        <p className="text-gray-600 mt-1">
          השלימו את השלבים הבאים כדי לפרסם את החנות שלכם באתר.
        </p>
      </div>

      <OnboardingChecklist partner={partner} />

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">השלבים הבאים</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/partner/store"
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">🏪 עיצוב החנות</div>
            <p className="text-sm text-gray-600 mt-1">שם, לוגו, צבעים ופרסום</p>
          </Link>
          <Link
            href="/partner/products"
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-gray-900">🛒 הוספת מוצרים</div>
            <p className="text-sm text-gray-600 mt-1">העלאת מוצרים והגדרות מחסן</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
