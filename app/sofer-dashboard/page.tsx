'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  imgUrl?: string;
  status: string;
  inventoryCount?: number;
}

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  soferId: string;
  orderId: string;
  orderDate?: { seconds: number };
  orderStatus?: string;
  customerName?: string;
}

export default function SoferDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && user.role !== 'sofer' && user.role !== 'admin') router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user && (user.role === 'sofer' || user.role === 'admin') && user.soferId) {
      loadData();
    } else if (user && user.role === 'admin') {
      setDataLoading(false);
    }
  }, [user]);

  async function loadData() {
    if (!user?.soferId) return;
    try {
      // טען מוצרים של הסופר
      const productsSnap = await getDocs(
        query(collection(db, 'products'), where('soferId', '==', user.soferId))
      );
      const productsData: Product[] = [];
      productsSnap.forEach(d => productsData.push({ id: d.id, ...d.data() } as Product));
      setProducts(productsData);

      // טען פריטי הזמנות של הסופר
      const ordersSnap = await getDocs(
        query(collection(db, 'orderItems'), where('soferId', '==', user.soferId))
      );
      const ordersData: OrderItem[] = [];
      ordersSnap.forEach(d => ordersData.push({ id: d.id, ...d.data() } as OrderItem));
      setOrderItems(ordersData);
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 22 }}>טוען...</div>
    </div>
  );

  if (!user || (user.role !== 'sofer' && user.role !== 'admin')) return null;

  // אם אין soferId עדיין
  if (!user.soferId) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✍️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a3a2a', marginBottom: 12 }}>הפרופיל שלך בבדיקה</h2>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          הבקשה שלך להצטרף כסופר התקבלה ונמצאת בבדיקה. נודיע לך ברגע שתאושר.
        </p>
        <button onClick={() => router.push('/')}
          style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          חזרה לדף הבית
        </button>
      </div>
    </div>
  );

  // חישובים
  const totalSold = orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalRevenue = orderItems.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
  const activeProducts = products.filter(p => p.status === 'active').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#a8c8b4', marginBottom: 4 }}>פורטל סופר</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
            שלום, {user.displayName?.split(' ')[0]} ✍️
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/sofer-dashboard/edit')}
            style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✏️ ערוך פרופיל
          </button>
          <button onClick={() => router.push('/')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ← לחנות
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1a3a2a' }}>{products.length}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>סה"כ מוצרים</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#2980b9' }}>{activeProducts}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>מוצרים פעילים</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#8e44ad' }}>{totalSold}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>יחידות שנמכרו</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#27ae60' }}>₪{totalRevenue.toFixed(0)}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>סה"כ מכירות</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'overview', label: '📊 סקירה' },
            { key: 'products', label: '📜 המוצרים שלי' },
            { key: 'orders', label: '📦 הזמנות' },
          ].map(t => (
            <button key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: activeTab === t.key ? '#1a3a2a' : '#fff',
                color: activeTab === t.key ? '#fff' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16, color: '#1a3a2a' }}>הזמנות אחרונות</h3>
            {orderItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div>אין הזמנות עדיין</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מוצר</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>כמות</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מחיר</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.slice(0, 10).map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.productTitle}</td>
                      <td style={{ padding: '10px 8px', color: '#555' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 8px', color: '#27ae60', fontWeight: 700 }}>₪{item.price}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          background: item.orderStatus === 'delivered' ? '#d5f5e3' : '#fef9e7',
                          color: item.orderStatus === 'delivered' ? '#1e8449' : '#b7950b',
                          padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700
                        }}>
                          {item.orderStatus === 'delivered' ? '✅ נמסר' : '⏳ בתהליך'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div>
            {products.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
                <div style={{ fontSize: 18, color: '#555', marginBottom: 8 }}>אין מוצרים עדיין</div>
                <div style={{ fontSize: 14, color: '#888' }}>המנהל ישייך אליך מוצרים בקרוב</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {products.map(p => (
                  <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div style={{ height: 120, background: 'linear-gradient(135deg, #1a3a2a, #3d7a52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl || p.imgUrl ? (
                        <img src={p.imageUrl || p.imgUrl} alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 40 }}>📜</span>
                      )}
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{p.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#1a3a2a' }}>₪{p.price}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: p.status === 'active' ? '#d5f5e3' : '#fde8e8',
                          color: p.status === 'active' ? '#1e8449' : '#c0392b',
                        }}>
                          {p.status === 'active' ? '● פעיל' : '● לא פעיל'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{p.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {orderItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div>אין הזמנות עדיין</div>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מוצר</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>לקוח</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>כמות</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סכום</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{item.productTitle}</td>
                      <td style={{ padding: '10px 8px', color: '#555' }}>{item.customerName || '—'}</td>
                      <td style={{ padding: '10px 8px' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 8px', color: '#27ae60', fontWeight: 700 }}>₪{(item.price * (item.quantity || 1)).toFixed(0)}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          background: item.orderStatus === 'delivered' ? '#d5f5e3' : '#fef9e7',
                          color: item.orderStatus === 'delivered' ? '#1e8449' : '#b7950b',
                          padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700
                        }}>
                          {item.orderStatus === 'delivered' ? '✅ נמסר' :
                           item.orderStatus === 'processing' ? '🔄 בעיבוד' : '⏳ חדש'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
