'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, getDocs, orderBy, query,
  doc, updateDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../contexts/AuthContext';

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

interface SoferApplication {
  id: string;
  name: string;
  city: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  description?: string;
  style?: string;
  categories: string[];
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: { seconds: number };
}

interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: string;
  soferId?: string;
  shaliachId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  cat?: string;
  category?: string;
  status?: string;
  soferId?: string;
  imgUrl?: string;
  image_url?: string;
}

interface Sofer {
  id: string;
  name: string;
}

type TabType = 'orders' | 'commissions' | 'soferim' | 'users' | 'products';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: '👑 מנהל',
  sofer: '✍️ סופר',
  shaliach: '🟦 שליח',
  customer: '👤 לקוח',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  sofer: 'bg-amber-100 text-amber-700',
  shaliach: 'bg-blue-100 text-blue-700',
  customer: 'bg-gray-100 text-gray-600',
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<SoferApplication[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [soferim, setSoferim] = useState<Sofer[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('הכל');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOrders();
      loadApplications();
      loadUsers();
      loadProducts();
      loadSoferim();
    }
  }, [user]);

  async function loadOrders() {
    try {
      const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      const data: Order[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Order));
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setOrdersLoading(false); }
  }

  async function loadApplications() {
    try {
      const snap = await getDocs(query(collection(db, 'soferim_applications'), orderBy('createdAt', 'desc')));
      const data: SoferApplication[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as SoferApplication));
      setApplications(data);
    } catch (e) { console.error(e); }
    finally { setAppsLoading(false); }
  }

  async function loadUsers() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data: AppUser[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as AppUser));
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setUsersLoading(false); }
  }

  async function loadProducts() {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const data: Product[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Product));
      setProducts(data);
    } catch (e) { console.error(e); }
    finally { setProductsLoading(false); }
  }

  async function loadSoferim() {
    try {
      const snap = await getDocs(collection(db, 'soferim'));
      const data: Sofer[] = [];
      snap.forEach(d => data.push({ id: d.id, name: d.data().name } as Sofer));
      setSoferim(data);
    } catch (e) { console.error(e); }
  }

  async function assignSoferToProduct(productId: string, soferId: string) {
    setActionLoading(productId);
    try {
      await updateDoc(doc(db, 'products', productId), { soferId: soferId || null });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, soferId: soferId || undefined } : p));
    } catch (e) {
      console.error(e);
      alert('שגיאה בשיוך סופר');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleProductStatus(productId: string, currentStatus: string) {
    setActionLoading(productId + '_status');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'products', productId), { status: newStatus });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: newStatus } : p));
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון סטטוס');
    } finally {
      setActionLoading(null);
    }
  }

  async function changeUserRole(userId: string, newRole: UserRole) {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
      console.error(e);
      alert('שגיאה בעדכון תפקיד');
    } finally {
      setActionLoading(null);
    }
  }

  async function approveApplication(app: SoferApplication) {
    setActionLoading(app.id);
    try {
      await updateDoc(doc(db, 'soferim_applications', app.id), {
        status: 'approved', approvedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'soferim'), {
        name: app.name, city: app.city, phone: app.phone,
        whatsapp: app.whatsapp || '', email: app.email || '',
        description: app.description || '', style: app.style || '',
        categories: app.categories, imageUrl: app.imageUrl || '',
        status: 'active', createdAt: serverTimestamp(),
      });
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a));
    } catch (e) { console.error(e); alert('שגיאה באישור'); }
    finally { setActionLoading(null); }
  }

  async function rejectApplication(id: string) {
    setActionLoading(id);
    try {
      await updateDoc(doc(db, 'soferim_applications', id), {
        status: 'rejected', rejectedAt: serverTimestamp(),
      });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (e) { console.error(e); alert('שגיאה בדחייה'); }
    finally { setActionLoading(null); }
  }

  if (loading || ordersLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-2xl">טוען...</div>
    </div>
  );

  if (!user || user.role !== 'admin') return null;

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const shaliachOrders = orders.filter(o => o.shaliachName);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const filteredUsers = roleFilter === 'הכל' ? users : users.filter(u => u.role === roleFilter);
  const filteredProducts = products.filter(p =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );
  const unassignedProducts = products.filter(p => !p.soferId).length;

  return (
    <main className="max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">👑 דשבורד מנהל</h1>
        <button onClick={() => router.push('/')} className="text-green-700 font-bold hover:underline">
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
          <div className="text-3xl font-black text-blue-600">{products.length}</div>
          <div className="text-sm text-gray-500 mt-1">מוצרים</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-purple-600">{users.length}</div>
          <div className="text-sm text-gray-500 mt-1">משתמשים</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-3xl font-black text-orange-500">{pendingApps.length}</div>
          <div className="text-sm text-gray-500 mt-1">בקשות סופרים</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'orders' ? 'bg-green-700 text-white' : 'bg-white text-gray-600'}`}>
          📦 הזמנות
        </button>
        <button onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl font-bold transition relative ${activeTab === 'products' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}>
          📜 מוצרים
          {unassignedProducts > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unassignedProducts}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'commissions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
          🤝 עמלות שליחים
        </button>
        <button onClick={() => setActiveTab('soferim')}
          className={`px-4 py-2 rounded-xl font-bold transition relative ${activeTab === 'soferim' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600'}`}>
          ✍️ בקשות סופרים
          {pendingApps.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingApps.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>
          👥 משתמשים
        </button>
      </div>

      {/* Products */}
      {activeTab === 'products' && (
        <div>
          <div className="flex gap-3 mb-4 items-center">
            <input
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="חיפוש מוצר..."
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm flex-1 max-w-xs"
            />
            <span className="text-sm text-gray-500">{filteredProducts.length} מוצרים</span>
            {unassignedProducts > 0 && (
              <span className="text-sm text-red-500 font-bold">{unassignedProducts} ללא סופר</span>
            )}
          </div>

          {productsLoading ? (
            <div className="p-10 text-center text-gray-400">טוען מוצרים...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">מוצר</th>
                    <th className="p-3 text-right">קטגוריה</th>
                    <th className="p-3 text-right">מחיר</th>
                    <th className="p-3 text-right">סטטוס</th>
                    <th className="p-3 text-right">שיוך לסופר</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-gray-400">אין מוצרים</td></tr>
                  ) : filteredProducts.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {(p.imgUrl || p.image_url) && (
                            <img src={p.imgUrl || p.image_url} alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <span className="font-bold text-xs">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{p.cat || p.category || '—'}</td>
                      <td className="p-3 font-bold text-green-700">₪{p.price}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleProductStatus(p.id, p.status || 'active')}
                          disabled={actionLoading === p.id + '_status'}
                          className={`px-2 py-1 rounded-full text-xs font-bold transition
                            ${p.status === 'inactive'
                              ? 'bg-red-100 text-red-600 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {p.status === 'inactive' ? '● לא פעיל' : '● פעיל'}
                        </button>
                      </td>
                      <td className="p-3">
                        <select
                          value={p.soferId || ''}
                          disabled={actionLoading === p.id}
                          onChange={e => assignSoferToProduct(p.id, e.target.value)}
                          className={`border rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer
                            ${!p.soferId ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-700'}`}>
                          <option value="">⚠️ ללא סופר</option>
                          {soferim.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        {actionLoading === p.id && <span className="text-xs text-gray-400 mr-1">שומר...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">אין הזמנות עדיין</td></tr>
              ) : orders.map(o => (
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

      {/* Sofer Applications */}
      {activeTab === 'soferim' && (
        <div>
          {appsLoading ? (
            <div className="p-10 text-center text-gray-400">טוען בקשות...</div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין בקשות סופרים עדיין</div>
          ) : (
            <div className="grid gap-4">
              {applications.map(app => (
                <div key={app.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-shrink-0">
                      {app.imageUrl ? (
                        <img src={app.imageUrl} alt={app.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">✍️</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black">{app.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                          ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-600'}`}>
                          {app.status === 'pending' ? '⏳ ממתין' :
                           app.status === 'approved' ? '✅ מאושר' : '❌ נדחה'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                        {app.city && <span>📍 {app.city}</span>}
                        {app.phone && <span>📞 {app.phone}</span>}
                        {app.whatsapp && <span>💬 {app.whatsapp}</span>}
                        {app.email && <span>✉️ {app.email}</span>}
                        {app.style && <span>✍️ {app.style}</span>}
                      </div>
                      {app.categories?.length > 0 && (
                        <div className="flex gap-2 flex-wrap mb-3">
                          {app.categories.map(cat => (
                            <span key={cat} className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">{cat}</span>
                          ))}
                        </div>
                      )}
                      {app.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{app.description}</p>
                      )}
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => approveApplication(app)}
                          disabled={actionLoading === app.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                          {actionLoading === app.id ? '...' : '✅ אשר'}
                        </button>
                        <button onClick={() => rejectApplication(app.id)}
                          disabled={actionLoading === app.id}
                          className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200 disabled:opacity-50">
                          ❌ דחה
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['הכל', 'admin', 'sofer', 'shaliach', 'customer'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${roleFilter === r ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'}`}>
                {r === 'הכל' ? 'הכל' : ROLE_LABELS[r as UserRole]}
              </button>
            ))}
          </div>
          {usersLoading ? (
            <div className="p-10 text-center text-gray-400">טוען משתמשים...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-gray-400">אין משתמשים</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-right">משתמש</th>
                    <th className="p-3 text-right">אימייל</th>
                    <th className="p-3 text-right">תפקיד נוכחי</th>
                    <th className="p-3 text-right">שנה תפקיד</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-bold">{u.displayName || '—'}</td>
                      <td className="p-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          disabled={actionLoading === u.id}
                          onChange={e => changeUserRole(u.id, e.target.value as UserRole)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold bg-white cursor-pointer">
                          <option value="customer">👤 לקוח</option>
                          <option value="sofer">✍️ סופר</option>
                          <option value="shaliach">🟦 שליח</option>
                          <option value="admin">👑 מנהל</option>
                        </select>
                        {actionLoading === u.id && <span className="text-xs text-gray-400 mr-2">שומר...</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
