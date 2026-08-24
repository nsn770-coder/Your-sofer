'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ManualOrderModal — יצירת הזמנה שבוצעה מחוץ לאתר (וואטסאפ / טלפון / פנים מול פנים)
// ושולמה בביט, בהעברה בנקאית או במזומן.
//
// ההזמנה נשמרת ב-collection 'orders' הרגיל עם status='paid', ולכן היא מופיעה
// בטאב ההזמנות ונספרת בכל דוחות ההכנסה בלי שינוי בהם.
// השדות source='manual' + paymentMethod מאפשרים להפריד אותה מהזמנות האתר.
//
// שולח ל-POST /api/admin/manual-order (אדמין בלבד).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bit:           '📱 ביט',
  bank_transfer: '🏦 העברה בנקאית',
  cash:          '💵 מזומן',
  credit:        '💳 אשראי',
  other:         'אחר',
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bit',           label: '📱 ביט' },
  { value: 'bank_transfer', label: '🏦 העברה בנקאית' },
  { value: 'cash',          label: '💵 מזומן' },
  { value: 'other',         label: 'אחר' },
];

const CHANNEL_OPTIONS = [
  { value: 'whatsapp',  label: '💬 וואטסאפ' },
  { value: 'phone',     label: '📞 טלפון' },
  { value: 'in_person', label: '🤝 פנים מול פנים' },
  { value: 'other',     label: 'אחר' },
];

interface LineDraft {
  key: string;
  name: string;
  price: string;
  quantity: string;
}

