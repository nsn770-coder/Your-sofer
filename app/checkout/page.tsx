'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../CartContext';
import { useShaliach } from '../ShaliachContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { shaliach, refCode } = useShaliach();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">טוען...</div>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.address) {
      alert('נא למלא את כל השדות');
      return;
    }
    setLoading(true);
    try {
      const orderNumber = 'YS-' + Date.now().toString().slice(-6);

      // חשב עמלה אם יש שליח
      const commissionPercent = shaliach?.commissionPercent || 0;
      const commissionAmount = commissionPercent > 0
        ? Math.round(total * commissionPercent / 100 * 100) / 100
        : 0;

      await addDoc(collection(db, 'orders'), {
        orderNumber,
        customerName: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        total,
        status: 'new',
        createdAt: serverTimestamp(),
        // שליח
        shaliachRef: refCode || null,
        shaliachId: shaliach?.id || null,
        shaliachName: shaliach?.name || null,
        commissionPercent,
        commissionAmount,
      });

      clearCart();
      router.push(`/thank-you?order=${orderNumber}`);
    } catch (e) {
      alert('שגיאה בשליחת ההזמנה. נסה שוב.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6" dir="rtl">
      <button onClick={() => router.push('/cart')}
        className="mb-6 flex items-center gap-2 text-green-700 font-bold hover:underline">
        ← חזרה לסל
      </button>

      <h1 className="text-2xl font-bold mb-8">💳 השלמת הזמנה</h1>

      {/* באנר שליח */}
      {shaliach && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-800 font-semibold">
          🤝 הזמנה זו מיוחסת לשליח: {shaliach.name}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-bold text-lg mb-4">פרטי משלוח</h2>
            {[
              { name: 'name', label: 'שם מלא', placeholder: 'ישראל ישראלי', type: 'text' },
              { name: 'email', label: 'אימייל', placeholder: 'your@email.com', type: 'email' },
              { name: 'phone', label: 'טלפון', placeholder: '050-0000000', type: 'tel' },
              { name: 'address', label: 'כתובת למשלוח', placeholder: 'רחוב, עיר', type: 'text' },
            ].map(field => (
              <div key={field.name} className="mb-4">
                <label className="block text-sm font-bold mb-1">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl text-lg transition">
            {loading ? '⏳ שולח...' : '✅ אשר הזמנה'}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow p-6 h-fit">
          <h2 className="font-bold text-lg mb-4">סיכום הזמנה</h2>
          <div className="flex flex-col gap-3 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} × {item.quantity}</span>
                <span className="font-bold">₪{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 flex justify-between font-black text-lg">
            <span>סה"כ:</span>
            <span className="text-green-700">₪{total.toFixed(2)}</span>
          </div>
          {shaliach && (
            <div className="mt-3 text-xs text-gray-400">
              עמלת שליח: {shaliach.commissionPercent}% = ₪{(total * shaliach.commissionPercent / 100).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}