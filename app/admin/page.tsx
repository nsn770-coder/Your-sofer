'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  shaliachName?: string;
  commissionAmount?: number;
  createdAt?: { seconds: number };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'commissions'>('orders');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrders();
    }
  }, [user]);

  async function loadOrders() {
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const data: Order[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  }

  if (loading || ordersLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl">טוען...</div>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCommissions = orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
  const shaliachOrders = orders.filter(o => o.shaliachName);

  return (
    <main className="max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">👑 דשבורד מנהל</h1>
        <button onClick={() => router.push('/')}
          className="text-green-700 font-bold hover:underline">
          ← חזרה לחנות
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-green-700">₪{totalRevenue.toFixed(0)}</div>
          <div className="text-sm text-gray-500 mt-1">סה"כ הכנסות</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{orders.length}</div>
          <div className="text-sm text-gray-500 mt-1">הזמנות</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-purple-600">{shaliachOrders.length}</div>
          <div className="text-sm text-gray-500 mt-1">הזמנות שליחים</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-orange-500">₪{totalCommissions.toFixed(0)}</div>
          <div className="text-sm text-gray-500 mt-1">עמלות לתשלום</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'orders' ? 'bg-green-700 text-white' : 'bg-white text-gray-600'}`}>
          📦 הזמנות
        </button>
        <button onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'commissions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
          🤝 עמלות שליחים
        </button>
      </div>

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">מספר הזמנה</th>
                <th className="p-3 text-right">לקוח</th>
                <th className="p-3 text-right">סכום</th>
                <th className="p-3 text-right">שליח</th>
                <th className="p-3 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                  <td className="p-3 font-bold">{o.customerName}</td>
                  <td className="p-3 text-green-700 font-bold">₪{o.total}</td>
                  <td className="p-3 text-blue-600">{o.shaliachName || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                      ${o.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                        o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'}`}>
                      {o.status === 'new' ? '⏳ חדש' :
                       o.status === 'processing' ? '🔄 בעיבוד' :
                       o.status === 'delivered' ? '✅ נמסר' : o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commissions */}
      {activeTab === 'commissions' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {shaliachOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין הזמנות שליחים עדיין</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-right">מספר הזמנה</th>
                  <th className="p-3 text-right">שליח</th>
                  <th className="p-3 text-right">סכום הזמנה</th>
                  <th className="p-3 text-right">אחוז עמלה</th>
                  <th className="p-3 text-right">עמלה</th>
                </tr>
              </thead>
              <tbody>
                {shaliachOrders.map(o => (
                  <tr key={o.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                    <td className="p-3 font-bold text-blue-600">{o.shaliachName}</td>
                    <td className="p-3">₪{o.total}</td>
                    <td className="p-3">{(o as any).commissionPercent}%</td>
                    <td className="p-3 font-bold text-orange-500">₪{o.commissionAmount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}