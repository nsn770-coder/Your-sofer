'use client';
import { Partner } from '@/app/lib/partner-types';
import { getOnboardingProgress } from '@/app/lib/partner';

export function OnboardingChecklist({ partner }: { partner: Partner | null }) {
  if (!partner) return null;

  const progress = getOnboardingProgress(partner);
  const items = [
    { key: 'nameComplete', label: '✓ השם והעיר שלך', link: '/partner/onboarding?step=name' },
    { key: 'logoComplete', label: '✓ הלוגו שלך', link: '/partner/onboarding?step=logo' },
    { key: 'colorsComplete', label: '✓ הצבעים שלך', link: '/partner/onboarding?step=colors' },
    {
      key: 'whatsappComplete',
      label: '✓ WhatsApp / טלפון',
      link: '/partner/onboarding?step=whatsapp',
    },
    { key: 'published', label: '✓ פרסום החנות', link: '/partner/store' },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">🚀 השלם את הקמת החנות</h2>
        <div className="text-sm font-bold text-blue-600">{progress}%</div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.link}
            className="flex items-center gap-3 p-3 bg-white rounded hover:bg-blue-50 transition-colors"
          >
            <span className={`text-lg ${(partner.onboarding as any)[item.key] ? '' : 'opacity-30'}`}>
              {(partner.onboarding as any)[item.key] ? '✅' : '⬜'}
            </span>
            <span className="text-gray-700 text-sm">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
