'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';
import type { InternalOrder } from '@/app/ops/types';
import StatusBadge from '@/components/ops/StatusBadge';

const RELEVANT_STATUSES = new Set([
  'in_fulfillment', 'waiting_supplier', 'fulfillment_ready',
  'ready_for_shipment', 'shipped', 'delivered',
]);

export default function FulfillmentDashboard() {
  const { opsUser } = useOpsAuth();
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [commNote, setCommNote] = useState<Record<string, string>>({});
  const [commChannel, setCommChannel] = useState<Record<string, 'phone' | 'whatsapp' | 'email'>>({});
  const [savingComm, setSavingComm] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'queue' | 'shipped'>('queue');

  async function load() {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, 'internalOrders'), orderBy('createdAt', 'desc'))
    );
    const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InternalOrder));
    const relevant = loaded.filter((o) => RELEVANT_STATUSES.has(o.status));
    setOrders(relevant);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const queue = orders.filter((o) =>
    ['in_fulfillment', 'waiting_supplier', 'fulfillment_ready', 'ready_for_shipment'].includes(o.status)
  );
  const shipped = orders.filter((o) => ['shipped', 'delivered'].includes(o.status));

  async function saveTracking(order: InternalOrder) {
    const tracking = trackingInputs[order.id]?.trim();
    if (!tracking) return;
    setSaving((s) => ({ ...s, [order.id]: true }));
    await updateDoc(doc(db, 'internalOrders', order.id), {
      shipmentTracking: tracking,
      status: 'shipped',
      shippedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'auditLog'), {
      orderId: order.id,
      userId: opsUser!.uid,
      userName: opsUser!.name,
      action: 'מספר מעקב נוסף',
      newValue: tracking,
      timestamp: serverTimestamp(),
    });
    setSaving((s) => ({ ...s, [order.id]: false }));
    load();
  }

  async function saveComm(order: InternalOrder) {
    const note = commNote[order.id]?.trim();
    if (!note) return;
    setSavingComm((s) => ({ ...s, [order.id]: true }));
    const entry = {
      authorId: opsUser!.uid,
      authorName: opsUser!.name,
      channel: commChannel[order.id] || 'phone',
      summary: note,
      createdAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'internalOrders', order.id), {
      customerCommunicationLog: [...(order.customerCommunicationLog || []), entry],
      updatedAt: serverTimestamp(),
    });
    await addDoc(collection(db, 'auditLog'), {
      orderId: order.id,
      userId: opsUser!.uid,
      userName: opsUser!.name,
      action: 'תקשורת עם לקוח נרשמה',
      newValue: `${entry.channel}: ${note}`,
      timestamp: serverTimestamp(),
    });
    setCommNote((s) => ({ ...s, [order.id]: '' }));
    setSavingComm((s) => ({ ...s, [order.id]: false }));
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">טוען נתונים...</div>;
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-black" style={{ color: '#0c1a35' }}>
          שלום {opsUser?.name} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">דשבורד מילוי הזמנות</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'בביצוע', status: 'in_fulfillment', color: 'text-orange-500' },
          { label: 'ממתין לספק', status: 'waiting_supplier', color: 'text-amber-600' },
          { label: 'מוכן למשלוח', status: 'ready_for_shipment', color: 'text-teal-600' },
          { label: 'נשלח', status: 'shipped', color: 'text-indigo-600' },
        ].map(({ label, status, color }) => (
          <div key={status} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <div className={`text-3xl font-black ${color}`}>
              {orders.filter((o) => o.status === status).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === 'queue' ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          תור הכנה ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('shipped')}
          className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === 'shipped' ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          נשלחו / נמסרו ({shipped.length})
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
              אין הזמנות בתור הכנה
            </div>
          ) : (
            queue.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-gray-800">{order.customerName}</div>
                    <div className="text-sm text-gray-500">{order.customerEmail} · {order.customerPhone}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {order.shippingAddress?.street}, {order.shippingAddress?.city}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <a
                      href={`/ops/orders/${order.id}`}
                      style={{ background: '#0c1a35', color: '#b8972a' }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                    >
                      פרטים מלאים
                    </a>
                  </div>
                </div>

                {/* Products */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-2">מוצרים</div>
                  <div className="space-y-1">
                    {order.products?.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700">
                        <span>{p.name} × {p.quantity}</span>
                        <span className="text-gray-500">{p.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tracking */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">מספר מעקב משלוח</div>
                    {order.shipmentTracking ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-green-50 border border-green-200 rounded px-2 py-1 text-green-800">
                          {order.shipmentTracking}
                        </span>
                        <span className="text-xs text-green-600">✓ נרשם</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trackingInputs[order.id] || ''}
                          onChange={(e) => setTrackingInputs((s) => ({ ...s, [order.id]: e.target.value }))}
                          placeholder="הזן מספר מעקב..."
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                          onKeyDown={(e) => e.key === 'Enter' && saveTracking(order)}
                        />
                        <button
                          onClick={() => saveTracking(order)}
                          disabled={saving[order.id] || !trackingInputs[order.id]}
                          style={{ background: '#0c1a35', color: '#b8972a' }}
                          className="px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                        >
                          {saving[order.id] ? '...' : 'שמור'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Communication log */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">תקשורת עם לקוח</div>
                    {order.customerCommunicationLog?.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {order.customerCommunicationLog.slice(-2).map((log, i) => (
                          <div key={i} className="text-xs bg-gray-50 rounded p-2 text-gray-600">
                            <span className="font-semibold">
                              {log.channel === 'phone' ? '📞' : log.channel === 'whatsapp' ? '💬' : '✉️'}
                            </span>{' '}
                            {log.summary}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={commChannel[order.id] || 'phone'}
                        onChange={(e) => setCommChannel((s) => ({ ...s, [order.id]: e.target.value as any }))}
                        className="border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
                      >
                        <option value="phone">📞 טלפון</option>
                        <option value="whatsapp">💬 WhatsApp</option>
                        <option value="email">✉️ מייל</option>
                      </select>
                      <input
                        type="text"
                        value={commNote[order.id] || ''}
                        onChange={(e) => setCommNote((s) => ({ ...s, [order.id]: e.target.value }))}
                        placeholder="תקציר שיחה..."
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none"
                      />
                      <button
                        onClick={() => saveComm(order)}
                        disabled={savingComm[order.id] || !commNote[order.id]}
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                      >
                        {savingComm[order.id] ? '...' : 'הוסף'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'shipped' && (
        <div className="space-y-3">
          {shipped.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
              אין הזמנות שנשלחו
            </div>
          ) : (
            shipped.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-bold text-gray-800">{order.customerName}</div>
                  <div className="text-sm text-gray-500">{order.customerEmail}</div>
                  {order.shipmentTracking && (
                    <div className="text-xs font-mono bg-gray-50 border rounded px-2 py-0.5 mt-1 inline-block">
                      מעקב: {order.shipmentTracking}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <a
                    href={`/ops/orders/${order.id}`}
                    style={{ background: '#0c1a35', color: '#b8972a' }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                  >
                    פרטים
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