function newLine(): LineDraft {
  return { key: Math.random().toString(36).slice(2), name: '', price: '', quantity: '1' };
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ManualOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** נקרא אחרי יצירה מוצלחת — כדי לרענן את רשימת ההזמנות */
  onCreated: (info: { orderId: string; orderNumber: string; total: number }) => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [address, setAddress]           = useState('');
  const [city, setCity]                 = useState('');
  const [notes, setNotes]               = useState('');

  const [lines, setLines]               = useState<LineDraft[]>([newLine()]);
  const [shippingCost, setShippingCost] = useState('');

  const [paymentMethod, setPaymentMethod]       = useState('bit');
  const [paymentReference, setPaymentReference] = useState('');
  const [channel, setChannel]                   = useState('whatsapp');
  const [paidDate, setPaidDate]                 = useState(todayLocalDate());
  const [isPaid, setIsPaid]                     = useState(true);

  const [useOverride, setUseOverride]   = useState(false);
  const [overrideTotal, setOverrideTotal] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const computedTotal = useMemo(() => {
    const itemsSum = lines.reduce((sum, l) => {
      const p = Number(l.price) || 0;
      const q = Math.max(1, Math.floor(Number(l.quantity) || 1));
      return sum + p * q;
    }, 0);
    return Math.round((itemsSum + (Number(shippingCost) || 0)) * 100) / 100;
  }, [lines, shippingCost]);

  const finalTotal = useOverride && overrideTotal !== '' ? Number(overrideTotal) || 0 : computedTotal;

  if (!open) return null;

  const updateLine = (key: string, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

  const reset = () => {
    setCustomerName(''); setPhone(''); setEmail(''); setAddress(''); setCity(''); setNotes('');
    setLines([newLine()]); setShippingCost('');
    setPaymentMethod('bit'); setPaymentReference(''); setChannel('whatsapp');
    setPaidDate(todayLocalDate()); setIsPaid(true);
    setUseOverride(false); setOverrideTotal('');
    setError(null);
  };

  async function submit() {
    setError(null);

    if (!customerName.trim()) { setError('חסר שם לקוח'); return; }
    if (!phone.trim())        { setError('חסר טלפון'); return; }

    const items = lines
      .map(l => ({
        name: l.name.trim(),
        price: Number(l.price) || 0,
        quantity: Math.max(1, Math.floor(Number(l.quantity) || 1)),
      }))
      .filter(i => i.name);

    if (items.length === 0) { setError('חייב להיות לפחות פריט אחד עם שם'); return; }

    setSaving(true);
    try {
      const _auth = await getAuthLazy();
      const idToken = await _auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('לא מחובר — התחבר מחדש');

      const res = await fetch('/api/admin/manual-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          city: city.trim(),
          notes: notes.trim(),
          items,
          shippingCost: Number(shippingCost) || 0,
          paymentMethod,
          paymentReference: paymentReference.trim(),
          channel,
          isPaid,
          paidAt: isPaid && paidDate ? new Date(`${paidDate}T12:00:00`).toISOString() : undefined,
          totalOverride: useOverride && overrideTotal !== '' ? Number(overrideTotal) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'שגיאה ביצירת ההזמנה'); return; }

      onCreated({ orderId: data.orderId, orderNumber: data.orderNumber, total: data.total });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה לא צפויה');
    } finally {
      setSaving(false);
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200';
  const label = 'text-xs font-bold text-gray-500 mb-1 block';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-800">➕ הזמנה ידנית (וואטסאפ / ביט / העברה)</h3>
          <button
            onClick={() => !saving && onClose()}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            aria-label="סגירה"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── לקוח ─────────────────────────────────────────────────── */}
          <section>
            <h4 className="text-sm font-black text-gray-700 mb-3">פרטי לקוח</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>שם מלא *</label>
                <input className={input} value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label className={label}>טלפון *</label>
                <input className={input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" />
              </div>
              <div>
                <label className={label}>אימייל</label>
                <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={label}>עיר</label>
                <input className={input} value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>כתובת</label>
                <input className={input} value={address} onChange={e => setAddress(e.target.value)} placeholder="רחוב, מספר, דירה" />
              </div>
            </div>
          </section>

          {/* ── פריטים ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-black text-gray-700">פריטים</h4>
              <button
                onClick={() => setLines(prev => [...prev, newLine()])}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                + שורה
              </button>
            </div>

            <div className="space-y-2">
              {lines.map(l => (
                <div key={l.key} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <label className={label}>תיאור</label>
                    <input
                      className={input}
                      value={l.name}
                      onChange={e => updateLine(l.key, { name: e.target.value })}
                      placeholder='למשל: 50 כיפות פשתן בעיצוב אישי'
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={label}>מחיר ליח׳</label>
                    <input
                      className={input}
                      type="number"
                      min="0"
                      step="0.5"
                      value={l.price}
                      onChange={e => updateLine(l.key, { price: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={label}>כמות</label>
                    <input
                      className={input}
                      type="number"
                      min="1"
                      step="1"
                      value={l.quantity}
                      onChange={e => updateLine(l.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end pb-1">
                    {lines.length > 1 && (
                      <button
                        onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))}
                        className="text-xs font-bold px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                      >
                        מחק
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 max-w-[200px]">
              <label className={label}>עלות משלוח</label>
              <input
                className={input}
                type="number"
                min="0"
                step="1"
                value={shippingCost}
                onChange={e => setShippingCost(e.target.value)}
                placeholder="0"
              />
            </div>
          </section>

          {/* ── תשלום ────────────────────────────────────────────────── */}
          <section>
            <h4 className="text-sm font-black text-gray-700 mb-3">תשלום</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>אמצעי תשלום *</label>
                <select className={input} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHOD_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>מאיפה הגיעה ההזמנה</label>
                <select className={input} value={channel} onChange={e => setChannel(e.target.value)}>
                  {CHANNEL_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>אסמכתא (4 ספרות אחרונות / מס׳ העברה)</label>
                <input className={input} value={paymentReference} onChange={e => setPaymentReference(e.target.value)} />
              </div>
              <div>
                <label className={label}>תאריך תשלום</label>
                <input
                  className={input}
                  type="date"
                  value={paidDate}
                  disabled={!isPaid}
                  max={todayLocalDate()}
                  onChange={e => setPaidDate(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 mt-3 text-sm font-bold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="w-4 h-4" />
              התשלום כבר בוצע
              <span className="font-normal text-xs text-gray-500">
                {isPaid
                  ? '(סטטוס "חדש" — נספר כהכנסה בדוחות)'
                  : '(סטטוס "ממתין" — לא נספר כהכנסה עד שתסמן ששולם)'}
              </span>
            </label>
          </section>

          {/* ── סכום ─────────────────────────────────────────────────── */}
          <section className="bg-gray-50 rounded-xl p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={useOverride}
                onChange={e => { setUseOverride(e.target.checked); if (e.target.checked && overrideTotal === '') setOverrideTotal(String(computedTotal)); }}
                className="w-4 h-4"
              />
              סכום ידני (מה שסוכם בפועל)
            </label>

            {useOverride && (
              <input
                className={`${input} max-w-[200px] mb-2`}
                type="number"
                min="0"
                step="1"
                value={overrideTotal}
                onChange={e => setOverrideTotal(e.target.value)}
              />
            )}

            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">
                מחושב מהשורות: ₪{computedTotal.toLocaleString('he-IL')}
              </span>
              <span className="text-xl font-black text-gray-900">
                סה״כ לחיוב: ₪{finalTotal.toLocaleString('he-IL')}
              </span>
            </div>
          </section>

          <div>
            <label className={label}>הערות פנימיות</label>
            <textarea
              className={`${input} min-h-[70px]`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="למשל: סוכם בוואטסאפ, ההדפסה לפי הקובץ ששלח"
            />
          </div>

          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            ⚠️ <b>קבלה:</b> Sumit מנפיק קבלה אוטומטית רק בחיוב אשראי. בהזמנה ידנית ההזמנה נשמרת עם
            <code className="mx-1 px-1 bg-white rounded">receiptIssued: false</code>
            ואתה צריך להנפיק את הקבלה בנפרד ב-Sumit.
            <br />
            ℹ️ הזמנה ידנית <b>לא</b> מדווחת כקונברז׳ן לגוגל אדס — היא לא הגיעה מהמודעה.
          </p>

          {error && (
            <div className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-bold border border-indigo-700 bg-indigo-700 text-white hover:bg-indigo-800 disabled:bg-gray-300 disabled:border-gray-300"
          >
            {saving ? 'שומר…' : 'צור הזמנה'}
          </button>
        </div>
      </div>
    </div>
  );
}
