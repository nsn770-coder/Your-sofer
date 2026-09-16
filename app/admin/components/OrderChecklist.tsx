'use client';
import { useState, type ReactNode } from 'react';
import {
  stepsForOrder,
  completedCount,
  nextStep,
  previousStatus,
  isOutOfFlow,
  isKnownFlowStatus,
  isCustomOrder,
  FULL_FLOW,
  START_STATUS,
  type ChecklistOrderLike,
  type ChecklistStep,
} from '@/app/lib/orderChecklist';

/**
 * OrderChecklist — הסטטוס של ההזמנה כצ'קליסט במקום רשימה נפתחת.
 *
 * למה: ברשימה נפתחת אפשר לקפוץ ישר ל"מוכן למשלוח" ולדלג על ספירת הכמויות.
 * כאן ניתן לסמן רק את השלב הבא בתור, ולכן אי אפשר לפספס שלב.
 * ביטול אפשרי רק על הסימון האחרון, עם אישור, ונרשם ב-statusHistory.
 */

interface OrderProp extends ChecklistOrderLike {
  id: string;
  status: string;
  statusHistory?: { status: string; at: string; by?: string }[];
}

interface Props {
  order: OrderProp;
  updating: boolean;
  /** מחלקת הצבע של הצ'יפ, מתוך ORDER_STATUSES */
  colorClass: string;
  /** תווית הסטטוס הנוכחי להצגה על הצ'יפ */
  currentLabel: string;
  /** אותו handler של הרשימה הישנה — שומר ב-Firestore ומוסיף ל-statusHistory */
  onChange: (orderId: string, newStatus: string) => void;
  /** נשמר להזמנות היסטוריות בסטטוס ישן — מוצג במקום הצ'קליסט */
  legacyControl?: ReactNode;
}

/** לאן לחזור אחרי "דורש טיפול" — השלב האחרון בתהליך שנרשם ביומן ההזמנה */
function resumeStatus(steps: ChecklistStep[], order: OrderProp): string {
  const history = order.statusHistory ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i]?.status;
    if (s && (s === START_STATUS || steps.some(st => st.value === s))) return s;
  }
  return START_STATUS;
}

export default function OrderChecklist({
  order, updating, colorClass, currentLabel, onChange, legacyControl,
}: Props) {
  const [open, setOpen] = useState(false);
  // מעבר ידני למסלול המלא, למקרה שהזיהוי האוטומטי פספס הזמנה עם עיצוב
  const [forceFull, setForceFull] = useState(false);

  const steps = forceFull ? FULL_FLOW : stepsForOrder(order);
  const outOfFlow = isOutOfFlow(order.status);
  const known = isKnownFlowStatus(steps, order.status);

  // הזמנה היסטורית בסטטוס ישן — הצ'קליסט לא רלוונטי לה
  if (!known && !outOfFlow && legacyControl) return <>{legacyControl}</>;

  const done = completedCount(steps, order.status);
  const next = outOfFlow ? null : nextStep(steps, order.status);
  const total = steps.length;

  function mark(step: ChecklistStep) {
    if (updating) return;
    onChange(order.id, step.value);
  }

  function undoLast() {
    if (updating || done === 0) return;
    const last = steps[done - 1];
    if (!window.confirm(`לבטל את הסימון "${last.label}"?\nההזמנה תחזור לשלב הקודם, והביטול יירשם ביומן ההזמנה.`)) return;
    onChange(order.id, previousStatus(steps, order.status));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        disabled={updating}
        className={`text-xs font-bold px-2 py-1 rounded-full outline-none text-right leading-tight ${colorClass} ${updating ? 'opacity-50' : 'hover:brightness-95'}`}
        title="לחיצה פותחת את רשימת השלבים"
      >
        {currentLabel}
        {!outOfFlow && <span className="block text-[10px] font-semibold opacity-80">{done}/{total} שלבים</span>}
      </button>

      {updating && <span className="mr-2 text-xs text-gray-400">שומר...</span>}

      {open && (
        <>
          {/* שכבה שקופה לסגירה בלחיצה בחוץ */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute z-50 mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl p-3 text-right"
            style={{ insetInlineEnd: 0 }}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-black text-gray-700">
                {isCustomOrder(order) ? 'הזמנה בעיצוב אישי' : 'הזמנה רגילה'} · {done}/{total}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xs px-1" aria-label="סגירה">✕</button>
            </div>

            {outOfFlow ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 space-y-2">
                <div className="font-bold">ההזמנה מסומנת כ{currentLabel} — התהליך מושהה.</div>
                <button
                  type="button"
                  onClick={() => { onChange(order.id, resumeStatus(steps, order)); setOpen(false); }}
                  className="w-full bg-red-600 text-white rounded-lg py-1.5 font-bold"
                >
                  החזרה לתהליך
                </button>
              </div>
            ) : (
              <ol className="space-y-1">
                {steps.map((step, i) => {
                  const isDone = i < done;
                  const isNext = !!next && next.value === step.value;
                  const isLastDone = isDone && i === done - 1;

                  return (
                    <li key={step.value}>
                      <button
                        type="button"
                        onClick={() => { if (isNext) mark(step); }}
                        disabled={!isNext || updating}
                        className={[
                          'w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-right transition',
                          isNext ? 'bg-blue-50 border border-blue-300 hover:bg-blue-100 cursor-pointer' : 'border border-transparent',
                          isDone ? 'opacity-90' : '',
                          !isDone && !isNext ? 'opacity-45 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-black',
                            isDone ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-transparent',
                          ].join(' ')}
                        >
                          ✓
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[12px] font-bold ${isDone ? 'text-green-800' : isNext ? 'text-blue-900' : 'text-gray-500'}`}>
                            {step.label}
                            {!isDone && !isNext && <span className="mr-1">🔒</span>}
                          </span>
                          {(isNext || isDone) && step.hint && (
                            <span className="block text-[10.5px] text-gray-500 leading-snug">{step.hint}</span>
                          )}
                        </span>
                      </button>

                      {isLastDone && (
                        <button
                          type="button"
                          onClick={undoLast}
                          disabled={updating}
                          className="block text-[10.5px] text-gray-400 hover:text-red-600 underline mr-6 mt-0.5"
                        >
                          ביטול הסימון הזה
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {!outOfFlow && steps.length < FULL_FLOW.length && (
              <button
                type="button"
                onClick={() => setForceFull(true)}
                className="mt-2 w-full text-[11px] font-bold text-blue-700 bg-blue-50 rounded-lg py-1.5 hover:bg-blue-100"
              >
                זו הזמנה עם עיצוב — הצג את כל השלבים
              </button>
            )}

            {!outOfFlow && (
              <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => { onChange(order.id, 'needs_care'); setOpen(false); }}
                  disabled={updating}
                  className="flex-1 text-[11px] font-bold text-red-700 bg-red-50 rounded-lg py-1.5 hover:bg-red-100"
                >
                  ⚠️ דורש טיפול
                </button>
                <button
                  type="button"
                  onClick={() => { onChange(order.id, 'abandoned'); setOpen(false); }}
                  disabled={updating}
                  className="flex-1 text-[11px] font-bold text-gray-600 bg-gray-100 rounded-lg py-1.5 hover:bg-gray-200"
                >
                  🚫 נטוש
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
