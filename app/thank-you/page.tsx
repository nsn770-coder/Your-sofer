'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as pixel from '@/lib/metaPixel';

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const orderId = searchParams.get('orderId');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!orderId || emailSent) return;

    async function sendEmail() {
      try {
        // קבל פרטי ההזמנה מ-Firestore
        const orderSnap = await getDoc(doc(db, 'orders', orderId!));
        if (!orderSnap.exists()) return;

        const order = orderSnap.data();

        // עדכן סטטוס הזמנה ל-paid
        await updateDoc(doc(db, 'orders', orderId!), {
          status: 'paid',
          paidAt: new Date().toISOString(),
        });

        // GA4 purchase event
        window.gtag?.('event', 'purchase', {
          transaction_id: order.orderNumber,
          value: order.total,
          currency: 'ILS',
          items: (order.items || []).map((i: { id: string; name: string; price: number; quantity: number }) => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        });

        // Meta Pixel purchase event
        pixel.purchase(
          order.orderNumber,
          (order.items || []).map((i: { id: string; name: string; price: number; quantity: number }) => ({
            id: i.id, name: i.name, price: i.price, quantity: i.quantity,
          })),
          order.total,
        );

        // שלח מייל ללקוח
        await fetch('/api/send-order-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: order.email,
            customerName: order.customerName,
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.total,
            address: order.address,
          }),
        });

        // סנכרן לתוך מערכת הניהול הפנימית
        fetch('/api/ops/sync-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderId,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.email,
            customerPhone: order.phone || '',
            items: order.items,
            total: order.total,
            address: order.address,
          }),
        }).catch((e) => console.error('Ops sync error (non-fatal):', e));

        setEmailSent(true);
      } catch (e) {
        console.error('Email send error:', e);
      }
    }

    sendEmail();
  }, [orderId]);

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
          תודה על הזמנתך! שלחנו אליך אישור במייל.
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
