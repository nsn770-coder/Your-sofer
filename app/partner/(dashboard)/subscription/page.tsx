'use client';

import { usePartner } from '@/app/contexts/PartnerContext';

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  past_due: 'תשלום נכשל',
  suspended: 'מושהה',
  cancelled: 'בוטל',
  expired: 'פג תוקף',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-700',
  expired: 'bg-gray-200 text-gray-700',
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('he-IL');
}

export default function PartnerSubscriptionPage() {
  const { partner, subscription, loading } = usePartner();

  if (loading) return <p className="text-gray-500">בטעינה...</p>;

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">המנוי שלי</h1>
        <p className="text-gray-600 mt-1">פרטי המנוי החודשי ומועד החיוב הבא.</p>
      </div>

      {!subscription ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-900">
          לא נמצא מנוי פעיל. אם ביצעתם תשלום ולא נוצר מנוי, פנו לתמיכה.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">סטטוס</div>
              <span
                className={`inline-block mt-1 px-3 py-1 rounded-full text-sm ${
                  STATUS_STYLES[subscription.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {STATUS_LABELS[subscription.status] || subscription.status}
              </span>
            </div>
            <div className="text-left">
              <div className="text-sm text-gray-500">תשלום חודשי</div>
              <div className="text-2xl font-bold text-gray-900">
                ₪{(subscription.amount ?? 0).toLocaleString('he-IL')}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <Row label="תחילת התקופה" value={formatDate(subscription.currentPeriodStart)} />
            <Row label="סוף התקופה" value={formatDate(subscription.currentPeriodEnd)} />
            <Row label="חיוב הבא" value={formatDate(subscription.nextBillingDate)} />
            <Row label="חיוב אחרון" value={formatDate(subscription.lastChargeDate)} />
          </div>

          {subscription.failureCount > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
              נרשמו {subscription.failureCount} ניסיונות חיוב שנכשלו. יש לעדכן את אמצעי
              התשלום כדי למנוע השהיית החנות.
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">דמי הקמה</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Row
            label="סכום"
            value={`₪${(partner?.setupFeeAmount ?? 0).toLocaleString('he-IL')}`}
          />
          <Row label="שולם" value={partner?.setupFeePaid ? 'כן' : 'לא'} />
          <Row label="תאריך תשלום" value={formatDate(partner?.setupFeePaidAt)} />
          <Row label="עמלת פלטפורמה" value={`${partner?.commissionPercent ?? 20}%`} />
        </div>
      </div>

      <p className="text-sm text-gray-500">
        לשינוי או ביטול המנוי יש לפנות לתמיכה בכתובת shop@your-sofer.com
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-gray-900 font-medium mt-0.5">{value}</div>
    </div>
  );
}
