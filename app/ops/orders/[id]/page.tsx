'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc, getDoc, updateDoc, addDoc, collection, getDocs,
  orderBy, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useOpsAuth } from '@/app/contexts/OpsAuthContext';
import type {
  InternalOrder, AuditEntry, OrderStatus, Priority,
} from '@/app/ops/types';
import {
  STATUS_LABELS, PRIORITY_LABELS, ORDER_TYPE_LABELS,
  FULFILLMENT_ALLOWED_STATUSES, OPS_MANAGER_BLOCKED_STATUSES,
} from '@/app/ops/types';
import StatusBadge from '@/components/ops/StatusBadge';
import AuditTimeline from '@/components/ops/AuditTimeline';

const ALL_STATUSES: OrderStatus[] = [
  'new_order', 'awaiting_review', 'assigned', 'in_fulfillment',
  'waiting_supplier', 'stam_processing', 'stam_sent_checking', 'stam_approved',
  'fulfillment_ready', 'ready_for_shipment', 'shipped', 'delivered',
  'completed', 'delayed', 'blocked', 'cancelled',
];

function formatTs(ts: any): string {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
      <h2 className="font-bold text-gray-800 mb-4 text-base border-b pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-800">{value || '—'}</div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { opsUser } = useOpsAuth();
  const router = useRouter();

  const [order, setOrder] = useState<InternalOrder | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [newPriority, setNewPriority] = useState<Priority | ''>('');
  const [primaryOwner, setPrimaryOwner] = useState('');
  const [secondaryOwner, setSecondaryOwner] = useState('');
  const [tracking, setTracking] = useState('');
  const [noteText, setNoteText] = useState('');
  const [commText, setCommText] = useState('');
  const [commChannel, setCommChannel] = useState<'phone' | 'whatsapp' | 'email'>('phone');
  const [isDelayed, setIsDelayed] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  async function loadOrder() {
    if (!id) return;
    const [orderSnap, auditSnap] = await Promise.all([
      getDoc(doc(db, 'internalOrders', id)),
      getDocs(query(collection(db, 'auditLog'), where('orderId', '==', id), orderBy('timestamp', 'desc'))),
    ]);

    if (!orderSnap.exists()) {
      setLoading(false);
      return;
    }

    const data = { id: orderSnap.id, ...orderSnap.data() } as InternalOrder;
    setOrder(data);
    setNewStatus(data.status);
    setNewPriority(data.priority);
    setPrimaryOwner(data.primaryOwner || '');
    setSecondaryOwner(data.secondaryOwner || '');
    setTracking(data.shipmentTracking || '');
    setIsDelayed(data.isDelayed || false);
    setDelayReason(data.delayReason || '');
    setIsBlocked(data.isBlocked || false);
    setBlockReason(data.blockReason || '');

    setAudit(auditSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry)));
    setLoading(false);
  }

  useEffect(() => {
    loadOrder();
  }, [id]);

  function allowedStatuses(): OrderStatus[] {
    if (!opsUser) return [];
    if (opsUser.role === 'owner') return ALL_STATUSES;
    if (opsUser.role === 'ops_manager') {
      return ALL_STATUSES.filter((s) => !OPS_MANAGER_BLOCKED_STATUSES.includes(s));
    }
    if (opsUser.role === 'fulfillment') {
      return FULFILLMENT_ALLOWED_STATUSES;
    }
    return [];
  }

  const canAssign = opsUser?.role === 'owner' || opsUser?.role === 'ops_manager';
  const isFinancialVisible = opsUser?.role !== 'fulfillment';

  async function writeAudit(action: string, oldValue?: any, newValue?: any) {
    await addDoc(collection(db, 'auditLog'), {
      orderId: id,
      userId: opsUser!.uid,
      userName: opsUser!.name,
      action,
      oldValue,
      newValue,
      timestamp: serverTimestamp(),
    });
  }

  async function saveStatus() {
    if (!order || !newStatus || newStatus === order.status) return;
    setSaving(true);
    const oldStatus = order.status;
    await updateDoc(doc(db, 'internalOrders', id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    await writeAudit('שינוי סטטוס', STATUS_LABELS[oldStatus], STATUS_LABELS[newStatus]);

    // Notify on important status changes
    if (newStatus === 'delayed' || newStatus === 'blocked' || newStatus === 'completed') {
      const notifyType = newStatus === 'delayed' ? 'delayed' : newStatus === 'blocked' ? 'blocked' : 'completed';
      try {
        await fetch('/api/ops/notify-team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: notifyType,
            orderNumber: order.orderId,
            orderId: id,
            customerName: order.customerName,
            reason: newStatus === 'delayed' ? delayReason : blockReason,
          }),
        });
      } catch (_) {}
    }

    setSaving(false);
    await loadOrder();
  }

  async function savePriority() {
    if (!order || !newPriority || newPriority === order.priority) return;
    setSaving(true);
    await updateDoc(doc(db, 'internalOrders', id), {
      priority: newPriority,
      updatedAt: serverTimestamp(),
    });
    await writeAudit('שינוי עדיפות', PRIORITY_LABELS[order.priority], PRIORITY_LABELS[newPriority]);
    setSaving(false);
    await loadOrder();
  }

  async function saveAssignment() {
    if (!order) return;
    setSaving(true);
    const changes: Record<string, string> = {};
    if (primaryOwner !== order.primaryOwner) changes.primaryOwner = primaryOwner;
    if (secondaryOwner !== order.secondaryOwner) changes.secondaryOwner = secondaryOwner;
    if (Object.keys(changes).length === 0) { setSaving(false); return; }
    await updateDoc(doc(db, 'internalOrders', id), { ...changes, updatedAt: serverTimestamp() });
    if (changes.primaryOwner !== undefined) {
      await writeAudit('שיוך אחראי', order.primaryOwner || 'ללא', primaryOwner || 'ללא');
    }
    setSaving(false);
    await loadOrder();
  }

  async function saveTracking() {
    if (!order || tracking === order.shipmentTracking) return;
    setSaving(true);
    await updateDoc(doc(db, 'internalOrders', id), {
      shipmentTracking: tracking,
      updatedAt: serverTimestamp(),
    });
    await writeAudit('מספר מעקב עודכן', order.shipmentTracking || '—', tracking);
    setSaving(false);
    await loadOrder();
  }

  async function saveFlags() {
    if (!order) return;
    setSaving(true);
    await updateDoc(doc(db, 'internalOrders', id), {
      isDelayed, delayReason, isBlocked, blockReason,
      updatedAt: serverTimestamp(),
    });
    if (isDelayed !== order.isDelayed) await writeAudit('דגל עיכוב', String(order.isDelayed), String(isDelayed));
    if (isBlocked !== order.isBlocked) await writeAudit('דגל חסימה', String(order.isBlocked), String(isBlocked));
    setSaving(false);
    await loadOrder();
  }

  async function addNote() {
    if (!noteText.trim() || !order) return;
    setSaving(true);
    const entry = {
      authorId: opsUser!.uid,
      authorName: opsUser!.name,
      text: noteText.trim(),
      createdAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'internalOrders', id), {
      internalNotes: [...(order.internalNotes || []), entry],
      updatedAt: serverTimestamp(),
    });
    await writeAudit('הערה נוספה', undefined, noteText.trim());
    setNoteText('');
    setSaving(false);
    await loadOrder();
  }

  async function addComm() {
    if (!commText.trim() || !order) return;
    setSaving(true);
    const entry = {
      authorId: opsUser!.uid,
      authorName: opsUser!.name,
      channel: commChannel,
      summary: commText.trim(),
      createdAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'internalOrders', id), {
      customerCommunicationLog: [...(order.customerCommunicationLog || []), entry],
      updatedAt: serverTimestamp(),
    });
    await writeAudit('תקשורת עם לקוח נרשמה', undefined, `${commChannel}: ${commText.trim()}`);
    setCommText('');
    setSaving(false);
    await loadOrder();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-gray-400">טוען הזמנה...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-24">
        <div className="text-gray-400 text-lg mb-4">הזמנה לא נמצאה</div>
        <button onClick={() => router.back()} className="text-blue-600 underline">חזרה</button>
      </div>
    );
  }

  const allowed = allowedStatuses();

  return (
    <div dir="rtl" className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
            ← חזרה
          </button>
          <h1 className="text-2xl font-black" style={{ color: '#0c1a35' }}>
            הזמנה #{order.orderId?.slice(-6).toUpperCase() || id.slice(-6).toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusBadge status={order.status} />
            {order.isDelayed && <span className="text-orange-500 text-sm font-semibold">⚠️ מאוחרת</span>}
            {order.isBlocked && <span className="text-red-600 text-sm font-semibold">🚨 חסומה</span>}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>נוצר: {formatTs(order.createdAt)}</div>
          <div>עודכן: {formatTs(order.updatedAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Customer info */}
          <Section title="פרטי לקוח">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="שם לקוח" value={order.customerName} />
              <Field label="טלפון" value={order.customerPhone} />
              <Field label="אימייל" value={order.customerEmail} />
              <Field label="רחוב" value={order.shippingAddress?.street} />
              <Field label="עיר" value={order.shippingAddress?.city} />
              <Field label="מיקוד" value={order.shippingAddress?.zip} />
            </div>
          </Section>

          {/* Products */}
          <Section title="מוצרים">
            <div className="space-y-2">
              {order.products?.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.category} · כמות: {p.quantity}</div>
                  </div>
                  {isFinancialVisible && (
                    <div className="font-semibold text-gray-700">₪{p.price?.toLocaleString()}</div>
                  )}
                </div>
              ))}
            </div>
            {isFinancialVisible && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold text-gray-800">
                <span>סה"כ</span>
                <span>₪{order.totalAmount?.toLocaleString()}</span>
              </div>
            )}
          </Section>

          {/* Status + Priority */}
          <Section title="ניהול סטטוס ועדיפות">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">סטטוס</label>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {allowed.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={saveStatus}
                    disabled={saving || newStatus === order.status}
                    style={{ background: '#0c1a35', color: '#b8972a' }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                  >
                    שמור
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">עדיפות</label>
                <div className="flex gap-2">
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Priority)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="low">נמוך</option>
                    <option value="normal">רגיל</option>
                    <option value="high">גבוה</option>
                    <option value="urgent">דחוף</option>
                  </select>
                  <button
                    onClick={savePriority}
                    disabled={saving || newPriority === order.priority}
                    style={{ background: '#0c1a35', color: '#b8972a' }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                  >
                    שמור
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Assignment */}
          {canAssign && (
            <Section title="שיוך אחראים">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">אחראי ראשי</label>
                  <input
                    type="text"
                    value={primaryOwner}
                    onChange={(e) => setPrimaryOwner(e.target.value)}
                    placeholder="שם אחראי ראשי..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">אחראי משני</label>
                  <input
                    type="text"
                    value={secondaryOwner}
                    onChange={(e) => setSecondaryOwner(e.target.value)}
                    placeholder="שם אחראי משני..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <button
                onClick={saveAssignment}
                disabled={saving}
                style={{ background: '#0c1a35', color: '#b8972a' }}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור שיוך'}
              </button>
            </Section>
          )}

          {/* Tracking */}
          <Section title="מעקב משלוח">
            <div className="flex gap-2">
              <input
                type="text"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="מספר מעקב משלוח..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveTracking}
                disabled={saving || tracking === order.shipmentTracking}
                style={{ background: '#0c1a35', color: '#b8972a' }}
                className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
              >
                שמור
              </button>
            </div>
            {order.shippedAt && (
              <div className="text-xs text-gray-400 mt-2">נשלח ב: {formatTs(order.shippedAt)}</div>
            )}
          </Section>

          {/* Delay / Block flags */}
          <Section title="דגלי עיכוב וחסימה">
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDelayed}
                    onChange={(e) => setIsDelayed(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-orange-600">⚠️ מאוחרת</span>
                </label>
                {isDelayed && (
                  <input
                    type="text"
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="סיבת העיכוב..."
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-orange-50"
                  />
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBlocked}
                    onChange={(e) => setIsBlocked(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-semibold text-red-600">🚨 חסומה</span>
                </label>
                {isBlocked && (
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="סיבת החסימה..."
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-red-50"
                  />
                )}
              </div>
              <button
                onClick={saveFlags}
                disabled={saving}
                style={{ background: '#0c1a35', color: '#b8972a' }}
                className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור דגלים'}
              </button>
            </div>
          </Section>

          {/* Internal Notes */}
          <Section title="הערות פנימיות">
            <div className="space-y-3 mb-4">
              {(order.internalNotes || []).length === 0 ? (
                <div className="text-sm text-gray-400">אין הערות עדיין</div>
              ) : (
                [...(order.internalNotes || [])].reverse().map((note, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="font-semibold text-gray-600">{note.authorName}</span>
                      <span>{formatTs(note.createdAt)}</span>
                    </div>
                    <div className="text-gray-700">{note.text}</div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="הוסף הערה פנימית..."
                rows={2}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                style={{ background: '#0c1a35', color: '#b8972a' }}
                className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50 self-end"
              >
                הוסף
              </button>
            </div>
          </Section>

          {/* Customer Communication Log */}
          <Section title="תקשורת עם לקוח">
            <div className="space-y-3 mb-4">
              {(order.customerCommunicationLog || []).length === 0 ? (
                <div className="text-sm text-gray-400">אין רשומות תקשורת</div>
              ) : (
                [...(order.customerCommunicationLog || [])].reverse().map((log, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span className="font-semibold text-gray-600">
                        {log.channel === 'phone' ? '📞 טלפון' : log.channel === 'whatsapp' ? '💬 WhatsApp' : '✉️ מייל'}
                        {' · '}{log.authorName}
                      </span>
                      <span>{formatTs(log.createdAt)}</span>
                    </div>
                    <div className="text-gray-700">{log.summary}</div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={commChannel}
                onChange={(e) => setCommChannel(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="phone">📞 טלפון</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">✉️ מייל</option>
              </select>
              <input
                type="text"
                value={commText}
                onChange={(e) => setCommText(e.target.value)}
                placeholder="תקציר שיחה עם הלקוח..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={(e) => e.key === 'Enter' && addComm()}
              />
              <button
                onClick={addComm}
                disabled={saving || !commText.trim()}
                style={{ background: '#0c1a35', color: '#b8972a' }}
                className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
              >
                הוסף
              </button>
            </div>
          </Section>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Order summary */}
          <Section title="סיכום הזמנה">
            <div className="space-y-3">
              <Field label="סוג הזמנה" value={ORDER_TYPE_LABELS[order.orderType] || order.orderType} />
              {isFinancialVisible && (
                <>
                  <Field label="סכום כולל" value={`₪${order.totalAmount?.toLocaleString()}`} />
                  <Field label="סטטוס כספי" value={order.financialStatus === 'paid' ? 'שולם' : order.financialStatus === 'refunded' ? 'הוחזר' : 'ממתין'} />
                </>
              )}
              <Field label="עדיפות" value={PRIORITY_LABELS[order.priority] || order.priority} />
              <Field label="תאריך יעד" value={order.dueDate ? formatTs(order.dueDate) : '—'} />
              <Field label="מעקב משלוח" value={order.shipmentTracking} />
            </div>
          </Section>

          {/* Assignment info */}
          <Section title="שיוך">
            <div className="space-y-3">
              <Field label="אחראי ראשי" value={order.primaryOwner} />
              <Field label="אחראי משני" value={order.secondaryOwner} />
            </div>
          </Section>

          {/* Streams */}
          {(order.judaicaStream?.notes || order.stamStream?.notes) && (
            <Section title="פרטי זרמים">
              {order.judaicaStream?.status && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">זרם יודאיקה</div>
                  <div className="text-sm text-gray-700">{order.judaicaStream.status}</div>
                  {order.judaicaStream.notes && (
                    <div className="text-xs text-gray-500">{order.judaicaStream.notes}</div>
                  )}
                </div>
              )}
              {order.stamStream?.status && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">זרם סת"מ</div>
                  <div className="text-sm text-gray-700">{order.stamStream.status}</div>
                  {order.stamStream.notes && (
                    <div className="text-xs text-gray-500">{order.stamStream.notes}</div>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Audit timeline */}
          <Section title="היסטוריית פעולות">
            <AuditTimeline entries={audit} />
          </Section>
        </div>
      </div>
    </div>
  );
}
