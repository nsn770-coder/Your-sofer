'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');

  return (
    <main className="max-w-lg mx-auto p-6 text-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg p-10 mt-20">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-black text-green-700 mb-2">ההזמנה התקבלה!</h1>
        {orderNumber && (
          <div className="text-gray-500 text-sm mb-6">
            מספר הזמנה: <span className="font-bold text-gray-800">{orderNumber}</span>
          </div>
        )}
        <p className="text-gray-600 mb-8 leading-relaxed">
          תודה על הזמנתך! נשלח אליך אישור במייל בקרוב.
          הסופר יתחיל לעבוד על המוצר שלך בהקדם.
        </p>
        <button onClick={() => router.push('/')}
          className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-lg transition">
          חזרה לחנות
        </button>
      </div>
    </main>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}