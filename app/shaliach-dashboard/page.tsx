'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  shaliachId: string;
  commissionAmount?: number;
  commissionPercent?: number;
  createdAt?: { seconds: number };
}

interface ShaliachProfile {
  name: string;
  chabadName?: string;
  city?: string;
  rabbiName?: string;
  logoUrl?: string;
  phone?: string;
  commissionPercent?: number;
}

export default function ShaliachDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<ShaliachProfile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'profile'>('overview');
  const [refLink, setRefLink] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && user.role !== 'shaliach' && user.role !== 'admin') router.push('/');
  }, [user, loading]);

  useEffect(() => {
    if (user && (user.role === 'shaliach' || user.role === 'admin') && user.shaliachId) {
      loadData();
      setRefLink(`${window.location.origin}/?ref=${user.shaliachId}`);
    } else if (user) {
      setDataLoading(false);
    }
  }, [user]);

  async function loadData() {
    if (!user?.shaliachId) return;
    try {
      // טען הזמנות
      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('shaliachId', '==', user.shaliachId))
      );
      const ordersData: Order[] = [];
      ordersSnap.forEach(d => ordersData.push({ id: d.id, ...d.data() } as Order));
      ordersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(ordersData);

      // טען פרופיל שליח
      const profileSnap = await getDocs(
        query(collection(db, 'shluchim'), where('__name__', '==', user.shaliachId))
      );
      if (!profileSnap.empty) {
        setProfile(profileSnap.docs[0].data() as ShaliachProfile);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.shaliachId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('הקובץ גדול מדי — מקסימום 2MB');
      return;
    }

    setUploadLoading(true);
    try {
      const storageRef = ref(storage, `shluchim/${user.shaliachId}/logo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'shluchim', user.shaliachId), { logoUrl: url });
      setProfile(prev => prev ? { ...prev, logoUrl: url } : prev);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('שגיאה בהעלאת הלוגו');
    } finally {
      setUploadLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink);
    alert('הלינק הועתק! 🎉');
  }

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontSize: 22 }}>טוען...</div>
    </div>
  );

  if (!user || (user.role !== 'shaliach' && user.role !== 'admin')) return null;

  if (!user.shaliachId) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🟦</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a3a2a', marginBottom: 12 }}>הפרופיל שלך בהכנה</h2>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          הצוות שלנו מגדיר את החשבון שלך. נודיע לך ברגע שהכל מוכן.
        </p>
        <button onClick={() => router.push('/')}
          style={{ background: '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          חזרה לדף הבית
        </button>
      </div>
    </div>
  );

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCommissions = orders.reduce((sum, o) => sum + (o.commissionAmount || 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0c1a35', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {profile?.logoUrl && (
            <img src={profile.logoUrl} alt="לוגו"
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: '2px solid #b8972a' }} />
          )}
          <div>
            <div style={{ fontSize: 13, color: '#8899aa', marginBottom: 2 }}>פורטל שליח</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>
              {profile?.chabadName || user.displayName?.split(' ')[0]} 🟦
            </div>
            {profile?.city && <div style={{ fontSize: 12, color: '#a8c0d8' }}>{profile.city}</div>}
          </div>
        </div>
        <button onClick={() => router.push('/')}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← לחנות
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

        {/* לינק אישי */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '2px solid #b8972a' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a3a2a', marginBottom: 10 }}>🔗 הלינק האישי שלך</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: '#f8f9fa', border: '1px solid #ddd', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {refLink}
            </div>
            <button onClick={copyLink}
              style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📋 העתק
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>שתף עם לקוחות — כל הזמנה דרכו תזוכה אליך</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { value: orders.length, label: 'סה"כ הזמנות', color: '#0c1a35' },
            { value: `₪${totalRevenue.toFixed(0)}`, label: 'סה"כ מכירות', color: '#27ae60' },
            { value: `₪${totalCommissions.toFixed(0)}`, label: 'עמלות שלך', color: '#b8972a' },
            { value: deliveredOrders, label: 'הזמנות שנמסרו', color: '#8e44ad' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'overview', label: '📊 סקירה' },
            { key: 'orders', label: '📦 הזמנות' },
            { key: 'profile', label: '🖼️ פרופיל ולוגו' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: activeTab === t.key ? '#0c1a35' : '#fff',
                color: activeTab === t.key ? '#fff' : '#555',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile & Logo Tab */}
        {activeTab === 'profile' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a3a2a', marginBottom: 24 }}>🖼️ לוגו בית החבד שלך</h3>

            {/* תצוגת לוגו נוכחי */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
              {profile?.logoUrl ? (
                <img src={profile.logoUrl} alt="לוגו נוכחי"
                  style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid #b8972a' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: 12, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  🟦
                </div>
              )}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                  {profile?.logoUrl ? '✅ לוגו מוגדר' : '⚠️ אין לוגו עדיין'}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  הלוגו יופיע בראש האתר כשלקוחות נכנסים דרך הלינק שלך
                </div>
              </div>
            </div>

            {/* העלאת לוגו */}
            <div style={{ border: '2px dashed #ddd', borderRadius: 12, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>העלה לוגו חדש</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
                PNG, JPG, או SVG · מקסימום 2MB · מומלץ ריבוע 200x200
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: 'none' }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                style={{
                  background: uploadLoading ? '#888' : '#0c1a35',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '12px 28px', fontSize: 15, fontWeight: 700,
                  cursor: uploadLoading ? 'not-allowed' : 'pointer'
                }}>
                {uploadLoading ? '⏳ מעלה...' : '📤 בחר קובץ והעלה'}
              </button>

              {uploadSuccess && (
                <div style={{ marginTop: 16, color: '#27ae60', fontWeight: 700, fontSize: 15 }}>
                  ✅ הלוגו עודכן בהצלחה! רענן את הדף לראות את השינוי.
                </div>
              )}
            </div>

            {/* פרטי פרופיל */}
            {profile && (
              <div style={{ marginTop: 28, padding: 20, background: '#f8f9fa', borderRadius: 12 }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: '#1a3a2a' }}>פרטי הפרופיל שלך</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
                  {profile.chabadName && <div><span style={{ color: '#888' }}>שם בית חבד: </span><strong>{profile.chabadName}</strong></div>}
                  {profile.city && <div><span style={{ color: '#888' }}>עיר: </span><strong>{profile.city}</strong></div>}
                  {profile.rabbiName && <div><span style={{ color: '#888' }}>שם הרב: </span><strong>{profile.rabbiName}</strong></div>}
                  {profile.phone && <div><span style={{ color: '#888' }}>טלפון: </span><strong>{profile.phone}</strong></div>}
                  {profile.commissionPercent && <div><span style={{ color: '#888' }}>עמלה: </span><strong>{profile.commissionPercent}%</strong></div>}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                  לשינוי פרטים — פנה למנהל המערכת
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Table */}
        {(activeTab === 'overview' || activeTab === 'orders') && (
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                <div style={{ fontSize: 18, marginBottom: 8 }}>אין הזמנות עדיין</div>
                <div style={{ fontSize: 14, marginBottom: 24 }}>שתף את הלינק שלך כדי להתחיל</div>
                <button onClick={copyLink}
                  style={{ background: '#b8972a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  📋 העתק לינק
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontWeight: 600 }}>מספר הזמנה</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontWeight: 600 }}>לקוח</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סכום</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontWeight: 600 }}>עמלה</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontWeight: 600 }}>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#555' }}>{o.orderNumber}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>{o.customerName}</td>
                      <td style={{ padding: '12px 16px', color: '#27ae60', fontWeight: 700 }}>₪{o.total}</td>
                      <td style={{ padding: '12px 16px', color: '#b8972a', fontWeight: 700 }}>
                        ₪{o.commissionAmount?.toFixed(0) || '—'}
                        {o.commissionPercent && <span style={{ fontSize: 11, color: '#aaa', marginRight: 4 }}>({o.commissionPercent}%)</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          background: o.status === 'delivered' ? '#d5f5e3' : o.status === 'processing' ? '#d6eaf8' : '#fef9e7',
                          color: o.status === 'delivered' ? '#1e8449' : o.status === 'processing' ? '#1a5276' : '#b7950b',
                          padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700
                        }}>
                          {o.status === 'delivered' ? '✅ נמסר' : o.status === 'processing' ? '🔄 בעיבוד' : '⏳ חדש'}
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
