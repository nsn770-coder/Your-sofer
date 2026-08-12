'use client';

import { useState } from 'react';
import { usePartner } from '@/app/contexts/PartnerContext';

export default function PartnerMarketingPage() {
  const { partner, loading } = usePartner();
  const [copied, setCopied] = useState<string | null>(null);

  if (loading) return <p className="text-gray-500">בטעינה...</p>;

  const base =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-sofer.com';
  const storeLink = partner?.storeUrl ? `${base}/store/${partner.storeUrl}` : '';

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const shareText = `${partner?.storeName || 'החנות שלי'} — סת"ם ויודאיקה באתר Your Sofer\n${storeLink}`;

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">שיווק</h1>
        <p className="text-gray-600 mt-1">
          כלים להפצת החנות שלכם ולהבאת לקוחות חדשים.
        </p>
      </div>

      {!partner?.isPublished && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          החנות עדיין לא מפורסמת — הקישורים יעבדו רק לאחר פרסום החנות.
        </div>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">קישור לחנות</h2>
        {storeLink ? (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={storeLink}
              dir="ltr"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono bg-gray-50"
            />
            <button
              onClick={() => copy(storeLink, 'link')}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm whitespace-nowrap"
            >
              {copied === 'link' ? 'הועתק ✓' : 'העתקה'}
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">כתובת החנות עדיין לא הוגדרה.</p>
        )}
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">שיתוף מהיר</h2>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
          >
            שיתוף בוואטסאפ
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            שיתוף בפייסבוק
          </a>
          <button
            onClick={() => copy(shareText, 'text')}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
          >
            {copied === 'text' ? 'הועתק ✓' : 'העתקת טקסט שיווקי'}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">טיפים להגדלת מכירות</h2>
        <ul className="space-y-2 text-sm text-gray-700 list-disc pr-5">
          <li>תמונות איכותיות מעלות משמעותית את שיעור ההמרה — עדיף רקע נקי ותאורה טובה.</li>
          <li>תיאור מוצר מפורט שמסביר את רמת הכשרות, הכתב והקלף מקטין פניות ומגדיל אמון.</li>
          <li>מענה מהיר בוואטסאפ הוא הגורם המשפיע ביותר על סגירת עסקה בקטגוריה הזו.</li>
          <li>עדכון מלאי שוטף מונע ביטולי הזמנות ופגיעה בדירוג החנות.</li>
        </ul>
      </section>
    </div>
  );
}
